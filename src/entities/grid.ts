import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as crisprUtil from "../crisprUtil";

import * as nucleotide from "./nucleotide";

import * as level from "../scenes/level";

/** from 0 to 5, start on top */
export type NeighborIndex = 0 | 1 | 2 | 3 | 4 | 5;
export const NeighborIndexes: NeighborIndex[] = [0, 1, 2, 3, 4, 5];

export function opposedIndexOf(neighborIndex: NeighborIndex): NeighborIndex {
  let opposedNeighborIndex = neighborIndex - 3;
  if (opposedNeighborIndex < 0) opposedNeighborIndex += 6;
  return opposedNeighborIndex as NeighborIndex;
}

export type GridPreset<T = true> = ((T | null)[] | null)[];

export type GridShape =
  | "mini"
  | "medium"
  | "full"
  | GridPreset<nucleotide.ColorName>
  | ((x: number, y: number) => boolean);

/** Represent the game nucleotides grid
 *
 * Emits
 *  - pointerup()
 *
 */
export class Grid extends entity.CompositeEntity {
  public container: PIXI.Container;
  public allNucleotides: nucleotide.Nucleotide[] = [];
  public nucleotideContainer: PIXI.Container;
  public x = crisprUtil.width * 0.09;
  public y = crisprUtil.height * 0.4;
  public isPointerDown = false;
  public cursor = new PIXI.Point();
  public lastHovered: nucleotide.Nucleotide | null;

  constructor(
    public colCount: number,
    public rowCount: number,
    public scissorCount: number,
    public nucleotideRadius: number,
    public shape: GridShape,
    public presetScissors?: GridPreset
  ) {
    super();
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  _setup() {
    this.container = new PIXI.Container();
    this.container.interactive = true;

    // Keep track of last pointer position
    this._on(this.container, "pointerup", this._onPointerUp);
    this._on(this.container, "pointerdown", this._onPointerDown);
    this._on(this.container, "pointermove", this._onPointerMove);

    if (crisprUtil.debug) {
      this.on("drag", (n: nucleotide.Nucleotide) => {
        console.log(this.getGridPositionOf(n));
      });
    }

    this._entityConfig.container.addChild(this.container);

    this.nucleotideContainer = new PIXI.Container();
    this.nucleotideContainer.position.set(this.x, this.y);
    this.container.addChild(this.nucleotideContainer);

    this.allNucleotides.length = this.colCount * this.rowCount;

    const addNucleotide = (
      x: number,
      y: number,
      color?: nucleotide.ColorName
    ) => {
      const n = new nucleotide.Nucleotide(
        this.nucleotideRadius,
        "grid",
        this.getAbsolutePositionFromGridPosition(new PIXI.Point(x, y)),
        0,
        color
      );
      n.floating.active.x = true;
      n.floating.active.y = true;
      n.floating.speed.set(1.4, 2);
      n.floating.amplitude.set(0.3, 0.3);
      n.type = "normal";
      this._activateChildEntity(
        n,
        entity.extendConfig({
          container: this.nucleotideContainer,
        })
      );
      this.allNucleotides[y * this.colCount + x] = n;
    };

    if (Array.isArray(this.shape)) {
      this.shape.forEach((row, y) => {
        if (row)
          row.forEach((col, x) => {
            if (col) addNucleotide(x, y, col);
          });
      });
    } else {
      for (let x = 0; x < this.colCount; x++) {
        for (let y = 0; y < this.rowCount; y++) {
          if (x % 2 === 0 && y === this.rowCount - 1) continue;
          if (
            this.shape === "mini" &&
            (x < 2 || x > 4 || y < 2 || y > 4 || (y > 3 && x % 2 === 0))
          )
            continue;
          if (
            this.shape === "medium" &&
            (x < 1 ||
              x > 5 ||
              y < 1 ||
              y > 5 ||
              (x === 1 && y === 1) ||
              (x === 5 && y === 1) ||
              (x !== 3 && x > 0 && x < 6 && y === 5))
          )
            continue;

          if (typeof this.shape === "function" && !this.shape(x, y)) continue;

          addNucleotide(x, y);
        }
      }
    }

    if (this.presetScissors) {
      this.presetScissors.forEach((row, y) => {
        if (row)
          row.forEach((col, x) => {
            if (col) {
              const n = this.getNucleotideFromGridPosition(
                new PIXI.Point(x, y)
              );
              n.type = "scissors";
            }
          });
      });
    }

    this.addScissors(this.nucleotides);

    this.nucleotides.forEach((n) => (n.state = "present"));
  }

  _update() {
    if (!this.isPointerDown) return;

    const currentHovered = this.getHovered();
    if (currentHovered && currentHovered !== this.lastHovered) {
      this.lastHovered = currentHovered;
      this.level.path.add(this.lastHovered);
    }
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
    this.container = null;

    this.allNucleotides = [];
  }

  private _onPointerDown(e: PIXI.InteractionEvent) {
    this.isPointerDown = true;
    this.updateCursor(e);

    let hovered: nucleotide.Nucleotide;

    const bonus = this.level.options.disableBonuses
      ? null
      : this.level.bonusesManager.getSelectedBonus();

    if (!bonus || bonus.name === "time") {
      hovered = this.getHovered();
      if (!hovered) return;

      // update path with hovered
      const updated = this.level.path.startAt(hovered);
      if (updated) this.level.path.emit("updated");
    } else {
      hovered = this.getHovered();
      if (!hovered) return;
    }

    this.emit("drag", hovered);
  }

  private _onPointerUp(e: PIXI.InteractionEvent): void {
    this.isPointerDown = false;
    this.updateCursor(e);

    this.emit("pointerup");
    this.emit("drop");
  }

  private _onPointerMove(e: PIXI.InteractionEvent): void {
    this.updateCursor(e);
  }

  private updateCursor(e: PIXI.InteractionEvent) {
    this.cursor.copyFrom(e.data.global);
  }

  get nucleotides(): nucleotide.Nucleotide[] {
    return this.allNucleotides.filter((n) => n !== undefined);
  }

  /** Does nothing in "long" mode **/
  addScissors(among: nucleotide.Nucleotide[]) {
    if (this.level.options.variant === "long") return;

    const safe = this.nucleotides;
    if (safe.length === 0) return;

    while (
      safe.filter((n) => n.type === "scissors").length < this.scissorCount
    ) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * among.length);
      } while (among[randomIndex].type === "scissors");
      among[randomIndex].type = "scissors";
    }
  }

  isOnEvenCol(n: nucleotide.Nucleotide): boolean {
    const position = this.getGridPositionOf(n);
    if (!position) return null;
    return position.x % 2 === 0;
  }

  getRandomPath(length: number): nucleotide.ColorName[] | null {
    const alreadyPassed: nucleotide.Nucleotide[] = [];
    const colorNames: nucleotide.ColorName[] = [];

    const normals = this.nucleotides.filter((n) => n.type === "normal");

    if (normals.length < length) {
      return null;
    }

    let current = crisprUtil.random(normals);

    while (colorNames.length < length) {
      alreadyPassed.push(current);
      if (current.type === "normal") {
        colorNames.push(current.colorName);
      }

      const neighbors = this.getNeighbors(current).filter((n) => {
        return !!n && !alreadyPassed.includes(n);
      });

      if (neighbors.length === 0) {
        return null;
      }

      current = crisprUtil.random(neighbors);
    }

    if (
      this.level.options.scissorCount > 0 &&
      !alreadyPassed.some((n) => n.type === "scissors")
    ) {
      return null;
    }

    return colorNames;
  }

  getNucleotideFromGridPosition(
    gridPos: PIXI.Point
  ): nucleotide.Nucleotide | null {
    return this.allNucleotides[gridPos.y * this.colCount + gridPos.x];
  }

  getGridPositionOf(n: nucleotide.Nucleotide): PIXI.Point | null {
    const index = this.allNucleotides.indexOf(n);
    if (index === -1) return null;
    const x = index % this.colCount;
    const y = Math.floor(index / this.colCount);
    return new PIXI.Point(x, y);
  }

  setAbsolutePositionFromGridPosition(n: nucleotide.Nucleotide) {
    n.position.copyFrom(
      this.getAbsolutePositionFromGridPosition(this.getGridPositionOf(n))
    );
  }

  // getGridPositionFromAbsolutePosition(pos: PIXI.Point): PIXI.Point {
  //   const { width, height, dist } = nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
  //     this.nucleotideRadius
  //   );
  //   const x = Math.floor((width / 2 + pos.x) / dist.x )
  //   const y = (x % 2 === 0)
  //     ? Math.floor( (pos.y / height) + height / 2 )
  //     : Math.floor(pos.y / height)
  //   return new PIXI.Point(x, y);
  // }

  getAbsolutePositionFromGridPosition(gridPos: PIXI.Point): PIXI.Point {
    const {
      width,
      height,
      dist,
    } = nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
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

  getHovered(radiusRatio: number = 1): nucleotide.Nucleotide | null {
    return this.nucleotides
      .filter((n) => this.checkHovered(n, radiusRatio) !== false)
      .sort((a, b) => {
        return (
          (this.checkHovered(a, radiusRatio) as number) -
          (this.checkHovered(b, radiusRatio) as number)
        );
      })[0];
  }

  getAllHovered(radiusRatio: number = 1): nucleotide.Nucleotide[] {
    return this.nucleotides.filter(
      (nucleotide) => this.checkHovered(nucleotide, radiusRatio) !== false
    );
  }

  checkHovered(
    n: nucleotide.Nucleotide,
    radiusRatio: number = 1
  ): false | number {
    if (!this.cursor) return false;
    const dist = crisprUtil.dist(
      n.position.x + this.x,
      n.position.y + this.y,
      this.cursor.x,
      this.cursor.y
    );
    if (dist < n.radius * radiusRatio) return dist;
    return false;
  }

  slide(neighborIndex: NeighborIndex) {
    const opposedNeighborIndex = opposedIndexOf(neighborIndex);
    const oldHoles = this.nucleotides.filter((n) => n.state === "missing");
    for (const nucleotide of this.nucleotides) {
      if (nucleotide.state === "missing") {
        this.generateNucleotide(nucleotide);
        this.recursiveSwap(nucleotide, opposedNeighborIndex);
      }
    }

    this.addScissors(oldHoles);
    // this.refresh();
  }

  pointTo(n: nucleotide.Nucleotide, index: NeighborIndex | -1) {
    if (index !== -1) {
      n.pathArrow.angle = index * (360 / 6);
      n.pathArrow.visible = true;
      n.pathArrow.play();
      n.level.path.container.addChildAt(n.pathArrow, 0);
    } else {
      n.pathArrow.visible = false;
      n.pathArrow.stop();
      n.level.path.container.removeChild(n.pathArrow);
    }
  }

  fillHoles(): nucleotide.Nucleotide[] {
    const holes = this.nucleotides.filter((n) => n.state === "missing");
    for (const nucleotide of holes) {
      this.generateNucleotide(nucleotide);
    }
    this.addScissors(holes);

    holes.forEach((n) => (n.state = "present"));

    return holes;
  }

  swap(
    n1: nucleotide.Nucleotide,
    n2: nucleotide.Nucleotide,
    swapAbsoluteToo = true
  ) {
    // swap grid indexes
    const index1 = this.allNucleotides.indexOf(n1);
    const index2 = this.allNucleotides.indexOf(n2);
    this.allNucleotides[index1] = n2;
    this.allNucleotides[index2] = n1;

    if (swapAbsoluteToo) this.swapAbsolutePosition(n1, n2);
  }

  swapAbsolutePosition(n1: nucleotide.Nucleotide, n2: nucleotide.Nucleotide) {
    const tempN1Pos = n1.position.clone();
    n1.position.copyFrom(n2.position);
    n2.position.copyFrom(tempN1Pos);
  }

  // fixAbsolutePosition(n: nucleotide.Nucleotide){
  //   n.position.copyFrom(
  //     this.getAbsolutePositionFromGridPosition(
  //       this.getGridPositionFromAbsolutePosition(n.position)
  //     )
  //   )
  // }

  recursiveSwap(n: nucleotide.Nucleotide, neighborIndex: NeighborIndex) {
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
    n: nucleotide.Nucleotide,
    neighborIndex: NeighborIndex
  ): nucleotide.Nucleotide | null {
    return this.nucleotides.find((nn) => {
      return this.getNeighborIndex(n, nn) === neighborIndex;
    });
  }

  /** get all neighbors of nucleotide */
  getNeighbors(n: nucleotide.Nucleotide): nucleotide.Nucleotide[] {
    const neighbors: nucleotide.Nucleotide[] = [];
    for (const neighborIndex of NeighborIndexes)
      neighbors.push(this.getNeighbor(n, neighborIndex));
    return neighbors;
  }

  getNeighborsInLine(
    n: nucleotide.Nucleotide,
    neighborIndex: NeighborIndex
  ): nucleotide.Nucleotide[] {
    const neighbor = this.getNeighbor(n, neighborIndex);
    if (!neighbor) return [];
    return [neighbor, ...this.getNeighborsInLine(neighbor, neighborIndex)];
  }

  getStarBranches(n: nucleotide.Nucleotide): nucleotide.Nucleotide[][] {
    const branches: nucleotide.Nucleotide[][] = [];
    for (let i = 0; i < 6; i++) {
      branches.push(this.getNeighborsInLine(n, i as NeighborIndex));
    }
    return branches;
  }

  getStarStages(n: nucleotide.Nucleotide): nucleotide.Nucleotide[][] {
    const stages: nucleotide.Nucleotide[][] = [];
    const branches = this.getStarBranches(n);
    let index = 0;
    while (branches.some((b, i) => b.length > stages.length)) {
      stages.push([...branches.map((b) => b[index]).filter((n) => n)]);
      index++;
    }
    return stages;
  }

  /** @returns {number} - -1 if is not a neighbor or the neighbor index */
  getNeighborIndex(
    n: nucleotide.Nucleotide,
    n2: nucleotide.Nucleotide
  ): NeighborIndex | -1 {
    if (!n || !n2) return -1;
    for (const neighborIndex of NeighborIndexes) {
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
    n: nucleotide.Nucleotide,
    neighborIndex: NeighborIndex
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
    return this.nucleotides.some((n) => n.state === "missing");
  }

  /**
   * Regenerate a certain number of nucleotides
   */
  regenerate(n: number, filter: (n: nucleotide.Nucleotide) => boolean): void {
    // Pick a certain number of non-infected nucleotides
    // @ts-ignore
    const nucleotides: nucleotide.Nucleotide[] = _.chain(this.nucleotides)
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

  generateNucleotide(nucleotide: nucleotide.Nucleotide) {
    nucleotide.type = "normal";
    nucleotide.generateColor();
  }

  isGameOver(): boolean {
    return !this.nucleotides.some(
      (n) => n.state === "present" && n.type === "normal"
    );
  }

  /**
   * Returns an entity sequence that gradually infects each of the nucleotides
   * @param count
   */
  infect(count: number): entity.EntitySequence {
    // @ts-ignore
    const infections: nucleotide.Nucleotide[] = _.chain(this.nucleotides)
      .filter((n) => n.state === "present" && n.type === "normal")
      .shuffle()
      .take(count)
      .value();

    // Stagger infections after the other
    const sequence: entity.Entity[] = [
      new entity.FunctionCallEntity(() => {
        this.level.disablingAnimations.add("grid.infect");
      }),
    ];
    for (let i = 0; i < infections.length; i++) {
      sequence.push(
        new entity.FunctionCallEntity(() => {
          infections[i].state = "infected";
        })
      );
      sequence.push(new entity.WaitingEntity(100));
      this.level.wasInfected = true;
      this.level.emit("infected");
    }

    sequence.push(
      new entity.FunctionCallEntity(() => {
        this.level.disablingAnimations.delete("grid.infect");
      })
    );

    return new entity.EntitySequence(sequence);
  }
}
