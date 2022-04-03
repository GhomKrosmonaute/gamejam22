import {
  CompositeEntity,
  EntitySequence,
  extendConfig,
  FunctionCallEntity,
  ParallelEntity,
  WaitingEntity,
} from "booyah/src/entity";
import { Tween } from "booyah/src/tween";
import { Character } from "../character";
import { Container, Sprite } from "pixi.js";

export class Detective_trouve_la_montre extends CompositeEntity {
  container: Container;
  character: Character;
  background: Sprite;
  background2: Sprite;

  _setup() {
    this.container = new Container();
    this.character = new Character();

    this.background = new Sprite(
      this._entityConfig.app.loader.resources[
        "images/Plan_ou_on_trouve_la_montre.png"
      ].texture
    );
    this.background.width = 1920;
    this.background.height = 1080;

    this.background2 = new Sprite(
      this._entityConfig.app.loader.resources[
        "images/Plan_ou_on_trouve_la_montre_monde_vert.png"
      ].texture
    );
    this.background2.width = 1920;
    this.background2.height = 1080;

    this.container.addChild(this.background);

    this._activateChildEntity(
      this.character,
      extendConfig({
        container: this.container,
      })
    );

    this.character.container.scale.set(3);
    this.character.container.position.set(1920 / 2, 1080 / 2);

    this._entityConfig.container.addChild(this.container);

    this.start();
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
  }

  start() {
    this._activateChildEntity(
      new EntitySequence([
        new ParallelEntity([
          new Tween({
            from: 3,
            to: 1.5,
            duration: 2000,
            onUpdate: (value) => {
              this.character.container.scale.set(value);
            },
          }),
          new Tween({
            from: 1080 / 2,
            to: 1080 / 2 + 100,
            duration: 2000,
            onUpdate: (value) => {
              this.character.container.position.y = value;
            },
          }),
        ]),
        new WaitingEntity(1000),
        new FunctionCallEntity(() => {
          this.character.getItem();
          this.container.removeChild(this.background);
          this.container.addChildAt(this.background2, 0);
        }),
        new WaitingEntity(1000),
      ])
    );
  }
}
