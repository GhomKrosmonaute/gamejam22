import * as pixi from "pixi.js";
import * as geom from "booyah/src/geom";

export type NucleotideState = "cut" | "hole" | "bonus" | "none";
export const nucleotideStates: NucleotideState[] = [
  "cut",
  "hole",
  "bonus",
  "none",
];
export function getRandomNucleotideState(): NucleotideState {
  return nucleotideStates[Math.floor(Math.random() * nucleotideStates.length)];
}

export type ColorName = "blue" | "red" | "green" | "yellow";
export const colorNames: ColorName[] = ["blue", "red", "green", "yellow"];
export function getRandomColorName(): ColorName {
  return colorNames[Math.floor(Math.random() * colorNames.length)];
}

export type PartyState = "crunch" | "slide";

/** from 0 to 5, start on top */
export type NeighborIndex = 0 | 1 | 2 | 3 | 4 | 5;
export const NeighborIndexes: NeighborIndex[] = [0, 1, 2, 3, 4, 5];

export function opposedIndexOf(neighborIndex: NeighborIndex): NeighborIndex {
  let opposedNeighborIndex = neighborIndex - 3;
  if (opposedNeighborIndex < 0) opposedNeighborIndex += 6;
  return opposedNeighborIndex as NeighborIndex;
}

export function getColorByName(name: ColorName): number {
  switch (name) {
    case "blue":
      return 0x247ba0;
    case "red":
      return 0xf25f5c;
    case "yellow":
      return 0xffe066;
    case "green":
      return 0x70c1b3;
    default:
      return 0xfffff;
  }
}

export function dist(
  x1: number | pixi.Point,
  y1: number | pixi.Point,
  x2?: number,
  y2?: number
): number {
  if (x1 instanceof pixi.Point && y1 instanceof pixi.Point)
    return Math.hypot(y1.x - x1.x, y1.y - x1.y);
  else if (typeof x1 === "number" && typeof y1 === "number")
    return Math.hypot(x2 - x1, y2 - y1);
  return NaN;
}

export function hexagon(
  position: pixi.Point,
  radius: number,
  flatTopped: boolean = true
) {
  const height = Math.sqrt(3) * radius;
  return [
    new pixi.Point(position.x - radius, position.y),
    new pixi.Point(position.x - radius / 2, position.y + height / 2),
    new pixi.Point(position.x + radius / 2, position.y + height / 2),
    new pixi.Point(position.x + radius, position.y),
    new pixi.Point(position.x + radius / 2, position.y - height / 2),
    new pixi.Point(position.x - radius / 2, position.y - height / 2),
  ];
}

export function middle(a: pixi.Point, b: pixi.Point): pixi.Point {
  return new pixi.Point(a.x + (b.x - a.x) / 2, a.y + (b.y - a.y) / 2);
}

/**
 * @param a - point
 * @param b - point
 * @param s - sommet
 */
export function getIsoceleAngle(
  a: pixi.Point,
  b: pixi.Point,
  s: pixi.Point
): any {
  const m = middle(b, a);
  const bm = dist(b, m);
  const sm = dist(s, m);
  return geom.radiansToDegrees(bm / sm);
}

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

export function map(
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

export function mapFromMiddle(
  n: number,
  start: number,
  stop: number,
  extremity: number,
  middle: number,
  withinBounds: boolean = false
): number {
  const middle1 = (start + stop) / 2;
  if (n < middle1)
    return map(n, start, middle1, extremity, middle, withinBounds);
  else return map(n, middle1, stop, middle, extremity, withinBounds);
}

export function constrain(n: number, low: number, high: number): number {
  return Math.max(Math.min(n, high), low);
}
export function approximate(base: number, shift: number): number {
  return random(base - shift, base + shift);
}
