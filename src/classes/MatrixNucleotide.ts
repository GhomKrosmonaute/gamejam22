import * as pixi from "pixi.js";
import * as utils from "../utils";
import Matrix from "./Matrix";
import Nucleotide from "./Nucleotide";

export default class MatrixNucleotide extends Nucleotide {
  public state: utils.NucleotideState;
  public infected = false;

  constructor(public matrix: Matrix, matrixPosition: pixi.Point) {
    super(() => matrix.nucleotideRadius, matrixPosition);
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

  get isHovered(): boolean {
    return (
      utils.dist(
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
    this.colorName = utils.getRandomColorName();
  }

  swap(nucleotide: MatrixNucleotide) {
    const oldMatrixPosition = this.matrixPosition.clone();
    this.matrixPosition.copyFrom(nucleotide.matrixPosition);
    nucleotide.matrixPosition.copyFrom(oldMatrixPosition);
    nucleotide.render();
    this.render();
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
  getNeighbor(neighborIndex: number): MatrixNucleotide | null {
    return this.matrix.nucleotides.find((n) => {
      return this.getNeighborIndex(n) === neighborIndex;
    });
  }

  getNeighbors(): [
    MatrixNucleotide,
    MatrixNucleotide,
    MatrixNucleotide,
    MatrixNucleotide,
    MatrixNucleotide,
    MatrixNucleotide
  ] {
    const neighbors: MatrixNucleotide[] = [];
    for (let i = 0; i < 6; i++) neighbors.push(this.getNeighbor(i));
    return neighbors as [
      MatrixNucleotide,
      MatrixNucleotide,
      MatrixNucleotide,
      MatrixNucleotide,
      MatrixNucleotide,
      MatrixNucleotide
    ];
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  getNeighborsInLine(neighborIndex: number): MatrixNucleotide[] {
    const neighbor = this.getNeighbor(neighborIndex);
    if (!neighbor) return [];
    return [neighbor, ...neighbor.getNeighborsInLine(neighborIndex)];
  }

  /** @returns {number} - -1 if is not a neighbor or the neighbor index */
  getNeighborIndex(nucleotide: MatrixNucleotide): number {
    for (let i = 0; i < 6; i++) {
      if (this.getNeighborMatrixPosition(i).equals(nucleotide.matrixPosition))
        return i;
    }
    return -1;
  }

  /** @param {number} cornerIndex - from 0 to 5, start on right corner */
  getCornerPosition(cornerIndex: number): pixi.Point {
    const angle = utils.degreesToRadians(60 * cornerIndex);
    return new pixi.Point(
      this.x + this.radius * Math.cos(angle),
      this.y + this.radius * Math.sin(angle)
    );
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  getNeighborMatrixPosition(neighborIndex: number): pixi.Point {
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
    /* Mouse collision */
    const hovered = this.isHovered;

    this.graphics.clear();

    switch (this.state) {
      case "bonus":
        this.graphics.beginFill(0xff00ff);
        break;
      case "cut":
        this.graphics.beginFill(0x888888);
        break;
      case "hole":
        this.graphics.beginFill(0x333333);
        break;
      case "none":
        this.graphics.beginFill(this.color);
        break;
    }

    this.graphics
      .drawPolygon([
        new pixi.Point(-this.radius, 0),
        new pixi.Point(-this.radius / 2, this.height / 2),
        new pixi.Point(this.radius / 2, this.height / 2),
        new pixi.Point(this.radius, 0),
        new pixi.Point(this.radius / 2, -this.height / 2),
        new pixi.Point(-this.radius / 2, -this.height / 2),
      ])
      .endFill();

    this.graphics.x = this.x;
    this.graphics.y = this.y;
  }
}
