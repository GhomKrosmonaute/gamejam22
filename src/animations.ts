import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as nucleotide from "./entities/nucleotide";

export type Sprite =
  | PIXI.AnimatedSprite
  | PIXI.Sprite
  | PIXI.Container
  | PIXI.Text;

export type AnimationCallback = (...targets: any) => any;

export function swap(
  n1: nucleotide.Nucleotide,
  n2: nucleotide.Nucleotide,
  duration: number,
  callback?: AnimationCallback
) {
  const n1Position = n1.position.clone();
  const n2Position = n2.position.clone();
  return new entity.ParallelEntity([
    move(n1.position, n1Position, n2Position, duration),
    move(n2.position, n2Position, n1Position, duration, callback),
  ]);
}

export function bubble(
  obj: PIXI.DisplayObject,
  to: number,
  duration: number,
  callback?: AnimationCallback
) {
  return new entity.EntitySequence([
    tween.tweeny({
      from: 1,
      to,
      duration: duration * 0.33,
      onUpdate: (value) => obj.scale.set(value),
    }),
    tween.tweeny(
      {
        from: to,
        to: 1,
        duration: duration * 0.66,
        onUpdate: (value) => obj.scale.set(value),
        onTeardown: () => {
          if(callback) callback(obj)
        }
      }
    ),
  ]);
}

export function down(
  obj: PIXI.DisplayObject,
  duration: number,
  callback?: AnimationCallback
) {
  const onUpdate = (value: number) => obj.scale.set(value)
  return new entity.EntitySequence([
    tween.tweeny({
      from: 1,
      to: 1.2,
      duration: duration * 0.65,
      onUpdate,
    }),
    tween.tweeny({
      from: 1.2,
      to: 0,
      duration: duration * 0.35,
      onUpdate,
      onTeardown: () => {
        if(callback) callback(obj)
      }
    }),
  ]);
}

export function sink(
  obj: PIXI.DisplayObject,
  duration: number,
  callback?: AnimationCallback
) {
  return new entity.ParallelEntity([
    tween.tweeny({
      from: 1,
      to: 0.5,
      duration,
      onUpdate: (value) => obj.scale.set(value),
    }),
    tween.tweeny({
      from: 1,
      to: 0,
      duration,
      onUpdate: (value) => (obj.filters = [new PIXI.filters.AlphaFilter(value)]),
      onTeardown: () => {
        if(callback) callback(obj)
      }
    }),
  ]);
}

export function popup(obj: PIXI.DisplayObject, callback?: AnimationCallback) {
  const duration = 100;
  return new entity.EntitySequence([
    tween.tweeny({
      to: 1.2,
      duration: duration * 0.7,
      onUpdate: (value) => obj.scale.set(value)
    }),
    tween.tweeny({
      from: 1.3,
      to: 1,
      duration: duration * 0.3,
      onUpdate: (value) => obj.scale.set(value),
      onTeardown: () => {
        if(callback) callback(obj)
      }
    }),
  ]);
}

export function move(
  target: PIXI.Point,
  from: PIXI.Point,
  to: PIXI.Point,
  duration: number,
  callback?: AnimationCallback
) {
  return new entity.ParallelEntity([
    tween.tweeny({
      from: from.y,
      to: to.y,
      duration,
      onUpdate: (value) => (target.y = value)
    }),
    tween.tweeny({
      from: from.x,
      to: to.x,
      duration,
      onUpdate: (value) => (target.x = value),
      onTeardown: () => {
        if(callback) callback(target)
      }
    }),
  ]);
}

export function textFadeUp(
  container: PIXI.Container,
  text: PIXI.Text,
  duration: number,
  from = new PIXI.Point(),
  callback?: AnimationCallback
) {
  const shift = 50;
  const to = new PIXI.Point(from.x, from.y - shift);
  text.anchor.set(0.5);
  container.addChild(text);
  return new entity.ParallelEntity([
    sink(text, duration),
    move(text.position, from, to, duration, () => {
      container.removeChild(text);
      if (callback) callback(text);
    }),
  ]);
}

export function hearthBeat(
  obj: PIXI.DisplayObject,
  duration: number,
  scale: number,
  callback?: AnimationCallback
) {
  const onUpdate = (value: number) => obj.scale.set(value);
  return new entity.EntitySequence([
    tween.tweeny({
      from: 1,
      to: scale,
      duration: duration * 0.25,
      onUpdate,
    }),
    tween.tweeny({
      from: scale,
      to: 1,
      duration: duration * 0.25,
      onUpdate,
    }),
    tween.tweeny({
      from: 1,
      to: scale,
      duration: duration * 0.25,
      onUpdate,
    }),
    tween.tweeny({
      from: scale,
      to: 1,
      duration: duration * 0.25,
      onUpdate,
      onTeardown: () => {
        if(callback) callback(obj)
      }
    }),
  ]);
}
