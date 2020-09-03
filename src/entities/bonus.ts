import * as entity from "booyah/src/entity";
import Level from "../scenes/level";
import Nucleotide from "./nucleotide";

export abstract class Bonus extends entity.EntityBase {
  public name: string = "";
}

export class SwapBonus extends Bonus {
  name = "swap";

  protected _setup() {
    const level: Level = this._entityConfig.level;

    level.grid.once("drag", (n1: Nucleotide) => {
      level.grid.once("drop", () => {
        const n2 = level.grid.getHovered();

        level.grid.swap(n1, n2);

        this._transition = entity.makeTransition();
      });
    });

    // todo: await mouse drag target
    // todo: await mouse drop on target 2
    // todo: level.grid.swap(n1, n2);
    // todo: make animation
  }
}

export class StarBonus extends Bonus {
  name = "star";

  protected _setup() {
    const level: Level = this._entityConfig.level;

    let target: Nucleotide | null = null;

    const delay = 250;

    level.grid.once("drag", (n: Nucleotide) => {
      target.state = "present";

      new entity.EntitySequence([
        new entity.WaitingEntity(delay),
        ...level.grid
          .getStarStages(target as Nucleotide)
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
          .flat(),
        new entity.FunctionCallEntity(() => {
          this._transition = entity.makeTransition();
        }),
      ]);
    });
  }
}

export class KillBonus extends Bonus {
  name = "kill";

  protected _setup() {
    const level: Level = this._entityConfig.level;

    let target: Nucleotide | null = null;

    // todo: await mouse click target
    target.state = "present";

    this._transition = entity.makeTransition();
  }
}
