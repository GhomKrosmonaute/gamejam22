import * as entity from "booyah/src/entity";

export class Bonus extends entity.EntityBase {
  public selected = false;
  public name: string = "";

  constructor() {
    super();
  }
}

// todo: make bonus body

export class SwapBonus extends Bonus {
  name = "swap";
  // todo: make animated this.grid.swap(n1, n2);
}

export class StarBonus extends Bonus {
  name = "star";
}

export class KillBonus extends Bonus {
  name = "kill";
}
