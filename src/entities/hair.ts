import * as PIXI from "pixi.js"

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as geom from "booyah/src/geom";

import * as crisprUtil from "../crisprUtil";

const hairCount = 40;
const hairMinScale = 0.3;
const hairMaxScale = 0.45;

export class HairManager extends entity.CompositeEntity {
  private container = new PIXI.Container()
  public hairs: Hair[] = []

  protected _setup() {
    for (let i = 0; i < hairCount; i++) {
      const hair = new Hair(
        geom.degreesToRadians(geom.lerp(-23, 24, i / hairCount)),
        geom.lerp(hairMaxScale, hairMinScale, Math.random())
      )
      this.hairs.push(hair)
      this._activateChildEntity(
        hair,
        entity.extendConfig({
          container: this.container,
        })
      );
    }
  }

  protected _teardown() {
    this.hairs.forEach(this._deactivateChildEntity.bind(this))
    this.hairs = null
  }
}


export class Hair extends entity.CompositeEntity {
  private loop: entity.EntitySequence
  public spriteEntity: entity.AnimatedSpriteEntity

  constructor(public rotation: number, public scale: number) {
    super();
  }

  get sprite(): PIXI.AnimatedSprite {
    return this.spriteEntity.sprite
  }

  _setup() {
    this.spriteEntity = util.makeAnimatedSprite(
      this._entityConfig.app.loader.resources["images/hair.json"],
      false
    );

    this.sprite.animationSpeed = (24 + this.rotation) / 60;
    this.sprite.loop = false;
    this.sprite.scale.set(this.scale);
    this.sprite.anchor.set(0.5, 1);

    crisprUtil.positionAlongMembrane(this.sprite, this.rotation);

    this._entityConfig.container.addChild(this.sprite)

    this.loop = new entity.EntitySequence([
      this.spriteEntity,
      new entity.FunctionCallEntity(() => {
        this.sprite.animationSpeed *= -1;
      })
    ], {
      loop: true
    })

    this._activateChildEntity(
      this.loop
    )
  }

  _teardown() {
    this._deactivateChildEntity(this.loop)
    this._entityConfig.container.removeChild(this.sprite)
  }

}