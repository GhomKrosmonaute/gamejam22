import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as nucleotide from "./entities/nucleotide";

import * as crisprUtil from "./crisprUtil";

const FLOATING_SPEED = 0.0005;
const FLOATING_AMPLITUDE = 0.06;

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
  easing: easing.EasingFunction,
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
  obj.filters = [new PIXI.filters.AlphaFilter(1)];
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
        ((obj.filters[0] as PIXI.filters.AlphaFilter).alpha = value),
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
  easing: easing.EasingFunction,
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

export function textFade(
  container: PIXI.Container,
  text: PIXI.Text,
  duration: number,
  from = new PIXI.Point(),
  direction: "up" | "down" | "left" | "right",
  callback?: AnimationCallback
) {
  const shift = 50;
  let to: PIXI.Point;

  switch (direction) {
    case "down":
      to = new PIXI.Point(from.x, from.y + shift);
      break;
    case "left":
      to = new PIXI.Point(from.x - shift, from.y);
      break;
    case "right":
      to = new PIXI.Point(from.x + shift, from.y);
      break;
    default:
      to = new PIXI.Point(from.x, from.y - shift);
      break;
  }

  text.style.align = "center";
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

export function heartBeat(
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
      duration: duration * 0.2,
      easing: easing.easeInOutQuart,
      onUpdate,
    }),
    tweeny({
      from: scale,
      to: 1,
      duration: duration * 0.3,
      easing: easing.easeInOutQuart,
      onUpdate,
    }),
    tweeny({
      from: 1,
      to: scale,
      duration: duration * 0.2,
      easing: easing.easeInOutQuart,
      onUpdate,
    }),
    tweeny({
      from: scale,
      to: 1,
      duration: duration * 0.3,
      easing: easing.easeInOutQuart,
      onUpdate,
      onTeardown: () => {
        if (callback) callback(obj);
      },
    }),
  ]);
}

export interface FloatingOptions {
  active: {
    x: boolean;
    y: boolean;
  };
  anchor: PIXI.Point;
  speed: PIXI.Point;
  amplitude: PIXI.Point;
  shift: PIXI.Point;
}

export interface ShakingOptions {
  anchor: PIXI.Point;
  amount: number;
}

export function makeFloatingOptions(
  options?: Partial<FloatingOptions>
): FloatingOptions {
  return {
    active: {
      x: false,
      y: false,
    },
    anchor: new PIXI.Point(),
    speed: new PIXI.Point(),
    amplitude: new PIXI.Point(),
    shift: new PIXI.Point(Math.random() * 10, Math.random() * 10),
    ...(options ?? {}),
  };
}

export function makeShakingOptions(
  options?: Partial<ShakingOptions>
): ShakingOptions {
  return {
    anchor: new PIXI.Point(),
    amount: 0,
    ...(options ?? {}),
  };
}

export function floatingPoint({
  active,
  anchor,
  speed,
  amplitude,
  shift,
}: FloatingOptions): PIXI.Point {
  const target = new PIXI.Point();
  crisprUtil.forAxes((axe) => {
    target[axe] = active[axe]
      ? floatingValue(anchor[axe], speed[axe], amplitude[axe], shift[axe])
      : anchor[axe];
  });
  return target;
}

export function floatingValue(
  anchor = 0,
  speed = 1,
  amplitude = 1,
  shift = 0
): number {
  const cos = Math.cos(shift + Date.now() * (speed * FLOATING_SPEED));
  const add = cos * (amplitude * FLOATING_AMPLITUDE);
  return anchor + add * 200;
}

export function shakingPoint({ anchor, amount }: ShakingOptions): PIXI.Point {
  const target = new PIXI.Point();
  const angle = Math.random() * 2 * Math.PI;
  crisprUtil.forAxes((axe) => {
    target[axe] =
      anchor[axe] + amount * Math[axe === "x" ? "cos" : "sin"](angle);
  });
  return target;
}

export class DisplayObjectShakesManager extends entity.EntityBase {
  public floatingOptions?: FloatingOptions;
  private _shakes: Map<string, number> = new Map();
  public anchor = new PIXI.Point();

  constructor(private object: PIXI.DisplayObject) {
    super();
    this.anchor.copyFrom(object.position);
  }

  set(name: string, options: number | FloatingOptions) {
    if (typeof options === "number") {
      this.setShake(name, options);
    } else {
      this.setFloat(name, options);
    }
  }

  setShake(name: string, amount: number) {
    this._shakes.set(name, amount);
  }

  setFloat(name: string, options?: Partial<FloatingOptions>) {
    this.floatingOptions = makeFloatingOptions({
      ...options,
      anchor: this.anchor,
    });
  }

  removeShake(name: string) {
    this._shakes.delete(name);
    this._resetPosition();
  }

  stopFloating() {
    delete this.floatingOptions;
    this._resetPosition();
  }

  private _resetPosition() {
    if (this._shakes.size === 0 && !this.floatingOptions)
      this.object.position.copyFrom(this.anchor);
  }

  protected _update() {
    const amount = Math.max(0, ...this._shakes.values());
    if (this._shakes.size > 0 && amount > 0) {
      // shakes animation
      this.object.position.copyFrom(
        shakingPoint({
          anchor: this.anchor,
          amount,
        })
      );
    } else if (this.floatingOptions) {
      // floating animation
      this.object.position.copyFrom(floatingPoint(this.floatingOptions));
    }
  }
}
