import * as PIXI from "pixi.js";

import * as geom from "booyah/src/geom";

export const width = 1080;
export const height = 1920;
export const debug = false;

export class BetterPoint extends PIXI.Point {
  public readonly origin = new PIXI.Point();

  constructor(x?: number, y?: number) {
    super(x, y);
    this.origin.set(x, y);
  }

  get base() {
    return this.origin;
  }
}
export function dist(a: number, b: number): number;
export function dist(a: PIXI.Point, b: PIXI.Point): number;
export function dist(x1: number, y1: number, x2: number, y2: number): number;
export function dist(
  x1: number | PIXI.Point,
  y1: number | PIXI.Point,
  x2?: number,
  y2?: number
): number {
  if (x1 instanceof PIXI.Point && y1 instanceof PIXI.Point)
    return Math.hypot(y1.x - x1.x, y1.y - x1.y);
  else if (typeof x1 === "number" && typeof y1 === "number") {
    if (typeof x2 === "number" && typeof y2 === "number")
      return Math.hypot(x2 - x1, y2 - y1);
    return x1 < y1 ? y1 - x1 : x1 - y1;
  }
  return NaN;
}

export function middle(a: PIXI.Point, b: PIXI.Point): PIXI.Point {
  return new PIXI.Point(a.x + (b.x - a.x) / 2, a.y + (b.y - a.y) / 2);
}

/** random between 0 and 1 */
export function random(): number;
/** random between 0 and X */
export function random(min: number): number;
/** random pick in array */
export function random<T>(min: T[]): T;
/** random in range */
export function random(min: number, max: number): number;
/** polyvalent random util */
export function random<T>(
  min?: (number | T)[] | number,
  max?: number
): number | T {
  let rand = Math.random();
  if (typeof min === "undefined") {
    return rand;
  } else if (typeof max === "undefined") {
    if (min instanceof Array) {
      return min[Math.floor(rand * min.length)];
    } else {
      return rand * min;
    }
  } else {
    if (min > max) {
      const tmp = min as number;
      min = max;
      max = tmp;
    }
    //@ts-ignore
    return rand * (max - min) + min;
  }
}

export function proportion(
  n: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
  withinBounds: boolean = false
): number {
  const output = ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
  if (!withinBounds) return output;
  return start2 < stop2
    ? constrain(output, start2, stop2)
    : constrain(output, stop2, start2);
}

export function constrain(n: number, low: number, high: number): number {
  return Math.max(Math.min(n, high), low);
}

export function approximate(base: number, shift: number): number {
  return random(base - shift, base + shift);
}

export interface Range {
  top: number;
  middle: number;
  bottom: number;
}

/**
 * @param target
 * @param angle in degrees
 * @param radius
 * @param centerY
 */
export function positionAlongMembrane(
  target: PIXI.DisplayObject | PIXI.Point,
  angle: number,
  radius = 1337,
  centerY = 320 + radius
): void {
  const rotation = geom.degreesToRadians(angle);
  if (target instanceof PIXI.Point) {
    target.set(
      radius * Math.cos(rotation + Math.PI / 2) + 1080 / 2,
      centerY - radius * Math.sin(rotation + Math.PI / 2)
    );
  } else {
    target.position.set(
      radius * Math.cos(rotation + Math.PI / 2) + 1080 / 2,
      centerY - radius * Math.sin(rotation + Math.PI / 2)
    );
    target.rotation = -rotation;
  }
}

export function makeText(text: string, options?: Partial<PIXI.TextStyle>) {
  const defaultConfig = {
    fontFamily: "Cardenio Modern Bold",
    fontSize: 80,
    align: "center",
  };
  const pixiText = new PIXI.Text(
    text,
    options
      ? {
          ...defaultConfig,
          ...options,
        }
      : defaultConfig
  );
  pixiText.anchor.set(0.5);
  return pixiText;
}

export type Axe = "x" | "y";
export const axes: Axe[] = ["x", "y"];
export function forAxes(callback: (axe: Axe) => any) {
  axes.forEach(callback);
}
