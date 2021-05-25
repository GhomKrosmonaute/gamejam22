import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as crispr from "../crispr";
import * as levels from "../levels";
import * as anim from "../animations";

import * as minimap from "./main";

import * as nucleotide from "../entities/nucleotide";
import * as sequence from "../entities/sequence";
import * as bonuses from "../entities/bonus";
import * as popup from "../entities/popup";
import * as virus from "../entities/virus";
import * as grid from "../entities/grid";
import * as path from "../entities/path";
import * as hair from "../entities/hair";
import * as hud from "../entities/hud";

import * as menu from "../scenes/menu";

export type LevelVariant = "turn" | "fall" | "zen";

export const levelVariants: { [k in LevelVariant]: Partial<LevelOptions> } = {
  zen: {
    endConditionText: (ctx) =>
      `Reach min ${ctx.options.remainingMoveCount} crispies in 5 moves`,
    loseCondition: (ctx: Level) =>
      ctx.remainingMovesIndicator.count <= 0 && ctx.crispies < 1000,
    winCondition: (ctx) =>
      ctx.remainingMovesIndicator.count <= 0 && ctx.crispies >= 1000,
    showMatchOnCrunch: false,
    sequenceRounded: true,
    sequenceLength: 13,
    disableClips: true,
    disableBonuses: true,
    remainingMoves: true,
    remainingMoveCount: 5,
    disableViruses: true,
    crunchOnPointerUp: false,
    actionButtonSprite: "images/hud_action_button_crunch.png",
    gaugeOptions: {
      max: 1000,
      initial: 0,
      color: crispr.yellowNumber,
      get: (ctx) => ctx.crispies,
      set: () => null,
      show: (val) => String(Math.floor(val)),
      devise: (val, ctx) =>
        crispr.sprite(ctx, "images/crispy.png", (it) => {
          it.anchor.set(0.5);
          it.scale.set(0.6);
          it.x = 65;
        }),
    },
    checks: {
      "One shot sequence": (level) => level.oneShotSequence,
      "Min score reached": (level) =>
        level.options.gaugeOptions.get(level) >=
        crispr.scrap(level.options.gaugeOptions.max, level),
    },
  },
  turn: {},
  fall: {
    showMatchOnCrunch: false,
    mustBeHiddenOnPause: true,
    sequenceLength: () => Math.ceil(crispr.random(3, 5)),
    falling: true,
  },
};

export const baseDropSpeed = 0.001;

export interface LevelResults {
  checks: { [text: string]: boolean };
  checkCount: number;
  checkedCount: number;
  starCount: number;
  failed: boolean;
}

export interface ScoreOptions {
  max: number | ((level: Level) => number);
  initial: number;
  color: number;
  get: (level: Level) => number;
  set: (score: number, level: Level) => unknown;
  show: (score: number, level: Level) => string;
  devise?: (
    score: number,
    level: Level
  ) => PIXI.Sprite | PIXI.AnimatedSprite | string;
}

export interface LevelOptions {
  endConditionText: string | ((ctx: Level) => string);
  disableExtraSequence: boolean;
  disablingAnimations: string[];
  mustBeHiddenOnPause: boolean;
  showMatchOnCrunch: boolean;
  disableBonuses: boolean;
  disableViruses: boolean;
  disableButton: boolean;
  disableGauge: boolean;
  disableScore: boolean;
  disableClips: boolean;
  gridCleaning: boolean;
  retryOnFail: boolean;
  infection: boolean;
  falling: boolean;
  winCondition: (ctx: Level) => boolean;
  loseCondition: (ctx: Level) => boolean;
  remainingMoves: boolean;
  crunchOnPointerUp: boolean;
  displayTurnTitles: boolean;
  variant: LevelVariant;
  virus: virus.VirusType;
  actionButtonSprite: string;
  maxLife: number;
  crispyBonusRate: number;
  gaugeOptions: Partial<ScoreOptions>;
  /**
   * If canCrunchParts.possibleParts.length is a string,
   * it is a percent of current sequence length.
   */
  canCrunchParts: {
    fromLeft?: boolean;
    fromRight?: boolean;
    possibleParts: { length: number | string; glowColor: number }[];
  } | null;
  fallingSpeed: number;
  baseCrispyGain: number;
  minStarNeeded: number;
  gaugeRings: ((level: Level, ring: hud.Ring) => unknown)[];
  sequenceLength: number | ((level: Level) => number);

  clipCount: number;
  portalsCount: number;
  jokerCount: number;

  nucleotideRadius: number;
  sequenceRounded: boolean;
  sequenceNucleotideRadius: number;
  gridShape: grid.GridShape | string;
  sequences: nucleotide.ColorName[][] | null;
  forceMatching: boolean;
  hooks: Hook[];
  initialBonuses: bonuses.InitialBonuses;
  checks: { [text: string]: (level: Level) => boolean };
  music: string;
  noCrispyBonus: boolean;

  // reset options
  resetScore: boolean;
  resetGrid: boolean;
  resetSequences: boolean;
  resetBonuses: boolean;

  // zen
  remainingMoveCount: number;
}

// export const defaultScoreOptions: Readonly<ScoreOptions> = {
//   max: 1000,
//   initial: 0,
//   color: crispr.yellowNumber,
//   get: (ctx) => ctx.score,
//   set: (val, ctx) => (ctx.score = val),
//   show: (val) => String(Math.floor(val)),
//   devise: (val, ctx) =>
//     crispr.sprite(ctx, "images/crispy.png", (it) => {
//       it.anchor.set(0.5);
//       it.scale.set(0.6);
//       it.x = 65;
//     }),
// };

export const defaultScoreOptions: Readonly<ScoreOptions> = {
  max: 5,
  initial: 0,
  color: crispr.yellowNumber,
  get: (context) => context.killedViruses,
  set: (value, context) => (context.killedViruses = value),
  show: (value, context) => String(Math.round(context.crispies)),
  devise: (val, ctx) =>
    crispr.sprite(ctx, "images/crispy.png", (it) => {
      it.anchor.set(0.5);
      it.scale.set(0.6);
      it.x = 65;
    }),
  // devise: (value, ctx) => {
  //   const spriteEntity = util.makeAnimatedSprite(
  //     ctx.entityConfig.app.loader.resources["images/mini_bob_idle.json"]
  //   );
  //   ctx.activate(spriteEntity);
  //   const sp = spriteEntity.sprite;
  //   sp.autoUpdate = true;
  //   sp.animationSpeed = 20 / 60;
  //   sp.loop = true;
  //   sp.play();
  //   sp.scale.set(0.08);
  //   sp.anchor.set(0.5);
  //   sp.position.x = 150;
  //   return sp;
  // },
};

export const defaultLevelOptions: Readonly<LevelOptions> = {
  endConditionText: (ctx) =>
    `Reach ${crispr.scrap(ctx.options.gaugeOptions.max, ctx)} crispies`,
  winCondition: (ctx) =>
    ctx.options.gaugeOptions.get(ctx) >=
    crispr.scrap(ctx.options.gaugeOptions.max, ctx),
  loseCondition: (ctx) => ctx.life <= 0,
  gridCleaning: false,
  mustBeHiddenOnPause: false,
  disablingAnimations: [],
  disableExtraSequence: false,
  showMatchOnCrunch: true,
  disableBonuses: false,
  disableViruses: false,
  disableButton: false,
  disableGauge: false,
  disableScore: false,
  disableClips: false,
  retryOnFail: true,
  infection: true,
  falling: false,
  remainingMoves: false,
  crunchOnPointerUp: true,
  displayTurnTitles: true,
  variant: "turn",
  virus: "mini",
  maxLife: 5,
  fallingSpeed: 1,
  canCrunchParts: null,
  gaugeOptions: defaultScoreOptions,
  baseCrispyGain: 10,
  minStarNeeded: 0,
  crispyBonusRate: 0.1,
  gaugeRings: [],
  sequenceLength: (level) =>
    Math.ceil(
      crispr.random(
        4,
        Math.min(
          8,
          level.grid.getIslands().sort((a, b) => a.length - b.length)[0]
            ?.length ?? 8
        )
      )
    ),
  sequences: null,

  clipCount: 4,
  portalsCount: 0,
  jokerCount: 0,

  actionButtonSprite: "images/hud_action_button.png",

  nucleotideRadius: crispr.width / 13.44,
  sequenceNucleotideRadius: crispr.width * 0.04,
  sequenceRounded: false,
  gridShape: "full",
  forceMatching: false,
  hooks: [],
  initialBonuses: [],
  checks: {
    //"No virus has escaped": (level) => !level.someVirusHasEscaped,
    "Not infected": (level) => !level.wasInfected,
    "No bonus used": (level) => !level.bonusesManager.wasBonusUsed,
    "All virus killed": (level) =>
      level.options.gaugeOptions.get(level) >=
      crispr.scrap(level.options.gaugeOptions.max, level),
  },
  music: null,
  noCrispyBonus: false,

  // reset options
  resetScore: true,
  resetGrid: true,
  resetSequences: true,
  resetBonuses: true,

  // zen
  remainingMoveCount: 5,
};

export type LevelEventName = keyof LevelEvents;
export type LevelEventParams<
  EventName extends LevelEventName
> = LevelEvents[EventName];

export interface LevelEvents {
  end: [];
  init: [];
  setup: [];
  update: [level: Level];
  canReset: [];
  infected: [];
  fallingDown: [];
  virusLeaves: [virus: virus.Virus];
  closedPopup: [popup: popup.Popup];
  minimizedPopup: [popup: popup.Popup];
  pathCrunched: [];
  partialCrunched: [];
  cleanedInfection: [];
  pathUpdated: [];
  ringReached: [ring: hud.Ring];
  sequenceDown: [];
  clickedBonus: [bonus: bonuses.Bonus];
  outOfZenMoves: [];
  maxScoreReached: [];
  injectedSequence: [sequence: sequence.Sequence];
  clickedNucleotide: [nucleotide: nucleotide.Nucleotide];
}

export interface HookOptions<
  Entity extends entity.Entity,
  EventName extends LevelEventName
> {
  id: string;
  delay?: number;
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
  constructor(public readonly options: HookOptions<Entity, EventName>) {
    super();
  }

  get level(): Level {
    return this._entityConfig.level;
  }

  protected _setup() {
    this[this.options.once ? "_once" : "_on"](
      this.level,
      this.options.event,
      this.listener.bind(this)
    );
    if (crispr.debug) {
      console.log("hook setup:", this.options.id);
    }
  }

  protected _teardown() {
    if (crispr.debug) {
      console.log("hook teardown:", this.options.id);
    }
  }

  private listener(...params: any[]) {
    if (!this.isSetup) {
      console.error("Error: hook listener must be deleted!");
      return;
    }

    if (
      !this.options.filter ||
      this.options.filter.bind(this.level)(...params)
    ) {
      this.level.triggeredHooks.add(this.options.id);

      const delay = this.options.delay ?? 0;

      if (this.options.reset) {
        if (crispr.debug) {
          console.log("hook reset:", this.options.id);
        }

        // get new options
        const newOptions =
          typeof this.options.reset === "function"
            ? this.options.reset(this.level)
            : this.options.reset;

        // set auto-reset option
        const resetOptions: Partial<LevelOptions> = {
          hooks: [],
          sequences: null,
          disablingAnimations: [],
          resetGrid: false,
          resetScore: false,
          resetBonuses: false,
          resetSequences: false,
          forceMatching: false,
          disableClips: false,
        };

        // apply changes
        this._activateChildEntity(
          new entity.EntitySequence([
            new entity.WaitingEntity(delay),
            new entity.FunctionCallEntity(() => {
              this.level.reset({
                ...this.level.options,
                ...resetOptions,
                ...newOptions,
              });
            }),
          ])
        );
      } else if (this.options.entity) {
        if (crispr.debug) {
          console.log("hook activate:", this.options.id, this.options.entity);
        }

        this._activateChildEntity(
          new entity.EntitySequence([
            new entity.WaitingEntity(delay),
            new entity.FunctionCallEntity(() => {
              if (this.options.entity instanceof popup.Popup) {
                this.level.activate(this.options.entity);
              } else {
                this._activateChildEntity(this.options.entity);
              }
            }),
          ])
        );
      } else {
        if (crispr.debug) {
          console.error("hook called but not triggered:", this.options.id);
        }
      }
    }
  }
}

export class Level extends entity.CompositeEntity {
  public options: LevelOptions;

  // system
  /**
   * Disable continuous events while `disablingAnimations` contains one or more elements. <br>
   * **Flag accessor**: `<Level>.isDisablingAnimationInProgress`
   */
  public disablingAnimations: Set<string> = new Set();
  public triggeredHooks: Set<string> = new Set();
  public fallingStopped = false;
  public container = new PIXI.Container();
  public backgroundCellDangerMask: PIXI.Sprite;
  public backgroundLayers: PIXI.Sprite[];
  public sequenceManager: sequence.SequenceManager;
  public bonusesManager: bonuses.BonusesManager;
  public hairManager: hair.HairManager;
  public swimmingViruses: virus.SwimmingVirus[] = [];
  public swimmingVirusCount = 0;
  public swimmingVirusesContainer = new PIXI.Container();
  public gauge: hud.Gauge;
  public path: path.Path;
  public grid: grid.Grid;
  public actionButton: hud.ActionButton;
  public remainingMovesIndicator: hud.RemainingMovesIndicator;
  public menu: menu.Menu;

  // screen shake
  public screenShakeAmplitude: number;
  public screenShakeDuration: number;
  public screenShakeZoom: number;
  public screenShakeStart: number;
  //public screenShakeComponents: (PIXI.Sprite | PIXI.AnimatedSprite | PIXI.Container)[]

  // game
  private _life: number;
  public crispies = 0;
  public killedViruses = 0;
  public wasInfected = false;
  public someVirusHasEscaped = false;
  public crunchCount = 0;
  public failed = false;
  public finished = false;
  public sequenceWasCrunched = false;
  public clipsWasIncludes = false;
  public oneShotSequence = false;
  public crunchedSequenceCount = 0;
  public isInit = false;
  public isEnded = false;
  public playTime = 0;
  public lastPlayTime = 0;

  // bonuses
  public syringeBonus: bonuses.Bonus;
  public healBonus: bonuses.Bonus;
  public swapBonus: bonuses.Bonus;
  public timeBonus: bonuses.Bonus;

  constructor(
    public name: levels.LevelName,
    optionsResolvable:
      | ((context: Level) => Partial<LevelOptions>)
      | Partial<LevelOptions>
  ) {
    super();
    const options =
      typeof optionsResolvable === "function"
        ? optionsResolvable(this)
        : optionsResolvable;

    this.options = {
      ...defaultLevelOptions,
      ...levelVariants[options.variant],
      ...options,
    };

    this.options.gaugeOptions = {
      ...defaultScoreOptions,
      ...this.options.gaugeOptions,
    };

    this.options.gaugeOptions.set(this.options.gaugeOptions.initial, this);

    // @ts-ignore
    window.level = this;
  }

  get variant(): LevelVariant {
    return this.options.variant;
  }

  activate(entity: entity.Entity) {
    if (!entity.isSetup) this._activateChildEntity(entity, this.config);
  }

  deactivate(entity: entity.Entity) {
    if (entity.isSetup) this._deactivateChildEntity(entity);
  }

  emitLevelEvent<K extends LevelEventName>(
    event: K,
    ...params: LevelEventParams<K>
  ) {
    return super.emit(event, ...params);
  }

  onLevelEvent<K extends LevelEventName>(
    event: K,
    callback: (...params: LevelEventParams<K>) => any
  ) {
    this._on(this, event, callback);
  }

  onceLevelEvent<K extends LevelEventName>(
    event: K,
    callback: (...params: LevelEventParams<K>) => any
  ) {
    this._once(this, event, callback);
  }

  get minimap(): minimap.Main {
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

  private _initLife() {
    this.life = this.options.maxLife;
  }

  private _initScreenShake() {
    this.screenShake(0, 0, 0);
    // this.screenShakeComponents = [
    //   ...this.backgroundLayers,
    //   this.grid.container
    // ]
  }

  private _initMenu() {
    this.menu = new menu.Menu();
    this._activateChildEntity(
      this.menu,
      entity.extendConfig({
        container: this._entityConfig.app.stage,
      })
    );
  }

  private _disableMenu() {
    this._deactivateChildEntity(this.menu);
  }

  private _initHooks() {
    if (crispr.debug)
      console.log(
        "hooks to init",
        this.options.hooks.map((h) => h.options.id)
      );
    this.options.hooks.forEach((hook) => {
      this._activateChildEntity(hook, this.config);
    });
  }

  private _initBackground() {
    this.backgroundLayers = [];
    [
      "background.png",
      "background_layer_1.png",
      "background_layer_2.png",
      //"background_layer_3-eclaircir.png",
      //"background_layer_4-lumiere_tamisee.png",
      "background_cell.png",
      "background_cell_danger.png",
    ].forEach((filename) => {
      const sprite = crispr.sprite(this, "images/" + filename);

      if (filename.includes("background_layer"))
        this.backgroundLayers.push(sprite);

      if (filename.includes("3")) sprite.blendMode = PIXI.BLEND_MODES.LIGHTEN;

      if (filename.includes("4"))
        sprite.blendMode = PIXI.BLEND_MODES.SOFT_LIGHT;

      if (filename.includes("background_cell_danger.png")) {
        this.backgroundCellDangerMask = crispr.sprite(
          this,
          "images/background_cell_danger_mask.png"
        );
        this.container.addChild(this.backgroundCellDangerMask);
        sprite.anchor.set(0, 1);
        sprite.position.y = crispr.height;
        sprite.mask = this.backgroundCellDangerMask;
      }

      this.container.addChild(sprite);
    });

    this.container.addChild(this.swimmingVirusesContainer);
  }

  private _initForeground() {
    const membrane = crispr.sprite(this, "images/membrane.png");
    membrane.position.set(0, 300);
    this.container.addChild(membrane);
  }

  private _initPath() {
    this.path = new path.Path();
    this._activateChildEntity(this.path, this.config);
  }

  private _initGrid() {
    this.grid = new grid.Grid();
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

    this.actionButton = new hud.ActionButton();
    this._activateChildEntity(this.actionButton, this.config);
  }

  private _disableButton() {
    if (this.options.disableButton) return;
    this._deactivateChildEntity(this.actionButton);
    this.actionButton = null;
  }

  private _initBonuses() {
    if (this.options.disableBonuses) return;
    this.bonusesManager = new bonuses.BonusesManager(
      this.options.initialBonuses
    );

    this.healBonus = new bonuses.HealBonus(this.bonusesManager);
    this.swapBonus = new bonuses.SwapBonus(this.bonusesManager);
    this.timeBonus = new bonuses.TimeBonus(this.bonusesManager);

    this._activateChildEntity(this.bonusesManager, this.config);
  }

  private _disableBonuses() {
    if (this.options.disableBonuses) return;

    this._deactivateChildEntity(this.bonusesManager);
    this.bonusesManager = null;
  }

  private _initRemainingMoves() {
    if (!this.options.remainingMoves) return;
    this.remainingMovesIndicator = new hud.RemainingMovesIndicator();
    this._activateChildEntity(this.remainingMovesIndicator, this.config);
  }

  private _disableRemainingMoves() {
    if (!this.options.remainingMoves) return;
    this._deactivateChildEntity(this.remainingMovesIndicator);
    this.remainingMovesIndicator = null;
  }

  private _initGauge() {
    if (this.options.disableGauge) return;

    this.gauge = new hud.Gauge(this.options.gaugeRings.length);

    this._activateChildEntity(this.gauge, this.config);
  }

  private _disableGauge() {
    if (this.options.disableGauge) return;
    this._deactivateChildEntity(this.gauge);
    this.gauge = null;
  }

  private _initDisablingAnimations() {
    this.options.disablingAnimations.forEach((id) => {
      this.disablingAnimation(id, true);
    });
  }

  private _initMusic() {
    let music: string;

    if (this.options.music) {
      music = this.options.music;
    } else {
      switch (this.options.variant) {
        case "turn": {
          music = "turn_by_turn";
          break;
        }
        case "fall": {
          music = "time_challenge";
          break;
        }
        case "zen": {
          music = "zen";
          break;
        }
      }
    }

    this._entityConfig.jukebox.play(music);
  }

  _setup() {
    this.isInit = false;
    this.container.sortableChildren = true;
    this._entityConfig.level = this;
    this._entityConfig.container.addChild(this.container);

    // this._on(this,"deactivatedChildEntity", (e) => {
    //   if (e instanceof Hook) {
    //     this.options.hooks = this.options.hooks.filter((h) => h !== e);
    //   }
    // });

    if (this.options.remainingMoves) {
      // remove a zen move
      this.onLevelEvent("pathCrunched", () => {
        this.remainingMovesIndicator.removeOne();
      });
    }

    if (this.options.variant === "zen" || this.options.variant === "fall") {
      // directly fill holes after crunch
      this.onLevelEvent("pathCrunched", () => {
        this._activateChildEntity(this.fillHoles());
      });
    }

    this.onLevelEvent("pathUpdated", this.refresh.bind(this));

    this.onLevelEvent("sequenceDown", () => {
      this._activateChildEntity(
        new entity.EntitySequence([
          this.fillHoles(),
          new entity.FunctionCallEntity(() => {
            this.sequenceManager.add();
          }),
        ])
      );
    });

    this.onLevelEvent("fallingDown", () => {
      this.screenShake(100, 1.2, 500);
      this._activateChildEntity(
        new entity.EntitySequence([
          new entity.FunctionCallEntity(() => {
            this.path.remove();
          }),
          this.infect(true),
        ])
      );
    });

    this.onLevelEvent("end", () => {
      this.isEnded = true;
    });

    this._initScreenShake();
    this._initDisablingAnimations();
    this._initMusic();
    this._initBackground();
    this._initForeground();
    this._initHooks();

    this.emitLevelEvent("init");
    this.isInit = true;

    this._initLife();
    this._initRemainingMoves();
    this._initGrid();
    this._initPath();
    this._initHairs();
    this._initBonuses();
    this._initButton();
    this._initGauge();
    this._initMenu();

    this._activateChildEntity(
      new entity.EntitySequence([
        new entity.FunctionalEntity({
          requestTransition: () =>
            !this.disablingAnimations.has("preventVirus"),
        }),
        new entity.FunctionCallEntity(() => {
          this._initSequences();

          this.refresh();

          this.emitLevelEvent("setup");
        }),
      ])
    );
  }

  _update(frameInfo: entity.FrameInfo) {
    this.playTime += frameInfo.playTime - this.lastPlayTime;
    this.lastPlayTime = frameInfo.playTime;

    if (this.isEnded) return;
    if (this.finished) return;

    this.emitLevelEvent("update", this);

    if (!this.options.disableGauge) this.gauge.refreshValue();

    // swimming viruses
    {
      while (this.swimmingViruses.length < this.swimmingVirusCount) {
        const generated = virus.generateSwimmingVirus(
          this,
          this.backgroundCellDangerMask.y * -1
        );

        this._activateChildEntity(
          generated.entity,
          entity.extendConfig({
            container: this.swimmingVirusesContainer,
          })
        );

        this.swimmingViruses.push(generated);
      }

      while (this.swimmingViruses.length > this.swimmingVirusCount) {
        const removed = this.swimmingViruses.shift();

        this.deactivate(removed.entity);
      }

      this.swimmingViruses.forEach((v) => {
        v.entity.sprite.x += v.speed;
        if (
          v.entity.sprite.x > crispr.width + 400 ||
          v.entity.sprite.x < -400
        ) {
          virus.generateSwimmingVirus(
            this,
            this.backgroundCellDangerMask.y * -1,
            v
          );
        }
      });
    }

    if (
      this.screenShakeDuration &&
      this.screenShakeStart &&
      this.screenShakeAmplitude &&
      this.screenShakeZoom
    ) {
      const duration = Date.now() - this.screenShakeStart;
      const DESC = crispr.proportion(
        duration,
        0,
        this.screenShakeDuration,
        1,
        0
      );

      if (duration > this.screenShakeDuration) {
        this.disablingAnimation("level.screenShake", false);
        this.container.scale.set(1);
        this.container.position.set(0);
      } else {
        this.container.scale.set(
          crispr.proportion(
            duration,
            0,
            this.screenShakeDuration,
            this.screenShakeZoom,
            1
          )
        );
        this.container.position.set(
          (crispr.width / 2 - crispr.width / 2 / (1 / this.screenShakeZoom)) *
            DESC,
          (crispr.height / 2 - crispr.height / 2 / (1 / this.screenShakeZoom)) *
            DESC
        );
        this.container.position.x +=
          Math.sin(Date.now() / 15) * DESC * this.screenShakeAmplitude;
        this.container.position.y +=
          Math.sin(Date.now() / 19) * DESC * this.screenShakeAmplitude;
      }
    } else {
      this.disablingAnimation("level.screenShake", false);
      this.container.scale.set(1);
      this.container.position.set(0);
    }

    if (this.backgroundLayers) {
      this.backgroundLayers.forEach((layer, i) => {
        layer.position.y =
          Math.cos(frameInfo.playTime / 3000 + i * 1000) * ((i + 1) * 2) * -10;
      });
    }

    if (this.failed || this.finished) return;

    if (this.options.winCondition(this)) {
      this.finished = true;
      this.minimap.saveResults(this);
      this._activateChildEntity(
        new entity.EntitySequence([
          new entity.WaitingEntity(2000),
          new popup.TerminatedLevelPopup(),
        ])
      );
      return;
    } else if (this.options.loseCondition(this)) {
      this.finished = true;
      this.failed = true;
      this._activateChildEntity(
        new entity.EntitySequence([
          new entity.WaitingEntity(2000),
          new popup.FailedLevelPopup(),
        ])
      );
      return;
    }

    if (!this.sequenceManager || !this.sequenceManager.isSetup) return;
    if (this.options.variant !== "fall") return;
    if (this.fallingStopped) return;
    if ([...this.disablingAnimations].some((name) => !name.startsWith("popup")))
      return;

    // if falling sequence is down, infect
    if (
      this.sequenceManager.advanceSequences(
        this.options.fallingSpeed * baseDropSpeed
      ).length > 0
    ) {
      this.emitLevelEvent("fallingDown");
    }
  }

  _teardown() {
    this.container.removeChildren();
    this._entityConfig.container.removeChildren();
    this.disablingAnimations.clear();
    this.removeAllListeners();
  }

  reset(options: LevelOptions) {
    this.isInit = false;
    this._entityConfig.level = this;

    // assign flags
    for (const key in options) {
      // @ts-ignore
      const value: any = options[key];
      if (
        (typeof value === "boolean" ||
          typeof value === "number" ||
          typeof value === "string") &&
        !/^disable(?:Bonuses|Button|Gauge)$/.test(key)
      ) {
        // @ts-ignore
        this.options[key] = value;
      }
    }

    this._initScreenShake();
    this._initDisablingAnimations();
    this._initLife();

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
    if (options.resetScore) {
      this.options.gaugeOptions = {
        ...this.options.gaugeOptions,
        ...options.gaugeOptions,
      };
      this.options.gaugeOptions.set(this.options.gaugeOptions.initial, this);
    }

    // Bonus manager
    if (options.resetBonuses && !options.disableBonuses) {
      this.options.initialBonuses = options.initialBonuses;
      this.bonusesManager.reset();
    }

    // grid rebuild
    if (options.resetGrid) {
      console.table({
        oldOptions: this.options.clipCount,
        newOptions: options.clipCount,
      });
      this.options.gridShape = options.gridShape;
      this.grid.reset();
    }

    // Sequence manager
    if (options.resetSequences) {
      this.options.sequences = options.sequences;
      this.sequenceManager.reset();
    }

    // Hooks
    {
      if (crispr.debug) {
        console.log(
          "hooks to deactivate",
          this.options.hooks.map((h) => h.options.id)
        );
      }
      this.options.hooks.forEach((hook) => {
        this._deactivateChildEntity(hook);
      });

      this.options.hooks = options.hooks.slice(0);

      this._initHooks();
    }

    // Menu
    {
      this._disableMenu();
      this._initMenu();
    }

    this.refresh();

    this.emitLevelEvent("init");
    this.isInit = true;

    if (crispr.debug) {
      console.log("--> DONE", "level.reset()");
    }
  }

  set life(life: number) {
    this._life = life;
    this.swimmingVirusCount = Math.round(
      crispr.proportion(life, this.options.maxLife, 0, 0, 5)
    );
    if (this.backgroundCellDangerMask) {
      this.backgroundCellDangerMask.position.y = Math.max(
        -1420,
        crispr.proportion(life, this.options.maxLife, 1, 200, -1420)
      );
    }
  }

  get life(): number {
    return this._life;
  }

  solution() {
    this.activate(this.grid.applySolution());
  }

  disablingAnimation(name: string, state: boolean) {
    const oldLength = this.disablingAnimations.size;
    this.disablingAnimations[state ? "add" : "delete"](name);
    if (crispr.debug) {
      const newLength = this.disablingAnimations.size;
      if (oldLength !== newLength) {
        console.log("updated disabling animations:", newLength, [
          ...this.disablingAnimations,
        ]);
      } else if (state) {
        console.warn(`Warning: useless start of disablingAnimation:`, name);
      }
    }
  }

  screenShake(amplitude: number, zoom: number, duration: number) {
    this.disablingAnimation("level.screenShake", true);
    this.screenShakeAmplitude = amplitude;
    this.screenShakeDuration = duration;
    this.screenShakeZoom = zoom;
    this.screenShakeStart = Date.now();
  }

  removeHalfScore(): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.ParallelEntity([
        new tween.Tween({
          from: this.crispies,
          to: Math.floor(this.crispies / 2),
          duration: 600,
          onUpdate: (value) => (this.crispies = value),
        }),
        anim.tweenShaking(this.gauge.container, 600, 10, 0),
        new entity.EntitySequence([
          new tween.Tween({
            from: this.options.gaugeOptions.color,
            to: 0xff0000,
            duration: 300,
            onUpdate: (value) => this.gauge.setTint(value),
            interpolate: tween.interpolation.color,
          }),
          new tween.Tween({
            from: 0xff0000,
            to: this.options.gaugeOptions.color,
            duration: 300,
            onUpdate: (value) => this.gauge.setTint(value),
            interpolate: tween.interpolation.color,
          }),
        ]),
      ]),
    ]);
  }

  checkAndReturnsResults(): LevelResults {
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

    const failed = starCount < this.options.minStarNeeded || this.failed;

    return {
      checks,
      checkCount,
      checkedCount,
      starCount,
      failed,
    };
  }

  resolveSignatures(): {
    sequenceSignature: string;
    pathSignature: string;
  } | null {
    let pathSignature = this.path.toString();
    let sequenceSignature = this.sequenceManager.first?.toString();

    if (!pathSignature || !sequenceSignature) return null;

    for (
      let i = 0;
      i < pathSignature.length && i < sequenceSignature.length;
      i++
    ) {
      if (pathSignature[i] === "*") {
        sequenceSignature =
          sequenceSignature.substring(0, i) +
          "*" +
          sequenceSignature.substring(i + 1);
      } else if (sequenceSignature[i] === "*") {
        pathSignature =
          pathSignature.substring(0, i) + "*" + pathSignature.substring(i + 1);
      }
    }

    return { pathSignature, sequenceSignature };
  }

  exit(save: boolean = false) {
    if (save) this.minimap.saveResults(this);
    this._transition = entity.makeTransition();
  }

  get isDisablingAnimationInProgress(): boolean {
    return this.disablingAnimations.size > 0 || this.finished || this.failed;
  }

  public attemptCrunch(): entity.Entity {
    const sequence = this.sequenceManager.first;

    const context: entity.EntityResolvable[] = [];
    const parallel: entity.EntityResolvable[] = [];

    if (!sequence.validate()) return this.actionButton.errorAnimation();
    else parallel.push(this.actionButton.clickAnimation());

    this.disablingAnimation("level.attemptCrunch", true);

    sequence.addScoring(this.path.items.map((n) => n.toJSON()));
    parallel.push(this.path.crunch());

    if (this.options.variant === "zen") {
      sequence.deactivateSegment();

      if (sequence.maxActiveLength < 3) {
        parallel.push(sequence.down(true));
      }
    } else {
      parallel.push(sequence.down(true));
    }

    context.push(
      new entity.ParallelEntity(parallel),
      new entity.FunctionCallEntity(() => {
        this.sequenceManager.adjustment.adjust();
      }),
      this.fillHoles(),
      new entity.FunctionCallEntity(() => {
        this.disablingAnimation("level.attemptCrunch", false);
        this.emitLevelEvent("pathCrunched");
      })
    );

    return new entity.EntitySequence(context);
  }

  public setActionButtonText(text: path.PathState) {
    this.actionButton?.setText(text);
  }

  public refresh(): void {
    if (this.path.items.length > 0) {
      if (!this.path.correctlyContainsClips()) {
        this.setActionButtonText("missing clips");
      } else {
        if (this.options.variant === "zen") this.setActionButtonText("crunch");
        else this.setActionButtonText("matching");
      }
    } else {
      this.setActionButtonText("skip");
    }
    this.sequenceManager.updateHighlighting();
  }

  public fillHoles(): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.FunctionalEntity({
        requestTransition: () =>
          !this.disablingAnimations.has("path.crunch.down"),
      }),
      new entity.FunctionCallEntity(() => {
        this.disablingAnimation("level.fillHoles", true);
        this.grid.fillHoles();
      }),
      // todo: replace waiting entity by this.grid.fillHoles():SeqenceEntity
      new entity.WaitingEntity(1000),
      new entity.FunctionCallEntity(() => {
        this.refresh();
        this.disablingAnimation("level.fillHoles", false);
      }),
    ]);
  }

  public infect(withSound = false): entity.Entity {
    return new entity.EntitySequence(
      !this.options.infection
        ? []
        : [
            new entity.FunctionCallEntity(() => {
              this.disablingAnimation("level.infect", true);
              this.wasInfected = true;
              if (withSound) this._entityConfig.fxMachine.play("skip");
            }),
            new tween.Tween({
              from: this.life,
              to: this.life - 1,
              easing: easing.easeInOutQuad,
              duration: 2500,
              onUpdate: (value) => {
                this.life = value;
              },
            }),
            //this.grid.infect(),
            new entity.FunctionCallEntity(() => {
              this.disablingAnimation("level.infect", false);
              this.emitLevelEvent("infected");
            }),
          ]
    );
  }
}
