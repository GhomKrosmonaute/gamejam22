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

  slide(neighborIndex: utils.NeighborIndex) {
    const opposedNeighborIndex = utils.opposedIndexOf(neighborIndex);
    for (const nucleotide of this.safetyNucleotides)
      if (nucleotide.state === "hole") {
        nucleotide.generate();
        this.recursiveSwap(nucleotide, opposedNeighborIndex);
      }
    this.addCuts();
    this.party.state = "crunch";
    this.party.stateSwitch.text = "mode: crunch";
  }

  swap(n1: Nucleotide, n2: Nucleotide) {
    // swap grid indexes
    const index1 = this.nucleotides.indexOf(n1);
    const index2 = this.nucleotides.indexOf(n2);
    this.nucleotides[index1] = n2;
    this.nucleotides[index2] = n1;

    // swap absolute positions
    const oldPosition = n1.position.clone();
    n1.position.copyFrom(n2.position);
    n2.position.copyFrom(oldPosition);

    // refresh
    n1.refresh();
    n2.refresh();
  }

  recursiveSwap(n: Nucleotide, neighborIndex: utils.NeighborIndex) {
    // get the neighbor of n
    const nn = this.getNeighbor(n, neighborIndex);
    if (nn) {
      // swap places between neighbor and n
      this.swap(n, nn);

      // continue recursively
      this.recursiveSwap(n, neighborIndex);
    }
  }

  getNeighbor(
    n: Nucleotide,
    neighborIndex: utils.NeighborIndex
  ): Nucleotide | null {
    return this.safetyNucleotides.find((nn) => {
      return this.getNeighborIndex(n, nn) === neighborIndex;
    });
  }

  /** get all neighbors of nucleotide */
  getNeighbors(n: Nucleotide): Nucleotide[] {
    const neighbors: Nucleotide[] = [];
    for (const neighborIndex of utils.NeighborIndexes)
      neighbors.push(this.getNeighbor(n, neighborIndex));
    return neighbors;
  }

  getNeighborsInLine(
    n: Nucleotide,
    neighborIndex: utils.NeighborIndex
  ): Nucleotide[] {
    const neighbor = this.getNeighbor(n, neighborIndex);
    if (!neighbor) return [];
    return [neighbor, ...this.getNeighborsInLine(neighbor, neighborIndex)];
  }

  /** @returns {number} - -1 if is not a neighbor or the neighbor index */
  getNeighborIndex(n: Nucleotide, n2: Nucleotide): utils.NeighborIndex | -1 {
    for (const neighborIndex of utils.NeighborIndexes) {
      if (
        this.getNeighborGridPosition(n, neighborIndex).equals(
          this.getGridPositionOf(n2)
        )
      )
        return neighborIndex;
    }
    return -1;
  }

  getNeighborGridPosition(
    n: Nucleotide,
    neighborIndex: utils.NeighborIndex
  ): pixi.Point {
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
