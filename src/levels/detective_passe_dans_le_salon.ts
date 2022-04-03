import {
  CompositeEntity,
  EntitySequence,
  extendConfig,
  FunctionCallEntity,
  WaitingEntity,
  ParallelEntity,
} from "booyah/src/entity";
import { Container, Sprite } from "pixi.js";
import { Character } from "../character";
import { Tween } from "booyah/src/tween";
import { Detective_trouve_la_montre } from "./detective_trouve_la_montre";

export class Detective_passe_dans_le_salon extends CompositeEntity {
  container: Container;
  character: Character;
  background: Sprite;

  _setup() {
    this.container = new Container();
    this.character = new Character();

    this.background = new Sprite(
      this._entityConfig.app.loader.resources[
        "images/Plan_maison_1.png"
      ].texture
    );
    this.background.width = 1920;
    this.background.height = 1080;

    this.container.addChild(this.background);

    this._activateChildEntity(
      this.character,
      extendConfig({
        container: this.container,
      })
    );

    this.character.container.scale.set(1.5);
    this.character.container.position.set(2020, 750);

    this._entityConfig.container.addChild(this.container);

    this.start();
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
  }

  start() {
    this._activateChildEntity(
      new ParallelEntity([
        new EntitySequence([
          new WaitingEntity(1000),
          () => this.character.turn(),
          new WaitingEntity(1000),
          () => this.character.turn(),
        ]),
        new EntitySequence([
          new Tween({
            from: 2020,
            to: -100,
            duration: 3000,
            onUpdate: (value) => {
              this.character.container.position.x = value;
            },
          }),
          new FunctionCallEntity(() => {
            this._entityConfig.monitor.switch(new Detective_trouve_la_montre());
          }),
        ]),
      ])
    );
  }
}
