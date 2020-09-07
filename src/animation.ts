import * as PIXI from "pixi.js";
import * as entity from "booyah/dist/entity";
import * as crisprUtil from "./crisprUtil";
import Nucleotide from "./entities/nucleotide";

export type Sprite = PIXI.AnimatedSprite | PIXI.Sprite | PIXI.Container;

export type AnimationCallback = (...targets: any) => any;

export function fromTo<Obj>(
  target: Obj,
  modifier: (value: number, target: Obj) => any,
  options: {
    from?: number;
    to?: number;
    time: number;
    stepCount: number;
  },
  callback?: (target: Obj) => any
) {
  if (options.from === undefined) options.from = 0;
  if (options.to === undefined) options.to = 1;

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

export function swap(
  n1: Nucleotide,
  n2: Nucleotide,
  time: number,
  stepCount: number,
  callback?: AnimationCallback
) {
  const n1Position = n1.position.clone();
  const n2Position = n2.position.clone();
  return new entity.ParallelEntity([
    // n1 X
    fromTo(n1, (value) => (n1.position.x = value), {
      from: n1Position.x,
      to: n2Position.x,
      time,
      stepCount,
    }),
    // n1 Y
    fromTo(n1, (value) => (n1.position.y = value), {
      from: n1Position.y,
      to: n2Position.y,
      time,
      stepCount,
    }),
    // n2 X
    fromTo(n1, (value) => (n2.position.x = value), {
      from: n2Position.x,
      to: n1Position.x,
      time,
      stepCount,
    }),
    // n2 Y
    fromTo(
      n1,
      (value) => (n2.position.y = value),
      {
        from: n2Position.y,
        to: n1Position.y,
        time,
        stepCount,
      },
      callback
    ),
  ]);
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

export function textFadeUp(
  text: string,
  color: string | number,
  time: number,
  stepCount: number,
  position = new PIXI.Point()
) {
  const pixiText = new PIXI.Text(text, {
    fill: color,
    fontFamily: "Cardenio Modern Bold",
    fontSize: "70px",
  });
  return new entity.EntitySequence([]);
}
