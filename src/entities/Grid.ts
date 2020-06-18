import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";
import * as game from "../game";
import Party from "../scenes/Party";
import Nucleotide from "./Nucleotide";

export default class Grid extends entity.ParallelEntity {
  public nucleotides: Nucleotide[] = [];
  public container: pixi.Container;
  public x = game.width * 0.09;
  public y = game.height * 0.47;

  constructor(
    public party: Party,
    public colCount: number,
    public rowCount: number,
    public cutCount: number,
    public nucleotideRadius: number
  ) {
    super();
  }

  _setup() {
    this.container = new pixi.Container();
    this.container.position.set(this.x, this.y);
    this.nucleotides.length = this.colCount * this.rowCount;
    for (let x = 0; x < this.colCount; x++) {
      for (let y = 0; y < this.rowCount; y++) {
        if (x % 2 === 0 && y === this.rowCount - 1) continue;
        const n = new Nucleotide(
          this.nucleotideRadius,
          this.getAbsolutePositionFromGridPosition(new pixi.Point(x, y))
        );
        this.addEntity(
          n,
          entity.extendConfig({
            container: this.container,
          })
        );
        this.nucleotides[y * this.colCount + x] = n;
      }
    }

    this.addCuts();
    this.refresh();
    this.entityConfig.container.addChild(this.container);
  }

  _update() {
    // check hovering of all nucleotides and stock hovered
    let hovered: Nucleotide;
    for (const n of this.safetyNucleotides)
      if (this.checkHovered(n)) hovered = n;

    // update path with hovered
    if (hovered && this.party.path.items.length > 0)
      this.party.path.calc(hovered);
  }

  _teardown() {
    for (const n of this.safetyNucleotides) {
      this.container.removeChild(n.graphics);
    }
    this.entityConfig.container.removeChild(this.container);
    this.nucleotides = [];
    this.container = null;
  }

  get safetyNucleotides(): Nucleotide[] {
    return this.nucleotides.filter((n) => n !== undefined);
  }

  isOnEvenCol(n: Nucleotide): boolean {
    return this.getGridPositionOf(n).x % 2 === 0;
  }

  getNucleotideFromGridPosition(gridPos: pixi.Point): Nucleotide {
    return this.nucleotides[gridPos.y * this.colCount + gridPos.x];
  }

  getGridPositionOf(n: Nucleotide): pixi.Point | null {
    const index = this.nucleotides.indexOf(n);
    if (index === -1) return null;
    const x = index % this.colCount;
    const y = Math.floor(index / this.colCount);
    return new pixi.Point(x, y);
  }

  getAbsolutePositionFromGridPosition(gridPos: pixi.Point): pixi.Point {
    const { width, height, dist } = Nucleotide.getNucleotideDimensions(
      this.nucleotideRadius
    );
    const x = width / 2 + gridPos.x * dist.x;
    const y =
      gridPos.y * height -
      height / 2 +
      (gridPos.x % 2 === 0 ? height / 2 : 0) +
      height;
    return new pixi.Point(x, y);
  }

  getHovered(): Nucleotide | null {
    return this.safetyNucleotides.find((nucleotide) => nucleotide.isHovered);
  }

  checkHovered(n: Nucleotide): boolean {
    const isHovered =
      utils.dist(
        n.position.x + this.x,
        n.position.y + this.y,
        this.party.mouse.global.x,
        this.party.mouse.global.y
      ) <
      n.radius * 0.86;
    if (n.isHovered !== isHovered) {
      n.isHovered = isHovered;
      n.refresh();
    }
    return isHovered;
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  slide(neighborIndex: number) {
    const opposedNeighborIndex = utils.opposedIndexOf(neighborIndex);
    for (const nucleotide of this.nucleotides)
      if (nucleotide.state === "hole") {
        nucleotide.generate();
        this.recursiveSwap(nucleotide, opposedNeighborIndex);
      }
    this.addCuts();
    this.party.state = "crunch";
    this.party.stateSwitch.text = "mode: crunch";
  }

  addCuts() {
    const safe = this.safetyNucleotides;
    while (safe.filter((n) => n.state === "cut").length < this.cutCount) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * safe.length);
      } while (safe[randomIndex].state === "cut");
      safe[randomIndex].state = "cut";
      safe[randomIndex].refresh();
    }
  }

  swap(n: Nucleotide, nucleotide: Nucleotide) {
    const oldPosition = n.position.clone();
    n.position.copyFrom(nucleotide.position);
    nucleotide.position.copyFrom(oldPosition);
    nucleotide.refresh();
    this.refresh();
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  recursiveSwap(n: Nucleotide, neighborIndex: number) {
    // get the opposed neighbor
    const neighbor = this.getNeighbor(n, neighborIndex);
    if (neighbor) {
      // swap places with this nucleotide
      this.swap(n, neighbor);

      // continue recursively
      this.recursiveSwap(n, neighborIndex);
    }
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  getNeighbor(n: Nucleotide, neighborIndex: number): Nucleotide | null {
    return this.nucleotides.find((nn) => {
      return this.getNeighborIndex(n, nn) === neighborIndex;
    });
  }

  /** get all neighbors of nucleotide */
  getNeighbors(n: Nucleotide): Nucleotide[] {
    const neighbors: Nucleotide[] = [];
    for (let i = 0; i < 6; i++) neighbors.push(this.getNeighbor(n, i));
    return neighbors;
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  getNeighborsInLine(n: Nucleotide, neighborIndex: number): Nucleotide[] {
    const neighbor = this.getNeighbor(n, neighborIndex);
    if (!neighbor) return [];
    return [neighbor, ...this.getNeighborsInLine(neighbor, neighborIndex)];
  }

  /** @returns {number} - -1 if is not a neighbor or the neighbor index */
  getNeighborIndex(n: Nucleotide, n2: Nucleotide): number {
    for (let i = 0; i < 6; i++) {
      if (this.getNeighborGridPosition(n, i).equals(this.getGridPositionOf(n2)))
        return i;
    }
    return -1;
  }

  /** @param {number} neighborIndex - from 0 to 5, start on top */
  getNeighborGridPosition(n: Nucleotide, neighborIndex: number): pixi.Point {
    const gridPos = this.getGridPositionOf(n);
    const evenCol = this.isOnEvenCol(n);
    switch (neighborIndex) {
      case 0:
        gridPos.y--;
        break;
      case 3:
        gridPos.y++;
        break;
      case 1:
        gridPos.x++;
        if (!evenCol) gridPos.y--;
        break;
      case 5:
        gridPos.x--;
        if (!evenCol) gridPos.y--;
        break;
      case 2:
        gridPos.x++;
        if (evenCol) gridPos.y++;
        break;
      case 4:
        gridPos.x--;
        if (evenCol) gridPos.y++;
        break;
    }
    return gridPos;
  }

  refresh() {
    for (const n of this.safetyNucleotides) n.refresh();
  }
}
