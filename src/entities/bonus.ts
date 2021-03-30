import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as easing from "booyah/src/easing";
import * as tween from "booyah/src/tween";

import * as level from "../scenes/level";
import * as nucleotide from "./nucleotide";
import * as sequence from "./sequence";
import * as anim from "../animations";
import * as crispUtil from "../crispr";
import * as crispr from "../crispr";

export abstract class Bonus extends entity.CompositeEntity {
  public isUpdateDisabled = false;
  public sprite: PIXI.Sprite;
  public shakes: anim.ShakesManager;
  public position: PIXI.Point;

  public _count = 0;
  private _highlight = false;

  abstract name: string;

  constructor(private bonusesManager: BonusesManager) {
    super();
  }

  setup(frameInfo: entity.FrameInfo, entityConfig: entity.EntityConfig) {
    super.setup(frameInfo, entityConfig);
    this._activateChildEntity(this.shakes);
    this.shakes.setShake("root", 3);
    this.level.bonusesManager.disablingAnimation = false;
  }

  get highlight(): boolean {
    return this._highlight;
  }

  set highlight(value: boolean) {
    this._highlight = value;
    this.sprite.scale.set(value ? 1.2 : 1);
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
        fontSize: 60,
        fontStyle: "bold",
        fill: "#000000",
      });
      text.position.set(75, -85);
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
    this.level.bonusesManager.disablingAnimation = false;
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

export class TimeBonus extends Bonus {
  name = "time";

  protected _setup() {
    if (this.level.sequenceManager.sequenceCount === 0) {
      return this.abort();
    }

    this._entityConfig.fxMachine.play("bonus_time");

    this.level.fallingStopped = true;
    this._activateChildEntity(
      new entity.EntitySequence([
        new entity.WaitingEntity(5000),
        new entity.FunctionCallEntity(() => {
          this.level.fallingStopped = false;
          this.end();
        }),
      ])
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
    this.level.disablingAnimation(this.name, true);
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
            .then(() => this.level.disablingAnimation(this.name, false))
            .catch();
          this.end();
        }
      )
    );

    this._entityConfig.fxMachine.play("bonus_swap");
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

  protected _update(frameInfo: entity.FrameInfo) {
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

      this.level.disablingAnimation(this.name, true);

      this._activateChildEntity(
        new entity.EntitySequence([
          anim.sequenced({
            timeBetween: 200,
            items: stages,
            onStep: (stage, index) => {
              for (const n of stage) {
                n.shakes.setShake(this.name, 7 - index / 2);
              }
            },
          }),
          anim.sequenced({
            delay: 400,
            timeBetween: 200,
            waitForAllSteps: true,
            items: stages,
            onStep: (stage, index, src, finish) => {
              const promises: Promise<any>[] = [];
              for (const n of stage) {
                promises.push(
                  n.bubble(300, (_n) => {
                    _n.state = "present";
                    _n.shakes.removeShake(this.name);
                  })
                );
              }
              Promise.all(promises).then(finish);
            },
            callback: () => {
              this.level.disablingAnimation(this.name, false);
              this.end();
            },
          }),
        ])
      );
    });
  }
}

export class SyringeBonus extends Bonus {
  name = "syringe";

  protected _setup() {
    this.level.sequenceManager.container.buttonMode = true;

    this._once(this.level.sequenceManager, "click", (s: sequence.Sequence) => {
      this.level.disablingAnimation(this.name, true);
      this._activateChildEntity(
        new entity.EntitySequence([
          this.level.sequenceManager.removeSequence(
            !this.level.options.disableScore,
            s
          ),
          new entity.FunctionCallEntity(() => {
            this.level.sequenceManager.add();
            this.level.disablingAnimation(this.name, false);
            this.end();
          }),
        ])
      );
    });
  }

  protected _teardown() {
    this.level.sequenceManager.container.buttonMode = false;
  }
}

export interface InitialBonus {
  bonus: ((context: level.Level) => Bonus) | Bonus;
  quantity?: number;
}

export type InitialBonuses = InitialBonus[];

export class BonusesManager extends entity.CompositeEntity {
  public container: PIXI.Container;
  public bonuses = new Set<Bonus>();
  public selected: Bonus;
  public shakeAmount = 3;
  public wasBonusUsed = false;
  public disablingAnimation = false;
  private bonusBackground: PIXI.Sprite;

  constructor(private initialBonuses: InitialBonuses) {
    super();
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  _setup() {
    this.container = new PIXI.Container();
    this.container.position.set(30, crispUtil.height - 230);
    this._entityConfig.container.addChild(this.container);

    this.bonusBackground = crispr.sprite(
      this,
      "images/hud_bonus_background.png"
    );
    this.container.addChild(this.bonusBackground);

    this._on(this, "deactivatedChildEntity", (bonus: entity.EntityBase) => {
      if (bonus instanceof Bonus) {
        this.disablingAnimation = true;
        bonus.count--;
        bonus.sprite.filters = [];
        bonus.sprite.position.copyFrom(bonus.position);
        this.selected = null;
        this._activateChildEntity(
          new tween.Tween({
            from: 1.2,
            to: 1,
            duration: 20,
            onUpdate: (value) => bonus.sprite.scale.set(value),
            onTeardown: () => {
              this.disablingAnimation = false;
            },
          })
        );
      }
    });

    this._on(this, "activatedChildEntity", (bonus: entity.EntityBase) => {
      if (bonus instanceof Bonus) {
        this.disablingAnimation = true;
        bonus.level.path.remove();
        this._activateChildEntity(
          new tween.Tween({
            from: 1,
            to: 1.2,
            duration: 20,
            onUpdate: (value) => bonus.sprite.scale.set(value),
            onTeardown: () => {
              this.disablingAnimation = false;
            },
          })
        );
      }
    });

    this.generateFirstBonuses();
  }

  _update() {
    const disable = this.level.isDisablingAnimationInProgress;
    for (const bonus of this.bonuses) {
      const bonusDisable =
        this.disablingAnimation ||
        ((disable || !bonus.count) && !bonus.highlight);
      bonus.sprite.buttonMode = !bonusDisable;
      bonus.sprite.tint = bonusDisable ? 0x9f9f9f : 0xffffff;
    }
  }

  _teardown() {
    this.container = null;
  }

  reset() {
    this.bonuses.forEach(this.remove.bind(this));
    if (crispr.debug) {
      console.log("--> DONE", "bonusManager.reset()");
    }
  }

  generateFirstBonuses() {
    this.initialBonuses.forEach(({ bonus, quantity }) => {
      this.add(
        typeof bonus === "function" ? bonus(this.level) : bonus,
        quantity ?? 1
      );
    });
  }

  remove(bonus: Bonus): this {
    if (!this.bonuses.has(bonus)) {
      return;
    }

    this._off(bonus.sprite);

    this.container.removeChild(bonus.sprite);

    bonus.sprite = null;
    bonus.shakes = null;
    bonus._count = 0;

    this.bonuses.delete(bonus);

    return this;
  }

  add(bonus: Bonus, count = 1, fromPosition?: PIXI.Point): this {
    if (this.disablingAnimation) return;

    if (this.bonuses.has(bonus)) {
      bonus.count += count;
      return;
    }

    const position = new PIXI.Point(
      (this.bonusBackground.width / 3) * (this.bonuses.size + 1) -
        this.bonusBackground.width / 6,
      this.bonusBackground.height / 2
    );

    const sprite = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        `images/bonus_${bonus.name}.png`
      ].texture
    );

    sprite.anchor.set(0.5);
    sprite.interactive = true;
    sprite.position.copyFrom(position);

    this.container.addChild(sprite);

    bonus.position = position;
    bonus.sprite = sprite;
    bonus.shakes = new anim.ShakesManager(sprite);
    bonus.count = count;

    this.bonuses.add(bonus);

    this._on(bonus.sprite, "pointerup", () => {
      if (this.disablingAnimation) return;

      this.selection(bonus);
    });

    if (fromPosition) {
      sprite.position.copyFrom(fromPosition);
      this._activateChildEntity(
        new entity.EntitySequence([
          new entity.FunctionCallEntity(() => {
            this.level.disablingAnimation("bonus", true);
          }),
          new entity.WaitingEntity(1000),
          new entity.ParallelEntity([
            anim.move(
              sprite.position,
              fromPosition,
              position,
              1000,
              easing.easeOutQuart
            ),
            anim.bubble(sprite, 3, 1000),
          ]),
          new entity.FunctionCallEntity(() => {
            this.level.disablingAnimation("bonus", false);
          }),
        ])
      );
    }

    return this;
  }

  selection(bonus: Bonus) {
    if (this.disablingAnimation) return;

    this.disablingAnimation = true;

    if (bonus.isSetup) {
      this.selected = null;
      return bonus.abort();
    }

    if (this.selected === bonus) {
      this.selected = null;
      return bonus.abort();
    }

    // if (this.selected) {
    //   console.warn("bonus already selected:", this.selected, "target bonus:", bonus)
    // }

    if (bonus.count <= 0 || this.level.isDisablingAnimationInProgress) {
      this.disablingAnimation = false;
      return;
    }

    this.selected = bonus;

    this._activateChildEntity(
      bonus,
      entity.extendConfig({
        container: this.container,
      })
    );

    this._entityConfig.fxMachine.play("bonus_pick");
  }
}
