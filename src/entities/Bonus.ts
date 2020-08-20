import * as PIXI from "pixi.js";
import { GlowFilter } from "@pixi/filter-glow";

import * as entity from "booyah/src/entity";
import * as utils from "../utils";
import * as game from "../game";
import Nucleotide from "./Nucleotide";

const glowFilter = new GlowFilter({ distance: 40 });

export default class Bonus extends entity.EntityBase {
  public targets: Nucleotide[] = [];
  public countText = new PIXI.Text("1", {
    fill: "#FFFFFF",
    fontSize: "80px",
    stroke: "#000000",
    strokeThickness: 10,
  });

  private _count = 1;
  private isFocused = false;

  constructor(
    public name: string,
    public sprite: PIXI.Sprite,
    public usageStyle: utils.BonusUsageStyle
  ) {
    super();
  }

  _setup() {
    // todo: add a sprite and make it interactive
    this.sprite.interactive = true;
    this.sprite.buttonMode = true;
    this.countText.anchor.set(0.5);
    this._entityConfig.container.addChild(this.sprite);
    this._entityConfig.container.addChild(this.countText);
    this.refresh();
  }

  _update() {}

  _teardown() {
    this._entityConfig.container.removeChild(this.sprite);
    this._entityConfig.container.removeChild(this.countText);
  }

  get count(): number {
    return this._count;
  }

  set count(count: number) {
    this._count = count;
    this.refresh();
  }

  get focused(): boolean {
    return this.isFocused;
  }

  set focused(isFocused: boolean) {
    this.isFocused = isFocused;
    if (isFocused) this.sprite.filters = [glowFilter];
    else this.sprite.filters = [];
  }

  use(n: Nucleotide) {
    this.targets.push(n);
    if (this.usageStyle === "drag & drop") {
      if (this.targets.length === 2) {
        this.emit("trigger", ...this.targets.slice(0));
        this.targets = [];
      }
    } else if (this.usageStyle === "drag & drop on neighbor") {
      if (this.targets.length === 2) {
        const neighborIndex = this._entityConfig.level.grid.getNeighborIndex(
          this.targets[0],
          this.targets[1]
        );
        if (neighborIndex === -1) {
          this.targets.pop();
        } else {
          this.emit("trigger", ...this.targets.slice(0));
          this.targets = [];
        }
      }
    } else {
      // this.usageStyle === "click"
      this.emit("trigger", this.targets[0]);
      this.targets = [];
    }
  }

  refresh() {
    this.countText.position.set(this.sprite.x + 200, this.sprite.y + 200);
    if (this._count < 2) {
      this.countText.visible = false;
    } else {
      this.countText.visible = true;
      this.countText.text = String(this._count);
    }
  }
}
