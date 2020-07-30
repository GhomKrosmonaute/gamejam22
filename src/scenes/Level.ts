import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";
import * as util from "booyah/src/util";

import * as utils from "../utils";
import * as game from "../game";
import Grid from "../entities/Grid";
import Path from "../entities/Path";
import SequenceManager from "../entities/SequenceManager";
import Inventory from "../entities/Inventory";
import Bonus from "../entities/Bonus";
import Nucleotide from "../entities/Nucleotide";

export type LevelVariant = "turnBased" | "continuous";

const dropSpeed = 0.001;

export default class Level extends entity.ParallelEntity {
  public container: PIXI.Container;
  public nucleotideRadius = game.width / 13.44;
  public sequenceManager: SequenceManager;
  public inventory: Inventory;
  public path: Path;
  public grid: Grid;
  public state: utils.PartyState = "crunch";

  public readonly colCount = 7;
  public readonly rowCount = 7;
  public readonly cutCount = 6;

  private goButton: PIXI.Container & { text?: PIXI.Text };
  private crunchCount: number = 0;

  constructor(public readonly levelVariant: LevelVariant) {
    super();
  }

  _setup() {
    this.entityConfig.level = this;

    this.container = new PIXI.Container();
    this.container.interactive = true;
    this.entityConfig.container.addChild(this.container);

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
        this.entityConfig.app.loader.resources["images/background.jpg"].texture
      );
      const particles = new PIXI.Sprite(
        this.entityConfig.app.loader.resources[
          "images/particles_background.png"
        ].texture
      );
      this.container.addChild(background);
      this.container.addChild(particles);
    }

    // add to entities path, grid and the test sequenceManager
    this.addEntity(
      this.grid,
      entity.extendConfig({
        container: this.container,
      })
    );
    this.addEntity(
      this.path,
      entity.extendConfig({
        container: this.container,
      })
    );
    this.addEntity(
      this.sequenceManager,
      entity.extendConfig({
        container: this.container,
      })
    );

    // adding go button
    {
      this.goButton = new PIXI.Container();
      this.goButton.position.set(
        this.entityConfig.app.view.width * 0.75,
        this.entityConfig.app.view.height - 90
      );
      this.goButton.interactive = true;
      this.goButton.buttonMode = true;
      this._on(this.goButton, "pointerup", this._onGo);
      this.container.addChild(this.goButton);

      const bg = new PIXI.Graphics()
        .beginFill(0xaaaaaa)
        .drawRect(-250, -50, 500, 100)
        .endFill();

      this.goButton.addChild(bg);

      this.goButton.text = new PIXI.Text("GO", {
        fill: "#000000",
        fontSize: "50px",
      });
      this.goButton.text.anchor.set(0.5);
      this.goButton.addChild(this.goButton.text);
    }

    // foreground images
    {
      const particles2 = new PIXI.Sprite(
        this.entityConfig.app.loader.resources[
          "images/particles_foreground.png"
        ].texture
      );
      this.container.addChild(particles2);

      const membrane = new PIXI.Sprite(
        this.entityConfig.app.loader.resources["images/membrane.png"].texture
      );
      this.container.addChild(membrane);
    }

    this.inventory = new Inventory();

    this.addEntity(
      this.inventory,
      entity.extendConfig({
        container: this.container,
      })
    );

    // adding sequences for tests
    this.sequenceManager.add(3);
    if (this.levelVariant === "turnBased")
      this.sequenceManager.distributeSequences();

    // adding bonus
    {
      const swapBonus = new Bonus(
        "swap",
        new PIXI.Sprite(
          this.entityConfig.app.loader.resources[
            "images/bonus_swap.png"
          ].texture
        ),
        "drag & drop"
      );
      this.inventory.add(swapBonus);
      this._on(swapBonus, "trigger", (n1: Nucleotide, n2: Nucleotide) => {
        // todo: make animated swap function on grid
        this.grid.swap(n1, n2);
      });

      this._on(this.sequenceManager, "crunch", () => {
        this.crunchCount++;
        if (this.crunchCount % 2 === 0) this.inventory.add(swapBonus);
      });
    }

    // adding viruses (test)
    {
      const virus = util.makeAnimatedSprite(
        this.entityConfig.app.loader.resources["images/mini_bob_idle.json"]
      );
      virus.animationSpeed = 25 / 60;
      virus.scale.set(0.6);
      virus.anchor.set(0.5, 1);
      virus.position.set(300, 400);
      virus.play();

      this.container.addChild(virus);
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
    this.entityConfig.container.removeChild(this.container);

    this.path = null;
    this.grid = null;
    this.sequenceManager = null;
  }

  private _onGo(): void {
    if (this.state !== "crunch") return;
    if (this.path.items.length > 0) return;

    if (this.levelVariant === "turnBased") {
      if (this.grid.containsHoles()) {
        this._regenerate();
      } else {
        // TODO: add confirm dialog "Are you sure?"

        this.addEntity(
          new entity.EntitySequence([
            new entity.FunctionCallEntity(() => this.grid.regenerate(5)),
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

  private _endTurn(): void {
    if (this.grid.isGameOver()) {
      this.requestedTransition = "game_over";
      return;
    }

    // Create a list of "actions" that will take place at the end of calling this function
    let actions = [];

    const countSequences = this.sequenceManager.countSequences();
    if (countSequences > 0) {
      const infectionSequence = this.grid.infect(countSequences * 5);
      actions.push(infectionSequence);
    }

    if (countSequences < 3) {
      actions.push(
        new entity.FunctionCallEntity(() => {
          const length = utils.random(3, 4);
          this.sequenceManager.add(length);
          this.sequenceManager.distributeSequences();
        })
      );
    }

    if (actions.length > 0) {
      this.addEntity(new entity.EntitySequence(actions));
    }
  }

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

    this.path.crunch();
    this.path.remove();

    if (this.levelVariant === "continuous") this._regenerate();
    else if (
      this.levelVariant === "turnBased" &&
      this.sequenceManager.countSequences() === 0
    ) {
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
    this.addEntity(
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
      this.requestedTransition = "game_over";
      return;
    }

    const infectionSequence = this.grid.infect(infectionCount * 5);

    this.addEntity(
      new entity.EntitySequence([
        infectionSequence,
        new entity.FunctionCallEntity(() => {
          const length = utils.random(3, 4);
          this.sequenceManager.add(length);
        }),
      ])
    );
  }
}
