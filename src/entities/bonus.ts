import * as entity from "booyah/src/entity";
import Level from "../scenes/level";
import Nucleotide from "./nucleotide";

export class Bonus extends entity.EntityBase {
  public selected = false;
  public name: string = "";
}

// todo: make bonus body

export class SwapBonus extends Bonus {
  name = "swap";
  // todo: make animated this.grid.swap(n1, n2);
}

export class StarBonus extends Bonus {
  name = "star";

  protected _setup() {
    const level: Level = this._entityConfig.level

    let target: Nucleotide | null = null

    new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        // await mouse click target
      }),
      ...level.grid.getStarStages(target as Nucleotide).map((stage) => {
        return new entity.FunctionCallEntity(() => {
          for(const n of stage){
            n.state = "present"
          }
        })
      }),
      new entity.FunctionCallEntity(() => {
        this._transition = entity.makeTransition()
      })
    ])
  }


}

export class KillBonus extends Bonus {
  name = "kill";
}
