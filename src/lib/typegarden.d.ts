// Types for the Type Garden engine (typegarden.js, plain JavaScript).
export type GardenPalette = [name: string, bg: string, flower: string, stem: string, line: string, text: string, vein?: string];
export interface GardenOptions {
  palette?: number | GardenPalette;
  transparent?: boolean;
  interactive?: boolean;
  caret?: boolean;
  boil?: boolean;
  recoil?: number;
  density?: number;
  scale?: number;
  /** a fixed number of words on each line (e.g. 2), so a phrase stacks in short lines and can be larger */
  wordsPerLine?: number;
  /** with wordsPerLine: 'left' starts every line at the same left edge (default: centred) */
  align?: 'left' | 'center';
  legible?: boolean;
  maxDpr?: number;
  font?: string;
  /** several rose colours: each rose takes one */
  flowers?: string[];
}
export declare class TypeGarden {
  static PAL: GardenPalette[];
  constructor(canvas: HTMLCanvasElement, options?: GardenOptions);
  opts: Required<GardenOptions>;
  start(): void;
  stop(): void;
  destroy(): void;
  resize(): void;
  type(ch: string): void;
  backspace(): void;
  clear(): void;
  text(): string;
  setPalette(p: number | GardenPalette): void;
}
