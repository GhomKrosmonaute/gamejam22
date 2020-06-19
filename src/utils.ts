import * as PIXI from "pixi.js";
import * as geom from "booyah/src/geom";

export type NucleotideState = "scissors" | "hole" | "bonus" | "none";
export const nucleotideStates: NucleotideState[] = [
  "scissors",
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

export function hexagon(
  position: PIXI.Point,
  radius: number,
  flatTopped: boolean = true
) {
  const height = Math.sqrt(3) * radius;
  return [
    new PIXI.Point(position.x - radius, position.y),
    new PIXI.Point(position.x - radius / 2, position.y + height / 2),
    new PIXI.Point(position.x + radius / 2, position.y + height / 2),
    new PIXI.Point(position.x + radius, position.y),
    new PIXI.Point(position.x + radius / 2, position.y - height / 2),
    new PIXI.Point(position.x - radius / 2, position.y - height / 2),
  ];
}

export function middle(a: PIXI.Point, b: PIXI.Point): PIXI.Point {
  return new PIXI.Point(a.x + (b.x - a.x) / 2, a.y + (b.y - a.y) / 2);
}

/**
 * @param a - point
 * @param b - point
 * @param s - sommet
 */
export function getIsoceleAngle(
  a: PIXI.Point,
  b: PIXI.Point,
  s: PIXI.Point
): any {
  const m = middle(b, a);
  const bm = dist(b, m);
  const sm = dist(s, m);
  return geom.radiansToDegrees(bm / sm);
}
