import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as crispr from "../crispr";
import * as anim from "../animations";

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

export const colCount = 7;
export const rowCount = 7;

export type GridPreset<T = true> = ((T | null)[] | null)[];

export type GridArrowShape = (x: number, y: number) => boolean;

export interface GridShapeOptions {
  portals?: PIXI.IPointData[] | number;
  clips?: PIXI.IPointData[] | number;
  shape: GridPreset<nucleotide.ColorName> | GridArrowShape;
}

export const gridShapes: Record<string, GridArrowShape | GridShapeOptions> = {
  mini: (x: number, y: number) =>
    x < 2 || x > 4 || y < 2 || y > 4 || (y > 3 && x % 2 === 0),
  medium: (x: number, y: number) =>
    x < 1 ||
    x > 5 ||
    y < 1 ||
    y > 5 ||
    (x === 1 && y === 1) ||
    (x === 5 && y === 1) ||
    (x !== 3 && x > 0 && x < 6 && y === 5),
  fourIslands: {
    portals: [
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      { x: 1, y: 5 },
      { x: 5, y: 5 },
    ],
    shape: (x: number, y: number) =>
      (x > 2 || y < 4 || y > 6) &&
      (x < 4 || y < 4 || y > 6) &&
      (x > 2 || y > 2 || (y === 2 && (x === 0 || x === 2))) &&
      (x < 4 || y > 2 || (y === 2 && (x === 4 || x === 6))),
  },
  littleBridge: (x: number, y: number) =>
    (x > 2 || y < 1 || y > 5 || (y === 5 && (x === 0 || x === 2))) &&
    (x !== 3 || y !== 3) &&
    (x < 4 || y < 1 || y > 5 || (y === 5 && (x === 4 || x === 6))),
  bowTie: (x: number, y: number) =>
    y < 1 ||
    y > 4 ||
    (y === 4 && x > 1 && x < 5) ||
    (y === 1 && x > 0 && x < 6) ||
    (x === 3 && y === 2),
  hole: (x: number, y: number) =>
    (x > 1 && x < 5 && y > 1 && y < 5 && !(y === 4 && (x === 2 || x === 4))) ||
    (y === 0 && (x < 2 || x > 4)) ||
    (y > 4 && (x > 4 || x < 2) && !((x === 1 || x === 5) && y === 5)),
  hive: (x: number, y: number) => x % 2 !== 0 && y % 2 === 0,
};

export type GridShape =
  | "full"
  | GridPreset<nucleotide.ColorName>
  | GridArrowShape
  | GridShapeOptions;

/** Represent the game nucleotides grid
 *
 * Emits
 *  - pointerup()
 *
 */
export class Grid extends entity.CompositeEntity {
  public container: PIXI.Graphics;
  public allNucleotides: nucleotide.Nucleotide[] = [];
  public solution: nucleotide.Nucleotide[] = [];
  public nucleotideContainer: PIXI.Container;
  public x = crispr.width * 0.09;
  public y = crispr.height * 0.4;
  public isPointerDown = false;
  public cursor = new PIXI.Point();
  public lastHovered: nucleotide.Nucleotide | null;

  get level(): level.Level {
    return this._entityConfig.level;
  }

  _setup() {
    this.container = new PIXI.Graphics();
    this.container
      .beginFill(0x000000, 0.001)
      .drawRect(0, 0, crispr.width, crispr.height)
      .endFill();
    this.container.interactive = true;

    // Keep track of last pointer position
    this._on(this.container, "pointerup", this._onPointerUp);
    this._on(this.container, "pointerdown", this._onPointerDown);
    this._on(this.container, "pointermove", this._onPointerMove);

    if (crispr.debug) {
      this._on(this, "drag", (n: nucleotide.Nucleotide) => {
        console.log(this.getGridPositionOf(n));
      });
    }

    this._entityConfig.container.addChild(this.container);

    this.nucleotideContainer = new PIXI.Container();
    this.nucleotideContainer.position.set(this.x, this.y);
    this.container.addChild(this.nucleotideContainer);

    this.generateShape();

    this._on(this, "pointerup", () => {
      if (this.level.options.variant !== "zen") {
        const crunch = this.level.attemptCrunch();
        if (crunch) this._activateChildEntity(crunch);
      }
    });
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

  get shape(): (nucleotide.ColorName | "s")[][] {
    const shape: (nucleotide.ColorName | "s")[][] = [];
    for (let y = 0; y < colCount; y++) {
      shape.push([]);
      for (let x = 0; x < rowCount; x++) {
        const n = this.getNucleotideFromGridPosition(new PIXI.Point(x, y));
        if (n) {
          if (n.type === "normal") {
            shape[y][x] = n.colorName;
          } else {
            shape[y][x] = "s";
          }
        }
      }
    }
    return shape;
  }

  applySolution(): entity.EntityBase {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.level.path.remove();
      }),
      anim.sequenced({
        items: this.solution,
        timeBetween: 100,
        waitForAllSteps: true,
        onStep: (n, i) => {
          if (i === 0) this.level.path.startAt(n);
          else this.level.path.add(n);
        },
        callback: () => {
          this.level.activate(this.level.attemptCrunch());
        },
      }),
    ]);
  }

  addNucleotide(x: number, y: number, color?: nucleotide.ColorName) {
    const n = new nucleotide.Nucleotide(
      this.level.options.nucleotideRadius,
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
    this.allNucleotides[y * colCount + x] = n;
  }

  generateShape() {
    this.allNucleotides.length = colCount * rowCount;

    // colors and shape
    const shape = this.level.options.gridShape;
    if (Array.isArray(shape)) {
      // preset grid colors and shape
      shape.forEach((row, y) => {
        if (row)
          row.forEach((col, x) => {
            if (col) this.addNucleotide(x, y, col);
          });
      });
    } else {
      // preset shape
      for (let x = 0; x < colCount; x++) {
        for (let y = 0; y < rowCount; y++) {
          if (x % 2 === 0 && y === rowCount - 1) continue;

          if (shape !== "full") {
            if (typeof shape === "string") {
              const resolvedShape = gridShapes[shape];
              if (typeof resolvedShape === "function") {
                if (resolvedShape(x, y)) continue;
              } else {
                const sub = resolvedShape.shape;
                if (typeof sub === "function") {
                  if (sub(x, y)) continue;
                } else {
                  sub.forEach((row, y) => {
                    if (row)
                      row.forEach((col, x) => {
                        if (col) this.addNucleotide(x, y, col);
                      });
                  });
                }
              }
            } else if (typeof shape === "function") {
              if (shape(x, y)) continue;
            }
          }

          this.addNucleotide(x, y);
        }
      }
    }

    // preset scissors
    if (this.level.options.presetClips) {
      this.level.options.presetClips.forEach((row, y) => {
        if (row)
          row.forEach((col, x) => {
            if (col) {
              const n = this.getNucleotideFromGridPosition(
                new PIXI.Point(x, y)
              );
              n.type = "clip";
            }
          });
      });
    }

    // finalize
    this.addSpecifics(
      this.nucleotides,
      this.level.options.portalsCount,
      "portal"
    );
    (() =>
      this.addSpecifics(
        this.nucleotides,
        this.level.options.clipCount,
        "clip"
      ))();
    this.nucleotides.forEach((n) => (n.state = "present"));
  }

  reset() {
    this.nucleotides.forEach((n) => {
      this._deactivateChildEntity(n);
    });

    this.allNucleotides = [];

    this.generateShape();

    if (crispr.debug) {
      console.log("--> DONE", "grid.reset()");
    }
  }

  private _onPointerDown(e: PIXI.InteractionEvent) {
    this.isPointerDown = true;
    this.updateCursor(e);

    let hovered: nucleotide.Nucleotide;

    const bonus = this.level.options.disableBonuses
      ? null
      : this.level.bonusesManager?.selected;

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

  addSpecifics(
    among: nucleotide.Nucleotide[],
    count: number,
    type: nucleotide.NucleotideType
  ) {
    let countOption: number = null;

    const shape = this.level.options.gridShape;

    if (typeof shape === "string") {
      if (shape in gridShapes) {
        const resolvableOptions = gridShapes[shape];

        if (typeof resolvableOptions !== "function") {
          const val = resolvableOptions[(type + "s") as "portals" | "clips"];

          if (val !== undefined) {
            if (typeof val === "number") {
              countOption = val;
            } else {
              return val.forEach(({ x, y }) => {
                const n = this.getNucleotideFromGridPosition(
                  new PIXI.Point(x, y)
                );
                if (n) n.type = type;
              });
            }
          }
        }
      }
    }

    const safe = this.nucleotides;
    if (safe.length === 0) return;

    const normals = among.filter((n) => n.type === "normal");
    const neededCount =
      (countOption ?? count) - safe.filter((n) => n.type === type).length;

    // si le nombre de normaux est insuffisant (presque jamais)
    if (normals.length <= neededCount) {
      // change tous les normaux en specifics
      normals.forEach((n) => (n.type = type));
    } else {
      _.shuffle(normals)
        .slice(0, neededCount)
        .forEach((n) => (n.type = type));
    }
  }

  isOnEvenCol(n: nucleotide.Nucleotide): boolean {
    const position = this.getGridPositionOf(n);
    if (!position) return null;
    return position.x % 2 === 0;
  }

  getForcedMatchingPath(
    length: number
  ): {
    colors: nucleotide.ColorName[];
    nucleotides: nucleotide.Nucleotide[];
  } {
    let output: {
      colors: nucleotide.ColorName[];
      nucleotides: nucleotide.Nucleotide[];
    } = null;

    while (output === null) {
      const passed: {
        colors: nucleotide.ColorName[];
        nucleotides: nucleotide.Nucleotide[];
      } = {
        colors: [],
        nucleotides: [],
      };

      let current: nucleotide.Nucleotide;

      const addAndFocus = (n: nucleotide.Nucleotide) => {
        current = n;
        passed.nucleotides.push(n);
        if (current.type === "normal") passed.colors.push(n.colorName);
      };

      // get all color-based nucleotides
      const normals = this.nucleotides.filter((n) => n.type === "normal");

      // if request is impossible, throw error
      if (normals.length < length) throw new Error("bad length request");

      // chose an entry point
      addAndFocus(
        crispr.random(this.nucleotides.filter((n) => n.type === "clip"))
      );

      // while path is not full
      while (true) {
        // get possible next nucleotides
        let nextList: nucleotide.Nucleotide[] = [];

        if (current.type === "portal") {
          if (
            passed.nucleotides.filter((n) => n.type === "portal").length % 2 ===
            0
          ) {
            nextList = this.getNeighbors(current).filter((n) => {
              return (
                !!n && !passed.nucleotides.includes(n) && n.type !== "clip"
              );
            });
          } else {
            nextList = this.getPortals().filter((n) => {
              return !!n && !passed.nucleotides.includes(n);
            });
          }
        } else {
          nextList = this.getNeighbors(current).filter((n) => {
            return !!n && !passed.nucleotides.includes(n) && n.type !== "clip";
          });
        }

        // if path is locked, break and retry
        if (nextList.length === 0) {
          break;
        } else {
          // continue path
          addAndFocus(crispr.random(nextList));

          // if path is full
          if (passed.colors.length >= length) {
            if (
              this.level.options.clipCount === 0 ||
              passed.nucleotides.filter((n) => n.type === "clip").length > 0
            ) {
              // return it
              output = passed;
            }
            break;
          }
        }
      }
    }

    return output;
  }

  getNucleotideFromGridPosition(
    gridPos: PIXI.Point
  ): nucleotide.Nucleotide | null {
    return this.allNucleotides[gridPos.y * colCount + gridPos.x];
  }

  getGridPositionOf(n: nucleotide.Nucleotide): PIXI.Point | null {
    const index = this.allNucleotides.indexOf(n);
    if (index === -1) return null;
    const x = index % colCount;
    const y = Math.floor(index / colCount);
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
      this.level.options.nucleotideRadius
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
    const dist = crispr.dist(
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

    this.addSpecifics(oldHoles, this.level.options.portalsCount, "portal");
    (() => this.addSpecifics(oldHoles, this.level.options.clipCount, "clip"))();
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
    // todo: use changeState(): entity.Sequence instead of state accessor and returns it

    const holes = this.nucleotides.filter((n) => n.state === "missing");
    for (const nucleotide of holes) {
      this.generateNucleotide(nucleotide);
    }
    this.addSpecifics(holes, this.level.options.portalsCount, "portal");
    (() => this.addSpecifics(holes, this.level.options.clipCount, "clip"))();

    holes.forEach((n) => (n.state = "present"));

    this._entityConfig.fxMachine.play("spawn");

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

  getPortals(): nucleotide.Nucleotide[] {
    return this.nucleotides.filter((n) => n.type === "portal");
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
  // regenerate(n: number, filter: (n: nucleotide.Nucleotide) => boolean): void {
  //   // todo: use changeState(): entity.Sequence instead of state accessor and returns it
  //
  //   // Pick a certain number of non-infected nucleotides
  //   // @ts-ignore
  //   const nucleotides: nucleotide.Nucleotide[] = _.chain(this.nucleotides)
  //     // @ts-ignore
  //     .filter(filter)
  //     .shuffle()
  //     .take(n)
  //     .value();
  //
  //   // Make them disappear
  //   nucleotides.forEach((n) => {
  //     n.state = "missing";
  //     this.generateNucleotide(n);
  //   });
  //
  //   this.addSpecifics(nucleotides, this.level.options.portalsCount, "portal");
  //   (() =>
  //     this.addSpecifics(nucleotides, this.level.options.clipCount, "clip"))();
  //
  //   nucleotides.forEach((n) => (n.state = "present"));
  // }

  generateNucleotide(nucleotide: nucleotide.Nucleotide) {
    nucleotide.type = "normal";
    nucleotide.generateColor();
  }
}
