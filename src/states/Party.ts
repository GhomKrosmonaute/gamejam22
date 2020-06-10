import { Container } from "pixi.js";
import { Entity } from "booyah/src/entity";
import Matrix from "../classes/Matrix";
import Path from "../classes/Path";
import Sequence from "../classes/Sequence";
import { PartyState } from "../utils";

export default class Party extends Entity {
  public colCount = 7;
  public rowCount = 7;
  public cutCount = 9;
  public nucleotideRadius = 40;
  public sequence: Sequence;
  public path: Path;
  public matrix: Matrix;
  public state: PartyState = "crunch";
  public mouseIsDown: boolean = false;
  public mouseButton: "right" | "left";

  get container(): Container {
    return this.entityConfig.container;
  }

  _setup() {
    this.sequence = new Sequence(5);
    this.path = new Path(this);
    this.matrix = new Matrix(
      this,
      this.colCount,
      this.rowCount,
      this.cutCount,
      this.nucleotideRadius
    );

    this.container
      .addChild(this.matrix.container)
      .addChild(this.path.container)
      .addChild(this.sequence.container).interactive = true;

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
    this.container.removeChild(this.matrix.container);
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
