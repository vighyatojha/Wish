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
  legible?: boolean;
  maxDpr?: number;
  font?: string;
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
