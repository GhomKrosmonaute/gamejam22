import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as geom from "booyah/src/geom";
import * as tween from "booyah/src/tween";

import * as crisprUtil from "../crisprUtil";
import * as anim from "../animations";
import * as game from "../game";

import * as sequence from "../entities/sequence";
import * as bonuses from "../entities/bonus";
import * as virus from "../entities/virus";
import * as grid from "../entities/grid";
import * as path from "../entities/path";
import * as hair from "../entities/hair";
import * as hud from "../entities/hud";

export type LevelVariant = "turnBased" | "continuous" | "long";
export type LevelState = "crunch" | "regenerate" | "bonus";

const dropSpeed = 0.001;

/**
 * Emits:
 * - maxScoreReached()
 * - ringReached(ring: PIXI.Sprite, index: number)
 * - scoreUpdated(score: number)
 */
export class Level extends entity.CompositeEntity {
  public container = new PIXI.Container();
  public nucleotideRadius = game.width / 13.44;
  public sequenceManager: sequence.SequenceManager;
  public bonusesManager: bonuses.BonusesManager;
  public hairManager: hair.HairManager;
  public gauge: hud.Gauge;
  public path: path.Path;
  public grid: grid.Grid;
  public state: LevelState = "crunch";

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

  public swapBonus = new bonuses.SwapBonus();
  public starBonus = new bonuses.StarBonus();
  public killBonus = new bonuses.KillBonus();

  public readonly colCount = 7;
  public readonly rowCount = 7;
  public readonly cutCount = 6;

  private bonusBackground: PIXI.Sprite;
  private goButton: PIXI.Container & { text?: PIXI.Text };
  private crunchCount = 0;

  public score = 0;

  constructor(
    public readonly levelVariant: LevelVariant,
    public readonly maxScore = 1000,
    public readonly gaugeRingCount = 5,
    public readonly baseScore = 10
  ) {
    super();
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
    this._on(this.path, "updated", this._refresh);
    this._activateChildEntity(this.path, this.config);
  }

  private _initGrid() {
    this.grid = new grid.Grid(
      this.colCount,
      this.rowCount,
      this.cutCount,
      this.nucleotideRadius
    );
    this._on(this.grid, "pointerup", this._attemptCrunch);
    this._activateChildEntity(this.grid, this.config);
  }

  private _initSequences() {
    this.sequenceManager = new sequence.SequenceManager();

    let virus: virus.Virus;

    this._on(this, "activatedChildEntity", (child: entity.EntityBase) => {
      if (child !== this.sequenceManager) return;

      virus = this._makeVirus();

      this._on(virus, "changedState", (newState) => {
        if (newState !== "stingOut") return;

        this.sequenceManager.add();
        if (this.levelVariant === "turnBased")
          this.sequenceManager.distributeSequences();
      });
    });

    this._activateChildEntity(this.sequenceManager, this.config);
  }

  private _initHairs() {
    this.hairManager = new hair.HairManager();
    this._activateChildEntity(this.hairManager, this.config);
  }

  private _initButton() {
    this.goButton = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        "images/hud_go_button.png"
      ].texture
    );
    this.goButton.position.set(
      this._entityConfig.app.view.width * 0.734,
      this._entityConfig.app.view.height * 0.8715
    );
    this.goButton.interactive = true;
    this.goButton.buttonMode = true;
    this._on(this.goButton, "pointerup", this._onGo);
    this.container.addChild(this.goButton);

    this.goButton.text = crisprUtil.makeText("GO", {
      fill: 0x000000,
    });
    this.goButton.text.position.set(
      this.goButton.width / 2,
      this.goButton.height / 2
    );
    this.goButton.addChild(this.goButton.text);
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
    // todo: continue
    this.container.addChild(this.bonusBackground);
    this.bonusesManager = new bonuses.BonusesManager();
    this._on(this, "activatedChildEntity", (child: entity.EntityBase) => {
      if (child === this.bonusesManager) {
        this.bonusesManager.add(this.swapBonus, 5);
        this.bonusesManager.add(this.starBonus, 5);
        this.bonusesManager.add(this.killBonus, 5);
        this._on(this.sequenceManager, "crunch", () => {
          this.crunchCount++;
          if (this.crunchCount % 2 === 0) {
            this.bonusesManager.add(this.swapBonus);
          }
        });
      }
    });
    this._activateChildEntity(this.bonusesManager, this.config);
  }

  private _makeVirus(): virus.Virus {
    const v = new virus.Virus(virus.leftEdge);
    const config = entity.extendConfig({
      container: this.container,
    });
    this._activateChildEntity(v, config);

    const moveVirus = new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        v.moveToAngle(geom.degreesToRadians(geom.randomInRange(10, -10)));
      }),
      new entity.WaitForEvent(
        v,
        "changedState",
        (newState, oldState) => oldState === "walk"
      ),
      new entity.FunctionCallEntity(() => {
        v.sting();
      }),
      new entity.WaitForEvent(
        v,
        "changedState",
        (newState, oldState) => oldState === "stingOut"
      ),
      new entity.FunctionCallEntity(() => {
        v.leave();
      }),
      new entity.WaitForEvent(
        v,
        "changedState",
        (newState, oldState) => oldState === "walk"
      ),
    ]);
    this._activateChildEntity(moveVirus, config);

    return v;
  }

  private _initGauge() {
    this.gauge = new hud.Gauge(this.gaugeRingCount, this.maxScore);
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
    // this._initVirus();
    this._initHairs();
    this._initSequences();
    this._initBonuses();
    this._initButton();
    this._initGauge();

    this._refresh();
    this.isGuiLocked = false;
  }

  _update() {
    if (
      this.levelVariant !== "continuous" ||
      this.isDisablingAnimationInProgress
    )
      return;

    const droppedSequences = this.sequenceManager.advanceSequences(dropSpeed);
    if (droppedSequences.length > 0) {
      this._onInfection(droppedSequences.length);
    }
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
    this.gauge = null;
    this.path = null;
    this.grid = null;
    this.sequenceManager = null;
  }

  addScore(score: number) {
    if (this.score === this.maxScore) {
      return;
    } else if (this.score + score >= this.maxScore) {
      this.emit("maxScoreReached");
      this.score = this.maxScore;
    } else {
      this.emit("scoreUpdated", score);
      this.score += score;
    }
    this.gauge.setValue(this.score);
  }

  private _onGo(): void {
    if (this.isGuiLocked) return;

    if (this.path.items.length > 0) return;

    if (this.levelVariant === "turnBased" || this.levelVariant === "long") {
      if (this.grid.containsHoles()) {
        this._regenerate();
      } else {
        // TODO: add confirm dialog "Are you sure?"

        this._activateChildEntity(
          new entity.EntitySequence([
            new entity.FunctionCallEntity(() => {
              this.isGuiLocked = true;
              this.grid.regenerate(5, (n) => n.state === "present");
            }),
            new entity.WaitingEntity(1200),
            new entity.FunctionCallEntity(() => {
              this._endTurn();
              this._refresh();
            }),
          ])
        );
      }
    } else {
      // As if the sequence dropped all the way down
      this.sequenceManager.dropSequences();
      this._onInfection();
    }
  }

  get isDisablingAnimationInProgress(): boolean {
    return this.disablingAnimations.size > 0;
  }

  get isGuiLocked(): boolean {
    return !this.goButton.buttonMode || this.isDisablingAnimationInProgress;
  }

  set isGuiLocked(value: boolean) {
    this.goButton.buttonMode = !value;
    this.goButton.interactive = !value;
    this.goButton.text.style.fill = !value ? "#000000" : "#4e535d";
    for (const bonusName in this.bonusesManager.sprites) {
      this.bonusesManager.sprites[bonusName].buttonMode = !value;
    }
  }

  private _endTurn(): void {
    if (this.grid.isGameOver()) {
      this._transition = entity.makeTransition("game_over");
      return;
    }

    // Create a list of "actions" that will take place at the end of calling this function
    let actions: entity.Entity[] = [];

    const countSequences = this.sequenceManager.countSequences;
    if (countSequences > 0) {
      const infectionSequence = this.grid.infect(countSequences * 5);
      actions.push(infectionSequence);
    }

    if (countSequences < this.sequenceManager.sequenceCountLimit) {
      actions.push(
        new entity.FunctionCallEntity(() => {
          this.sequenceManager.add();
          this.sequenceManager.distributeSequences();
        })
      );
    }

    actions.push(
      new entity.FunctionCallEntity(() => {
        this.isGuiLocked = false;
      })
    );

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
      if (this.levelVariant === "turnBased") {
        this.sequenceManager.distributeSequences();
      }

      if (
        this.levelVariant === "long" &&
        this.sequenceManager.sequences[0] &&
        this.sequenceManager.sequences[0].maxActiveLength < 3
      ) {
        await new Promise((resolve) => {
          this.sequenceManager.sequences[0].down(true, resolve);
        });

        // const fully = sequence.nucleotides.every((n) => n.state === "inactive");
        // await new Promise((resolve) => {
        //   this._activateChildEntity(
        //     new entity.EntitySequence([
        //       ...sequence.nucleotides
        //         .map((n, i) => {
        //           const baseShift = Math.round(Math.random() * 50) + 50;
        //           const score =
        //             10 *
        //             Math.ceil((i + 1) / 2) *
        //             (n.state !== "inactive" ? 1 : -1) *
        //             (fully ? 2 : 1);
        //           return [
        //             new entity.FunctionCallEntity(() => {
        //               this._activateChildEntity(
        //                 anim.textFade(
        //                   this.container,
        //                   new PIXI.Text(`${score}`, {
        //                     fontSize: 80,
        //                     fontFamily: "Cardenio Modern Bold",
        //                     fill:
        //                       score < 0
        //                         ? "#d70000"
        //                         : nucleotide.fullColorNames[n.colorName],
        //                     stroke: fully
        //                       ? "#ffcb00"
        //                       : score < 0
        //                       ? "#000000"
        //                       : "#ffffff",
        //                     strokeThickness: score < 0 ? 3 : 10,
        //                   }),
        //                   1000,
        //                   new PIXI.Point(
        //                     n.position.x + sequence.position.x,
        //                     n.position.y +
        //                       sequence.position.y +
        //                       baseShift * (score < 0 ? 1 : -1)
        //                   ),
        //                   score < 0 ? "down" : "up",
        //                   () => this.addScore(score)
        //                 )
        //               );
        //             }),
        //             new entity.WaitingEntity(80),
        //           ];
        //         })
        //         .flat(),
        //       new entity.FunctionCallEntity(resolve),
        //     ])
        //   );
        // });
        // await new Promise((resolve) => {
        //   sequence.down(false, resolve);
        // });
      }
      if (this.sequenceManager.countSequences === 0) {
        this._regenerate();
      }
    });

    // Makes holes in the grid that corresponds to the used nucleotides
    this.path.crunch();
  }

  public setGoButtonText(text: string) {
    this.goButton.text.style.fontSize = text.length > 6 ? 50 : 70;
    this.goButton.text.text = text;
  }

  private _refresh(): void {
    if (this.path.items.length > 0) {
      this.goButton.interactive = false;
      const match = this.sequenceManager.matchesSequence(this.path);
      if (match === true) {
        this.setGoButtonText("MATCH");
      } else {
        this.setGoButtonText(match);
      }
    } else {
      this.setGoButtonText("SKIP");
      this.goButton.interactive = true;
    }
    this.sequenceManager.updateHighlighting(this.path);
  }

  private _regenerate(): void {
    // Switch to regenerate mode
    this.state = "regenerate";
    this._refresh();

    const regen = () => {
      const newNucleotides = this.grid.fillHoles();

      // Wait for a second, then continue
      this._activateChildEntity(
        new entity.EntitySequence([
          new entity.WaitingEntity(1000),
          new entity.FunctionCallEntity(() => {
            this.state = "crunch";

            this._endTurn();
            this._refresh();
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

  private _onInfection(infectionCount = 1): void {
    if (this.grid.isGameOver()) {
      this._transition = entity.makeTransition("game_over");
      return;
    }

    const infectionSequence = this.grid.infect(infectionCount * 5);

    this._activateChildEntity(
      new entity.EntitySequence([
        new entity.FunctionCallEntity(() => {
          this.disablingAnimations.add("infection");
        }),
        infectionSequence,
        new entity.FunctionCallEntity(() => {
          this.sequenceManager.add();
          this.disablingAnimations.delete("infection");
        }),
      ])
    );
  }
}
