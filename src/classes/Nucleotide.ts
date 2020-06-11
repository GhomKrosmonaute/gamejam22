import { Graphics, Point, Container } from "pixi.js";
import Matrix from "./Matrix";
import {
  ColorName,
  getRandomColorName,
  NucleotideState,
  getColorByName,
  dist,
  degreesToRadians,
} from "../utils";
import { Entity } from "booyah/src/entity";

export default class Nucleotide extends Entity {
  public state: NucleotideState;
  public colorName: ColorName;
  public graphics = new Graphics();
  public infected = false;

  constructor(public matrix: Matrix, public matrixPosition: Point) {
    super();
  }

  _setup() {
    this.generate();
    this.render();
    this.container.addChild(this.graphics);
  }

  _update() {
    if (this.matrix.party.path.items.length > 0)
      this.matrix.party.path.calc(this);
  }

  _teardown() {
    this.container.removeChild(this.graphics);
  }

  get container(): Container {
    return this.entityConfig.container;
  }

  get color(): number {
    return getColorByName(this.colorName);
  }

  get evenCol(): boolean {
    return this.matrixPosition.x % 2 === 0;
  }

  get radius(): number {
    return this.matrix.nucleotideRadius;
  }

  get width(): number {
    return 2 * this.radius;
  }

  get height(): number {
    return Math.sqrt(3) * this.radius;
  }

  get dist(): Point {
    return new Point(this.width * (3 / 4), this.height);
  }

  get x(): number {
    return this.width / 2 + this.matrixPosition.x * this.dist.x;
  }

  get y(): number {
    const height = this.height;
    return (
      this.matrixPosition.y * height -
      height / 2 +
      (this.evenCol ? height / 2 : 0) +
      height
    );
  }

  get isHovered(): boolean {
    return (
      dist(
        this.x,
        this.y,
        this.matrix.party.mouse.global.x,
        this.matrix.party.mouse.global.y
      ) <
      this.radius * 0.86
    );
  }

  generate() {
    this.state = "none";
    this.colorName = getRandomColorName();
  }

  swap(nucleotide: Nucleotide) {
    const oldMatrixPosition = this.matrixPosition.clone();
    this.matrixPosition.copyFrom(nucleotide.matrixPosition);
    nucleotide.matrixPosition.copyFrom(oldMatrixPosition);
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  recursiveSwap(neighborIndex: number) {
    // get the opposed neighbor
    const neighbor = this.getNeighbor(neighborIndex);
    if (neighbor) {
      // swap places with this nucleotide
      this.swap(neighbor);

      // continue recursively
      this.recursiveSwap(neighborIndex);
    }
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  getNeighbor(neighborIndex: number): Nucleotide | null {
    return this.matrix.nucleotides.find((n) => {
      return this.getNeighborIndex(n) === neighborIndex;
    });
  }

  getNeighbors(): [
    Nucleotide,
    Nucleotide,
    Nucleotide,
    Nucleotide,
    Nucleotide,
    Nucleotide
  ] {
    const neighbors: Nucleotide[] = [];
    for (let i = 0; i < 6; i++) neighbors.push(this.getNeighbor(i));
    return neighbors as [
      Nucleotide,
      Nucleotide,
      Nucleotide,
      Nucleotide,
      Nucleotide,
      Nucleotide
    ];
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  getNeighborsInLine(neighborIndex: number): Nucleotide[] {
    const neighbor = this.getNeighbor(neighborIndex);
    if (!neighbor) return [];
    return [neighbor, ...neighbor.getNeighborsInLine(neighborIndex)];
  }

  /** @returns {number} - -1 if is not a neighbor or the neighbor index */
  getNeighborIndex(nucleotide: Nucleotide): number {
    for (let i = 0; i < 6; i++) {
      if (this.getNeighborMatrixPosition(i).equals(nucleotide.matrixPosition))
        return i;
    }
    return -1;
  }

  /** @param {number} cornerIndex - from 0 to 5, start on right corner */
  getCornerPosition(cornerIndex: number): Point {
    const angle = degreesToRadians(60 * cornerIndex);
    return new Point(
      this.x + this.radius * Math.cos(angle),
      this.y + this.radius * Math.sin(angle)
    );
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  getNeighborMatrixPosition(neighborIndex: number): Point {
    const matrixPosition = this.matrixPosition.clone();
    switch (neighborIndex) {
      case 0:
        matrixPosition.y--;
        break;
      case 3:
        matrixPosition.y++;
        break;
      case 1:
        matrixPosition.x++;
        if (!this.evenCol) matrixPosition.y--;
        break;
      case 5:
        matrixPosition.x--;
        if (!this.evenCol) matrixPosition.y--;
        break;
      case 2:
        matrixPosition.x++;
        if (this.evenCol) matrixPosition.y++;
        break;
      case 4:
        matrixPosition.x--;
        if (this.evenCol) matrixPosition.y++;
        break;
    }
    return matrixPosition;
  }

  render() {
    if (this.state === "hole") return;

    /* Mouse collision */
    const hovered = this.isHovered;

    this.graphics
      .clear()
      .beginFill(this.color)
      .drawPolygon([
        new Point(-this.radius, 0),
        new Point(-this.radius / 2, this.height / 2),
        new Point(this.radius / 2, this.height / 2),
        new Point(this.radius, 0),
        new Point(this.radius / 2, -this.height / 2),
        new Point(-this.radius / 2, -this.height / 2),
      ]);

    if (this.state === "cut") {
      // Draw vectoriel cut
    } else {
      // Draw vectoriel nucleotide
    }

    this.graphics.endFill();
    this.graphics.x = this.x;
    this.graphics.y = this.y;
  }
}
