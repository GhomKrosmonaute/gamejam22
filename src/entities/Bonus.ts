import * as PIXI from "pixi.js";
import { GlowFilter } from "@pixi/filter-glow";

import * as entity from "booyah/src/entity";
import Nucleotide from "./Nucleotide";

const glowFilter = new GlowFilter({ distance: 40, color: 0x3399ff });

export interface BonusTriggerEvents {
  click: [];
  clickOneNucleotide: [Nucleotide];
  clickTwoNucleotides: [Nucleotide, Nucleotide];
  clickTwoNeighbors: [Nucleotide, Nucleotide];
}

export default class Bonus<
  TriggerEventName extends keyof BonusTriggerEvents
> extends entity.EntityBase {
  public targets: Nucleotide[] = [];
  public countText = new PIXI.Text("1", {
    fill: "#FFFFFF",
    fontSize: "100px",
    stroke: "#000000",
    strokeThickness: 13,
  });

  private _selected = false;
  private _count = 1;

  constructor(
    public name: string,
    public sprite: PIXI.Sprite,
    private triggerEventName: TriggerEventName
  ) {
    super();
  }

  onTrigger(
    callback: (
      ...args: BonusTriggerEvents[TriggerEventName]
    ) => any | Promise<any>
  ) {
    this._on(this, "trigger", callback);
  }

  _setup() {
    // todo: add a sprite and make it interactive
    this.sprite.interactive = true;
    this.sprite.buttonMode = true;
    this.countText.anchor.set(0.5);
    this.sprite.addChild(this.countText);
    this._entityConfig.container.addChild(this.sprite);
    this.countUpdate();
    this.onTrigger(() => {
      this.selected = false;
      this.count--;
    });
  }

  _update() {}

  _teardown() {
    this._entityConfig.container.removeChild(this.sprite);
  }

  get count(): number {
    return this._count;
  }

  set count(count: number) {
    this._count = count;
    this.countUpdate();
  }

  get selected(): boolean {
    return this._selected;
  }

  set selected(isFocused: boolean) {
    this._selected = isFocused;
    if (isFocused) {
      if (this.triggerEventName === "click") {
        this._selected = false;
        this.emit("trigger");
      } else {
        this.sprite.filters = [glowFilter];
      }
    } else {
      this.sprite.filters = [];
    }
  }

  use(n: Nucleotide) {
    this.targets.push(n);
    if (this.triggerEventName === "clickTwoNucleotides") {
      if (this.targets.length === 2) {
        this.emit("trigger", ...this.targets.slice(0));
        this.targets = [];
      }
    } else if (this.triggerEventName === "clickTwoNeighbors") {
      if (this.targets.length === 2) {
        const neighborIndex = this._entityConfig.level.grid.getNeighborIndex(
          this.targets[0],
          this.targets[1]
        );
        if (neighborIndex === -1) {
          this.targets.pop();
        } else {
          // @ts-ignore
          this.emit("trigger", ...this.targets.slice(0));
          this.targets = [];
        }
      }
    } else {
      // this.triggerEventName === "clickOneNucleotide"
      // @ts-ignore
      this.emit("trigger", this.targets[0]);
      this.targets = [];
    }
  }

  countUpdate() {
    this.countText.position.set(-60, 55);
    if (this._count < 2) {
      this.countText.visible = false;
    } else {
      this.countText.visible = true;
      this.countText.text = String(this._count);
    }
    if (this._count === 0) {
      this.emit("empty");
    }
  }
}
