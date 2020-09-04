import * as PIXI from "pixi.js";
import * as entity from "booyah/dist/entity";
import * as crisprUtil from "./crisprUtil";

export type Sprite = PIXI.AnimatedSprite | PIXI.Sprite

export type AnimationCallback = (sprite: Sprite) => any

export function bubble(sprite: Sprite, time: number, callback?: AnimationCallback) {
  return new entity.EntitySequence([
    scale(sprite, 1, 1.3, time * 0.33, 4),
    scale(sprite, 1.3, 1, time * 0.66, 4, callback)
  ]);
}

export function scale(
  sprite: Sprite,
  from: number,
  to: number,
  time: number,
  stepCount: number,
  callback?: AnimationCallback
) {
  return new entity.EntitySequence(
    new Array(stepCount)
      .fill(0)
      .map((value, step) => {
        return [
          new entity.FunctionCallEntity(() => {
            sprite.scale.set(
              crisprUtil.mapProportion(step, 0, stepCount, from, to)
            );
          }),
          new entity.WaitingEntity(time / stepCount),
        ];
      })
      .flat()
      .concat([
        new entity.FunctionCallEntity(() => {
          sprite.scale.set(to)
          if (callback) callback(sprite);
        }),
      ])
  )
}

export function down(sprite: Sprite, time: number, callback?: AnimationCallback){
  return new entity.EntitySequence([
    scale(sprite, 1, 1.2, time * .65, 3),
    scale(sprite, 1.2, 0, time * .35, 3, callback),
  ])
}