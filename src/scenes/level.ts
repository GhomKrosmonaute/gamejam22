import * as PIXI from "pixi.js";
import * as _ from "underscore";

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
  displayTurnTitles: boolean;
  variant: LevelVariant;
  maxScore: number;
  dropSpeed: number;
  baseGain: number;
  baseScore: number;
  gaugeRings: ((level: Level, ring: hud.Ring) => unknown)[];
  sequenceLength: number | null;
  colCount: number;
  rowCount: number;
  scissorCount: number;
  nucleotideRadius: number;
  sequenceNucleotideRadius: number;
  gridShape: grid.GridShape;
  presetScissors: grid.GridPreset | null;
  sequences: nucleotide.ColorName[][] | null;
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
  retryOnFail: true,
  displayTurnTitles: true,
  variant: "turnBased",
  presetScissors: null,
  dropSpeed: 0.001,
  maxScore: 1000,
  baseGain: 10,
  baseScore: 0,
  gaugeRings: [],
  sequenceLength: null,
  sequences: null,
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

            const keepPopups = [...popup.Popup.minimized].filter((p) => {
              if (p.options.keepOnReset) {
                p.options.minimizeOnSetup = true;
                return true;
              }
              return false;
            });

            this.level.reset({
              ...this.level.options,
              hooks: [],
              ...newOptions,
            });

            this.level.options.hooks.unshift(
              new Hook({
                once: true,
                event: "beforeSetup",
                entity: new entity.ParallelEntity(keepPopups),
              })
            );

            if (crisprUtil.debug) {
              console.log(
                "Hook resetting on",
                this.options.event,
                this.level.options
              );
            }
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
  beforeSetup: [];
  setup: [];
  infected: [];
  closedPopup: [popup.Popup];
  minimizedPopup: [popup.Popup];
  pathUpdated: [];
  ringReached: [ring: hud.Ring];
  sequenceDown: [];
  scoreUpdated: [score: number];
  clickedBonus: [bonus: bonuses.Bonus];
  maxScoreReached: [];
  clickedNucleotide: [nucleotide: nucleotide.Nucleotide];
  activatedChildEntity: [entity: entity.Entity];
  deactivatedChildEntity: [entity: entity.Entity];
}

export class Level extends entity.CompositeEntity {
  public options: LevelOptions;

  // system
  /**
   * Disable continuous events while `disablingAnimations` contains one or more elements. <br>
   * **Flag accessor**: `<Level>.isDisablingAnimationInProgress`
   */
  public disablingAnimations: Set<string> = new Set();
  public fallingStopped = false;
  public container = new PIXI.Container();
  public sequenceManager: sequence.SequenceManager;
  public bonusesManager: bonuses.BonusesManager;
  public hairManager: hair.HairManager;
  public gauge: hud.Gauge;
  public path: path.Path;
  public grid: grid.Grid;
  public goButton: hud.GoButton;

  // game
  public wasInfected = false;
  public someVirusHasEscaped = false;
  public crunchCount = 0;
  public score: number;
  public failed = false;
  public sequenceWasCrunched = false;
  public scissorsWasIncludes = false;
  public oneShotLongSequence = false;
  public crunchedSequenceCount = 0;

  constructor(public name: levels.LevelName, options: Partial<LevelOptions>) {
    super();
    this.options = util.fillInOptions(options, defaultLevelOptions);
    this.score = this.options.baseScore;
  }

  activate(entity: entity.Entity) {
    if (!entity.isSetup) this._activateChildEntity(entity, this.config);
  }

  deactivate(entity: entity.Entity) {
    if (entity.isSetup) this._deactivateChildEntity(entity);
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
      this.options.gridShape,
      this.options.presetScissors
    );
    this._on(this.grid, "pointerup", () => {
      if (this.options.variant !== "long") {
        const crunch = this.attemptCrunch();
        if (crunch) this._activateChildEntity(crunch);
      }
    });
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

  private _disableButton() {
    this._deactivateChildEntity(this.goButton);
    this.goButton = null;
  }

  private _initBonuses() {
    if (this.options.disableBonuses) return;
    this.bonusesManager = new bonuses.BonusesManager(
      this.options.initialBonuses
    );
    this._activateChildEntity(this.bonusesManager, this.config);
  }

  private _disableBonuses() {
    this._deactivateChildEntity(this.bonusesManager);
    this.bonusesManager = null;
  }

  private _initGauge() {
    if (this.options.disableGauge) return;

    this.gauge = new hud.Gauge(
      this.options.gaugeRings.length,
      this.options.maxScore
    );

    this._activateChildEntity(this.gauge, this.config);
  }

  private _disableGauge() {
    this._deactivateChildEntity(this.gauge);
    this.gauge = null;
  }

  _setup() {
    this.container.sortableChildren = true;
    this._entityConfig.level = this;
    this._entityConfig.container.addChild(this.container);

    this._initBackground();
    this._initForeground();
    this._initHooks();

    this.emit("beforeSetup");

    this._initGrid();
    this._initPath();
    this._initHairs();
    this._initSequences();
    this._initBonuses();
    this._initButton();
    this._initGauge();

    this.refresh();

    this.emit("setup");

    if (crisprUtil.debug) {
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
      this.isDisablingAnimationInProgress ||
      this.fallingStopped
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

  reset(
    options: LevelOptions,
    resetOptions?: {
      resetScore?: boolean;
    }
  ) {
    // assign flags
    {
      [
        "disableExtraSequence",
        "disableScore",
        "retryOnFail",
        "displayTurnTitles",
        "variant",
        "maxScore",
        "dropSpeed",
        "baseGain",
        "baseScore",
        "gaugeRings",
        "sequenceLength",
        "checks",
        "scissorCount",
        "nucleotideRadius",
        "sequenceNucleotideRadius",
        "forceMatching",
      ].forEach((prop) => {
        // @ts-ignore
        this.options[prop] = Array.isArray(options[prop])
          ? // @ts-ignore
            options[prop].slice(0)
          : // @ts-ignore
            options[prop];
      });
    }

    // manage components switches
    {
      const switchComponent = (name: string) => {
        // @ts-ignore
        if (this.options["disable" + name] !== options["disable" + name]) {
          // @ts-ignore
          this.options["disable" + name] = options["disable" + name];
          // @ts-ignore
          if (this.options["disable" + name]) {
            // @ts-ignore
            this["_disable" + name]();
          } else {
            // @ts-ignore
            this["_init" + name]();
          }
        }
      };
      ["Bonuses", "Button", "Gauge"].forEach(switchComponent);
    }

    // reset options
    if (resetOptions?.resetScore) {
      this.score = this.options.baseScore;
    }

    // mock useless properties
    {
      const Ahahahaha = (uselessProp: any): any => null;
      Ahahahaha(options.colCount);
      Ahahahaha(options.rowCount);
    }

    // grid rebuild
    {
      if (this.options.gridShape !== options.gridShape) {
        this.options.gridShape = _.clone(options.gridShape);
      }

      if (this.options.presetScissors !== options.presetScissors) {
        this.options.presetScissors = _.clone(options.presetScissors);
      }

      this.grid.reset();
    }
    // TODO: HERE
    /*
      sequences: nucleotide.ColorName[][] | null;
      hooks: Hook[];
      initialBonuses: bonuses.InitialBonuses;
    */
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

  public endTurn(): entity.EntitySequence {
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
          if (this.options.disableExtraSequence) {
            return;
          }

          this.sequenceManager.add();
        })
      );
    }

    actions.push(
      new entity.FunctionCallEntity(() => {
        this.disablingAnimations.delete("level.endTurn");
      })
    );

    return new entity.EntitySequence(actions);
  }

  // TODO: refactor this as a separate object, using the strategy pattern
  public attemptCrunch(): entity.EntitySequence | void {
    if (
      this.path.items.length === 0 ||
      this.sequenceManager.matchesSequence(this.path) !== true
    ) {
      return;
    }

    this.disablingAnimations.add("level.attemptCrunch");

    const sequenceCrunch = this.sequenceManager.crunch(this.path);

    if (!sequenceCrunch) return;

    const context: entity.Entity[] = [this.path.crunch(), sequenceCrunch];

    if (this.options.variant === "turnBased") {
      context.push(
        new entity.FunctionCallEntity(() => {
          this._activateChildEntity(
            this.sequenceManager.adjustRelativePositionOfSequences()
          );
        })
      );
    }

    const first = [...this.sequenceManager.sequences][0];

    if (this.options.variant === "long" && first && first.maxActiveLength < 3) {
      context.push(first.down(true));
    }

    context.push(
      new entity.FunctionCallEntity(() => {
        if (this.sequenceManager.sequenceCount === 0) {
          this._activateChildEntity(this.regenerate());
        }

        this.disablingAnimations.delete("level.attemptCrunch");
      })
    );

    return new entity.EntitySequence(context);
  }

  public setGoButtonText(text: string) {
    if (!this.options.disableButton) this.goButton.setText(text);
  }

  public refresh(): void {
    if (this.path.items.length > 0) {
      const match = this.sequenceManager.matchesSequence(this.path);
      if (match === true) {
        if (this.options.variant === "long") this.setGoButtonText("CRUNCH");
        else this.setGoButtonText("MATCH");
      } else {
        this.setGoButtonText(match);
      }
    } else {
      this.setGoButtonText("SKIP");
    }
    this.sequenceManager.updateHighlighting(this.path);
  }

  public regenerate(): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.FunctionalEntity({
        requestTransition: () => !this.disablingAnimations.has("path.crunch"),
      }),
      new entity.FunctionCallEntity(() => {
        this.disablingAnimations.add("level.regenerate");
        this.grid.fillHoles();
        this.refresh();
      }),
      new entity.WaitingEntity(1000),
      this.endTurn(),
      new entity.FunctionCallEntity(() => {
        this.refresh();

        this.disablingAnimations.delete("level.regenerate");
      }),
    ]);
  }

  public onInfection(infectionCount = 1): void {
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
          this.disablingAnimations.delete("level.onInfection");

          if (this.options.disableExtraSequence) {
            return;
          }

          this.sequenceManager.add();
        }),
      ])
    );
  }
}
