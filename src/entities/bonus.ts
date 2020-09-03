import * as entity from "booyah/src/entity";
import Level from "../scenes/level";
import Nucleotide from "./nucleotide";
import * as sequence from "./sequence";
import * as PIXI from "pixi.js";

export abstract class Bonus extends entity.CompositeEntity {
  public name: string = "";

  protected _teardown() {
    const level: Level = this._entityConfig.level;

    level.isGuiLocked = false;

    level.inventory.sprites[this.name].filters = [];
  }
}

export class SwapBonus extends Bonus {
  name = "swap";
  dragging: Nucleotide | null = null;
  basePosition = new PIXI.Point();

  protected _setup() {
    const level: Level = this._entityConfig.level;

    level.grid.once("drag", (n1: Nucleotide) => {
      this.dragging = n1;
      this.basePosition.copyFrom(n1._container.position);

      level.grid.once("drop", () => {
        this.dragging._container.position.copyFrom(this.basePosition);
        this.dragging = null;

        const n2 = level.grid.getHovered();

        level.grid.swap(n1, n2);

        this._transition = entity.makeTransition();
      });
    });
  }

  protected _update() {
    const mouse: PIXI.Point = this._entityConfig.level.grid._lastPointerPos;

    // if drag, move nucleotide and auto-swap
    if (this.dragging) {
      this.dragging.position.x = mouse.x - this.basePosition.x;
      this.dragging.position.y = mouse.y - this.basePosition.y;
    }
  }
}

export class StarBonus extends Bonus {
  name = "star";

  protected _setup() {
    const level: Level = this._entityConfig.level;

    const delay = 250;

    level.grid.once("drag", (target: Nucleotide) => {
      target.state = "present";

      const propagation = level.grid
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
    const level: Level = this._entityConfig.level;

    level.sequenceManager.once("click", (s: sequence.Sequence) => {
      // todo: make animation for removing
      level.sequenceManager.removeSequence(s);

      this._transition = entity.makeTransition();
    });
  }
}
