import { concurrent, isGenerator, resolveInclude } from "./utils.ts";
import { Exception } from "./errors.ts";
import { Page } from "./filesystem.ts";
import { posix } from "../deps/path.ts";
import { getDate, getUrl, mergeData } from "./source.ts";

import type { Content, Data, Formats, FS, Processors } from "../core.ts";

export interface Options {
  includes: string;
  prettyUrls: boolean;
  preprocessors: Processors;
  formats: Formats;
  fs: FS;
}

/**
 * The renderer is responsible for rendering the site pages
 * in the right order and using the right template engine.
 */
export default class Renderer {
  /** The default folder to include the layouts */
  includes: string;

  /** The filesystem instance used to read the layouts */
  fs: FS;

  /** To convert the urls to pretty /example.html => /example/ */
  prettyUrls: boolean;

  /** All preprocessors */
  preprocessors: Processors;

  /** Available file formats */
  formats: Formats;

  /** The registered helpers */
  helpers = new Map<string, [Helper, HelperOptions]>();

  constructor(options: Options) {
    this.includes = options.includes;
    this.prettyUrls = options.prettyUrls;
    this.preprocessors = options.preprocessors;
    this.formats = options.formats;
    this.fs = options.fs;
  }

  /** Register a new helper used by the template engines */
  addHelper(name: string, fn: Helper, options: HelperOptions) {
    this.helpers.set(name, [fn, options]);

    for (const format of this.formats.entries.values()) {
      format.engines?.forEach((engine) => engine.addHelper(name, fn, options));
    }

    return this;
  }

  /** Render the provided pages */
  async renderPages(from: Page[], to: Page[], onDemand: Page[]): Promise<void> {
    for (const group of this.#groupPages(from)) {
      const pages: Page[] = [];
      const generators: Page[] = [];

      // Split regular pages and generators
      for (const page of group) {
        if (isGenerator(page.data.content)) {
          generators.push(page);
          continue;
        }

        if (page.data.ondemand) {
          onDemand.push(page);
          continue;
        }
        pages.push(page);
      }

      // Preprocess the pages and add them to site.pages
      await this.preprocessors.run(pages);
      to.push(...pages);

      const generatedPages: Page[] = [];
      for (const page of generators) {
        const data = { ...page.data };
        const { content } = data;
        delete data.content;

        const generator = await this.render<Generator<Data, Data>>(
          content,
          data,
          page.src.path + page.src.ext,
        );

        let index = 0;
        const basePath: string | false = typeof page.data.url === "string"
          ? posix.dirname(page.data.url)
          : false;

        for await (const data of generator) {
          if (!data.content) {
            data.content = null;
          }
          const newPage = page.duplicate(index++, mergeData(page.data, data));
          newPage.data.url = basePath
            ? getUrl(newPage, this.prettyUrls, basePath)
            : false;
          newPage.data.date = getDate(newPage);
          generatedPages.push(newPage);
        }
      }

      // Preprocess the generators and add them to site.pages
      await this.preprocessors.run(generatedPages);
      to.push(...generatedPages);

      // Render the pages content
      const renderedPages: Page[] = [];
      await concurrent(
        pages.concat(generatedPages),
        async (page) => {
          try {
            const content = await this.#renderPage(page);

            // If the page is HTML or PHP, save the children to render the layout later
            if (/\.(html|php)$/.test(page.outputPath || '')) {
              page.data.children = content;
              renderedPages.push(page);
            } else {
              page.content = content;
            }
          } catch (cause) {
            throw new Exception("Error rendering this page", { cause, page });
          }
        },
      );

      // Render the pages layouts
      await concurrent(
        renderedPages,
        async (page) => {
          try {
            page.content = await this.#renderLayout(
              page,
              page.data.children as Content,
            );

            // Ensure all HTML pages have the DOCTYPE declaration
            if (
              page.outputPath?.endsWith(".html") &&
              typeof page.content === "string"
            ) {
              const trim = page.content.trim();

              if (trim && !trim.match(/^<!DOCTYPE\s/i)) {
                page.content = `<!DOCTYPE html>\n${page.content}`;
              }
            }
          } catch (cause) {
            throw new Exception("Error rendering the layout of this page", {
              cause,
              page,
            });
          }
        },
      );
    }
  }

  /** Render the provided pages */
  async renderPageOnDemand(page: Page): Promise<void> {
    if (isGenerator(page.data.content)) {
      throw new Exception("Cannot render a multiple page on demand.", {
        page,
      });
    }

    await this.preprocessors.run([page]);

    if (this.formats.get(page.src.ext || "")?.asset) {
      page.content = page.data.content as Content;
    } else {
      const content = await this.#renderPage(page);
      page.content = await this.#renderLayout(page, content);
    }
  }

  /** Render a template */
  async render<T>(
    content: unknown,
    data: Data,
    filename: string,
  ): Promise<T> {
    const engines = this.#getEngine(filename, data);

    if (engines) {
      for (const engine of engines) {
        content = await engine.render(content, data, filename);
      }
    }

    return content as T;
  }

  /** Group the pages by renderOrder */
  #groupPages(pages: Page[]): Page[][] {
    const renderOrder: Record<number | string, Page[]> = {};

    for (const page of pages) {
      const order = page.data.renderOrder || 0;
      renderOrder[order] = renderOrder[order] || [];
      renderOrder[order].push(page);
    }

    return Object.keys(renderOrder).sort().map((order) => renderOrder[order]);
  }

  /** Render a page */
  async #renderPage(page: Page): Promise<Content> {
    const data = { ...page.data };
    const { content } = data;
    delete data.content;

    return await this.render<Content>(
      content,
      data,
      page.src.path + page.src.ext,
    );
  }

  /** Render the page layout */
  async #renderLayout(page: Page, content: Content): Promise<Content> {
    let data = { ...page.data };
    let path = page.src.path + page.src.ext;
    let layout = data.layout;

    // Render the layouts recursively
    while (layout) {
      const format = this.formats.search(layout);

      if (!format || !format.pageLoader) {
        throw new Exception(
          "There's no handler for this layout format",
          { layout },
        );
      }

      const includesPath = format.includesPath || this.includes;
      const layoutPath = resolveInclude(
        layout,
        includesPath,
        posix.dirname(path),
      );
      const entry = this.fs.entries.get(layoutPath);

      if (!entry) {
        throw new Exception(
          "The layout file doesn't exist",
          { layoutPath },
        );
      }

      const layoutData = await entry.getContent(format.pageLoader);

      delete data.layout;
      delete data.templateEngine;

      data = {
        ...layoutData,
        ...data,
        content,
      };

      content = await this.render<Content>(
        layoutData.content,
        data,
        layoutPath,
      );
      layout = layoutData.layout;
      path = layoutPath;
    }

    return content;
  }

  /** Get the engines assigned to an extension or configured in the data */
  #getEngine(path: string, data: Data): Engine[] | undefined {
    let { templateEngine } = data;

    if (templateEngine) {
      templateEngine = Array.isArray(templateEngine)
        ? templateEngine
        : templateEngine.split(",");

      return templateEngine.reduce((engines, name) => {
        const format = this.formats.get(`.${name.trim()}`);

        if (format?.engines) {
          return engines.concat(format.engines);
        }

        throw new Exception(
          "Invalid value for templateEngine",
          { path, templateEngine },
        );
      }, [] as Engine[]);
    }

    return this.formats.search(path)?.engines;
  }
}

/** An interface used by all template engines */
export interface Engine<T = string | { toString(): string }> {
  /** Delete a cached template */
  deleteCache(file: string): void;

  /** Render a template (used to render pages) */
  render(
    content: unknown,
    data?: Data,
    filename?: string,
  ): T | Promise<T>;

  /** Render a template synchronous (used to render components) */
  renderSync(
    content: unknown,
    data?: Data,
    filename?: string,
  ): T;

  /** Add a helper to the template engine */
  addHelper(
    name: string,
    fn: Helper,
    options: HelperOptions,
  ): void;
}

/** A generic helper to be used in template engines */
// deno-lint-ignore no-explicit-any
export type Helper = (...args: any[]) => any;

/** The options for a template helper */
export interface HelperOptions {
  /** The type of the helper (tag, filter, etc) */
  type: string;

  /** Whether the helper returns an instance or not */
  async?: boolean;

  /** Whether the helper has a body or not (used for tag types) */
  body?: boolean;
}
