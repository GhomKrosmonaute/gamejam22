import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import Level from "../scenes/level";
import Nucleotide from "./nucleotide";
import * as sequence from "./sequence";
import * as anim from "../animation";
import * as crisprUtil from "../crisprUtil";

export abstract class Bonus extends entity.CompositeEntity {
  public name: string = "";
  public updateDisabled = false;

  get level(): Level {
    return this._entityConfig.level;
  }

  end() {
    this._transition = entity.makeTransition();
    this.updateDisabled = false;
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
      delete n.shakeAmounts.swap;
    }
    return null;
  }

  protected _setup() {
    this._once(this.level.grid, "drag", (n1: Nucleotide) => {
      this.dragged = n1;
      this.dragged.pathArrow.visible = false;
      this.basePosition.copyFrom(n1.position);

      this._once(this.level.grid, "drop", () => {
        if (!this.dragged || !this.hovered) return this.abort();

        this.updateDisabled = true;
        this.level.grid.swap(this.dragged, this.hovered, false);
        this._activateChildEntity(
          anim.swap(this.dragged, this.hovered, 1, 6, () => {
            this.hovered.bubble(150).catch();
            this.dragged.bubble(150).catch();
            this.end();
          })
        );
      });
    });
  }

  protected _update() {
    if (this.updateDisabled) return;

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
        this.level.grid.nucleotides.forEach((n) => {
          delete n.shakeAmounts.swap;
          n.sprite.scale.set(1);
        });
        this.hovered = hovered;
        this.hovered.shakeAmounts.swap = 5;
        this.hovered.sprite.scale.set(1.2);
        this.level.grid.swapAbsolutePosition(this.hovered, this.dragged);
        // this._activateChildEntity(
        //   anim.swap(this.hovered, this.dragged, 50, 10)
        // )
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

      target.shakeAmounts.star = 7;

      const propagation = [
        new entity.WaitingEntity(delay * 2),
        ...stages.map((stage) => {
          return [
            new entity.FunctionCallEntity(() => {
              for (const n of stage) {
                n.shakeAmounts.star = 2;
              }
            }),
            new entity.WaitingEntity(delay),
          ];
        }),
        new entity.FunctionCallEntity(() => {
          target.state = "present";
        }),
        new entity.FunctionCallEntity(() => {
          this._activateChildEntity(
            anim.bubble(target.sprite, 1.3, delay / 2, 4)
          );
        }),
        new entity.WaitingEntity(delay / 2),
        new entity.FunctionCallEntity(() => (target.shakeAmounts.star = 0)),
        ...stages.map((stage, index) => {
          return [
            new entity.FunctionCallEntity(() => {
              for (const n of stage) {
                n.shakeAmounts.star = 10 - index;
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
                delete n.shakeAmounts.star;
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
      this.level.sequenceManager.removeSequence(s, () => {
        this.level.sequenceManager.add();

        if (this.level.levelVariant === "turnBased") {
          this.level.sequenceManager.distributeSequences();
          this.end();
        }
      });
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
  public sprites: { [k: string]: anim.Sprite } = {};
  public basePosition: { [k: string]: PIXI.Point } = {};
  public selected: string;
  public shakeAmount = 3;

  _setup() {
    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);
    this._on(this, "deactivatedChildEntity", (bonus: entity.EntityBase) => {
      if (bonus instanceof Bonus) {
        bonus.level.isGuiLocked = false;
        this.selected = null;
        this.sprites[bonus.name].filters = [];
        this.sprites[bonus.name].position.copyFrom(
          this.basePosition[bonus.name]
        );
        this._activateChildEntity(
          anim.fromTo(
            this.sprites[bonus.name],
            (value, target) => target.scale.set(value),
            {
              from: 0.7,
              to: 0.5,
              time: 20,
              stepCount: 3,
            }
          )
        );
      }
    });

    this._on(this, "activatedChildEntity", (bonus: entity.EntityBase) => {
      if (bonus instanceof Bonus) {
        bonus.level.isGuiLocked = true;
        bonus.level.path.remove();
        this._activateChildEntity(
          anim.fromTo(
            this.sprites[bonus.name],
            (value, target) => target.scale.set(value),
            {
              from: 0.5,
              to: 0.7,
              time: 20,
              stepCount: 3,
            }
          )
        );
      }
    });
  }

  _update() {
    const bonus = this.getSelectedBonus();
    if (bonus) {
      const angle = Math.random() * 2 * Math.PI;
      this.sprites[bonus.name].position.x =
        this.basePosition[bonus.name].x + this.shakeAmount * Math.cos(angle);
      this.sprites[bonus.name].position.y =
        this.basePosition[bonus.name].y + this.shakeAmount * Math.sin(angle);
    }
  }

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
    const position = new PIXI.Point(
      160 + this.bonuses.length * 190,
      this._entityConfig.app.view.height * 0.935
    );
    const sprite = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        `images/bonus_${bonus.name}.png`
      ].texture
    );
    sprite.scale.set(0.5);
    sprite.anchor.set(0.5);
    sprite.interactive = true;
    sprite.position.copyFrom(position);
    this.basePosition[bonus.name] = position;
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

    this.selected = name;

    const bonus = this.getSelectedBonus();

    this._activateChildEntity(
      bonus,
      entity.extendConfig({
        container: this.container,
      })
    );
  }
}
