import * as PIXI from "pixi.js";
import * as entity from "booyah/dist/entity";
import * as crisprUtil from "./crisprUtil";

export type Sprite = PIXI.AnimatedSprite | PIXI.Sprite;

export type AnimationCallback = ((sprite: Sprite) => any) | (() => any);

export function fromTo<Obj>(
  target: Obj,
  modifier: (value: number, target: Obj) => any,
  options: {
    from: number;
    to: number;
    time: number;
    stepCount: number;
  },
  callback?: (target: Obj) => any
) {
  return new entity.EntitySequence(
    new Array(options.stepCount)
      .fill(0)
      .map((value, step) => {
        return [
          new entity.FunctionCallEntity(() => {
            modifier(
              crisprUtil.mapProportion(
                step,
                0,
                options.stepCount,
                options.from,
                options.to
              ),
              target
            );
          }),
          new entity.WaitingEntity(options.time / options.stepCount),
        ];
      })
      .flat()
      .concat([
        new entity.FunctionCallEntity(() => {
          modifier(options.to, target);
          if (callback) callback(target);
        }),
      ])
  );
}

export function bubble(
  sprite: Sprite,
  time: number,
  stepCount: number,
  callback?: AnimationCallback
) {
  return new entity.EntitySequence([
    fromTo(sprite, (value) => sprite.scale.set(value), {
      from: 1,
      to: 1.3,
      time: time * 0.33,
      stepCount,
    }),
    fromTo(
      sprite,
      (value) => sprite.scale.set(value),
      { from: 1.3, to: 1, time: time * 0.66, stepCount },
      callback
    ),
  ]);
}

export function down(
  sprite: Sprite,
  time: number,
  stepCount: number,
  callback?: AnimationCallback
) {
  return new entity.EntitySequence([
    fromTo(sprite, (value) => sprite.scale.set(value), {
      from: 1,
      to: 1.2,
      time: time * 0.65,
      stepCount,
    }),
    fromTo(
      sprite,
      (value) => sprite.scale.set(value),
      { from: 1.2, to: 0, time: time * 0.35, stepCount },
      callback
    ),
  ]);
}

export function sink(
  sprite: Sprite,
  time: number,
  stepCount: number,
  callback?: AnimationCallback
) {
  return new entity.ParallelEntity([
    fromTo(sprite, (value) => sprite.scale.set(value), {
      from: 1,
      to: 0.5,
      time,
      stepCount,
    }),
    fromTo(
      sprite,
      (value) => (sprite.filters = [new PIXI.filters.AlphaFilter(value)]),
      { from: 1, to: 0, time, stepCount },
      callback
    ),
  ]);
}
