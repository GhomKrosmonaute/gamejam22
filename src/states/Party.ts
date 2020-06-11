import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";
import Matrix from "../classes/Matrix";
import Path from "../classes/Path";
import Sequence from "../classes/Sequence";

export default class Party extends entity.ParallelEntity {
  public colCount = 7;
  public rowCount = 7;
  public cutCount = 9;
  public nucleotideRadius = 40;
  public sequence: Sequence;
  public path: Path;
  public matrix: Matrix;
  public state: utils.PartyState = "crunch";
  public mouseIsDown: boolean = false;
  public mouseButton: "right" | "left";

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
    this.container.interactive = true;
    this.sequence = new Sequence(5);
    this.path = new Path(this);
    this.matrix = new Matrix(
      this,
      this.colCount,
      this.rowCount,
      this.cutCount,
      this.nucleotideRadius
    );

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

    // this.container
    //   .addChild(this.matrix.container)
    //   .addChild(this.path.container)
    //   .addChild(this.sequence.container).interactive = true;

    // setup listeners
    this._on(this.container, "pointerdown", () => {
      //TODO: listener don't works...
      console.log("down");

      this.mouseIsDown = true;
      this.mouseDown();
    });
    this._on(this.container, "pointerup", () => {
      this.mouseIsDown = false;
      this.mouseUp();
    });
    this._on(this.container, "rightdown", () => {
      this.mouseButton = "right";
    });
    this._on(this.container, "leftdown", () => {
      this.mouseButton = "left";
    });
  }

  _update() {}

  _teardown() {
    this.sequence = null;
    this.path = null;
    this.matrix = null;
  }

  mouseDown() {
    const hovered = this.matrix.getHovered();
    if (hovered && !this.path.items.includes(hovered)) {
      if (this.state === "crunch") {
        if (hovered.state !== "cut") this.path.calc(hovered);
      } else {
        this.path.calc(hovered);
      }
    }
  }

  mouseUp() {
    if (this.mouseButton === "left") {
      if (this.path.items.length === 1) {
        const n = this.path.first;
        n.state = n.state === "hole" ? "none" : "hole";
        this.path.remove();
      } else if (this.state === "slide") {
        this.path.slide();
        this.path.remove();
      }
    }
  }
}
