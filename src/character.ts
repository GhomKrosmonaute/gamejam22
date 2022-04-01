import { Container, Sprite } from "pixi.js";
import { CompositeEntity } from "booyah/src/entity";
import { xPad } from "./gamepad";

export class Character extends CompositeEntity {
  container: Container;
  sprite: Sprite;

  protected _setup() {
    xPad.once("connected", () => {
      console.log("Connected!");
    });
    xPad.on("buttonUpdate", console.log);
  }
}
