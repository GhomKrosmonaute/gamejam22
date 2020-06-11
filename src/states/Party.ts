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

  private validationButton: pixi.Text;

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

    // setup listeners
    this._on(this.container, "pointerdown", () => {
      this.mouseIsDown = true;
      this.mouseDown();
    });
    this._on(this.container, "pointerup", () => {
      this.mouseIsDown = false;
      this.mouseUp();
    });

    // add validation button
    this.validationButton = new pixi.Text("valider", { fill: "#FFFFFF" });
    this.validationButton.buttonMode = true;
    this.validationButton.interactive = true;
    this.validationButton.anchor.set(0.5);
    this.validationButton.x = 800;
    this.validationButton.y = 250;
    this.validationButton.on("pointerdown", () => {
      if (this.state === "crunch") {
        if (this.path) {
          this.path.crunch();
          this.path.remove();
        }
      }
    });
    this.container.addChild(this.validationButton);
  }

  _update() {}

  _teardown() {
    this.container.removeChild(this.validationButton);
    this.sequence = null;
    this.path = null;
    this.matrix = null;
    this.validationButton = null;
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
    console.log("work");
    if (this.path.items.length === 1) {
      const n = this.path.first;
      n.state = n.state === "hole" ? "none" : "hole";
      n.render();
      console.log(n.state);
      this.path.remove();
    } else if (this.state === "slide") {
      this.path.slide();
      this.path.remove();
    }
  }
}
