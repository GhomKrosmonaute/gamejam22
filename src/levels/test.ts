import { extendConfig } from "booyah/src/entity";
import { Level } from "../level";
import { Character } from "../character";
import { Container } from "pixi.js";

export class Test extends Level {
  container: Container;
  character: Character;

  _setup() {
    this.container = new Container();
    this.character = new Character();

    this._activateChildEntity(
      this.character,
      extendConfig({
        container: this.container,
      })
    );
  }
}
