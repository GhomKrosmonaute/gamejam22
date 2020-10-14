import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

import * as crisprUtil from "../crisprUtil";
import * as anim from "../animations";
import * as levels from "../levels";

import * as minimap from "./minimap";

import * as nucleotide from "../entities/nucleotide";
import * as sequence from "../entities/sequence";
import * as bonuses from "../entities/bonus";
import * as popup from "../entities/popup";
import * as grid from "../entities/grid";
import * as path from "../entities/path";
import * as hair from "../entities/hair";
import * as hud from "../entities/hud";

export type LevelVariant = "turnBased" | "continuous" | "long";

export interface LevelResults {
  checks: { [text: string]: boolean };
  checkCount: number;
  checkedCount: number;
  starCount: number;
}

export interface LevelOptions {
  disableExtraSequence: boolean;
  disableBonuses: boolean;
  disableButton: boolean;
  disableGauge: boolean;
  disableScore: boolean;
  retryOnFail: boolean;
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
  gridShape: grid.GridShape;
  forceMatching: boolean;
  hooks: Hook[];
  initialBonuses: bonuses.InitialBonuses;
  checks: { [text: string]: (level: Level) => boolean };
}

export const defaultLevelOptions: Readonly<LevelOptions> = {
  disableExtraSequence: false,
  disableBonuses: false,
  disableButton: false,
  disableGauge: false,
  disableScore: false,
  retryOnFail: false,
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
  gridShape: "full",
  forceMatching: false,
  hooks: [],
  initialBonuses: [],
  checks: {
    "No virus has escaped": (level) => !level.someVirusHasEscaped,
    "Max score reached": (level) => level.score >= level.options.maxScore,
    "Not infected": (level) => !level.wasInfected,
    "No bonus used": (level) => !level.bonusesManager.wasBonusUsed,
  },
};

export type LevelEventName = keyof LevelEvents;
export type LevelEventParams<
  EventName extends LevelEventName
> = LevelEvents[EventName];

export interface HookOptions<Entity, EventName extends LevelEventName> {
  event: EventName;
  /** Filter function, trigger hook if it returns `true` */
  filter?: (...params: LevelEventParams<EventName>) => boolean | void;
  /** Entity to activate on hook is triggered */
  entity?: Entity;
  once?: true;
  reset?: ((level: Level) => Partial<LevelOptions>) | Partial<LevelOptions>;
}

export class Hook<
  Entity extends entity.Entity = entity.Entity,
  EventName extends LevelEventName = LevelEventName
> extends entity.CompositeEntity {
  public emitter: PIXI.utils.EventEmitter;

  constructor(private options: HookOptions<Entity, EventName>) {
    super();
  }

  get level(): Level {
    return this._entityConfig.level;
  }

  protected _setup() {
    this[this.options.once ? "_once" : "_on"](
      this.emitter,
      this.options.event,
      (...params) => {
        if (
          !this.options.filter ||
          this.options.filter.bind(this.emitter)(...params)
        ) {
          if (this.options.reset) {
            const newOptions =
              typeof this.options.reset === "function"
                ? this.options.reset(this.level)
                : this.options.reset;

            this.level._teardown();
            this.level.options = {
              ...this.level.options,
              ...newOptions,
            };
            this.level._setup();
          }
          if (this.options.entity) {
            this._activateChildEntity(this.options.entity, this.level.config);
          }
        }
      }
    );
  }
}

export interface LevelEvents {
  setup: [];
  infected: [];
  pathUpdated: [];
  ringReached: [ring: hud.Ring, index: number];
  sequenceDown: [];
  scoreUpdated: [score: number];
  clickedBonus: [bonus: bonuses.Bonus];
  maxScoreReached: [];
  clickedNucleotide: [nucleotide: nucleotide.Nucleotide];
  activatedChildEntity: [entity: entity.Entity];
  deactivatedChildEntity: [entity: entity.Entity];
}

const DEBUG = false;

export class Level extends entity.CompositeEntity {
  // system
  /**
   * Disable continuous events while `disablingAnimations` contains one or more elements. <br>
   * **Flag accessor**: `<Level>.isDisablingAnimationInProgress`
   */
  public disablingAnimations: Set<string> = new Set();
  public container = new PIXI.Container();
  public sequenceManager: sequence.SequenceManager;
  public bonusesManager: bonuses.BonusesManager;
  public hairManager: hair.HairManager;
  public gauge: hud.Gauge;
  public path: path.Path;
  public grid: grid.Grid;
  private goButton: hud.GoButton;

  // game
  public wasInfected = false;
  public someVirusHasEscaped = false;
  public crunchCount = 0;
  public score: number;
  public failed = false;
  public sequenceWasCrunched = false;
  public scissorsWasIncludes = false;
  public crunchedSequenceCount = 0;

  constructor(
    public name: levels.LevelName,
    public options: Partial<LevelOptions>
  ) {
    super();
    this.options = util.fillInOptions(this.options, defaultLevelOptions);
    this.score = this.options.baseScore;
  }

  emit<K extends LevelEventName>(event: K, ...params: LevelEventParams<K>) {
    return super.emit(event, ...params);
  }

  on<K extends LevelEventName>(
    event: K,
    callback: (...params: LevelEventParams<K>) => any
  ): this {
    return super.on(event, callback);
  }

  once<K extends LevelEventName>(
    event: K,
    callback: (...params: LevelEventParams<K>) => any
  ): this {
    return super.once(event, callback);
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

  private _initHooks() {
    this.options.hooks.forEach((hook) => {
      hook.emitter = this;
      this._activateChildEntity(hook);
    });
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
    this.on("pathUpdated", this.refresh);
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
    this._activateChildEntity(this.sequenceManager, this.config);
  }

  private _initHairs() {
    this.hairManager = new hair.HairManager();
    this._activateChildEntity(this.hairManager, this.config);
  }

  private _initButton() {
    if (this.options.disableButton) return;

    this.goButton = new hud.GoButton();
    this._activateChildEntity(this.goButton, this.config);
  }

  private _initBonuses() {
    if (this.options.disableBonuses) return;
    this.bonusesManager = new bonuses.BonusesManager(
      this.options.initialBonuses
    );
    this._activateChildEntity(this.bonusesManager, this.config);
  }

  private _initGauge() {
    if (this.options.disableGauge) return;

    this.gauge = new hud.Gauge(
      this.options.gaugeRingCount,
      this.options.maxScore
    );
    this._activateChildEntity(this.gauge, this.config);
    this.on("ringReached", (ring) => {
      ring.tint = 0x6bffff;
      this._activateChildEntity(anim.tweenShaking(ring, 1000, 6, 0));
    });
    // setup shockwave on max score is reached
    this.on("maxScoreReached", () => {
      this.gauge.bubbleRings({
        timeBetween: 100,
        forEach: (ring: hud.Ring) => {
          ring.tint = 0x007784;
        },
      });
    });
  }

  _setup() {
    this._entityConfig.level = this;
    this._entityConfig.container.addChild(this.container);

    this._initHooks();
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

    this.emit("setup");

    if (DEBUG) {
      let lastDisablingAnimations = [...this.disablingAnimations];
      setInterval(() => {
        if (
          lastDisablingAnimations.some(
            (flag) => !this.disablingAnimations.has(flag)
          ) ||
          [...this.disablingAnimations].some(
            (flag) => !lastDisablingAnimations.includes(flag)
          )
        ) {
          lastDisablingAnimations = [...this.disablingAnimations];
          console.log(
            "disabling animations:",
            lastDisablingAnimations.length,
            ...lastDisablingAnimations
          );
        }
      }, 1);
    }
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
    this.disablingAnimations.clear();
    this.removeAllListeners();
  }

  gameOver() {
    this.failed = true;
    if (this.options.retryOnFail) {
      this._activateChildEntity(new popup.FailedLevelPopup(), this.config);
    } else {
      this.minimap.setResult(this.name, this.getResults());
      this._activateChildEntity(new popup.TerminatedLevelPopup(), this.config);
    }
  }

  getResults(): LevelResults {
    const checks: { [text: string]: boolean } = {};
    let checkCount = 0;
    let checkedCount = 0;

    for (const text in this.options.checks) {
      checks[text] = this.options.checks[text](this);

      checkCount++;
      if (checks[text]) {
        checkedCount++;
      }
    }

    const starCount = Math.floor((checkedCount / checkCount + 0.1) * 3);

    return {
      checks,
      checkCount,
      checkedCount,
      starCount,
    };
  }

  exit() {
    this.minimap.setResult(this.name, this.getResults());
    this._transition = entity.makeTransition();
  }

  addScore(score: number) {
    if (this.score === this.options.maxScore) {
      return;
    } else if (this.score + score >= this.options.maxScore) {
      this.emit("maxScoreReached");
      this.score = this.options.maxScore;
    } else {
      this.score += score;
    }
    this.emit("scoreUpdated", score);

    if (!this.options.disableGauge) {
      this.gauge.setValue(this.score);
    }
  }

  get isDisablingAnimationInProgress(): boolean {
    return this.disablingAnimations.size > 0;
  }

  public endTurn(): void {
    this.disablingAnimations.add("level.endTurn");

    if (this.grid.isGameOver()) {
      this.disablingAnimations.delete("level.endTurn");
      this.gameOver();
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
          this.disablingAnimations.delete("level.endTurn");
          if (this.options.disableExtraSequence) {
            return;
          }

          this.sequenceManager.add();
        })
      );
    } else {
      this.disablingAnimations.delete("level.endTurn");
    }

    if (actions.length > 0) {
      this._activateChildEntity(new entity.EntitySequence(actions));
    } else {
      this.disablingAnimations.delete("level.endTurn");
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
    this.path.crunch(() => {});
  }

  public setGoButtonText(text: string) {
    if (!this.options.disableButton) this.goButton.setText(text);
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
    this.disablingAnimations.add("level.regenerate");

    // Switch to regenerate mode
    this.refresh();

    const regen = () => {
      const newNucleotides = this.grid.fillHoles();

      // Wait for a second, then continue
      this._activateChildEntity(
        new entity.EntitySequence([
          new entity.WaitingEntity(1000),
          new entity.FunctionCallEntity(() => {
            this.endTurn();
            this.refresh();

            this.disablingAnimations.delete("level.regenerate");
          }),
        ])
      );
    };

    if (this.disablingAnimations.has("path.crunch")) {
      this._once(this.path, "crunchAnimationFinished", () => regen());
    } else {
      regen();
    }
  }

  public onInfection(infectionCount = 1): void {
    this.emit("infected");

    this.disablingAnimations.add("level.onInfection");

    if (this.grid.isGameOver()) {
      this.gameOver();
      return;
    }

    const infectionSequence = this.grid.infect(infectionCount * 5);

    this._activateChildEntity(
      new entity.EntitySequence([
        infectionSequence,
        new entity.FunctionCallEntity(() => {
          if (this.options.disableExtraSequence) {
            this.disablingAnimations.delete("level.onInfection");
            return;
          }

          this.sequenceManager.add();
        }),
      ])
    );
  }
}
