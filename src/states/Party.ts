import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";
import * as game from "../game";
import Matrix from "../classes/Matrix";
import Path from "../classes/Path";
import Sequence from "../classes/Sequence";

export default class Party extends entity.ParallelEntity {
  public colCount = 7;
  public rowCount = 7;
  public cutCount = 9;
  public nucleotideRadius = game.width / 13.44;
  public sequence: Sequence;
  public path: Path;
  public matrix: Matrix;
  public state: utils.PartyState = "crunch";
  public mouseIsDown: boolean = false;

  // debug control buttons
  public validationButton: pixi.Text;
  public stateSwitch: pixi.Text;

  get container(): pixi.Container {
    return this.entityConfig.container;
  }

  get renderer(): pixi.Renderer {
    return this.entityConfig.app.renderer;
  }

  get mouse(): pixi.interaction.InteractionData {
    return this.renderer.plugins.interaction.mouse;
  }

  _setup() {
    // make container interactive
    this.container.interactive = true;

    // add one sequence for tests
    this.sequence = new Sequence(
      this, // party
      50, // base length
      new pixi.Point(game.width * 0.5, game.height * 0.8) // pivot
    );

    // instancie path system
    this.path = new Path(this);

    // generate nucleotide matrix
    this.matrix = new Matrix(
      this,
      this.colCount,
      this.rowCount,
      this.cutCount,
      this.nucleotideRadius
    );

    // add to entities path, matrix and the test sequence
    this.addEntity(
      this.matrix,
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

    // setup mouse listeners
    this._on(this.container, "pointerdown", () => {
      this.mouseIsDown = true;
      this.mouseDown();
    });
    this._on(this.container, "pointerup", () => {
      this.mouseIsDown = false;
      this.mouseUp();
    });

    // check if path update to valid or invalid sequence
    this.path.on("validSequenceChange", (isValidSequence: boolean) => {
      this.validationButton.text = isValidSequence ? "validate" : "cancel";
    });

    // add validation button (for debug)
    this.validationButton = new pixi.Text("cancel", { fill: "#FFFFFF" });
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
    this.stateSwitch = new pixi.Text("mode: crunch", { fill: "#FFFFFF" });
    this.stateSwitch.buttonMode = true;
    this.stateSwitch.interactive = true;
    this.stateSwitch.anchor.set(0.5);
    this.stateSwitch.x = game.width / 2;
    this.stateSwitch.y = game.height * 0.06;
    this.stateSwitch.on("pointerdown", () => {
      this.state = this.state === "crunch" ? "slide" : "crunch";
      this.stateSwitch.text = "mode: " + this.state;
      this.step();
    });

    this.container.addChild(this.validationButton);
    this.container.addChild(this.stateSwitch);
  }

  _update() {}

  _teardown() {
    this.container.removeChild(this.validationButton);
    this.container.removeChild(this.stateSwitch);
    this.sequence = null;
    this.path = null;
    this.matrix = null;
    this.validationButton = null;
    this.stateSwitch = null;
  }

  mouseDown() {
    // get the hovered nucleotide
    const hovered = this.matrix.getHovered();

    // if path not includes this nucleotide
    if (hovered && !this.path.items.includes(hovered)) {
      // if party state is "crunch"
      if (this.state === "crunch") {
        // if hovered is not a cut, update path
        if (hovered.state !== "cut") this.path.calc(hovered);

        // if party state is "slide"
      } else {
        // update path
        this.path.calc(hovered);
      }
    }
  }

  mouseUp() {
    // if path length === 1
    if (this.path.items.length === 1) {
      // replace nucleotide by hole
      const n = this.path.first;
      n.state = n.state === "hole" ? "none" : "hole";
      n.render();
      this.path.remove();

      // if party state === "slide"
    } else if (this.state === "slide") {
      this.path.slide();
      this.path.remove();
    }
  }

  /** step (turn end | turn next) propagation */
  step() {
    this.sequence.step();
  }
}
