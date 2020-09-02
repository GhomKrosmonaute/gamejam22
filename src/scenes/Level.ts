import * as PIXI from "pixi.js";
import { GlowFilter } from "@pixi/filter-glow";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as geom from "booyah/src/geom";
import * as tween from "booyah/src/tween";

import * as crisprUtil from "../crisprUtil";
import * as game from "../game";
import Grid from "../entities/Grid";
import Path from "../entities/Path";
import SequenceManager from "../entities/SequenceManager";
import Inventory from "../entities/Inventory";
import Bonus from "../entities/Bonus";
import * as virus from "../entities/virus";

export type LevelVariant = "turnBased" | "continuous" | "long";

const dropSpeed = 0.001;
const hairCount = 40;
const hairMinScale = 0.3;
const hairMaxScale = 0.45;

const glowFilter = new GlowFilter();

export default class Level extends entity.CompositeEntity {
  public container: PIXI.Container;
  public nucleotideRadius = game.width / 13.44;
  public sequenceManager: SequenceManager;
  public inventory: Inventory;
  public path: Path;
  public grid: Grid;
  public state: crisprUtil.PartyState = "crunch";

  public swapBonus: Bonus<"clickTwoNucleotides">;
  public shieldBonus: Bonus<"clickOneNucleotide">;
  public healBonus: Bonus<"click">;

  public readonly colCount = 7;
  public readonly rowCount = 7;
  public readonly cutCount = 6;

  private goButton: PIXI.Container & { text?: PIXI.Text };
  private crunchCount: number = 0;
  private gaugeBackground: PIXI.Sprite;
  private gaugeBar: PIXI.Sprite;
  private gaugeForeground: PIXI.Sprite;
  private bonusBackground: PIXI.Sprite;

  constructor(public readonly levelVariant: LevelVariant) {
    super();
  }

  _setup() {
    this._entityConfig.level = this;

    this.container = new PIXI.Container();
    this.container.interactive = true;
    this._entityConfig.container.addChild(this.container);

    this.sequenceManager = new SequenceManager();

    // instancing path system
    this.path = new Path(this);
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

        this.goButton.text = new PIXI.Text("GO", {
          fill: "#000000",
          fontSize: "50px",
        });
        this.goButton.text.position.set(
          this.goButton.width / 2,
          this.goButton.height / 2
        );
        this.goButton.text.anchor.set(0.5);
        this.goButton.addChild(this.goButton.text);
      }

      // Gauge bar (score/exp?)
      {
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
        this.container.addChild(this.gaugeBackground);
        this.container.addChild(this.gaugeBar);
        this.container.addChild(this.gaugeForeground);
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

    this.inventory = new Inventory();

    this._activateChildEntity(
      this.inventory,
      entity.extendConfig({
        container: this.container,
      })
    );

    // adding sequences for tests
    this.sequenceManager.add(this._pickSequenceLength());

    if (this.levelVariant === "turnBased")
      this.sequenceManager.distributeSequences();

    // create bonuses
    {
      // swap
      {
        this.swapBonus = new Bonus(
          "swap",
          new PIXI.Sprite(
            this._entityConfig.app.loader.resources[
              "images/bonus_swap.png"
            ].texture
          ),
          "clickTwoNucleotides"
        );

        this.swapBonus.onTrigger((n1, n2) => {
          // todo: make animated swap function on grid
          this.grid.swap(n1, n2);
        });
      }
      // shield
      {
        this.shieldBonus = new Bonus(
          "shield",
          new PIXI.Sprite(
            this._entityConfig.app.loader.resources[
              "images/bonus_shield.png"
            ].texture
          ),
          "clickOneNucleotide"
        );

        this.shieldBonus.onTrigger((n) => {
          n.shield = true;
          this.grid.getNeighbors(n).forEach((nn) => (nn.shield = true));
        });
      }
      // heal
      {
        this.healBonus = new Bonus(
          "heal",
          new PIXI.Sprite(
            this._entityConfig.app.loader.resources[
              "images/bonus_heal.png"
            ].texture
          ),
          "click"
        );

        this.healBonus.onTrigger(() => {
          // regenerate 30 nucleotides
          this.grid.regenerate(30, (n) => !n.shield);
          this.isGuiLocked = true;
          setTimeout(() => {
            this.isGuiLocked = false;
          }, 1000);
        });
      }
    }

    // adding bonuses
    {
      this.inventory.add(this.swapBonus, 5);
      this.inventory.add(this.shieldBonus, 5);
      this.inventory.add(this.healBonus, 5);
      this._on(this.sequenceManager, "crunch", () => {
        this.crunchCount++;
        if (this.crunchCount % 2 === 0) this.inventory.add(this.swapBonus);
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
              this.grid.regenerate(
                5,
                (n) => !n.shield && n.state === "present"
              );
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
      !this.sequenceManager.matchesSequence(this.path)
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

  private _refresh(): void {
    if (this.path.items.length > 0) {
      this.goButton.interactive = false;
      if (this.sequenceManager.matchesSequence(this.path)) {
        this.goButton.text.text = "CRUNCH";
      } else {
        this.goButton.text.text = "INVALID SEQUENCE";
      }
    } else {
      this.goButton.text.text = "SKIP";
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
