import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as easing from "booyah/src/easing";
import * as tween from "booyah/src/tween";

import * as level from "../scenes/level";
import * as nucleotide from "./nucleotide";
import * as sequence from "./sequence";
import * as anim from "../animations";
import * as crispUtil from "../crisprUtil";

export abstract class Bonus extends entity.CompositeEntity {
  public name: string = "";
  public isUpdateDisabled = false;

  get level(): level.Level {
    return this._entityConfig.level;
  }

  end() {
    this._transition = entity.makeTransition();
    this.isUpdateDisabled = false;
  }

  abort() {
    this.level.bonusesManager.counts[this.name]++;
    this.end();
  }
}

export class SwapBonus extends Bonus {
  name = "swap";
  dragged: nucleotide.Nucleotide | null = null;
  hovered: nucleotide.Nucleotide | null = null;
  basePosition = new PIXI.Point();

  downNucleotide(n: nucleotide.Nucleotide): null {
    if (n) {
      this.level.grid.setAbsolutePositionFromGridPosition(n);
      n.shakes.removeShake(this.name);
      n.sprite.scale.set(1);
    }
    return null;
  }

  swap(a: nucleotide.Nucleotide, b: nucleotide.Nucleotide) {
    this.isUpdateDisabled = true;
    this.level.grid.swap(a, b, false);
    this.level.disablingAnimations.add(this.name);
    this._activateChildEntity(
      anim.swap(
        a,
        b,
        crispUtil.proportion(
          crispUtil.dist(b.position, a.position),
          0,
          1000,
          100,
          500,
          true
        ),
        easing.easeInBack,
        () => {
          b.bubble(150).catch();
          a.bubble(150)
            .then(() => this.level.disablingAnimations.delete(this.name))
            .catch();
          this.end();
        }
      )
    );
  }

  protected _setup() {
    this._once(this.level.grid, "drag", (n1: nucleotide.Nucleotide) => {
      this.dragged = n1;
      this.basePosition.copyFrom(n1.position);

      this._once(this.level.grid, "drop", () => {
        if (this.dragged === this.hovered) {
          // click
          console.log("selection");
        } else {
          // drag & drop
          if (!this.dragged || !this.hovered) {
            return this.abort();
          }
          this.swap(this.dragged, this.hovered);
        }
      });
    });
  }

  protected _update() {
    if (this.isUpdateDisabled) return;

    const mouse: PIXI.Point = this.level.cursor;

    if (this.dragged) {
      this.dragged.position.x = mouse.x - this.level.grid.x;
      this.dragged.position.y = mouse.y - this.level.grid.y;

      const hovered = this.level.grid
        .getAllHovered(0.86)
        .filter((n) => n !== this.dragged)[0];

      if (hovered && hovered !== this.hovered) {
        if (this.hovered) {
          this.level.grid.setAbsolutePositionFromGridPosition(this.hovered);
          this.level.grid.setAbsolutePositionFromGridPosition(this.dragged);
        }
        this.level.grid.nucleotides.forEach((n) => {
          n.shakes.removeShake(this.name);
          n.sprite.scale.set(1);
        });
        this.hovered = hovered;
        this.hovered.shakes.set(this.name, 5);
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

export class HealBonus extends Bonus {
  name = "heal";

  protected _setup() {
    this._once(this.level.grid, "drag", (target: nucleotide.Nucleotide) => {
      const stages = [[target], ...this.level.grid.getStarStages(target)];

      this.level.disablingAnimations.add(this.name);

      anim.sequenced({
        timeBetween: 200,
        sequence: stages,
        onStep: (resolve, stage, index) => {
          for (const n of stage) {
            n.shakes.setShake(this.name, 7 - index / 2);
          }
          resolve();
        },
        callback: () => {
          anim.sequenced({
            delay: 400,
            timeBetween: 200,
            sequence: stages,
            onStep: (resolve, stage, index) => {
              const finish: Promise<any>[] = [];
              for (const n of stage) {
                finish.push(
                  n.bubble(300, (_n) => {
                    _n.state = "present";
                    _n.shakes.removeShake(this.name);
                  })
                );
              }
              Promise.all(finish).then(resolve);
            },
            callback: () => {
              this.level.disablingAnimations.delete(this.name);
              this.end();
            },
          });
        },
      });
    });
  }
}

export class SyringeBonus extends Bonus {
  name = "syringe";

  protected _setup() {
    this.level.sequenceManager.container.buttonMode = true;

    this._once(this.level.sequenceManager, "click", (s: sequence.Sequence) => {
      this.level.disablingAnimations.add(this.name);
      this.level.sequenceManager.removeSequence(true, s, () => {
        this.level.sequenceManager.add();

        switch (this.level.levelVariant) {
          case "continuous":
            this.level.sequenceManager.distributeSequences();
            this.end();
            break;
          case "long":
            this.level.sequenceManager.distributeSequences();
            this.end();
            break;
          case "turnBased":
            this.level.sequenceManager.distributeSequences();
            this.end();
            break;
        }

        this.level.disablingAnimations.delete(this.name);
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
          new tween.Tween({
            from: 0.7,
            to: 0.5,
            duration: 20,
            onUpdate: (value) => this.sprites[bonus.name].scale.set(value),
          })
        );
      }
    });

    this._on(this, "activatedChildEntity", (bonus: entity.EntityBase) => {
      if (bonus instanceof Bonus) {
        bonus.level.isGuiLocked = true;
        bonus.level.path.remove();
        this._activateChildEntity(
          new tween.Tween({
            from: 0.5,
            to: 0.7,
            duration: 20,
            onUpdate: (value) => this.sprites[bonus.name].scale.set(value),
          })
        );
      }
    });
  }

  _update() {
    const bonus = this.getSelectedBonus();
    if (bonus) {
      this.sprites[bonus.name].position.copyFrom(
        anim.shakingPoint({
          anchor: this.basePosition[bonus.name],
          amount: this.shakeAmount,
        })
      );
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
    const level: level.Level = this._entityConfig.level;

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
