import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as geom from "booyah/src/geom";
import * as tween from "booyah/src/tween";

import * as crisprUtil from "../crisprUtil";
import * as anim from "../animations";
import * as game from "../game";
import * as filters from "../filters";

import * as nucleotide from "../entities/nucleotide";
import * as sequence from "../entities/sequence";
import * as bonuses from "../entities/bonus";
import * as virus from "../entities/virus";
import * as grid from "../entities/grid";
import * as path from "../entities/path";
import * as hair from "../entities/hair";
import { FrameInfo } from "booyah/src/entity";

export type LevelVariant = "turnBased" | "continuous" | "long";
export type LevelState = "crunch" | "regenerate" | "bonus";

const dropSpeed = 0.001;

/**
 * emit:
 * - maxScoreReached()
 * - scoreUpdated(score: number)
 */
export class Level extends entity.CompositeEntity {
  public container: PIXI.Container;
  public nucleotideRadius = game.width / 13.44;
  public sequenceManager: sequence.SequenceManager;
  public bonusesManager: bonuses.BonusesManager;
  public hairManager: hair.HairManager;
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

  private goButton: PIXI.Container & { text?: PIXI.Text };
  private crunchCount = 0;
  private gauge: PIXI.Container;
  private gaugeText: PIXI.Text;
  private gaugeBar: PIXI.Sprite;
  private gaugeRings: PIXI.Container;
  private gaugeBackground: PIXI.Sprite;
  private bonusBackground: PIXI.Sprite;
  private gaugeBarBaseWidth: number;
  private gaugeTriggered = false;

  public score = 0;

  constructor(
    public readonly levelVariant: LevelVariant,
    public readonly maxScore = 1000,
    public readonly gaugeRingCount = 5
  ) {
    super();
  }

  get cursor(): PIXI.Point {
    return this.grid.cursor;
  }

  _setup() {
    this._entityConfig.level = this;

    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);

    this.sequenceManager = new sequence.SequenceManager();

    // instancing path system
    this.path = new path.Path();
    this._on(this.path, "updated", this._refresh);

    // generating nucleotide grid
    this.grid = new grid.Grid(
      this.colCount,
      this.rowCount,
      this.cutCount,
      this.nucleotideRadius
    );
    this._on(this.grid, "pointerup", this._attemptCrunch);

    // background images
    {
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

    // add to entities path, grid and the test sequenceManager
    this._activateChildEntity(
      this.grid,
      entity.extendConfig({
        container: this.container,
      })
    );
    this._activateChildEntity(
      this.path,
      entity.extendConfig({
        container: this.container,
      })
    );
    this._activateChildEntity(
      this.sequenceManager,
      entity.extendConfig({
        container: this.container,
      })
    );

    // foreground images
    {
      const particles2 = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          "images/particles_foreground.png"
        ].texture
      );
      this.container.addChild(particles2);

      const membrane = new PIXI.Sprite(
        this._entityConfig.app.loader.resources["images/membrane.png"].texture
      );
      membrane.position.set(0, 300);
      this.container.addChild(membrane);

      // Make hair
      this.hairManager = new hair.HairManager();

      this._activateChildEntity(
        this.hairManager,
        entity.extendConfig({
          container: this.container,
        })
      );
    }

    // GUI/HUD
    {
      // GO button
      {
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

        this.goButton.text = crisprUtil.makeText("GO", 0x000000);
        this.goButton.text.position.set(
          this.goButton.width / 2,
          this.goButton.height / 2
        );
        this.goButton.addChild(this.goButton.text);
      }

      // Gauge bar (score/exp?)
      {
        this.gauge = new PIXI.Container();

        this.gaugeBackground = new PIXI.Sprite(
          this._entityConfig.app.loader.resources[
            "images/hud_gauge_background.png"
          ].texture
        );

        this.gaugeBar = new PIXI.Sprite(
          this._entityConfig.app.loader.resources[
            "images/hud_gauge_bar.png"
          ].texture
        );

        this.gaugeRings = new PIXI.Container()
        this.gaugeRings.position.x = 200

        for(let i=0; i<this.gaugeRingCount; i++){
          const gaugeRing = new PIXI.Sprite(
            this._entityConfig.app.loader.resources[
              "images/hud_gauge_ring.png"
              ].texture
          )
          gaugeRing.anchor.x = .5
          gaugeRing.position.x = crisprUtil.proportion(
            i, -1, this.gaugeRingCount, 0, 450, true
          )
          this.gaugeRings.addChild(gaugeRing)
        }

        this.gaugeText = crisprUtil.makeText("", 0x000000, 40);
        this.gaugeText.position.set(110, 110);

        this.gauge.addChild(this.gaugeBackground);
        this.gauge.addChild(this.gaugeBar);
        this.gauge.addChild(this.gaugeRings);
        this.gauge.addChild(this.gaugeText);

        this.container.addChild(this.gauge);

        this.gaugeBarBaseWidth = this.gaugeBar.width;

        this.setGaugeBarValue(0);

        // setup shockwave on max score is reached
        this._on(this, "maxScoreReached", () => {
          const filter = new filters.ShockwaveFilter(new PIXI.Point(110, 110), {
            amplitude: this.gaugeBar.width / 5,
            wavelength: 100,
            brightness: 2,
            radius: this.gaugeBar.width,
          });
          if (!this.gauge.filters) this.gauge.filters = [];
          this.gauge.filters.push(filter);
          this._activateChildEntity(
            anim.tweeny({
              from: 0,
              to: 3,
              duration: 1,
              onUpdate: (value) => (filter.time = value),
              onTeardown: () => {
                this.gauge.filters = this.gauge.filters.filter((f) => {
                  return f !== filter;
                });
              },
            })
          );
        });
      }

      // Bonus
      {
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
      }
    }

    this.bonusesManager = new bonuses.BonusesManager();

    this._activateChildEntity(
      this.bonusesManager,
      entity.extendConfig({
        container: this.container,
      })
    );

    // adding sequences for tests
    this.sequenceManager.add();

    if (this.levelVariant === "turnBased")
      this.sequenceManager.distributeSequences();

    // adding bonuses
    {
      this.bonusesManager.add(this.swapBonus, 5);
      this.bonusesManager.add(this.starBonus, 5);
      this.bonusesManager.add(this.killBonus, 5);
      this._on(this.sequenceManager, "crunch", () => {
        this.crunchCount++;
        if (this.crunchCount % 2 === 0) this.bonusesManager.add(this.swapBonus);
      });
    }

    // adding viruses (test)
    {
      const v = new virus.Virus();
      const config = entity.extendConfig({
        container: this.container,
      });
      this._activateChildEntity(v, config);

      const sequence = new entity.EntitySequence(
        [
          new entity.FunctionCallEntity(() => {
            v.state = "walkRight";
          }),
          new tween.Tween({
            obj: v,
            property: "angle",
            from: geom.degreesToRadians(25),
            to: geom.degreesToRadians(0),
            duration: 1000,
          }),
          new entity.FunctionCallEntity(() => {
            v.state = "sting";
          }),
          new entity.WaitingEntity(3000),
          new entity.FunctionCallEntity(() => {
            v.state = "idle";
          }),
          new entity.WaitingEntity(1000),
          new entity.FunctionCallEntity(() => {
            v.state = "walkLeft";
          }),
          new tween.Tween({
            obj: v,
            property: "angle",
            from: geom.degreesToRadians(0),
            to: geom.degreesToRadians(25),
            duration: 1000,
          }),
        ],
        { loop: true }
      );
      const moveVirus = this._activateChildEntity(sequence, config);
    }

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

    this.path = null;
    this.grid = null;
    this.sequenceManager = null;
  }

  /**
   * Set value of gauge bar (value/maxValue) (default: value %)
   * @param {number} value - The new value of gauge bar
   */
  setGaugeBarValue(value: number) {
    this.gaugeBar.width = crisprUtil.proportion(
      value,
      0,
      this.maxScore,
      0,
      this.gaugeBarBaseWidth,
      true
    );
    this.gaugeBar.position.set(
      crisprUtil.proportion(value, 0, this.maxScore, 200, 0, true),
      0
    );
    this.gaugeText.text =
      value > 999 ? Math.floor(value / 1000) + "k" : value + " pts";
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
    this.setGaugeBarValue(this.score);
    if (!this.gaugeTriggered) {
      this.gaugeTriggered = true;
      this._activateChildEntity(
        anim.bubble(this.gaugeText, 1.5, 50, () => {
          this.gaugeTriggered = false;
        })
      );
    }
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
    return !this.goButton.buttonMode;
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
        const sequence = this.sequenceManager.sequences[0];
        const fully = sequence.nucleotides.every((n) => n.state === "inactive");
        await new Promise((resolve) => {
          this._activateChildEntity(
            new entity.EntitySequence([
              ...sequence.nucleotides
                .map((n, i) => {
                  const baseShift = Math.round(Math.random() * 50) + 50;
                  const score =
                    10 *
                    Math.ceil((i + 1) / 2) *
                    (n.state !== "inactive" ? 1 : -1) *
                    (fully ? 2 : 1);
                  return [
                    new entity.FunctionCallEntity(() => {
                      this._activateChildEntity(
                        anim.textFade(
                          this.container,
                          new PIXI.Text(`${score}`, {
                            fontSize: 80,
                            fontFamily: "Cardenio Modern Bold",
                            fill:
                              score < 0
                                ? "#d70000"
                                : nucleotide.fullColorNames[n.colorName],
                            stroke: fully
                              ? "#ffcb00"
                              : score < 0
                              ? "#000000"
                              : "#ffffff",
                            strokeThickness: score < 0 ? 3 : 10,
                          }),
                          1000,
                          new PIXI.Point(
                            n.position.x + sequence.position.x,
                            n.position.y +
                              sequence.position.y +
                              baseShift * (score < 0 ? 1 : -1)
                          ),
                          score < 0 ? "down" : "up",
                          () => this.addScore(score)
                        )
                      );
                    }),
                    new entity.WaitingEntity(80),
                  ];
                })
                .flat(),
              new entity.FunctionCallEntity(resolve),
            ])
          );
        });
        await new Promise((resolve) => {
          sequence.down(false, resolve);
        });
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
          this.isGuiLocked = true;
        }),
        infectionSequence,
        new entity.FunctionCallEntity(() => {
          this.sequenceManager.add();
          this.isGuiLocked = false;
        }),
      ])
    );
  }
}
