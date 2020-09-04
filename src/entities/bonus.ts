import * as entity from "booyah/src/entity";
import Level from "../scenes/level";
import Nucleotide from "./nucleotide";
import * as sequence from "./sequence";
import * as PIXI from "pixi.js";

import { GlowFilter } from "@pixi/filter-glow";
import * as anim from "../animation";

const glowFilter = new GlowFilter({ distance: 20, color: 0x000000 });

export abstract class Bonus extends entity.CompositeEntity {
  public name: string = "";

  get level(): Level {
    return this._entityConfig.level;
  }

  end() {
    this._transition = entity.makeTransition();
  }

  abort() {
    this.level.bonusesManager.counts[this.name]++;
    this.end();
  }
}

export class SwapBonus extends Bonus {
  name = "swap";
  dragged: Nucleotide | null = null;
  hovered: Nucleotide | null = null;
  basePosition = new PIXI.Point();

  downNucleotide(n: Nucleotide): null {
    if (n) {
      this.level.grid.setAbsolutePositionFromGridPosition(n);
      n.shakeAmount = 0;
    }
    return null;
  }

  protected _setup() {
    this._once(this.level.grid, "drag", (n1: Nucleotide) => {
      this.dragged = n1;
      this.basePosition.copyFrom(n1.position);

      this._once(this.level.grid, "drop", () => {
        if (!this.dragged || !this.hovered) return this.abort();

        this.level.grid.swap(this.dragged, this.hovered);

        this.hovered.bubble(150).catch()
        setTimeout(function(){
          this.bubble(150).catch()
        }.bind(this.dragged), 100)

        this.end();
      });
    });
  }

  protected _update() {
    const mouse: PIXI.Point = this.level.grid.lastPointerPos;

    if (this.dragged) {
      this.dragged.position.x = mouse.x - this.level.grid.x;
      this.dragged.position.y = mouse.y - this.level.grid.y;

      const hovered = this.level.grid
        .getAllHovered()
        .filter((n) => n !== this.dragged)[0];

      if (hovered && hovered !== this.hovered) {
        if (this.hovered) {
          this.level.grid.setAbsolutePositionFromGridPosition(this.hovered);
          this.level.grid.setAbsolutePositionFromGridPosition(this.dragged);
        }
        this.hovered = hovered;
        this.level.grid.swapAbsolutePosition(this.hovered, this.dragged);
      }
    }
  }

  protected _teardown() {
    this.dragged = this.downNucleotide(this.dragged);
    this.hovered = this.downNucleotide(this.hovered);
  }
}

export class StarBonus extends Bonus {
  name = "star";

  protected _setup() {
    const delay = 200;

    this._once(this.level.grid, "drag", (target: Nucleotide) => {
      const stages = this.level.grid.getStarStages(target);

      target.shakeAmount = 7;

      const propagation = [
        new entity.WaitingEntity(delay * 2),
        ...stages.map((stage) => {
          return [
            new entity.FunctionCallEntity(() => {
              for (const n of stage) {
                n.shakeAmount = 2;
              }
            }),
            new entity.WaitingEntity(delay),
          ];
        }),
        new entity.FunctionCallEntity(() => {
          target.state = "present";
        }),
        new entity.FunctionCallEntity(() => {
          this._activateChildEntity(anim.bubble(target.sprite, delay / 2));
        }),
        new entity.WaitingEntity(delay / 2),
        new entity.FunctionCallEntity(() => (target.shakeAmount = 0)),
        ...stages.map((stage, index) => {
          return [
            new entity.FunctionCallEntity(() => {
              for (const n of stage) {
                n.shakeAmount = 10 - index;
              }
            }),
            new entity.WaitingEntity(delay / 3),
            new entity.FunctionCallEntity(() => {
              for (const n of stage) {
                n.state = "present";
                n.bubble(delay / 3).catch();
              }
            }),
            new entity.WaitingEntity(delay / 3),
            new entity.FunctionCallEntity(() => {
              for (const n of stage) {
                n.shakeAmount = 0;
              }
            }),
          ];
        }),
      ].flat();

      const sequence = new entity.EntitySequence([
        ...propagation,
        new entity.FunctionCallEntity(() => this.end()),
      ]);

      this._activateChildEntity(sequence);
    });
  }
}

export class KillBonus extends Bonus {
  name = "kill";

  protected _setup() {
    this.level.sequenceManager.container.buttonMode = true;

    this._once(this.level.sequenceManager, "click", (s: sequence.Sequence) => {
      this.level.sequenceManager.removeSequence(s, () => this.end());
    });
  }

  protected _teardown() {
    this.level.sequenceManager.container.buttonMode = false;
  }
}

export class BonusesManager extends entity.CompositeEntity {
  public container: PIXI.Container;
  public bonuses: Bonus[] = [];
  public counts: { [k: string]: number } = {};
  public sprites: { [k: string]: PIXI.Sprite | PIXI.AnimatedSprite } = {};
  public selected: string;

  _setup() {
    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);
    this._on(this, "deactivatedChildEntity", (bonus: Bonus) => {
      bonus.level.isGuiLocked = false;
      bonus.level.bonusesManager.sprites[bonus.name].filters = [];
      bonus.level.bonusesManager.selected = null;
    });
  }

  _update() {}

  _teardown() {
    this.container = null;
  }

  getSelectedBonus(): Bonus | null {
    return this.bonuses.find((b) => b.name === this.selected);
  }

  add(bonus: Bonus, count = 1) {
    if (this.bonuses.includes(bonus)) {
      this.counts[bonus.name] += count;
      return;
    }
    const sprite = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        `images/bonus_${bonus.name}.png`
      ].texture
    );
    sprite.scale.set(0.5);
    sprite.anchor.set(0.5);
    sprite.interactive = true;
    sprite.position.set(
      160 + this.bonuses.length * 190,
      this._entityConfig.app.view.height * 0.935
    );
    this.sprites[bonus.name] = sprite;
    this.container.addChild(sprite);

    this.counts[bonus.name] = count;

    this._on(this.sprites[bonus.name], "pointerup", () =>
      this.selection(bonus.name)
    );

    this.bonuses.push(bonus);
  }

  selection(name: string) {
    const level: Level = this._entityConfig.level;

    if (name === this.selected) {
      const bonus = this.getSelectedBonus();
      if (bonus) bonus.abort();
      return;
    }

    if (level.isGuiLocked) return;
    else level.isGuiLocked = true;

    this.selected = name;

    for (const n in this.sprites) {
      this.sprites[n].filters = [];
    }
    this.sprites[name].filters = [glowFilter];

    this._activateChildEntity(
      this.getSelectedBonus(),
      entity.extendConfig({
        container: this.container,
      })
    );
  }
}
