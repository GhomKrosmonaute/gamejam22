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

  private goButtonText: PIXI.Text;
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
      const goButton = new PIXI.Container();
      goButton.position.set(
        this.entityConfig.app.view.width / 2,
        this.entityConfig.app.view.height - 90
      );
      goButton.interactive = true;
      goButton.buttonMode = true;
      this._on(goButton, "pointerup", this._onGo);
      this.container.addChild(goButton);

      const bg = new PIXI.Graphics();
      bg.beginFill(0xaaaaaa);
      bg.drawRect(-200, -50, 400, 100);
      bg.endFill();
      goButton.addChild(bg);

      this.goButtonText = new PIXI.Text("GO", {
        fill: "#000000",
        fontSize: "50px",
      });
      this.goButtonText.anchor.set(0.5);
      goButton.addChild(this.goButtonText);
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

    // if (this.state === "slide") {
    //   const endPos = e.data.global;
    //   const angle = Math.atan2(
    //     endPos.y - this._slideDownPos.y,
    //     endPos.x - this._slideDownPos.x
    //   );
    //   console.log("slide angle", angle);
    // }
    // // if path items count === 1
    // if (this.path.items.length === 1) {
    //   // replace nucleotide by hole
    //   const n = this.path.first;
    //   n.state = n.state === "hole" ? "normal" : "hole";
    //   n.refresh();
    //   this.path.remove();
    //   // if party state === "slide"
    // } else if (this.state === "slide") {
    //   this.path.slide();
    //   this.path.remove();
    // }
  }

  /** step (turn end or turn next) propagation */
  step() {
    // todo: turn changes
  }

  private _onGo() {
    console.assert(this.state === "crunch");

    if (this.path.items.length > 0) {
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
      this.goButtonText.text = "CRUNCH";
    } else if (this.grid.containsHoles()) {
      this.goButtonText.text = "SLIDE";
    } else {
      this.goButtonText.text = "SKIP";
    }
  }
}
