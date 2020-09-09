import * as PIXI from "pixi.js";
import * as entity from "booyah/dist/entity";
import * as crisprUtil from "./crisprUtil";
import * as nucleotide from "./entities/nucleotide";

export type Sprite =
  | PIXI.AnimatedSprite
  | PIXI.Sprite
  | PIXI.Container
  | PIXI.Text;

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
  options.from = options.from ?? 0;
  options.to = options.to ?? 1;

  options.stepCount = Math.ceil(options.stepCount);

  return new entity.EntitySequence(
    new Array(options.stepCount)
      .fill(0)
      .map((value, step) => {
        return [
          new entity.FunctionCallEntity(() => {
            modifier(
              crisprUtil.proportion(
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
          // if(options.time < Date.now() - startAt){
          //   console.warn(
          //     "The time taken for the \"fromTo\" animation is",
          //     (Date.now() - startAt) - options.time,
          //     "ms too long.",
          //     options
          //   )
          // }
        }),
      ])
  );
}

export function swap(
  n1: nucleotide.Nucleotide,
  n2: nucleotide.Nucleotide,
  time: number,
  stepCount: number,
  callback?: AnimationCallback
) {
  const n1Position = n1.position.clone();
  const n2Position = n2.position.clone();
  return new entity.ParallelEntity([
    move(n1.position, n1Position, n2Position, time, stepCount),
    move(n2.position, n2Position, n1Position, time, stepCount, callback),
  ]);
}

export function bubble(
  sprite: Sprite,
  to: number,
  time: number,
  stepCount: number,
  callback?: AnimationCallback
) {
  return new entity.EntitySequence([
    fromTo(sprite, (value) => sprite.scale.set(value), {
      from: 1,
      to,
      time: time * 0.33,
      stepCount,
    }),
    fromTo(
      sprite,
      (value) => sprite.scale.set(value),
      { from: to, to: 1, time: time * 0.66, stepCount },
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

export function popup(sprite: Sprite, callback?: AnimationCallback) {
  const time = 100;
  const stepCount = 6;
  return new entity.EntitySequence([
    fromTo(sprite, (value) => sprite.scale.set(value), {
      to: 1.2,
      time: time * 0.7,
      stepCount: stepCount * 0.7,
    }),
    fromTo(
      sprite,
      (value) => sprite.scale.set(value),
      { from: 1.3, to: 1, time: time * 0.3, stepCount: stepCount * 0.3 },
      callback
    ),
  ]);
}

export function move(
  target: PIXI.Point,
  from: PIXI.Point,
  to: PIXI.Point,
  time: number,
  stepCount: number,
  callback?: AnimationCallback
) {
  return new entity.ParallelEntity([
    fromTo(target, (value) => (target.y = value), {
      from: from.y,
      to: to.y,
      time,
      stepCount,
    }),
    // n2 X
    fromTo(
      target,
      (value) => (target.x = value),
      {
        from: from.x,
        to: to.x,
        time,
        stepCount,
      },
      callback
    ),
  ]);
}

export function textFadeUp(
  container: PIXI.Container,
  text: PIXI.Text,
  time: number,
  stepCount: number,
  from = new PIXI.Point(),
  callback?: AnimationCallback
) {
  const shift = 50;
  const to = new PIXI.Point(from.x, from.y - shift);
  text.anchor.set(0.5);
  container.addChild(text);
  return new entity.ParallelEntity([
    sink(text, time, stepCount),
    move(text.position, from, to, time, stepCount, () => {
      container.removeChild(text);
      if (callback) callback(text);
    }),
  ]);
}

export function hearthBeat(
  sprite: Sprite,
  time: number,
  stepCount: number,
  scale: number,
  callback?: AnimationCallback
) {
  const updater = (value: number) => sprite.scale.set(value);
  return new entity.EntitySequence([
    fromTo(sprite, updater, {
      from: 1,
      to: scale,
      time: time * 0.25,
      stepCount: stepCount * 0.25,
    }),
    fromTo(sprite, updater, {
      from: scale,
      to: 1,
      time: time * 0.25,
      stepCount: stepCount * 0.25,
    }),
    fromTo(sprite, updater, {
      from: 1,
      to: scale,
      time: time * 0.25,
      stepCount: stepCount * 0.25,
    }),
    fromTo(
      sprite,
      updater,
      {
        from: scale,
        to: 1,
        time: time * 0.25,
        stepCount: stepCount * 0.25,
      },
      callback
    ),
  ]);
}
