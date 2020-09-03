import * as entity from "booyah/src/entity";
import Level from "../scenes/level";
import Nucleotide from "./nucleotide";

export abstract class Bonus extends entity.EntityBase {
  public name: string = "";
}

// todo: make bonus body

export class SwapBonus extends Bonus {
  name = "swap";

  protected _setup() {
    const level: Level = this._entityConfig.level

    // todo: await mouse drag target
      // todo: await mouse drop on target 2
        // todo: level.grid.swap(n1, n2);
        // todo: make animation
  }
}

export class StarBonus extends Bonus {
  name = "star";

  protected _setup() {
    const level: Level = this._entityConfig.level

    let target: Nucleotide | null = null

    const delay = 250

    new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        // todo: await mouse click target
        target.state = "present"
      }),
      new entity.WaitingEntity(delay),
      ...level.grid.getStarStages(target as Nucleotide).map((stage) => {
        return [
          new entity.FunctionCallEntity(() => {
            for(const n of stage){
              n.state = "present"
            }
          }),
          new entity.WaitingEntity(delay)
        ]
      }).flat(),
      new entity.FunctionCallEntity(() => {
        this._transition = entity.makeTransition()
      })
    ])
  }
}

export class KillBonus extends Bonus {
  name = "kill";

  protected _setup() {
    const level: Level = this._entityConfig.level

    let target: Nucleotide | null = null

    // todo: await mouse click target
    target.state = "present"

    this._transition = entity.makeTransition()
  }
}
