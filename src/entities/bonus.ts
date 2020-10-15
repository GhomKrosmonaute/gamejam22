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
  public isUpdateDisabled = false;
  public sprite: PIXI.Sprite;
  public shakes: anim.ShakesManager;
  public position: PIXI.Point;

  private _count = 0;
  private _highlight = false;

  abstract name: string;

  setup(frameInfo: entity.FrameInfo, entityConfig: entity.EntityConfig) {
    super.setup(frameInfo, entityConfig);
    this._activateChildEntity(this.shakes);
    this.shakes.setShake("root", 3);
  }

  get highlight(): boolean {
    return this._highlight;
  }

  set highlight(value: boolean) {
    this._highlight = value;
    this.sprite.scale.set(value ? 0.7 : 0.5);
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get isDisable(): boolean {
    return this.level.isDisablingAnimationInProgress || this.count <= 0;
  }

  set count(value: number) {
    if (this._count === value) return;

    this._count = value;

    this.sprite.removeChildren();

    if (this._count > 0) {
      const text = crispUtil.makeText(String(this._count), {
        fontSize: 120,
        fill: 0xffffff,
        strokeThickness: 40,
        stroke: 0x444444,
      });
      text.position.set(-100, -100);
      this.sprite.addChild(text);
    }
  }

  get count(): number {
    return this._count;
  }

  end(aborted = false) {
    if (!aborted) this.level.bonusesManager.wasBonusUsed = true;
    this._transition = entity.makeTransition();
    this.isUpdateDisabled = false;
  }

  abort() {
    this._count++;
    this._activateChildEntity(
      anim.tweenShaking(this.sprite, 200, 20, 20, () => {
        this.end(true);
      })
    );
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
    if (a.colorName === b.colorName && a.type === b.type && a.state === b.state)
      return this.abort();

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
        if (!this.hovered) {
          // click
          this._once(this.level.grid, "drag", () => {
            if (!this.dragged || !this.hovered) {
              return this.abort();
            }
            this.swap(this.dragged, this.hovered);
          });
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
        this.level.disablingAnimations.delete(this.name);
        this.end();
      });
    });
  }

  protected _teardown() {
    this.level.sequenceManager.container.buttonMode = false;
  }
}

export const syringeBonus = new SyringeBonus();
export const healBonus = new HealBonus();
export const swapBonus = new SwapBonus();

export interface InitialBonus {
  bonus: Bonus;
  quantity?: number;
}

export type InitialBonuses = InitialBonus[];

export class BonusesManager extends entity.CompositeEntity {
  public container: PIXI.Container;
  public bonuses: Bonus[] = [];
  public selected: string;
  public shakeAmount = 3;
  public wasBonusUsed = false;
  private bonusBackground: PIXI.Sprite;

  constructor(private initialBonuses: InitialBonuses) {
    super();
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  _setup() {
    this.container = new PIXI.Container();
    this.container.position.set(0, crispUtil.height - 200);
    this._entityConfig.container.addChild(this.container);

    this.bonusBackground = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        "images/hud_bonus_background.png"
      ].texture
    );
    this.bonusBackground.scale.set(0.65);
    this.container.addChild(this.bonusBackground);

    this._on(this, "deactivatedChildEntity", (bonus: entity.EntityBase) => {
      if (bonus instanceof Bonus) {
        bonus.count--;
        bonus.sprite.filters = [];
        bonus.sprite.position.copyFrom(bonus.position);
        this.selected = null;
        this._activateChildEntity(
          new tween.Tween({
            from: 0.7,
            to: 0.5,
            duration: 20,
            onUpdate: (value) => bonus.sprite.scale.set(value),
          })
        );
      }
    });

    this._on(this, "activatedChildEntity", (bonus: entity.EntityBase) => {
      if (bonus instanceof Bonus) {
        bonus.level.path.remove();
        this._activateChildEntity(
          new tween.Tween({
            from: 0.5,
            to: 0.7,
            duration: 20,
            onUpdate: (value) => bonus.sprite.scale.set(value),
          })
        );
      }
    });

    this.initialBonuses.forEach(({ bonus, quantity }) => {
      this.add(bonus, quantity ?? 1);
    });
  }

  _update() {
    const disable = this.level.isDisablingAnimationInProgress;
    for (const bonus of this.bonuses) {
      const bonusDisable = (disable || !bonus.count) && !bonus.highlight;
      bonus.sprite.buttonMode = !bonusDisable;
      bonus.sprite.tint = bonusDisable ? 0x9f9f9f : 0xffffff;
    }
  }

  _teardown() {
    this.container = null;
  }

  getSelectedBonus(): Bonus | null {
    return this.bonuses.find((b) => b.name === this.selected);
  }

  add(bonus: Bonus, count = 1): this {
    if (this.bonuses.includes(bonus)) {
      bonus.count += count;
      return;
    }
    const position = new PIXI.Point(100 + this.bonuses.length * 190, 100);
    const sprite = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        `images/bonus_${bonus.name}.png`
      ].texture
    );
    sprite.scale.set(0.5);
    sprite.anchor.set(0.5);
    sprite.interactive = true;
    sprite.position.copyFrom(position);

    bonus.position = position;

    bonus.sprite = sprite;

    this.container.addChild(sprite);

    bonus.shakes = new anim.ShakesManager(sprite);

    bonus.count = count;

    this._on(bonus.sprite, "pointerup", () => this.selection(bonus));

    this.bonuses.push(bonus);

    return this;
  }

  selection(bonus: Bonus) {
    if (bonus.isSetup) {
      this.selected = null;
      return bonus.abort();
    }

    const old = this.getSelectedBonus();
    if (old === bonus) {
      this.selected = null;
      return bonus.abort();
    }

    if (bonus.count <= 0 || this.level.isDisablingAnimationInProgress) return;

    this.selected = bonus.name;

    this._activateChildEntity(
      bonus,
      entity.extendConfig({
        container: this.container,
      })
    );
  }
}
