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
  public sequence = new Sequence(5);
  public matrix: Matrix;
  public path: Path = null;
  public state: PartyState = "crunch";

  get container(): Container {
    return this.entityConfig.container;
  }

  _setup() {
    this.matrix = new Matrix(
      this,
      this.colCount,
      this.rowCount,
      this.cutCount,
      this.nucleotideRadius
    );
    this.container.interactive = true;

    // setup listeners
    this._on(this.container, "pointerdown", () => {
      //TODO: listener don't works...
      console.log("down");

      this.matrix.mouseIsDown = true;
      this.matrix.mouseDown();
    });
    this._on(this.container, "pointerup", () => {
      this.matrix.mouseIsDown = false;
      this.matrix.mouseUp();
    });
    this._on(this.container, "rightdown", () => {
      this.matrix.mouseButton = "right";
    });
    this._on(this.container, "leftdown", () => {
      this.matrix.mouseButton = "left";
    });
  }

  _update() {}

  _teardown() {
    this.container.removeChild(this.matrix.container);
    this.matrix = null;
  }
}
