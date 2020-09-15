import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as nucleotide from "./entities/nucleotide";

/**
 * Ghom's light tween method adaptation
 */
export function tweeny(options: {
  from?: number;
  to?: number;
  duration?: number;
  easing?: (t: number) => number;
  onUpdate?: (value: number) => any;
  onTeardown?: () => any;
}) {
  options.from = options.from ?? 0;
  options.to = options.to ?? 1;

  return new tween.Tween(options);
}

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
  easing: easing.Easing,
  callback?: AnimationCallback
) {
  const n1Position = n1.position.clone();
  const n2Position = n2.position.clone();
  return new entity.ParallelEntity([
    move(n1.position, n1Position, n2Position, duration, easing),
    move(n2.position, n2Position, n1Position, duration, easing, callback),
  ]);
}

export function bubble(
  obj: PIXI.DisplayObject,
  to: number,
  duration: number,
  callback?: AnimationCallback
) {
  return new entity.EntitySequence([
    tweeny({
      from: 1,
      to,
      duration: duration * 0.33,
      easing: easing.easeInOutQuad,
      onUpdate: (value) => obj.scale.set(value),
    }),
    tweeny({
      from: to,
      to: 1,
      duration: duration * 0.66,
      easing: easing.easeOutQuart,
      onUpdate: (value) => obj.scale.set(value),
      onTeardown: () => {
        if (callback) callback(obj);
      },
    }),
  ]);
}

export function down(
  obj: PIXI.DisplayObject,
  duration: number,
  callback?: AnimationCallback
) {
  const onUpdate = (value: number) => obj.scale.set(value);
  return new entity.EntitySequence([
    tweeny({
      from: 1,
      to: 1.2,
      duration: duration * 0.65,
      onUpdate,
    }),
    tweeny({
      from: 1.2,
      to: 0,
      duration: duration * 0.35,
      onUpdate,
      onTeardown: () => {
        if (callback) callback(obj);
      },
    }),
  ]);
}

export function sink(
  obj: PIXI.DisplayObject,
  duration: number,
  callback?: AnimationCallback
) {
  return new entity.ParallelEntity([
    tweeny({
      from: 1,
      to: 0.5,
      duration,
      easing: easing.easeInOutQuad,
      onUpdate: (value) => obj.scale.set(value),
    }),
    tweeny({
      from: 1,
      to: 0,
      duration,
      easing: easing.easeInOutQuad,
      onUpdate: (value) =>
        (obj.filters = [new PIXI.filters.AlphaFilter(value)]),
      onTeardown: () => {
        if (callback) callback(obj);
      },
    }),
  ]);
}

export function popup(obj: PIXI.DisplayObject, callback?: AnimationCallback) {
  const duration = 100;
  return new entity.EntitySequence([
    tweeny({
      to: 1.2,
      duration: duration * 0.7,
      easing: easing.easeInOutExpo,
      onUpdate: (value) => obj.scale.set(value),
    }),
    tweeny({
      from: 1.3,
      to: 1,
      duration: duration * 0.3,
      easing: easing.easeInOutCubic,
      onUpdate: (value) => obj.scale.set(value),
      onTeardown: () => {
        if (callback) callback(obj);
      },
    }),
  ]);
}

export function move(
  target: PIXI.Point,
  from: PIXI.Point,
  to: PIXI.Point,
  duration: number,
  easing: easing.Easing,
  callback?: AnimationCallback
) {
  return new entity.ParallelEntity([
    tweeny({
      from: from.y,
      to: to.y,
      duration,
      easing,
      onUpdate: (value) => (target.y = value),
    }),
    tweeny({
      from: from.x,
      to: to.x,
      duration,
      easing,
      onUpdate: (value) => (target.x = value),
      onTeardown: () => {
        if (callback) callback(target);
      },
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
    move(text.position, from, to, duration, easing.easeOutQuart, () => {
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
    tweeny({
      from: 1,
      to: scale,
      duration: duration * 0.25,
      onUpdate,
    }),
    tweeny({
      from: scale,
      to: 1,
      duration: duration * 0.25,
      onUpdate,
    }),
    tweeny({
      from: 1,
      to: scale,
      duration: duration * 0.25,
      onUpdate,
    }),
    tweeny({
      from: scale,
      to: 1,
      duration: duration * 0.25,
      onUpdate,
      onTeardown: () => {
        if (callback) callback(obj);
      },
    }),
  ]);
}
