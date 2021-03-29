import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as nucleotide from "./entities/nucleotide";
import * as virus from "./entities/virus";

import * as crispr from "./crispr";

const FLOATING_SPEED = 0.0005;
const FLOATING_AMPLITUDE = 0.06;

/**
 * **waitForAllSteps**:
 * - if you returns Entity, activate it (only if onStep.finish callback is not include).
 * - includes onStep.finish callback if you want to define a step end without returns an entity.
 *
 * **callback**:
 * - if waitForAllSteps flag is true, wait for all "finished" steps.
 * - if waitForAllSteps flag is false, wait for all steps are started.
 *
 * <br>
 *
 * todo: implement easing option
 */
export function sequenced<T = void>(options: {
  onStep: (index: number, finish: () => unknown) => void | entity.Entity;
  items: number;
  delay?: number;
  timeBetween: number;
  waitForAllSteps?: boolean;
  callback?: AnimationCallback;
}): entity.EntitySequence;
export function sequenced<T>(options: {
  onStep: (
    item: T,
    index: number,
    src: T[],
    finish: () => unknown
  ) => void | entity.Entity;
  items: T[];
  delay?: number;
  timeBetween: number;
  waitForAllSteps?: boolean;
  callback?: AnimationCallback;
}): entity.EntitySequence;
export function sequenced<T>(options: {
  onStep: (
    item: T | number,
    index: number | (() => unknown),
    src?: T[],
    finish?: () => unknown
  ) => void | entity.Entity;
  items: T[] | number;
  delay?: number;
  timeBetween: number;
  waitForAllSteps?: boolean;
  callback?: AnimationCallback;
}): entity.EntitySequence {
  const list =
    typeof options.items === "number"
      ? new Array(options.items).fill(0)
      : options.items;
  const context: entity.Entity[] = list.map((item, index, src) => {
    let stepEntity: entity.EntityResolvable;

    if (options.waitForAllSteps) {
      if (options.onStep.length === 4) {
        let promise: Promise<void>;

        stepEntity = new entity.EntitySequence([
          new entity.FunctionCallEntity(() => {
            promise = new Promise((resolve) => {
              if (typeof options.items === "number") {
                options.onStep(index, resolve);
              } else {
                options.onStep(item, index, src, resolve);
              }
            });
          }),
        ]);
      } else {
        stepEntity = () => {
          const step =
            typeof options.items === "number"
              ? options.onStep(index, () => null)
              : options.onStep(item, index, src, () => null);
          if (step) return step;
          return new entity.FunctionCallEntity(() => null);
        };
      }
    } else {
      stepEntity = new entity.FunctionCallEntity(() => {
        if (typeof options.items === "number") {
          options.onStep(index, () => null);
        } else {
          options.onStep(item, index, src, () => null);
        }
      });
    }

    return new entity.EntitySequence([
      new entity.WaitingEntity(options.timeBetween * index),
      stepEntity,
    ]);
  });

  context.push(
    new entity.WaitingEntity(
      options.timeBetween *
        (typeof options.items === "number"
          ? options.items
          : options.items.length)
    )
  );

  const sequence: entity.Entity[] = [new entity.ParallelEntity(context)];

  if (options.delay) {
    sequence.unshift(new entity.WaitingEntity(options.delay));
  }

  if (options.callback) {
    sequence.push(new entity.FunctionCallEntity(options.callback));
  }

  return new entity.EntitySequence(sequence);
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
  topScale: number,
  duration: number,
  callbacks?: {
    onTop?: AnimationCallback;
    onTeardown?: AnimationCallback;
  }
) {
  return new entity.EntitySequence([
    new tween.Tween({
      from: 1,
      to: topScale,
      duration: duration * 0.33,
      easing: easing.easeInOutQuad,
      onUpdate: (value) => obj.scale.set(value),
      onTeardown: () => {
        callbacks?.onTop?.(obj);
      },
    }),
    new tween.Tween({
      from: topScale,
      to: 1,
      duration: duration * 0.66,
      easing: easing.easeOutQuart,
      onUpdate: (value) => obj.scale.set(value),
      onTeardown: () => {
        callbacks?.onTeardown?.(obj);
      },
    }),
  ]);
}

export function down(
  obj: PIXI.DisplayObject,
  duration: number,
  defaultScale: number,
  callback?: AnimationCallback
) {
  const onUpdate = (value: number) => obj.scale.set(value);
  return new entity.EntitySequence([
    new tween.Tween({
      from: defaultScale,
      to: defaultScale * 1.2,
      duration: duration * 0.65,
      onUpdate,
    }),
    new tween.Tween({
      from: defaultScale * 1.2,
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
    new tween.Tween({
      from: obj.scale.x,
      to: obj.scale.x * 0.5,
      duration,
      easing: easing.easeInOutQuad,
      onUpdate: (value) => obj.scale.set(value),
    }),
    new tween.Tween({
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

export function popup(
  obj: PIXI.DisplayObject,
  duration = 100,
  callback?: AnimationCallback
) {
  return new tween.Tween({
    from: 0,
    to: 1,
    duration: duration,
    easing: easing.easeOutBack,
    onUpdate: (value) => obj.scale.set(value),
    onTeardown: () => {
      if (callback) callback(obj);
    },
  });
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
    new tween.Tween({
      from: from.y,
      to: to.y,
      duration,
      easing,
      onUpdate: (value) => (target.y = value),
    }),
    new tween.Tween({
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

export function title(
  container: PIXI.Container,
  text: string,
  duration = 2500,
  easingFn: (t: number) => number = easing.easeOutQuint,
  maxScale = 20
): entity.EntitySequence {
  const pixiText = crispr.makeText(text, {
    fontSize: 100,
    fill: 0xffffff,
    stroke: 0x000000,
    strokeThickness: 20,
  });
  pixiText.scale.set(0);
  pixiText.position.set(crispr.width / 2, crispr.height / 2);

  return new entity.EntitySequence([
    new entity.FunctionCallEntity(() => {
      container.addChild(pixiText);
    }),
    new tween.Tween({
      duration,
      from: 0,
      to: maxScale,
      easing: easingFn,
      onUpdate: (value) => {
        pixiText.scale.set(value);
        pixiText.alpha = crispr.proportion(value, 0, maxScale, 1, 0);
      },
    }),
    new entity.FunctionCallEntity(() => {
      container.removeChild(pixiText);
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
    new tween.Tween({
      from: 1,
      to: scale,
      duration: duration * 0.2,
      easing: easing.easeInOutQuart,
      onUpdate,
    }),
    new tween.Tween({
      from: scale,
      to: 1,
      duration: duration * 0.3,
      easing: easing.easeInOutQuart,
      onUpdate,
    }),
    new tween.Tween({
      from: 1,
      to: scale,
      duration: duration * 0.2,
      easing: easing.easeInOutQuart,
      onUpdate,
    }),
    new tween.Tween({
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

/**
 * @param obj
 * @param duration
 * @param from - from amount
 * @param to - to amount (default: from)
 * @param callback
 */
export function tweenShaking(
  obj: PIXI.DisplayObject,
  duration: number,
  from: number,
  to?: number,
  callback?: AnimationCallback
) {
  const anchor = new PIXI.Point();
  anchor.copyFrom(obj.position);
  return new tween.Tween({
    from,
    to: to ?? from,
    duration,
    onUpdate: (value) => {
      obj.position.copyFrom(
        shakingPoint({
          anchor,
          amount: value,
        })
      );
    },
    onTeardown: () => {
      obj.position.copyFrom(anchor);
      callback?.();
    },
  });
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
  timePast: number;
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
    timePast: Date.now(),
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
  timePast,
}: FloatingOptions): PIXI.Point {
  const target = new PIXI.Point();
  crispr.forAxes((axe) => {
    target[axe] = active[axe]
      ? floatingValue(anchor[axe], speed[axe], amplitude[axe], shift[axe], timePast)
      : anchor[axe];
  });
  return target;
}

export function floatingValue(
  anchor = 0,
  speed = 1,
  amplitude = 1,
  shift = 0,
  timePast = Date.now()
): number {
  const cos = Math.cos(shift + timePast * (speed * FLOATING_SPEED));
  const add = cos * (amplitude * FLOATING_AMPLITUDE);
  return anchor + add * 200;
}

export function shakingPoint({ anchor, amount }: ShakingOptions): PIXI.Point {
  const target = new PIXI.Point();
  const angle = Math.random() * 2 * Math.PI;
  crispr.forAxes((axe) => {
    target[axe] =
      anchor[axe] + amount * Math[axe === "x" ? "cos" : "sin"](angle);
  });
  return target;
}

export class ShakesManager extends entity.EntityBase {
  private _shakes: Map<string, number> = new Map();
  public floatingOptions?: FloatingOptions;
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

  removeAllShakes() {
    this._shakes.clear();
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

  protected _teardown() {
    this.removeAllShakes();
  }
}

export class VirusSequence extends entity.EntitySequence {
  private v = new virus.Virus("big");

  constructor(private context: ((v: virus.Virus) => entity.Entity)[]) {
    super(context.map((r) => () => r(this.v)));
  }

  _setup() {
    this._activateChildEntity(this.v);
    super._setup();
  }
}
