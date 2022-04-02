import { AnimatedSprite, Container, Sprite } from "pixi.js";
import {
  CompositeEntity,
  extendConfig,
  AnimatedSpriteEntity,
} from "booyah/src/entity";
import { makeAnimatedSprite } from "booyah/src/util";

export class Character extends CompositeEntity {
  spriteEntity: AnimatedSpriteEntity;
  container: Container;
  chapeau: Sprite;
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

    this.container.addChild(this.chapeau, this.pipe);

    this._entityConfig.container.addChild(this.container);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
  }
}
