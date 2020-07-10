import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as utils from "../utils";
import * as game from "../game";
import Grid from "../entities/Grid";
import Path from "../entities/Path";
import SequenceManager from "../entities/SequenceManager";
import Inventory from "../entities/Inventory";
import Bonus from "../entities/Bonus";
import Nucleotide from "../entities/Nucleotide";

export default class Level extends entity.ParallelEntity {
  public container: PIXI.Container;
  public nucleotideRadius = game.width / 13.44;
  public sequenceManager: SequenceManager;
  public inventory: Inventory;
  public path: Path;
  public grid: Grid;
  public state: utils.PartyState = "crunch";

  public readonly baseSequenceLength = 5;
  public readonly colCount = 7;
  public readonly rowCount = 7;
  public readonly cutCount = 6;

  private goButton: PIXI.Container & { text?: PIXI.Text };
  private crunchCount: number = 0;

  get renderer(): PIXI.Renderer {
    return this.entityConfig.app.renderer;
  }

  get mouse(): PIXI.InteractionData {
    return this.renderer.plugins.interaction.mouse;
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

    this._refresh();
  }

  _update() {}

  _teardown() {
    this.entityConfig.container.removeChild(this.container);

    this.path = null;
    this.grid = null;
    this.sequenceManager = null;
  }

  private _onGo(): void {
    console.assert(this.state === "crunch");

    if (this.path.items.length > 0) {
      this.sequenceManager.crunch(this.path);

      this.path.crunch();
      this.path.remove();

      this.grid.refresh();
    } else if (this.grid.containsHoles()) {
      // Switch to regenerate mode
      this.state = "regenerate";
      this._refresh();

      const newNucleotides = this.grid.fillHoles();

      // Setup growing animation
      const radiusTween = new tween.Tween({
        from: 0,
        to: this.grid.nucleotideRadius,
        easing: easing.easeOutBounce,
      });
      this._on(radiusTween, "updatedValue", (radius) => {
        for (const n of newNucleotides) n.radius = radius;
      });
      const tweenAnimation = new entity.EntitySequence([
        radiusTween,
        new entity.FunctionCallEntity(() => {
          this.state = "crunch";

          this._endTurn();
          this._refresh();

          this.removeEntity(tweenAnimation);
        }),
      ]);
      this.addEntity(tweenAnimation);
    } else {
      // TODO: add confirm dialog "Are you sure?"

      this.grid.regenerate(5);

      this._endTurn();
      this._refresh();
    }
  }

  private _endTurn(): void {
    if (!this.grid.safetyNucleotides.some((n) => !n.infected)) {
      this.requestedTransition = "game_over";
    }

    const countSequences = this.sequenceManager.countSequences();
    if (countSequences > 0) {
      const countInfects = countSequences * 5;
      _.chain(this.grid.safetyNucleotides)
        .filter((n) => !n.infected)
        .shuffle()
        .take(countInfects)
        .forEach((n) => (n.infected = true));
    }

    if (countSequences < 3) {
      const length = utils.random(3, 4);
      this.sequenceManager.add(length);
    }

    console.log(
      this.grid.safetyNucleotides.filter((n) => n.infected).length,
      "infected nucleotides"
    );
  }

  private _refresh() {
    if (this.path.items.length > 0) {
      if (this.sequenceManager.matchesSequence(this.path)) {
        this.goButton.text.text = "CRUNCH";
        this.goButton.interactive = true;
      } else {
        this.goButton.text.text = "INVALID SEQUENCE";
        this.goButton.interactive = false;
      }
    } else if (this.grid.containsHoles()) {
      this.goButton.text.text = "REGENERATE";
      this.goButton.interactive = true;
    } else {
      this.goButton.text.text = "SKIP";
      this.goButton.interactive = true;
    }
    this.sequenceManager.updateHighlighting(this.path);
  }
}
