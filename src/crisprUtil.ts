import * as PIXI from "pixi.js";

export function dist(x1: PIXI.Point, y1: PIXI.Point): number;
export function dist(x1: number, y1: number, x2: number, y2: number): number;
export function dist(
  x1: number | PIXI.Point,
  y1: number | PIXI.Point,
  x2?: number,
  y2?: number
): number {
  if (x1 instanceof PIXI.Point && y1 instanceof PIXI.Point)
    return Math.hypot(y1.x - x1.x, y1.y - x1.y);
  else if (typeof x1 === "number" && typeof y1 === "number")
    return Math.hypot(x2 - x1, y2 - y1);
  return NaN;
}

export function middle(a: PIXI.Point, b: PIXI.Point): PIXI.Point {
  return new PIXI.Point(a.x + (b.x - a.x) / 2, a.y + (b.y - a.y) / 2);
}

export function random(): number;
export function random(min: number): number;
export function random(min: number[]): number;
export function random(min: number, max: number): number;
export function random(min?: number[] | number, max?: number): number {
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

export function approximate(base: number): number;
export function approximate(base: number, shift?: number): number {
  if (typeof shift === "undefined") return random(-base, base);
  return random(base - shift, base + shift);
}

/**
 * @param displayObject
 * @param rotation in radians
 */
export function positionAlongMembrane(
  displayObject: PIXI.DisplayObject,
  rotation: number
): void {
  const radius = 1337;
  const centerY = 320 + radius;
  displayObject.position.set(
    radius * Math.cos(rotation + Math.PI / 2) + 1080 / 2,
    centerY - radius * Math.sin(rotation + Math.PI / 2)
  );
  displayObject.rotation = -rotation;
}

export function makeText(
  text: string,
  color: string | number = 0xffffff,
  size: string | number = 70
) {
  const pixiText = new PIXI.Text(text, {
    fill: color,
    fontFamily: "Cardenio Modern Bold",
    fontSize: size,
    align: "center",
  });
  pixiText.anchor.set(0.5);
  return pixiText;
}

const _debugged: string[] = [];
export function debug(name: string, ...any: any) {
  if (!_debugged.includes(name)) {
    _debugged.push(name);
    console.log(name, ...any);
  }
}