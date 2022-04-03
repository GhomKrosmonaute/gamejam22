import { AnimatedSprite, Container, Sprite } from "pixi.js";
import {
  CompositeEntity,
  extendConfig,
  AnimatedSpriteEntity,
} from "booyah/src/entity";
import { makeAnimatedSprite } from "booyah/src/util";
import { easeInOutBack } from "booyah/src/easing";
import { Tween } from "booyah/src/tween";

export class Character extends CompositeEntity {
  static hasItem = false;

  spriteEntity: AnimatedSpriteEntity;
  container: Container;
  chapeau: Sprite;
  montre: Sprite;
  pipe: Sprite;

  _setup() {
    this.container = new Container();

    this.spriteEntity = makeAnimatedSprite(
      this._entityConfig.app.loader.resources["images/character.json"]
    );

    this._activateChildEntity(
      this.spriteEntity,
      extendConfig({
        container: this.container,
      })
    );

    this.spriteEntity.sprite.loop = true;
    this.spriteEntity.sprite.animationSpeed = 1 / 3;
    this.spriteEntity.sprite.anchor.set(0.5);

    this.chapeau = new Sprite(
      this._entityConfig.app.loader.resources["images/chapeau.webp"].texture
    );
    this.chapeau.scale.set(0.5);
    this.chapeau.anchor.set(0.5);
    this.chapeau.position.set(-10, -180);

    this.pipe = new Sprite(
      this._entityConfig.app.loader.resources["images/pipe.png"].texture
    );
    this.pipe.scale.set(0.04);
    this.pipe.anchor.set(0.5);
    this.pipe.position.set(-58, -100);

    this.montre = new Sprite(
      this._entityConfig.app.loader.resources["images/Montre_2.png"].texture
    );
    this.montre.angle = -30;
    this.montre.visible = Character.hasItem;
    this.montre.scale.set(0.04);
    this.montre.anchor.set(0.5);
    this.montre.position.set(-50, 0);

    this.container.addChild(this.chapeau, this.pipe, this.montre);

    this._entityConfig.container.addChild(this.container);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
  }

  turn() {
    return new Tween({
      from: this.container.scale.x,
      to: this.container.scale.x * -1,
      duration: 250,
      easing: easeInOutBack,
      onUpdate: (value) => {
        this.container.scale.x = value;
      },
    });
  }

  getItem() {
    Character.hasItem = true;
    this.montre.visible = true;
  }
}
