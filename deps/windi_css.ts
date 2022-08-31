// deno-lint-ignore-file no-explicit-any
export { default as Processor } from "https://esm.sh/windicss@3.4.0";
export {
  CSSParser,
  HTMLParser,
} from "https://esm.sh/windicss@3.4.0/utils/parser";
export { StyleSheet } from "https://esm.sh/windicss@3.4.0/utils/style";

export interface Config {
  presets?: Config[];
  prefixer?: boolean;
  attributify?: boolean | {
    prefix?: string;
    separator?: string;
    disable?: string[];
  };
  separator?: string;
  important?: boolean | string;
  darkMode?: "class" | "media" | false;
  theme?: Partial<Theme>;
  variantOrder?: string[];
  plugins?: any[];
  handlers?: {
    static?: boolean;
    color?: boolean;
    opacity?: boolean;
    number?: boolean;
    string?: boolean;
    bracket?: boolean;
    time?: boolean;
    hex?: boolean;
    nxl?: boolean;
    fraction?: boolean;
    size?: boolean;
    variable?: boolean;
    negative?: boolean;
  };
  corePlugins?: string[] | Record<string, boolean>;
  prefix?: string;
  exclude?: RegExp[];
  alias?: Record<string, string>;
  shortcuts?: Record<string, any>;

  /**
   * Fallback
   */
  [key: string]: any;
}

export interface Theme {
  vars: any;
  orientation: any;
  screens: any;
  colors: any;
  spacing: any;
  animation: any;
  backdropBlur: any;
  backdropBrightness: any;
  backdropContrast: any;
  backdropGrayscale: any;
  backdropHueRotate: any;
  backdropInvert: any;
  backdropOpacity: any;
  backdropSaturate: any;
  backdropSepia: any;
  backgroundColor: any;
  backgroundImage: any;
  backgroundOpacity: any;
  backgroundPosition: any;
  backgroundSize: any;
  blur: any;
  borderColor: any;
  borderOpacity: any;
  borderRadius: any;
  borderWidth: any;
  boxShadow: any;
  boxShadowColor: any;
  brightness: any;
  caretColor: any;
  caretOpacity: any;
  container: any;
  contrast: any;
  cursor: any;
  divideColor: any;
  divideOpacity: any;
  divideWidth: any;
  dropShadow: any;
  fill: any;
  flex: any;
  flexGrow: any;
  flexShrink: any;
  fontFamily: any;
  fontSize: any;
  fontWeight: any;
  gap: any;
  gradientColorStops: any;
  grayscale: any;
  gridAutoColumns: any;
  gridAutoRows: any;
  gridColumn: any;
  gridColumnEnd: any;
  gridColumnStart: any;
  gridRow: any;
  gridRowStart: any;
  gridRowEnd: any;
  gridTemplateColumns: any;
  gridTemplateRows: any;
  height: any;
  hueRotate: any;
  inset: any;
  invert: any;
  keyframes: any;
  letterSpacing: any;
  lineHeight: any;
  listStyleType: any;
  margin: any;
  maxHeight: any;
  maxWidth: any;
  minHeight: any;
  minWidth: any;
  objectPosition: any;
  opacity: any;
  order: any;
  outline: any;
  outlineColor: any;
  perspective: any;
  perspectiveOrigin: any;
  padding: any;
  placeholderColor: any;
  placeholderOpacity: any;
  ringColor: any;
  ringOffsetColor: any;
  ringOffsetWidth: any;
  ringOpacity: any;
  ringWidth: any;
  rotate: any;
  saturate: any;
  scale: any;
  sepia: any;
  skew: any;
  space: any;
  stroke: any;
  strokeWidth: any;
  strokeDashArray: any;
  strokeDashOffset: any;
  tabSize: any;
  textColor: any;
  textOpacity: any;
  textShadow: any;
  textStrokeColor: any;
  textStrokeWidth: any;
  textDecorationColor: any;
  textDecorationOpacity: any;
  textDecorationLength: any;
  textDecorationOffset: any;
  textIndent: any;
  transformOrigin: any;
  transitionDuration: any;
  transitionDelay: any;
  transitionProperty: any;
  transitionTimingFunction: any;
  translate: any;
  width: any;
  zIndex: any;
  aspectRatio: any;
  filter: any;
  backdropFilter: any;
  lineClamp: any;
  snapMargin: any;
  snapPadding: any;
  typography: any;
  [key: string]: any;
}
