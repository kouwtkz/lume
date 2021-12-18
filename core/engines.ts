import { Exception } from "./utils.ts";
import Extensions from "./extensions.ts";

import type { Data } from "../core.ts";

export interface Options {
  /** Extra data to be passed to the engines */
  globalData: Data;
}

/**
 * Class to render the pages
 * using different template engines.
 */
export default class Engines {
  /** Template engines by extension */
  engines = new Extensions<Engine>();

  /** Extra data to be passed to the engines */
  globalData: Data;

  /** The registered helpers */
  helpers = new Map<string, [Helper, HelperOptions]>();

  constructor(options: Options) {
    this.globalData = options.globalData || {};
  }

  /** Register a new template engine */
  addEngine(extensions: string[], engine: Engine) {
    extensions.forEach((extension) => this.engines.set(extension, engine));

    for (const [name, helper] of this.helpers) {
      engine.addHelper(name, ...helper);
    }
  }

  /** Register a new helper used by the template engines */
  addHelper(name: string, fn: Helper, options: HelperOptions) {
    this.helpers.set(name, [fn, options]);

    for (const engine of this.engines.values()) {
      engine.addHelper(name, fn, options);
    }

    return this;
  }

  /** Render a template */
  async render(
    content: unknown,
    data: Data,
    filename: string,
  ): Promise<unknown> {
    const engines = this.getEngine(filename, data);

    if (engines) {
      data = { ...this.globalData, ...data };

      for (const engine of engines) {
        content = await engine.render(content, data, filename);
      }
    }

    return content;
  }

  /** Render a template synchronous */
  renderSync(content: unknown, data: Data, filename: string): unknown {
    const engines = this.getEngine(filename, data);

    if (engines) {
      data = { ...this.globalData, ...data };

      for (const engine of engines) {
        content = engine.renderSync(content, data, filename);
      }
    }

    return content;
  }

  /** Get the engines assigned to an extension or configured in the data */
  getEngine(path: string, data: Data): Engine[] | undefined {
    let { templateEngine } = data;

    if (templateEngine) {
      templateEngine = Array.isArray(templateEngine)
        ? templateEngine
        : templateEngine.split(",");

      return templateEngine.map((name) => {
        const engine = this.engines.get(`.${name.trim()}`);

        if (engine) {
          return engine;
        }

        throw new Exception(
          "Invalid value for templateEngine",
          { path, templateEngine },
        );
      });
    }

    const result = this.engines.search(path);

    if (result) {
      return [result[1]];
    }
  }
}

/** An interface used by all template engines */
export interface Engine {
  /** Render a template */
  render(
    content: unknown,
    data?: Data,
    filename?: string,
  ): unknown | Promise<unknown>;

  /** Render a template synchronous */
  renderSync(
    content: unknown,
    data?: Data,
    filename?: string,
  ): string;

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