import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";
import * as game from "../game";
import Grid from "../entities/Grid";
import Path from "../entities/Path";
import Sequence from "../entities/Sequence";

export default class Party extends entity.ParallelEntity {
  public container: PIXI.Container;
  public colCount = 7;
  public rowCount = 7;
  public cutCount = 9;
  public nucleotideRadius = game.width / 13.44;
  public sequence: Sequence;
  public path: Path;
  public grid: Grid;
  public state: utils.PartyState = "crunch";
  public mouseIsDown: boolean = false;

  private _slideDownPos: PIXI.Point;

  // debug control buttons
  public validationButton: PIXI.Text;
  public stateSwitch: PIXI.Text;

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

    // add one sequence for tests
    this.sequence = new Sequence(
      this, // party
      50 // base length
    );

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

    // add to entities path, grid and the test sequence
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
      this.sequence,
      entity.extendConfig({
        container: this.container,
      })
    );

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

      const text = new PIXI.Text("GO", { fill: "#000000", fontSize: "50px" });
      text.anchor.set(0.5);
      goButton.addChild(text);
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

    // check if path update to valid or invalid sequence
    this.path.on("validSequenceChange", (isValidSequence: boolean) => {
      this.validationButton.text = isValidSequence ? "validate" : "cancel";
    });

    // debug buttons
    {
      const textStyle = { fill: "#000000", fontSize: "50px" };

      // add validation button (for debug)
      this.validationButton = new PIXI.Text("cancel", textStyle);
      this.validationButton.buttonMode = true;
      this.validationButton.interactive = true;
      this.validationButton.anchor.set(0.5);
      this.validationButton.x = game.width / 2;
      this.validationButton.y = game.height * 0.02;
      this.validationButton.on("pointerdown", () => {
        if (this.state === "crunch") {
          if (this.path) {
            this.path.crunch();
            this.path.remove();
          }
        }
      });

      // add party state switch (for debug)
      this.stateSwitch = new PIXI.Text("mode: crunch", textStyle);
      this.stateSwitch.buttonMode = true;
      this.stateSwitch.interactive = true;
      this.stateSwitch.anchor.set(0.5);
      this.stateSwitch.x = game.width / 2;
      this.stateSwitch.y = game.height * 0.045;
      this.stateSwitch.on("pointerdown", () => {
        this.state = this.state === "crunch" ? "slide" : "crunch";
        this.stateSwitch.text = "mode: " + this.state;
        this.step();
      });

      this.container.addChild(this.validationButton);
      this.container.addChild(this.stateSwitch);
    }
  }

  _update() {}

  _teardown() {
    this.entityConfig.container.removeChild(this.container);
    this.sequence = null;
    this.path = null;
    this.grid = null;
    this.validationButton = null;
    this.stateSwitch = null;
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
    } else if (this.state === "slide") {
      this._slideDownPos = e.data.global;
    }
  }

  mouseUp(e: PIXI.InteractionEvent) {
    if (this.state === "slide") {
      const endPos = e.data.global;

      const angle = Math.atan2(
        endPos.y - this._slideDownPos.y,
        endPos.x - this._slideDownPos.x
      );

      console.log("slide angle", angle);
    }
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
    this.sequence.step();
  }

  private _onGo() {
    console.assert(this.state === "crunch");

    if (this.path.items.length > 0) {
      this.path.crunch();
      this.path.remove();
      this.grid.refresh();
    } else if (this.grid.containsHoles()) {
      this.grid.slide(1);
    } else {
      // TODO: add confirm dialog
      // TODO: refresh grid

      console.log("TODO: refresh grid");
    }
  }
}
