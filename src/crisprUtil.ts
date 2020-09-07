import * as PIXI from "pixi.js";
import * as anim from "./animation";

export type NucleotideType = "scissors" | "bonus" | "normal";
export const nucleotideTypes: NucleotideType[] = [
  "scissors",
  "bonus",
  "normal",
];
export function getRandomNucleotideType(): NucleotideType {
  return nucleotideTypes[Math.floor(Math.random() * nucleotideTypes.length)];
}

// TODO: Use string enum here?
export type ColorName = "b" | "r" | "g" | "y";
export const colorNames: ColorName[] = ["b", "r", "g", "y"];
export function getRandomColorName(): ColorName {
  return colorNames[Math.floor(Math.random() * colorNames.length)];
}

export const fullColorNames: { [k in ColorName]: string } = {
  b: "blue",
  r: "red",
  g: "green",
  y: "yellow",
};

export type PartyState = "crunch" | "regenerate" | "bonus";

/** from 0 to 5, start on top */
export type NeighborIndex = 0 | 1 | 2 | 3 | 4 | 5;
export const NeighborIndexes: NeighborIndex[] = [0, 1, 2, 3, 4, 5];

export function opposedIndexOf(neighborIndex: NeighborIndex): NeighborIndex {
  let opposedNeighborIndex = neighborIndex - 3;
  if (opposedNeighborIndex < 0) opposedNeighborIndex += 6;
  return opposedNeighborIndex as NeighborIndex;
}

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

export function mapProportion(
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

export function positionAlongMembrane(
  displayObject: PIXI.DisplayObject,
  angle: number
): void {
  const radius = 1337;
  const centerY = 320 + radius;
  displayObject.position.set(
    radius * Math.cos(angle + Math.PI / 2) + 1080 / 2,
    centerY - radius * Math.sin(angle + Math.PI / 2)
  );
  displayObject.rotation = -angle;
}

export function makeText(
  text: string,
  color?: string | number,
  size: number = 70
) {
  return new PIXI.Text(text, {
    fill: color ?? 0xffffff,
    fontFamily: "Cardenio Modern Bold",
    fontSize: size + "px",
  });
}
