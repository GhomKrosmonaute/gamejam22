import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

import * as crisprUtil from "../crisprUtil";
import * as anim from "../animations";

import * as minimap from "./minimap";

import * as sequence from "../entities/sequence";
import * as bonuses from "../entities/bonus";
import * as popup from "../entities/popup";
import * as grid from "../entities/grid";
import * as path from "../entities/path";
import * as hair from "../entities/hair";
import * as hud from "../entities/hud";

export type LevelVariant = "turnBased" | "continuous" | "long";
export type LevelState = "crunch" | "regenerate" | "bonus";

export interface LevelOptions {
  variant: LevelVariant;
  maxScore: number;
  dropSpeed: number;
  baseGain: number;
  baseScore: number;
  gaugeRingCount: number;
  sequenceLength: number | null;
  colCount: number;
  rowCount: number;
  scissorCount: number;
  nucleotideRadius: number;
  sequenceNucleotideRadius: number;
  endsBy: "maxScoreReached" | "none";
  gridShape: grid.GridShape;
  forceMatching: boolean;
}

export const defaultLevelOptions: Readonly<LevelOptions> = {
  variant: "turnBased",
  dropSpeed: 0.001,
  maxScore: 1000,
  baseGain: 10,
  baseScore: 0,
  gaugeRingCount: 5,
  sequenceLength: null,
  colCount: 7,
  rowCount: 7,
  scissorCount: 6,
  nucleotideRadius: crisprUtil.width / 13.44,
  sequenceNucleotideRadius: crisprUtil.width * 0.04,
  endsBy: "maxScoreReached",
  gridShape: "full",
  forceMatching: false,
};

/**
 * Emits:
 * - maxScoreReached()
 * - ringReached(ring: PIXI.Sprite, index: number)
 * - scoreUpdated(score: number)
 * - initiatedSequenceManager
 */
export class Level extends entity.CompositeEntity {
  // system
  /**
   * Disable continuous events while `disablingAnimations` contains one or more elements.
   *
   * **Flag accessor**: `<Level>.isDisablingAnimationInProgress`
   *
   * set a disabling animation:
   * ```ts
   * disablingAnimations.add(identifier as string)
   * ```
   * remove a disabling animation:
   * ```ts
   * disablingAnimations.delete(identifier as string)
   * ```
   */
  public disablingAnimations: Set<string> = new Set();
  public container = new PIXI.Container();
  public sequenceManager: sequence.SequenceManager;
  public bonusesManager: bonuses.BonusesManager;
  public hairManager: hair.HairManager;
  public gauge: hud.Gauge;
  public path: path.Path;
  public grid: grid.Grid;
  public state: LevelState = "crunch";
  private bonusBackground: PIXI.Sprite;
  private goButton: hud.GoButton;

  // game
  public wasInfected = false;
  public someVirusHasEscaped = false;
  public crunchCount = 0;
  public score: number;

  constructor(public readonly options: Partial<LevelOptions>) {
    super();
    this.options = util.fillInOptions(this.options, defaultLevelOptions);
    this.score = this.options.baseScore;
  }

  get minimap(): minimap.Minimap {
    return this._entityConfig.minimap;
  }

  get config(): entity.EntityConfig {
    return entity.extendConfig({
      container: this.container,
    });
  }

  get cursor(): PIXI.Point {
    return this.grid.cursor;
  }

  private _initBackground() {
    const background = new PIXI.Sprite(
      this._entityConfig.app.loader.resources["images/background.jpg"].texture
    );
    const particles = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        "images/particles_background.png"
      ].texture
    );
    this.container.addChild(background);
    this.container.addChild(particles);
  }

  private _initForeground() {
    const particles = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        "images/particles_foreground.png"
      ].texture
    );
    const membrane = new PIXI.Sprite(
      this._entityConfig.app.loader.resources["images/membrane.png"].texture
    );
    membrane.position.set(0, 300);
    this.container.addChild(particles);
    this.container.addChild(membrane);
  }

  private _initPath() {
    this.path = new path.Path();
    this._on(this.path, "updated", this.refresh);
    this._activateChildEntity(this.path, this.config);
  }

  private _initGrid() {
    this.grid = new grid.Grid(
      this.options.colCount,
      this.options.rowCount,
      this.options.scissorCount,
      this.options.nucleotideRadius,
      this.options.gridShape
    );
    this._on(this.grid, "pointerup", this._attemptCrunch);
    this._activateChildEntity(this.grid, this.config);
  }

  private _initSequences() {
    this.sequenceManager = new sequence.SequenceManager();

    this._on(this, "activatedChildEntity", (child: entity.Entity) => {
      if (child !== this.sequenceManager) return;

      this.sequenceManager.add();

      this.emit("initiatedSequenceManager");
    });

    this._activateChildEntity(this.sequenceManager, this.config);
  }

  private _initHairs() {
    this.hairManager = new hair.HairManager();
    this._activateChildEntity(this.hairManager, this.config);
  }

  private _initButton() {
    this.goButton = new hud.GoButton();
    this._activateChildEntity(this.goButton, this.config);
  }

  private _initBonuses() {
    this.bonusBackground = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        "images/hud_bonus_background.png"
      ].texture
    );
    this.bonusBackground.position.set(
      this._entityConfig.app.view.width * 0.07,
      this._entityConfig.app.view.height * 0.88
    );
    this.bonusBackground.scale.set(0.65);
    this.container.addChild(this.bonusBackground);
    this.bonusesManager = new bonuses.BonusesManager();
    this._activateChildEntity(this.bonusesManager, this.config);
  }

  private _initGauge() {
    this.gauge = new hud.Gauge(
      this.options.gaugeRingCount,
      this.options.maxScore
    );
    this._on(this, "activatedChildEntity", (entity: entity.EntityBase) => {
      if (entity === this.gauge) {
        this.gauge.setValue(0);
      }
    });
    this._activateChildEntity(this.gauge, this.config);
    this._on(this.gauge, "ringReached", (ring: hud.Ring) => {
      ring.tint = 0x6bffff;
      this._activateChildEntity(anim.tweenShaking(ring, 1000, 6, 0));
    });
    // setup shockwave on max score is reached
    this._on(this, "maxScoreReached", () => {
      this.gauge.bubbleRings({
        timeBetween: 100,
        forEach: (ring: hud.Ring) => {
          ring.tint = 0x007784;
        },
        callback: () => {
          if (this.options.endsBy === "maxScoreReached") {
            this.gameOver();
          }
        },
      });
    });
  }

  _setup() {
    this._entityConfig.level = this;
    this._entityConfig.container.addChild(this.container);

    this._initBackground();
    this._initGrid();
    this._initPath();
    this._initForeground();
    this._initHairs();
    this._initSequences();
    this._initBonuses();
    this._initButton();
    this._initGauge();

    this.refresh();

    this.wasInfected = false;
    this.someVirusHasEscaped = false;
  }

  _update() {
    if (
      this.options.variant !== "continuous" ||
      this.isDisablingAnimationInProgress
    )
      return;

    const droppedSequences = this.sequenceManager.advanceSequences(
      this.options.dropSpeed
    );
    if (droppedSequences.length > 0) {
      this.onInfection(droppedSequences.length);
    }
  }

  _teardown() {
    this.container.removeChildren();
    this._entityConfig.container.removeChildren();
  }

  gameOver() {
    const endLevelPopup = new popup.TerminatedLevelPopup();
    this._once(endLevelPopup, "closed", () => {
      this._transition = entity.makeTransition();
    });
    this._activateChildEntity(endLevelPopup, this.config);
  }

  addScore(score: number) {
    if (this.score === this.options.maxScore) {
      return;
    } else if (this.score + score >= this.options.maxScore) {
      this.emit("maxScoreReached");
      this.score = this.options.maxScore;
    } else {
      this.emit("scoreUpdated", score);
      this.score += score;
    }
    this.gauge.setValue(this.score);
  }

  get isDisablingAnimationInProgress(): boolean {
    return this.disablingAnimations.size > 0;
  }

  public endTurn(): void {
    this.disablingAnimations.add("game");

    if (this.grid.isGameOver()) {
      this._transition = entity.makeTransition("game_over");
      return;
    }

    // Create a list of "actions" that will take place at the end of calling this function
    let actions: entity.Entity[] = [];

    const countSequences = this.sequenceManager.sequenceCount;
    if (countSequences > 0) {
      const infectionSequence = this.grid.infect(countSequences * 5);
      actions.push(infectionSequence);
    }

    if (countSequences < this.sequenceManager.sequenceCountLimit) {
      actions.push(
        new entity.FunctionCallEntity(() => {
          this.sequenceManager.add();
        })
      );
    }

    if (actions.length > 0) {
      this._activateChildEntity(new entity.EntitySequence(actions));
    }
  }

  // TODO: refactor this as a separate object, using the strategy pattern
  private _attemptCrunch(): void {
    if (
      this.path.items.length === 0 ||
      this.sequenceManager.matchesSequence(this.path) !== true
    ) {
      return;
    }

    this.sequenceManager.crunch(this.path, async () => {
      if (this.options.variant === "turnBased") {
        this.sequenceManager.adjustRelativePositionOfSequences();
      }

      const first = [...this.sequenceManager.sequences][0];

      if (
        this.options.variant === "long" &&
        first &&
        first.maxActiveLength < 3
      ) {
        await new Promise((resolve) => {
          first.down(true, resolve);
        });
      }
      if (this.sequenceManager.sequenceCount === 0) {
        this.regenerate();
      }
    });

    // Makes holes in the grid that corresponds to the used nucleotides
    this.path.crunch();
  }

  public setGoButtonText(text: string) {
    this.goButton.setText(text);
  }

  public refresh(): void {
    if (this.path.items.length > 0) {
      const match = this.sequenceManager.matchesSequence(this.path);
      if (match === true) {
        this.setGoButtonText("MATCH");
      } else {
        this.setGoButtonText(match);
      }
    } else {
      this.setGoButtonText("SKIP");
    }
    this.sequenceManager.updateHighlighting(this.path);
  }

  public regenerate(): void {
    this.disablingAnimations.add("game");

    // Switch to regenerate mode
    this.state = "regenerate";
    this.refresh();

    const regen = () => {
      const newNucleotides = this.grid.fillHoles();

      // Wait for a second, then continue
      this._activateChildEntity(
        new entity.EntitySequence([
          new entity.WaitingEntity(1000),
          new entity.FunctionCallEntity(() => {
            this.state = "crunch";

            this.endTurn();
            this.refresh();
          }),
        ])
      );
    };

    if (this.path.isCrunchAnimationRunning) {
      this._once(this.path, "crunchAnimationFinished", () => regen());
    } else {
      regen();
    }
  }

  public onInfection(infectionCount = 1): void {
    this.disablingAnimations.add("game");
    this.wasInfected = true;

    if (this.grid.isGameOver()) {
      this._transition = entity.makeTransition("game_over");
      return;
    }

    const infectionSequence = this.grid.infect(infectionCount * 5);

    this._activateChildEntity(
      new entity.EntitySequence([
        infectionSequence,
        new entity.FunctionCallEntity(() => {
          this.sequenceManager.add();
        }),
      ])
    );
  }
}
