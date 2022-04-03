import {
  CompositeEntity,
  EntitySequence,
  extendConfig,
  FunctionCallEntity,
  WaitingEntity,
} from "booyah/src/entity";
import { Tween } from "booyah/src/tween";
import { Container, Sprite } from "pixi.js";
import { Character } from "../character";
import { Detective_passe_dans_le_salon } from "./detective_passe_dans_le_salon";

export class Detective_se_leve_et_marche extends CompositeEntity {
  container: Container;
  character: Character;
  background: Sprite;

  _setup() {
    this.container = new Container();
    this.character = new Character();

    this.background = new Sprite(
      this._entityConfig.app.loader.resources[
        "images/Plan_appart_inspecteur_1.png"
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
    this.character.container.position.set(300, 750);

    this._entityConfig.container.addChild(this.container);

    this.start();
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
  }

  start() {
    this._activateChildEntity(
      new EntitySequence([
        new WaitingEntity(200),
        new Tween({
          from: 300,
          to: -100,
          duration: 2000,
          onUpdate: (value) => {
            this.character.container.position.x = value;
          },
        }),
        new FunctionCallEntity(() => {
          this._entityConfig.monitor.switch(
            new Detective_passe_dans_le_salon()
          );
        }),
      ])
    );
  }
}
