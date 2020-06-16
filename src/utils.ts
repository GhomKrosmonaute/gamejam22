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

export function opposedIndexOf(neighborIndex: number): number {
  let opposedNeighborIndex = neighborIndex - 3;
  if (opposedNeighborIndex < 0) opposedNeighborIndex += 6;
  return opposedNeighborIndex;
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
export function getIsocèleAngle(
  a: pixi.Point,
  b: pixi.Point,
  s: pixi.Point
): number {
  const m = middle(b, a);
  const bm = dist(b, m);
  const sm = dist(s, m);
  return geom.radiansToDegrees(bm / sm);
}
