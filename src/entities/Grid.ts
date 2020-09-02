import * as PIXI from "pixi.js";
import * as _ from "underscore";
import * as entity from "booyah/src/entity";
import * as crisprUtil from "../crisprUtil";
import * as game from "../game";
import Level from "../scenes/Level";
import Nucleotide from "./Nucleotide";

/** Represent the game nucleotides grid
 *
 * Emits
 *  - pointerup()
 *
 */
export default class Grid extends entity.CompositeEntity {
  public container: PIXI.Container;
  public nucleotides: Nucleotide[] = [];
  public nucleotideContainer: PIXI.Container;
  public x = game.width * 0.09;
  public y = game.height * 0.4;

  private _isPointerDown: boolean;
  private _lastPointerPos: PIXI.Point;

  constructor(
    public colCount: number,
    public rowCount: number,
    public cutCount: number,
    public nucleotideRadius: number
  ) {
    super();
  }

  _setup() {
    this._isPointerDown = false;

    this.container = new PIXI.Container();
    this.container.interactive = true;
    // Keep track of last pointer position
    this._on(this.container, "pointerdown", this._onPointerDown);
    this._on(this.container, "pointerup", this._onPointerUp);
    this._on(
      this.container,
      "pointermove",
      (e: PIXI.InteractionEvent) => (this._lastPointerPos = e.data.global)
    );
    this._entityConfig.container.addChild(this.container);

    // Add background to get pointer events
    {
      const bg = new PIXI.Graphics();
      bg.beginFill(0, 0);
      bg.drawRect(
        0,
        0,
        this._entityConfig.app.view.width,
        this._entityConfig.app.view.height
      );
      bg.endFill();
      this.container.addChild(bg);
    }

    this.nucleotideContainer = new PIXI.Container();
    this.nucleotideContainer.position.set(this.x, this.y);
    this.container.addChild(this.nucleotideContainer);

    this.nucleotides.length = this.colCount * this.rowCount;
    for (let x = 0; x < this.colCount; x++) {
      for (let y = 0; y < this.rowCount; y++) {
        if (x % 2 === 0 && y === this.rowCount - 1) continue;
        const n = new Nucleotide(
          this.nucleotideRadius,
          this.getAbsolutePositionFromGridPosition(new PIXI.Point(x, y))
        );
        n.setFloating("y", 0.001, 0.018);
        n.setFloating("x", 0.0007, 0.018);
        this.generateNucleotide(n);
        this._activateChildEntity(
          n,
          entity.extendConfig({
            container: this.nucleotideContainer,
          })
        );
        this.nucleotides[y * this.colCount + x] = n;
      }
    }

    this.addScissors(this.safetyNucleotides);

    this.safetyNucleotides.forEach((n) => (n.state = "present"));
  }

  _update() {
    if (!this._isPointerDown) return;

    const hovered: Nucleotide = this.safetyNucleotides.find((n) =>
      this.checkHovered(n)
    );
    if (!hovered) return;

    // update path with hovered
    this._entityConfig.level.path.add(hovered);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
    this.container = null;

    this.nucleotides = [];
  }

  private _onPointerDown(e: PIXI.InteractionEvent) {
    this._isPointerDown = true;

    const hovered: Nucleotide = this.safetyNucleotides.find((n) =>
      this.checkHovered(n)
    );
    if (!hovered) return;

    const focused = this._entityConfig.level.inventory.focused;

    if (!focused)
      // update path with hovered
      this._entityConfig.level.path.startAt(hovered);
    // use bonus
    else focused.use(hovered);
  }

  private _onPointerUp(): void {
    this._isPointerDown = false;

    this.emit("pointerup");
  }

  get safetyNucleotides(): Nucleotide[] {
    return this.nucleotides.filter((n) => n !== undefined);
  }

  /** Does nothing in "long" mode **/
  addScissors(among: Nucleotide[]) {
    if (this._entityConfig.level.levelVariant === "long") return;

    const safe = this.safetyNucleotides;
    while (safe.filter((n) => n.type === "scissors").length < this.cutCount) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * among.length);
      } while (among[randomIndex].type === "scissors");
      among[randomIndex].type = "scissors";
      among[randomIndex].shield = false;
    }
  }

  isOnEvenCol(n: Nucleotide): boolean {
    return this.getGridPositionOf(n).x % 2 === 0;
  }

  getNucleotideFromGridPosition(gridPos: PIXI.Point): Nucleotide | null {
    return this.nucleotides[gridPos.y * this.colCount + gridPos.x];
  }

  getGridPositionOf(n: Nucleotide): PIXI.Point | null {
    const index = this.nucleotides.indexOf(n);
    if (index === -1) return null;
    const x = index % this.colCount;
    const y = Math.floor(index / this.colCount);
    return new PIXI.Point(x, y);
  }

  getAbsolutePositionFromGridPosition(gridPos: PIXI.Point): PIXI.Point {
    const { width, height, dist } = Nucleotide.getNucleotideDimensionsByRadius(
      this.nucleotideRadius
    );
    const x = width / 2 + gridPos.x * dist.x;
    const y =
      gridPos.y * height -
      height / 2 +
      (gridPos.x % 2 === 0 ? height / 2 : 0) +
      height;
    return new PIXI.Point(x, y);
  }

  getHovered(): Nucleotide | null {
    return this.safetyNucleotides.find((nucleotide) =>
      this.checkHovered(nucleotide)
    );
  }

  checkHovered(n: Nucleotide): boolean {
    return (
      crisprUtil.dist(
        n.position.x + this.x,
        n.position.y + this.y,
        this._lastPointerPos.x,
        this._lastPointerPos.y
      ) <
      n.radius * 0.86
    );
  }

  slide(neighborIndex: crisprUtil.NeighborIndex) {
    const opposedNeighborIndex = crisprUtil.opposedIndexOf(neighborIndex);
    const oldHoles = this.safetyNucleotides.filter(
      (n) => n.state === "missing"
    );
    for (const nucleotide of this.safetyNucleotides) {
      if (nucleotide.state === "missing") {
        this.generateNucleotide(nucleotide);
        this.recursiveSwap(nucleotide, opposedNeighborIndex);
      }
    }

    this.addScissors(oldHoles);
    // this.refresh();
  }

  fillHoles(): Nucleotide[] {
    const holes = this.safetyNucleotides.filter((n) => n.state === "missing");
    for (const nucleotide of holes) {
      this.generateNucleotide(nucleotide);
    }
    this.addScissors(holes);

    holes.forEach((n) => (n.state = "present"));

    return holes;
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
  }

  recursiveSwap(n: Nucleotide, neighborIndex: crisprUtil.NeighborIndex) {
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
    neighborIndex: crisprUtil.NeighborIndex
  ): Nucleotide | null {
    return this.safetyNucleotides.find((nn) => {
      return this.getNeighborIndex(n, nn) === neighborIndex;
    });
  }

  /** get all neighbors of nucleotide */
  getNeighbors(n: Nucleotide): Nucleotide[] {
    const neighbors: Nucleotide[] = [];
    for (const neighborIndex of crisprUtil.NeighborIndexes)
      neighbors.push(this.getNeighbor(n, neighborIndex));
    return neighbors;
  }

  getNeighborsInLine(
    n: Nucleotide,
    neighborIndex: crisprUtil.NeighborIndex
  ): Nucleotide[] {
    const neighbor = this.getNeighbor(n, neighborIndex);
    if (!neighbor) return [];
    return [neighbor, ...this.getNeighborsInLine(neighbor, neighborIndex)];
  }

  getStar(n: Nucleotide): Nucleotide[][] {
    return this.getNeighbors(n).map(this.getNeighborsInLine)
  }

  /** @returns {number} - -1 if is not a neighbor or the neighbor index */
  getNeighborIndex(
    n: Nucleotide,
    n2: Nucleotide
  ): crisprUtil.NeighborIndex | -1 {
    if (!n || !n2) return -1;
    for (const neighborIndex of crisprUtil.NeighborIndexes) {
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
    neighborIndex: crisprUtil.NeighborIndex
  ): PIXI.Point {
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

  containsHoles(): boolean {
    return this.safetyNucleotides.some((n) => n.state === "missing");
  }

  /**
   * Regenerate a certain number of nucleotides
   */
  regenerate(n: number, filter: (n: Nucleotide) => boolean): void {
    // Pick a certain number of non-infected nucleotides
    // @ts-ignore
    const nucleotides: Nucleotide[] = _.chain(this.safetyNucleotides)
      // @ts-ignore
      .filter(filter)
      .shuffle()
      .take(n)
      .value();

    // Make them disappear
    nucleotides.forEach((n) => {
      n.state = "missing";
      this.generateNucleotide(n);
    });

    this.addScissors(nucleotides);

    nucleotides.forEach((n) => (n.state = "present"));
  }

  generateNucleotide(nucleotide: Nucleotide) {
    nucleotide.type = "normal";
    nucleotide.colorName = crisprUtil.getRandomColorName();
  }

  isGameOver(): boolean {
    return !this.safetyNucleotides.some(
      (n) => n.state === "present" && n.type === "normal"
    );
  }

  /**
   * Returns an entity sequence that gradually infects each of the nucleotides
   * @param count
   */
  infect(count: number): entity.EntitySequence {
    // @ts-ignore
    const infections: Nucleotide[] = _.chain(this.safetyNucleotides)
      .filter((n) => n.state === "present" && n.type === "normal" && !n.shield)
      .shuffle()
      .take(count)
      .value();

    // Stagger infections after the other
    const sequence: entity.Entity[] = [];
    for (let i = 0; i < infections.length; i++) {
      sequence.push(
        new entity.FunctionCallEntity(() => (infections[i].state = "infected"))
      );
      sequence.push(new entity.WaitingEntity(1000));
    }

    return new entity.EntitySequence(sequence);
  }
}
