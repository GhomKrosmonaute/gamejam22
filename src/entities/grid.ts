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

export type GridArrayShape<T = true> = ((T | null)[] | null)[];

export function isGridArrayShape(
  object: object
): object is GridArrayShape<keyof typeof nucleotide.NucleotideSignatures> {
  return (
    Array.isArray(object) &&
    object.every((row) => {
      return (
        Array.isArray(row) &&
        row.every((val) => {
          return (
            (val === null || typeof val === "string") &&
            Object.keys(nucleotide.NucleotideSignatures).includes(val)
          );
        })
      );
    })
  );
}

export type GridFilter = (x: number, y: number) => boolean;

export const gridMakerPresets: { [k: string]: GridMakerOptions } = {
  full: {
    filter: (x, y) => y < 6 || x % 2 !== 0,
  },
  mini: {
    filter: (x, y) =>
      !(x < 2 || x > 4 || y < 2 || y > 4 || (y > 3 && x % 2 === 0)),
  },
  medium: {
    filter: (x, y) =>
      !(
        x < 1 ||
        x > 5 ||
        y < 1 ||
        y > 5 ||
        (x === 1 && y === 1) ||
        (x === 5 && y === 1) ||
        (x !== 3 && x > 0 && x < 6 && y === 5)
      ),
  },
  fourIslands: {
    portals: [
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      { x: 1, y: 5 },
      { x: 5, y: 5 },
    ],
    clips: [
      { x: 1, y: 3 },
      { x: 5, y: 3 },
      { x: 3, y: 1 },
      { x: 3, y: 5 },
    ],
    filter: (x, y) =>
      !(
        (x > 2 || y < 4 || y > 6) &&
        (x < 4 || y < 4 || y > 6) &&
        (x > 2 || y > 2 || (y === 2 && (x === 0 || x === 2))) &&
        (x < 4 || y > 2 || (y === 2 && (x === 4 || x === 6)))
      ) &&
      (y < 6 || x % 2 !== 0),
  },
  littleBridge: {
    filter: (x, y) =>
      !(
        (x > 2 || y < 1 || y > 5 || (y === 5 && (x === 0 || x === 2))) &&
        (x !== 3 || y !== 3) &&
        (x < 4 || y < 1 || y > 5 || (y === 5 && (x === 4 || x === 6)))
      ),
  },
  twoIslands: {
    filter: (x, y) =>
      !(
        (x > 2 || y < 1 || y > 5 || (y === 5 && (x === 0 || x === 2))) &&
        (x !== 3 || y !== 3) &&
        (x < 4 || y < 1 || y > 5 || (y === 5 && (x === 4 || x === 6)))
      ),
    clips: [{ x: 3, y: 3 }],
    portals: [
      { x: 1, y: 3 },
      { x: 5, y: 3 },
    ],
  },
  bowTie: {
    filter: (x, y) =>
      !(
        y < 1 ||
        y > 4 ||
        (y === 4 && x > 1 && x < 5) ||
        (y === 1 && x > 0 && x < 6) ||
        (x === 3 && y === 2)
      ),
  },
  hole: {
    filter: (x, y) =>
      !(
        (x > 1 &&
          x < 5 &&
          y > 1 &&
          y < 5 &&
          !(y === 4 && (x === 2 || x === 4))) ||
        (y === 0 && (x < 2 || x > 4)) ||
        (y > 4 && (x > 4 || x < 2) && !((x === 1 || x === 5) && y === 5))
      ),
  },
  hive: {
    filter: (x, y) => !(x % 2 !== 0 && y % 2 === 0) && (y < 6 || x % 2 !== 0),
  },
};

export const madeGrids: {
  [k: string]: GridArrayShape<keyof typeof nucleotide.NucleotideSignatures>;
} = {
  around: [
    ["random", "random", "random", "portal", "random", "random", "random"],
    ["random", "portal", null, "clip", null, "portal", "random"],
    ["portal", null, null, null, null, null, "portal"],
    ["random", null, null, null, null, null, "random"],
    ["random", "random", "random", "clip", "random", "portal", "random"],
    [null, "random", null, "portal", null, "random", null],
  ],
  bone: [
    ["random", "random", "random", null, "random", "random", "random"],
    ["random", "random", "random", null, null, "random", "random"],
    [null, "random", "random", "random", "random", null, null],
    ["random", null, null, "random", "random", "random", "random"],
    ["random", "portal", "random", null, "random", "random", "random"],
    [null, "random", null, null, null, "random", null],
  ],
  mediumPortal: [
    [null, null, "random", null, "random", null, null],
    ["random", "random", "random", null, "random", "random", "random"],
    ["random", "clip", "portal", null, "portal", "clip", "random"],
    ["random", "random", "random", null, "random", "random", "random"],
    [null, "random", "random", null, "random", "random", null],
    [null, null, null, null, null, null, null],
  ],
};

export interface GridMakerOptions {
  filter?: GridFilter;
  portals?: PIXI.IPointData[];
  jokers?: PIXI.IPointData[];
  clips?: PIXI.IPointData[];
}

export function makeGrid(
  options: GridMakerOptions
): GridArrayShape<keyof typeof nucleotide.NucleotideSignatures> {
  const shape: GridArrayShape<
    keyof typeof nucleotide.NucleotideSignatures
  > = [];

  const filter = options.filter ?? (() => true);
  const portals = options.portals ?? [];
  const jokers = options.jokers ?? [];
  const clips = options.clips ?? [];

  for (let y = 0; y < colCount; y++) {
    shape.push([]);
    for (let x = 0; x < rowCount; x++) {
      shape[y][x] = filter(x, y) ? "random" : null;
    }
  }

  portals.forEach(({ x, y }) => (shape[y][x] = "portal"));
  jokers.forEach(({ x, y }) => (shape[y][x] = "joker"));
  clips.forEach(({ x, y }) => (shape[y][x] = "clip"));

  return shape;
}

/** Represent the game nucleotides grid
 *
 * Emits
 *  - pointerup()
 *
 */
export class Grid extends entity.CompositeEntity {
  public container: PIXI.Graphics;
  public allNucleotides: (nucleotide.Nucleotide | undefined)[] = [];
  public solution: nucleotide.Nucleotide[] = [];
  public nucleotideContainer: PIXI.Container;
  public x = crispr.width * 0.09;
  public y = crispr.height * 0.4;
  public isPointerDown = false;
  public cursor = new PIXI.Point();
  public lastHovered: nucleotide.Nucleotide | null;

  get level(): level.Level {
    return this._entityConfig.currentLevelHolder.level;
  }

  get presentColors(): nucleotide.NucleotideSignatures[] {
    const colors: nucleotide.NucleotideSignatures[] = [];
    Object.entries(nucleotide.NucleotideColorLetters).forEach(([key]) => {
      if (this.normals.some((n) => n.color === key)) {
        colors.push(
          nucleotide.NucleotideSignatures[
            key as keyof typeof nucleotide.NucleotideSignatures
          ]
        );
      }
    });
    return colors;
  }

  _setup() {
    this.level.disablingAnimation("grid._setup", true);

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

    if (crispr.inDebugMode()) {
      this._on(this, "drag", (n: nucleotide.Nucleotide) => {
        this.level.emit("clickedNucleotide", n);
        console.log(this.getGridPositionOf(n));
      });
    }

    this._entityConfig.container.addChild(this.container);

    this.nucleotideContainer = new PIXI.Container();
    this.nucleotideContainer.position.set(this.x, this.y);
    this.container.addChild(this.nucleotideContainer);

    this._activateChildEntity(
      new entity.EntitySequence([
        this.generateShape(),
        new entity.FunctionCallEntity(() => {
          this.level.disablingAnimation("grid._setup", false);
        }),
      ])
    );

    this._on(this, "pointerup", () => {
      if (this.level.isDisablingAnimationInProgress) return;
      if (this.level.options.crunchOnPointerUp) {
        const crunch = this.level.attemptCrunch();
        if (crunch) this._activateChildEntity(crunch);
      }
    });
  }

  _update() {
    // if (!this.level.isDisablingAnimationInProgress)
    //   this._activateChildEntity(this.fillHoles());

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

  applySolution(): entity.EntityBase {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.level.path.remove();
      }),
      anim.sequenced({
        items: this.solution.slice(),
        timeBetween: 100,
        waitForAllSteps: true,
        onStep: (n, i) => {
          if (i === 0) this.level.path.startAt(n);
          else this.level.path.add(n);
        },
        callback: () => {
          this.level.activate(this.level.attemptCrunch(), null);
        },
      }),
    ]);
  }

  addNucleotide(
    x: number,
    y: number,
    signature?: nucleotide.NucleotideSignatures
  ) {
    const n = new nucleotide.Nucleotide({
      parent: "grid",
      position: this.getAbsolutePositionFromGridPosition(new PIXI.Point(x, y)),
      ...nucleotide.Nucleotide.fromSignature(signature),
    });

    this._activateChildEntity(
      n,
      entity.extendConfig({
        container: this.nucleotideContainer,
      })
    );
    this.allNucleotides[y * colCount + x] = n;
  }

  static forShape<T = nucleotide.NucleotideSignatures>(
    shape: GridArrayShape<T>,
    fn: (x: number, y: number, val: T) => unknown
  ) {
    shape.forEach((row, y) => {
      if (row)
        row.forEach((col, x) => {
          if (col) {
            fn(x, y, col);
          }
        });
    });
  }

  static fromShape<T = nucleotide.NucleotideSignatures>(
    shape: GridArrayShape<T>,
    x: number,
    y: number
  ): T {
    return shape[y][x];
  }

  generateShape() {
    this.allNucleotides.length = colCount * rowCount;

    // colors and shape
    Grid.forShape(this.level.options.gridShape, this.addNucleotide.bind(this));

    // generate
    return anim.sequenced({
      items: this.regenerateFromShape(this.allNucleotides.filter((n) => !!n)),
      timeBetween: 50,
      waitForAllSteps: true,
      onStep: (item) => {
        return item.switchTypeAnimation(item.type);
      },
    });
  }

  reset() {
    this.nucleotides.forEach((n) => {
      this._deactivateChildEntity(n);
    });

    this.allNucleotides = [];

    if (crispr.inDebugMode()) {
      console.log("--> DONE", "grid.reset()");
    }

    return this.generateShape();
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

  getNucleotidesByType(
    type: nucleotide.NucleotideType
  ): nucleotide.Nucleotide[] {
    return this.allNucleotides.filter((n) => n?.type === type);
  }

  get clips(): nucleotide.Nucleotide[] {
    return this.getNucleotidesByType("clip");
  }

  get portals(): nucleotide.Nucleotide[] {
    return this.getNucleotidesByType("portal");
  }

  get jokers(): nucleotide.Nucleotide[] {
    return this.getNucleotidesByType("joker");
  }

  get holes(): nucleotide.Nucleotide[] {
    return this.getNucleotidesByType("hole");
  }

  get normals(): nucleotide.Nucleotide[] {
    return this.getNucleotidesByType("normal");
  }

  regenerateFromShape(among: nucleotide.Nucleotide[]) {
    return among.map((n) => {
      const gridPosition = this.getGridPositionOf(n);
      const signatureName = Grid.fromShape(
        this.level.options.gridShape,
        gridPosition.x,
        gridPosition.y
      );
      const signature = nucleotide.NucleotideSignatures[signatureName];
      const info = nucleotide.Nucleotide.fromSignature(signature);
      n.type = info.type;
      n.color = info.color;
      return n;
    });
  }

  isOnEvenCol(n: nucleotide.Nucleotide): boolean | null {
    const position = this.getGridPositionOf(n);
    if (!position) return null;
    return position.x % 2 === 0;
  }

  getForcedMatchingPath(
    givenLength: number
  ): {
    colors: nucleotide.NucleotideSignatures[];
    nucleotides: nucleotide.Nucleotide[];
  } {
    if (this.nucleotides.length === 0) throw new Error("The grid is empty!");

    if (!this.level.options.disableClips && this.clips.length === 0)
      throw new Error("clips are enabled and grid not includes any clip!");

    let security = 5000;

    let output: {
      colors: nucleotide.NucleotideSignatures[];
      nucleotides: nucleotide.Nucleotide[];
    } = null;

    const is = (
      n: nucleotide.Nucleotide,
      type: nucleotide.NucleotideType = "normal",
      not = false
    ): boolean => {
      return (not ? n.type !== type : n.type === type) && n.active;
    };

    const islands = this.getIslands();

    while (output === null) {
      const island = crispr.random(
        this.level.options.disableClips
          ? islands
          : islands.filter((island) => island.some((n) => n.type === "clip"))
      );

      if (!island) continue;

      let length = island.some((n) => n.type === "portal")
        ? givenLength
        : Math.min(givenLength, island.length);

      const passed: {
        colors: nucleotide.NucleotideSignatures[];
        nucleotides: nucleotide.Nucleotide[];
      } = {
        colors: [],
        nucleotides: [],
      };

      let current: nucleotide.Nucleotide;

      const addAndFocus = (n: nucleotide.Nucleotide) => {
        current = n;
        passed.nucleotides.push(n);
        if (is(current))
          passed.colors.push(nucleotide.NucleotideSignatures[n.color]);
      };

      // get all color-based nucleotides
      const normals = island.filter((n) => is(n));

      // if request is impossible, throw error
      if (normals.length < length) length = normals.length;

      // chose an entry point
      addAndFocus(
        crispr.random(
          island.filter((n) => {
            return is(n, "clip", this.level.options.disableClips);
          })
        )
      );

      // while path is not full
      while (true) {
        // get possible next nucleotides
        let nextList: nucleotide.Nucleotide[] = [];

        if (is(current, "portal")) {
          if (
            passed.nucleotides.filter((n) => is(n, "portal")).length % 2 ===
            0
          ) {
            nextList = this.getNeighbors(current).filter((n) => {
              return (
                !!n && !passed.nucleotides.includes(n) && is(n, "clip", true)
              );
            });
          } else {
            nextList = this.getPortals().filter((n) => {
              return !!n && !passed.nucleotides.includes(n);
            });
          }
        } else {
          nextList = this.getNeighbors(current).filter((n) => {
            return (
              !!n && !passed.nucleotides.includes(n) && is(n, "clip", true)
            );
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
              this.level.options.disableClips ||
              passed.nucleotides.filter((n) => is(n, "clip")).length > 0
            ) {
              // return it
              output = passed;
            }
            break;
          }
        }

        security--;
        if (security <= 0)
          throw new Error(
            "Max iterations reached in getForcedMatchingPath method loop."
          );
      }
    }

    return output;
  }

  getIslands(): nucleotide.Nucleotide[][] {
    const list = new Set<nucleotide.Nucleotide>();
    const islands: nucleotide.Nucleotide[][] = [];

    const all = this.nucleotides;

    while (list.size < all.length) {
      const notPassed = all.filter((n) => !list.has(n));

      const island = this.getIslandNucleotidesOf(crispr.random(notPassed));

      for (const n of island) list.add(n);

      islands.push(island);
    }

    return islands;
  }

  getIslandNucleotidesOf(
    n: nucleotide.Nucleotide,
    list: Set<nucleotide.Nucleotide> = new Set()
  ): nucleotide.Nucleotide[] {
    list.add(n);

    let neighborList = this.getNeighbors(n);

    for (const neighbor of neighborList)
      if (!list.has(neighbor)) this.getIslandNucleotidesOf(neighbor, list);

    return [...list].filter((n) => !!n);
  }

  getNucleotideFromGridPosition(
    gridPos: PIXI.IPointData
  ): nucleotide.Nucleotide | undefined {
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
      nucleotide.nucleotideRadius.grid
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

  pointTo(n: nucleotide.Nucleotide, index: NeighborIndex | -1) {
    if (index !== -1) {
      n.pathArrowSprite.angle = index * (360 / 6);
      n.pathArrowSprite.visible = true;
      n.pathArrowSprite.play();
      n.level.path.container.addChildAt(n.pathArrowSprite, 0);
    } else {
      n.pathArrowSprite.visible = false;
      n.pathArrowSprite.stop();
      n.level.path.container.removeChild(n.pathArrowSprite);
    }
  }

  fillHoles() {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        if (this.holes.length > 0) this._entityConfig.fxMachine.play("spawn");
      }),
      () => this.refreshTypeOf(this.regenerateFromShape(this.holes)),
    ]);
  }

  refreshTypeOf(targets: nucleotide.Nucleotide[]) {
    return new entity.ParallelEntity(
      targets.map((n) => n.switchTypeAnimation(n.type))
    );
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
}
