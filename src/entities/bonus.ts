import * as entity from "booyah/src/entity";
import Level from "../scenes/level";
import Nucleotide from "./nucleotide";
import * as sequence from "./sequence";
import * as PIXI from "pixi.js";

import { GlowFilter } from "@pixi/filter-glow";

const glowFilter = new GlowFilter({ distance: 20, color: 0x000000 });

export abstract class Bonus extends entity.CompositeEntity {
  public name: string = "";

  get level(): Level {
    return this._entityConfig.level;
  }

  protected _teardown() {
    this.level.isGuiLocked = false;
    this.level.inventory.sprites[this.name].filters = [];
    this.level.inventory.selected = null;
    this.level.sequenceManager.container.buttonMode = false;
  }
}

export class SwapBonus extends Bonus {
  name = "swap";
  dragging: Nucleotide | null = null;
  basePosition = new PIXI.Point();

  protected _setup() {
    this._once(this.level.grid, "drag", (n1: Nucleotide) => {
      this.dragging = n1;
      this.basePosition.copyFrom(n1.position);

      this._once(this.level.grid, "drop", () => {
        if (!this.dragging) return (this._transition = entity.makeTransition());

        this.dragging = null;

        const n2 = this.level.grid.getAllHovered().filter(n => n !== n1)[0];

        n1.position.copyFrom(this.basePosition)

        this.level.grid.swap(n1, n2);

        this._transition = entity.makeTransition();
      });
    });
  }

  protected _update() {
    const mouse: PIXI.Point = this.level.grid.lastPointerPos;

    if (this.dragging) {
      this.dragging.position.x = mouse.x - this.level.grid.x;
      this.dragging.position.y = mouse.y - this.level.grid.y;

      // todo: auto-swap preview
    }
  }
}

export class StarBonus extends Bonus {
  name = "star";

  protected _setup() {
    const delay = 250;

    this._once(this.level.grid, "drag", (target: Nucleotide) => {
      target.state = "present";

      const propagation = this.level.grid
        .getStarStages(target)
        .map((stage) => {
          return [
            new entity.FunctionCallEntity(() => {
              for (const n of stage) {
                n.state = "present";
              }
            }),
            new entity.WaitingEntity(delay),
          ];
        })
        .flat();

      const sequence = new entity.EntitySequence([
        new entity.WaitingEntity(delay),
        ...propagation,
        new entity.FunctionCallEntity(() => {
          this._transition = entity.makeTransition();
        }),
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
      // todo: make animation for removing
      this.level.sequenceManager.removeSequence(s);

      this._transition = entity.makeTransition();
    });
  }
}

export class BonusesManager extends entity.CompositeEntity {
  public container: PIXI.Container;
  public bonuses: Bonus[] = [];
  public counts: { [k: string]: number } = {};
  public sprites: { [k: string]: PIXI.Sprite | PIXI.AnimatedSprite } = {};
  public selected: string;

  constructor() {
    super();
  }

  _setup() {
    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);
  }

  _update() {}

  _teardown() {
    this.container = null;
  }

  _onPointerUp() {
    // todo: check mouse position to focus bonus or not
  }

  _onBonusUsed(name: string) {
    this.remove(name);
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

  remove(name: string) {
    const bonus = this.bonuses.find((b) => b.name === name);
    this._off(bonus);
    this.bonuses = this.bonuses.filter((b) => b !== bonus);
    this.container.removeChild(this.sprites[name]);
    this._deactivateChildEntity(bonus);
  }

  selection(name: string) {
    const level: Level = this._entityConfig.level;

    if (name === this.selected) {
      const bonus = this.getSelectedBonus();
      if (bonus) {
        this._deactivateChildEntity(bonus);
      }
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
