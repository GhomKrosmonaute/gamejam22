import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";
import * as game from "../game";
import Grid from "../entities/Grid";
import Path from "../entities/Path";
import SequenceManager from "../entities/SequenceManager";
import Sequence from "../entities/Sequence";
import Slide from "../entities/Slide";

export default class Party extends entity.ParallelEntity {
  public container: PIXI.Container;
  public colCount = 7;
  public rowCount = 7;
  public cutCount = 9;
  public baseSequenceLength = 5;
  public nucleotideRadius = game.width / 13.44;
  public sequenceManager: SequenceManager;
  public path: Path;
  public grid: Grid;
  public state: utils.PartyState = "crunch";
  public mouseIsDown: boolean = false;

  private goButton: PIXI.Container & { text?: PIXI.Text };
  private slide = new Slide();

  get renderer(): PIXI.Renderer {
    return this.entityConfig.app.renderer;
  }

  get mouse(): PIXI.InteractionData {
    return this.renderer.plugins.interaction.mouse;
  }

  _setup() {
    this.container = new PIXI.Container();
    this.container.interactive = true;
    this.entityConfig.container.addChild(this.container);

    // Create slide entity, but don't add it yet
    this.slide = new Slide();
    this._on(this.slide, "choseSide", this._onChoseSide);

    this.sequenceManager = new SequenceManager();

    // instancie path system
    this.path = new Path(this);

    // generate nucleotide grid
    this.grid = new Grid(
      this,
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
      const space = new PIXI.Sprite(
        this.entityConfig.app.loader.resources[
          "images/space-background.png"
        ].texture
      );
      const particles = new PIXI.Sprite(
        this.entityConfig.app.loader.resources[
          "images/particles-background.png"
        ].texture
      );
      this.container.addChild(background);
      this.container.addChild(space);
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

    // add sequences for tests
    // TODO: remove tests
    this.sequenceManager.add(5);
    this.sequenceManager.add(4);
    this.sequenceManager.add(5);

    // Add go button
    {
      this.goButton = new PIXI.Container();
      this.goButton.position.set(
        this.entityConfig.app.view.width / 2,
        this.entityConfig.app.view.height - 90
      );
      this.goButton.interactive = true;
      this.goButton.buttonMode = true;
      this._on(this.goButton, "pointerup", this._onGo);
      this.container.addChild(this.goButton);

      const bg = new PIXI.Graphics();
      bg.beginFill(0xaaaaaa);
      bg.drawRect(-250, -50, 500, 100);
      bg.endFill();
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
          "images/particles-foreground.png"
        ].texture
      );
      this.container.addChild(particles2);

      const membrane = new PIXI.Sprite(
        this.entityConfig.app.loader.resources["images/membrane.png"].texture
      );
      this.container.addChild(membrane);
    }

    // setup mouse listeners
    this._on(this.container, "pointerdown", (e: PIXI.InteractionEvent) => {
      this.mouseIsDown = true;
      this.mouseDown(e);
    });
    this._on(this.container, "pointerup", (e: PIXI.InteractionEvent) => {
      this.mouseIsDown = false;
      this.mouseUp(e);
    });

    this._refresh();
  }

  _update() {}

  _teardown() {
    this.entityConfig.container.removeChild(this.container);

    this.path = null;
    this.grid = null;
    this.sequenceManager = null;
  }

  mouseDown(e: PIXI.InteractionEvent) {
    if (this.state === "crunch") {
      // get the hovered nucleotide
      const hovered = this.grid.getHovered();

      // if path not includes this nucleotide
      if (hovered && !this.path.items.includes(hovered)) {
        // if hovered is not a scissors, update path
        if (hovered.state !== "scissors") this.path.calc(hovered);
      }
    }
  }

  mouseUp(e: PIXI.InteractionEvent) {
    this._refresh();
  }

  private _onGo() {
    console.assert(this.state === "crunch");

    if (this.path.items.length > 0) {
      this.sequenceManager.crunch(this.path);

      this.path.crunch();
      this.path.remove();

      this.grid.refresh();
    } else if (this.grid.containsHoles()) {
      // Switch to slide mode
      this.state = "slide";
      this._refresh();

      this.addEntity(this.slide);
    } else {
      // TODO: add confirm dialog "Are you sure?"

      this.grid.regenerate(5);

      this._refresh();
    }
  }

  private _onChoseSide(neighborIndex: utils.NeighborIndex) {
    console.assert(this.state === "slide");

    console.log("sliding neighborIndex", neighborIndex);

    this.grid.slide(neighborIndex);

    this.removeEntity(this.slide);
    this.state = "crunch";
    this._refresh();
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
      this.goButton.text.text = "SLIDE";
      this.goButton.interactive = true;
    } else {
      this.goButton.text.text = "SKIP";
      this.goButton.interactive = true;
    }
  }
}
