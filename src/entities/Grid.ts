import { Entity } from "booyah/src/entity";
import { Container } from "pixi.js";
import Matrix from "../classes/Matrix";
import Path from "../classes/Path";
import {ColorName, GridState} from "../utils";

export default class GridEntity extends Entity {

  public colCount = 7
  public rowCount = 7
  public cutCount = 9
  public nucleotideRadius = 40
  public pathMaxLength = 5
  public matrix: Matrix
  public path: Path
  public state: GridState = "crunch"
  public sequence: ColorName[]

  constructor() {
    super();
  }

  get container(): Container {
    return this.entityConfig.container
  }

  _setup() {
    this.matrix = new Matrix(
      this,
      this.colCount,
      this.rowCount,
      this.cutCount,
      this.nucleotideRadius
    )
    this.container
      .on("mousedown",() => {
        this.matrix.mouseIsDown = true;
        this.matrix.mouseDown();
      })
      .on("mouseup",() => {
        this.matrix.mouseIsDown = false;
        this.matrix.mouseUp();
      })
      .on("rightdown", () => {
        this.matrix.mouseButton = 'right';
      })
      .on("leftdown", () => {
        this.matrix.mouseButton = 'left';
      });
  }

  _update() {

  }

  _teardown() {
    this.container.removeChild(this.matrix.container)
    this.matrix = null
  }

}