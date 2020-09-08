import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as geom from "booyah/src/geom";
import * as tween from "booyah/src/tween";

import * as crisprUtil from "../crisprUtil";
import * as anim from "../animation";
import * as game from "../game";
import * as sequence from "../entities/sequence";
import * as bonuses from "../entities/bonus";
import * as virus from "../entities/virus";

import Grid from "../entities/grid";
import Path from "../entities/path";

export type LevelVariant = "turnBased" | "continuous" | "long";

const dropSpeed = 0.001;
const hairCount = 40;
const hairMinScale = 0.3;
const hairMaxScale = 0.45;

export default class Level extends entity.CompositeEntity {
  public container: PIXI.Container;
  public nucleotideRadius = game.width / 13.44;
  public sequenceManager: sequence.SequenceManager;
  public bonusesManager: bonuses.BonusesManager;
  public path: Path;
  public grid: Grid;
  public state: crisprUtil.PartyState = "crunch";

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
  private gaugeBackground: PIXI.Sprite;
  private gaugeForeground: PIXI.Sprite;
  private bonusBackground: PIXI.Sprite;
  private gaugeBarBaseWidth: number;
  private gaugeTriggered = false;

  private score = 0;
  private maxScore = 1000;

  constructor(public readonly levelVariant: LevelVariant) {
    super();
  }

  _setup() {
    this._entityConfig.level = this;

    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);

    this.sequenceManager = new sequence.SequenceManager();

    // instancing path system
    this.path = new Path();
    this._on(this.path, "updated", this._refresh);

    // generating nucleotide grid
    this.grid = new Grid(
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
      for (let i = 0; i < hairCount; i++) {
        this.container.addChild(
          this._makeHair(
            geom.degreesToRadians(geom.lerp(-23, 24, i / hairCount)),
            geom.lerp(hairMaxScale, hairMinScale, Math.random())
          )
        );
      }
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
        this.goButton.text.anchor.set(0.5);
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
        this.gaugeForeground = new PIXI.Sprite(
          this._entityConfig.app.loader.resources[
            "images/hud_gauge_foreground.png"
          ].texture
        );
        this.gaugeText = crisprUtil.makeText("", 0x000000, 40);
        this.gaugeText.anchor.set(0.5);
        this.gaugeText.position.set(110, 110);

        this.gauge.addChild(this.gaugeBackground);
        this.gauge.addChild(this.gaugeBar);
        this.gauge.addChild(this.gaugeForeground);
        this.gauge.addChild(this.gaugeText);

        this.container.addChild(this.gauge);

        this.gaugeBarBaseWidth = this.gaugeBar.width;

        this.setGaugeBarValue(0);
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
    this.sequenceManager.add(this._pickSequenceLength());

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
      v.state = "walk";
      const config = entity.extendConfig({
        container: this.container,
      });

      this._activateChildEntity(v, config);

      const sequence = new entity.EntitySequence(
        [
          new tween.Tween({
            obj: v,
            property: "angle",
            from: geom.degreesToRadians(25),
            to: geom.degreesToRadians(0),
            duration: 1000,
          }),
          new entity.WaitingEntity(1000),
          new entity.FunctionCallEntity(() => {
            v.state = "sting";
          }),
          new entity.WaitingEntity(3000),
          new entity.FunctionCallEntity(() => {
            v.state = "idle";
          }),
          new entity.WaitingEntity(1000),
          new entity.FunctionCallEntity(() => {
            v.state = "walk";
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
  }

  _update() {
    if (this.levelVariant !== "continuous") return;

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
   * @param {number} maxValue - The max bound of the new value (default 100)
   */
  setGaugeBarValue(value: number) {
    this.gaugeBar.width = crisprUtil.mapProportion(
      value,
      0,
      this.maxScore,
      0,
      this.gaugeBarBaseWidth,
      true
    );
    this.gaugeBar.position.set(
      crisprUtil.mapProportion(value, 0, this.maxScore, 200, 0, true),
      0
    );
    this.gaugeText.text =
      value > 999 ? Math.floor(value / 1000) + "k" : value + " pts";
  }

  addScore(score: number) {
    if (this.score + score > this.maxScore) {
      this.score = this.maxScore;
    } else {
      this.score += score;
    }
    this.setGaugeBarValue(this.score);
    if (!this.gaugeTriggered) {
      this.gaugeTriggered = true;
      this._activateChildEntity(
        anim.bubble(this.gaugeText, 1.5, 50, 3, () => {
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

  get isGuiLocked(): boolean {
    return !this.goButton.buttonMode;
  }

  set isGuiLocked(value: boolean) {
    this.goButton.buttonMode = !value;
    this.goButton.interactive = !value;
    this.goButton.text.style.fill = !value ? "#000000" : "#4e535d";
  }

  private _endTurn(): void {
    if (this.grid.isGameOver()) {
      this._transition = entity.makeTransition("game_over");
      return;
    }

    // Create a list of "actions" that will take place at the end of calling this function
    let actions: entity.Entity[] = [];

    const countSequences = this.sequenceManager.countSequences();
    if (countSequences > 0) {
      const infectionSequence = this.grid.infect(countSequences * 5);
      actions.push(infectionSequence);
    }

    if (countSequences < this.sequenceCountLimit) {
      actions.push(
        new entity.FunctionCallEntity(() => {
          const length = this._pickSequenceLength();
          this.sequenceManager.add(length);
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

  get sequenceCountLimit(): number {
    switch (this.levelVariant) {
      case "turnBased":
        return 3;
      case "continuous":
        return 1;
      case "long":
        return 1;
    }
  }

  private _pickSequenceLength(): number {
    switch (this.levelVariant) {
      case "turnBased":
        return crisprUtil.random(4, 7);
      case "continuous":
        return crisprUtil.random(3, 4);
      case "long":
        return 13;
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

    this.sequenceManager.crunch(this.path);
    if (this.levelVariant === "turnBased") {
      this.sequenceManager.distributeSequences();
    }

    // Makes holes in the grid that corresponds to the used nucleotides
    this.path.crunch();
    this.path.remove();

    if (this.sequenceManager.countSequences() === 0) {
      this._regenerate();
    }
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
          const length = this._pickSequenceLength();
          this.sequenceManager.add(length);
          this.isGuiLocked = false;
        }),
      ])
    );
  }

  /**
   *
   * @param angle in radians
   */
  private _makeHair(angle: number, scale: number): PIXI.AnimatedSprite {
    const hair = util.makeAnimatedSprite(
      this._entityConfig.app.loader.resources["images/hair.json"]
    );
    hair.animationSpeed = (24 + angle) / 60;

    // Make hair ping-pong
    hair.loop = false;
    hair.onComplete = () => {
      hair.animationSpeed *= -1;
      hair.play();
    };
    hair.play();

    hair.scale.set(scale);
    hair.anchor.set(0.5, 1);

    // const radius = 1337;
    // const centerY = 320 + radius;
    // hair.position.set(
    //   radius * Math.cos(angle + Math.PI / 2) +
    //     this._entityConfig.app.view.width / 2,
    //   centerY - radius * Math.sin(angle + Math.PI / 2)
    // );
    // hair.rotation = -angle;

    crisprUtil.positionAlongMembrane(hair, angle);

    return hair;
  }
}
