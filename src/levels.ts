import * as PIXI from "pixi.js";

import { OutlineFilter } from "@pixi/filter-outline";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as popup from "./entities/popup";
import * as grid from "./entities/grid";
import * as editor from "./entities/editor";
import * as nucleotide from "./entities/nucleotide";

import * as l from "./scenes/level";

import * as anim from "./animations";
import * as crispr from "./crispr";
import { init } from "./metrics";

declare var level: l.Level;

export class CurrentLevelHolder {
  private _level: l.Level = null;

  get level(): l.Level {
    return this._level;
  }

  set level(level: l.Level) {
    this._level = level;

    // Store the level in window for convenience
    (window as any).level = level;
  }
}

export function makeInstallCurrentLevelHolder() {
  return (
    rootConfig: entity.EntityConfig,
    rootEntity: entity.ParallelEntity
  ) => {
    rootConfig.currentLevelHolder = new CurrentLevelHolder();
  };
}

export const levels = {
  // Hard
  "Big Boss": () =>
    new l.Level("Big Boss", (context) => ({
      gridShape: grid.makeGrid({
        ...grid.gridMakerPresets.full,
        portals: [
          { x: 1, y: 1 },
          { x: 5, y: 5 },
        ],
        jokers: [
          { x: 1, y: 5 },
          { x: 5, y: 1 },
        ],
      }),
      virus: "big",
      forceMatching: false,
      sequenceLength: 10,
      disableClips: true,
      maxLife: 5,
      crispyBonusRate: 0.5,
      initialBonuses: [
        {
          bonus: (ctx) => ctx.swapBonus,
          quantity: 5,
        },
      ],
      hooks: [
        new l.Hook({
          id: "intro animation",
          event: "init",
          once: true,
          entity: new entity.EntitySequence([
            new entity.FunctionCallEntity(() => {
              context.disablingAnimation("preventVirus", true);
            }),
            new anim.VirusSequence([
              (v) =>
                new entity.FunctionCallEntity(() => {
                  v.type = "big";
                  v.scale = 4.5;
                  v.rounded = false;
                  v.angle = 0;
                  v.position = { x: crispr.width / 2, y: crispr.height * 2 };
                  v.filters = [new OutlineFilter(20, 0x000000) as any];
                }),
              (v) => v.stingIn(),
              (v) =>
                new tween.Tween({
                  duration: 500,
                  from: crispr.height * 2,
                  to: crispr.height,
                  easing: easing.easeOutCubic,
                  onUpdate: (value) => {
                    v.position = { x: crispr.width / 2, y: value };
                  },
                }),
              (v) => v.stingOut(),
              () => new entity.WaitingEntity(500),
              (v) => v.leave(),
            ]),
            new entity.FunctionCallEntity(() => {
              context.disablingAnimation("preventVirus", false);
            }),
          ]),
        }),
        new l.Hook({
          id: "go title",
          event: "injectedSequence",
          entity: new entity.FunctionCallEntity(() => {
            if (context.isEnded && !context.finished)
              context.activate(
                anim.title(context.container, "Go!"),
                context.middleContainer
              );
          }),
        }),
      ],
    })),
  "Big Around": () =>
    new l.Level("Big Around", (context) => ({
      gridShape: [
        ["random", "random", "random", "random", "random", "random", "random"],
        ["random", "random", null, "portal", null, "random", "random"],
        ["random", null, "random", "random", "random", null, "random"],
        ["random", "portal", "random", "clip", "random", "portal", "random"],
        ["random", null, null, "random", null, null, "random"],
        ["random", "random", "random", "portal", "random", "random", "random"],
        [null, "random", null, "random", null, "random", null],
      ],
      forceMatching: true,
      sequenceLength: 8,
    })),
  Broth: () =>
    new l.Level("Broth", (ctx) => ({
      sequenceLength: 8,
      forceMatching: false,
      gridShape: [
        [null, null, "random", "clip", "random", null, null],
        ["random", "portal", "red", "random", "joker", "random", "random"],
        ["random", "joker", "blue", "green", "blue", "portal", "random"],
        ["random", "red", "green", "clip", "green", "red", "random"],
        ["random", "portal", "joker", "blue", "red", "joker", "random"],
        [null, "random", "random", "random", "random", "portal", null],
        [null, null, null, "clip", null, null, null],
      ],
    })),
  Caribbean: () =>
    new l.Level("Caribbean", (ctx) => ({
      gridShape: grid.makeGrid({
        ...grid.gridMakerPresets.fourIslands,
        jokers: [
          { x: 4, y: 4 },
          { x: 2, y: 1 },
        ],
      }),
      forceMatching: false,
      sequenceLength: 6,
      maxLife: 10,
      crispyBonusRate: 0.6,
      initialBonuses: [
        {
          bonus: (ctx) => ctx.swapBonus,
          quantity: 2,
        },
      ],
      hooks: [
        new l.Hook({
          id: "intro",
          event: "init",
          once: true,
          entity: new entity.FunctionCallEntity(() => {
            ctx.activate(
              new popup.TutorialPopup({
                title: "Land in sight!",
                content: `Loot the Caribbean treasures, collect the maximum!`,
                image: "images/crispy.png",
                imageHeight: 200,
                popupOptions: {
                  minimizeOnClose: false,
                  coolDown: 2000,
                },
              }),
              ctx.foreContainer
            );
          }),
        }),
      ],
    })),
  Croissant: () =>
    new l.Level("Croissant", (context) => ({
      gridShape: [
        [null, null, "random", "random", "random", null, null],
        ["random", "random", "random", "clip", "random", "joker", "portal"],
        ["random", "random", "random", "random", null, null, null],
        ["random", "random", "random", null, "random", "random", "portal"],
        ["random", "clip", "random", null, "portal", "joker", "random"],
        [null, "random", "joker", null, null, "random", null],
        [null, null, null, "portal", null, null, null],
      ],
      forceMatching: true,
      sequenceLength: 9,
    })),
  Fabric: () =>
    new l.Level("Fabric", () => ({
      forceMatching: false,
      gridShape: [
        ["green", null, null, "blue", "blue", null, "red"],
        [null, "green", "green", "portal", "red", "red", null],
        ["blue", "clip", "red", "green", "green", "clip", "red"],
        ["red", "red", "green", "joker", "red", "red", "blue"],
        [null, "clip", "red", "green", "green", "clip", null],
        ["red", "red", "blue", "portal", null, "green", "green"],
        [null, null, null, "blue", null, null, null],
      ],
    })),
  // Timed: () =>
  //   new l.Level("Timed", (ctx) => {
  //     ctx.playTime = 0;
  //
  //     ctx.onLevelEvent("update", () => {
  //       if (ctx.playTime >= ctx.options.score.max) {
  //         ctx.finished = true;
  //         ctx.activate(
  //           new entity.EntitySequence([
  //             new entity.WaitingEntity(2000),
  //             new popup.FailedLevelPopup(),
  //           ])
  //         );
  //       }
  //     });
  //
  //     return {
  //       forceMatching: false,
  //       mustBeHiddenOnPause: true,
  //       gridShape: "hole",
  //       virus: "mini",
  //       checks: {
  //         "Reach 1000pts": (ctx) => ctx.score > 1000,
  //       },
  //       score: {
  //         max: 120000,
  //         devise: (score, ctx) =>
  //           crispr.sprite(ctx, "images/bonus_time.png", (it) => {
  //             it.anchor.set(0.5);
  //             it.scale.set(0.5);
  //             it.position.x = 90;
  //             //it.tint = 0xff4141
  //           }),
  //         show: (score) => `${Math.round(score / 1000)} s`,
  //         get: (ctx) => 120000 - ctx.playTime,
  //         set: (value, ctx) => (ctx.playTime = 120000 - value),
  //         color: 0xff4141,
  //         initial: 120000,
  //       },
  //     };
  //   }),

  // Medium
  "Medium Boss": () =>
    new l.Level("Medium Boss", (context) => ({
      virus: "big",
      variant: "turn",
      fallingSpeed: 1,
      gridShape: grid.makeGrid({
        ...grid.gridMakerPresets.hive,
        clips: [{ x: 3, y: 3 }],
        portals: [
          { x: 1, y: 3 },
          { x: 5, y: 3 },
          { x: 3, y: 1 },
          { x: 3, y: 5 },
        ],
      }),
      sequenceLength: 7,
      forceMatching: true,
      hooks: [
        new l.Hook({
          id: "intro animation",
          event: "init",
          once: true,
          entity: new entity.EntitySequence([
            new entity.FunctionCallEntity(() => {
              context.disablingAnimation("preventVirus", true);
            }),
            new anim.VirusSequence([
              (v) =>
                new entity.FunctionCallEntity(() => {
                  v.type = "big";
                  v.scale = 4.5;
                  v.rounded = false;
                  v.angle = 0;
                  v.position = { x: crispr.width / 2, y: crispr.height * 2 };
                  v.filters = [new OutlineFilter(20, 0x000000) as any];
                }),
              (v) => v.stingIn(),
              (v) =>
                new tween.Tween({
                  duration: 500,
                  from: crispr.height * 2,
                  to: crispr.height,
                  easing: easing.easeOutCubic,
                  onUpdate: (value) => {
                    v.position = { x: crispr.width / 2, y: value };
                  },
                }),
              (v) => v.stingOut(),
              () => new entity.WaitingEntity(500),
              (v) => v.leave(),
            ]),
            new entity.FunctionCallEntity(() => {
              context.disablingAnimation("preventVirus", false);
            }),
          ]),
        }),
        new l.Hook({
          id: "go title",
          event: "injectedSequence",
          entity: new entity.FunctionCallEntity(() => {
            if (context.isEnded && !context.finished)
              context.activate(
                anim.title(context.container, "Go!"),
                context.middleContainer
              );
          }),
        }),
      ],
    })),
  LadyBug: () =>
    new l.Level("LadyBug", (context) => ({
      gridShape: [
        ["portal", "random", "random", null, "random", "random", "portal"],
        [null, "random", "random", "random", "random", "random", null],
        ["random", null, "random", "random", "random", null, "random"],
        ["random", "random", "random", "clip", "random", "random", "random"],
        [null, null, "random", "random", "random", null, null],
        ["portal", "random", "random", "random", "random", "random", "portal"],
        [null, "random", null, null, null, "random", null],
      ],
      forceMatching: true,
      sequenceLength: 6,
    })),
  Around: () =>
    new l.Level("Around", (context) => ({
      gridShape: [
        ["random", "random", "random", "portal", "random", "random", "random"],
        ["random", "random", "random", "clip", "random", "random", "random"],
        ["portal", null, null, null, null, null, "portal"],
        ["random", null, "random", null, "random", null, "random"],
        ["random", "random", "random", "clip", "random", "random", "random"],
        [null, "random", null, "portal", null, "random", null],
        [null, null, null, null, null, null, null],
      ],
      forceMatching: true,
      sequenceLength: 7,
    })),
  "Classic Portal": () =>
    new l.Level("Classic Portal", (context) => ({
      gridShape: [
        [null, null, "random", null, "random", null, null],
        ["random", "random", "random", null, "random", "random", "random"],
        ["random", "portal", "random", null, "random", "clip", "random"],
        ["random", "random", "random", null, "random", "random", "random"],
        ["random", "clip", "random", null, "random", "portal", "random"],
        [null, "random", "random", null, "random", "random", null],
        [null, null, null, null, null, null, null],
      ],
      forceMatching: true,
      sequenceLength: 8,
    })),
  Claw: () =>
    new l.Level("Claw", (context) => ({
      gridShape: [
        ["random", "random", "random", null, "random", "random", "random"],
        ["random", "portal", "random", null, null, "portal", "random"],
        ["random", "clip", "random", "random", "random", null, null],
        [null, "random", "random", "clip", "random", "random", "random"],
        ["random", null, null, "random", "random", "clip", "random"],
        ["random", "portal", "random", null, "random", "portal", "random"],
        [null, "random", null, null, null, "random", null],
      ],
      forceMatching: true,
      sequenceLength: 6,
    })),
  Bean: () =>
    new l.Level("Bean", (context) => ({
      gridShape: [
        [null, null, null, null, null, null, null],
        ["random", "random", "random", null, "random", "random", "random"],
        ["portal", "random", "clip", "random", "portal", "random", "clip"],
        ["random", "random", "random", "random", "random", "random", "random"],
        [null, "random", null, null, null, "random", null],
        [null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null],
      ],
      forceMatching: true,
    })),
  "Chrono Portal": () =>
    new l.Level("Chrono Portal", (context) => ({
      variant: "fall",
      gridShape: grid.makeGrid({
        ...grid.gridMakerPresets.medium,
        clips: [{ x: 3, y: 3 }],
        portals: [
          { x: 1, y: 3 },
          { x: 5, y: 3 },
          { x: 3, y: 1 },
          { x: 3, y: 5 },
        ],
      }),
      forceMatching: true,
      // portals: 2,
      // clips: 1,
      gaugeRings: [
        (context) =>
          context.bonusesManager.add(
            context.swapBonus,
            1,
            new PIXI.Point(200, -2000)
          ),
        (context, ring) =>
          context.activate(
            new entity.EntitySequence([
              new entity.FunctionCallEntity(() => {
                context.bonusesManager.add(
                  context.timeBonus,
                  1,
                  new PIXI.Point(500, -2000)
                );
              }),
            ]),
            null
          ),
      ],
      hooks: [
        new l.Hook({
          id: "go title",
          event: "injectedSequence",
          entity: new entity.FunctionCallEntity(() => {
            if (context.isEnded && !context.finished)
              context.activate(
                anim.title(context.container, "Go!"),
                context.middleContainer
              );
          }),
        }),
      ],
    })),
  "Four Islands": () =>
    new l.Level("Four Islands", (context) => ({
      forceMatching: true,
      gridShape: grid.makeGrid(grid.gridMakerPresets.fourIslands),
      sequenceLength: 5,
    })),
  Butterfly: () =>
    new l.Level("Butterfly", () => ({
      forceMatching: true,
      sequenceLength: 7,
      crispyBonusRate: 0.1,
      gridShape: [
        [null, null, null, null, null, null, null],
        [null, "blue", "blue", null, "yellow", "yellow", null],
        [null, "blue", "blue", "portal", "yellow", "yellow", null],
        [null, "portal", "green", "clip", "red", "portal", null],
        [null, "green", "green", "portal", "red", "red", null],
        [null, "green", null, null, null, "red", null],
        [null, null, null, null, null, null, null],
      ],
    })),
  "Two Islands": () =>
    new l.Level("Two Islands", (context) => ({
      gridShape: grid.makeGrid(grid.gridMakerPresets.twoIslands),
      forceMatching: true,
      hooks: [
        new l.Hook({
          id: "tuto portal",
          event: "init",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Portals",
            content:
              "The portals are all linked together by quantum entanglement, you can use them to reach the unbeatable! ",
            image: "images/portal.json",
            imageHeight: 300,
            imageAnimationSpeed: 15 / 60,
            popupOptions: {
              id: "popup tuto portal",
              logo: "images/icon.png",
              minimizeOnClose: true,
            },
          }),
        }),
      ],
    })),

  // Easy
  Boss: () =>
    new l.Level("Boss", (context) => ({
      virus: "big",
      variant: "fall",
      fallingSpeed: 1,
      gridShape: grid.makeGrid({
        ...grid.gridMakerPresets.medium,
        clips: [{ x: 3, y: 3 }],
      }),
      sequenceLength: 7,
      forceMatching: true,
      //clips: 3,
      gaugeRings: [
        (context) => {
          context.options.fallingSpeed = 1.2;
          context.activate(
            anim.title(context.container, "Speed 120%", 2000, (t) => t, 2),
            context.middleContainer
          );
        },
        (context) =>
          context.bonusesManager.add(
            context.timeBonus,
            1,
            new PIXI.Point(500, -2000)
          ),
        (context) => {
          context.options.fallingSpeed = 1.3;
          context.activate(
            anim.title(context.container, "Speed 130%", 2000, (t) => t, 2),
            context.middleContainer
          );
        },
      ],
      hooks: [
        new l.Hook({
          id: "intro animation",
          event: "init",
          once: true,
          entity: new entity.EntitySequence([
            new entity.FunctionCallEntity(() => {
              context.disablingAnimation("preventVirus", true);
            }),
            new anim.VirusSequence([
              (v) =>
                new entity.FunctionCallEntity(() => {
                  v.type = "big";
                  v.scale = 4.5;
                  v.rounded = false;
                  v.angle = 0;
                  v.position = { x: crispr.width / 2, y: crispr.height * 2 };
                  v.filters = [new OutlineFilter(20, 0x000000) as any];
                }),
              (v) => v.stingIn(),
              (v) =>
                new tween.Tween({
                  duration: 500,
                  from: crispr.height * 2,
                  to: crispr.height,
                  easing: easing.easeOutCubic,
                  onUpdate: (value) => {
                    v.position = { x: crispr.width / 2, y: value };
                  },
                }),
              (v) => v.stingOut(),
              () => new entity.WaitingEntity(500),
              (v) => v.leave(),
            ]),
            new entity.FunctionCallEntity(() => {
              context.disablingAnimation("preventVirus", false);
            }),
          ]),
        }),
        new l.Hook({
          id: "go title",
          event: "injectedSequence",
          entity: new entity.FunctionCallEntity(() => {
            if (context.isEnded && !context.finished)
              context.activate(
                anim.title(context.container, "Go!"),
                context.middleContainer
              );
          }),
        }),
      ],
    })),
  Zen: () =>
    new l.Level("Zen", {
      variant: "zen",
      hooks: [
        new l.Hook({
          id: "intro",
          event: "setup",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Zen",
            content:
              "Chill out and enjoy making long DNA sequences.\n\nYou have 10 moves to rack up 1000 points and continue",
            popupOptions: {
              minimizeOnClose: false,
              coolDown: 2000,
            },
          }),
        }),
      ],
    }),
  Chrono: () =>
    new l.Level("Chrono", (context) => ({
      variant: "fall",
      gridShape: grid.makeGrid({
        ...grid.gridMakerPresets.medium,
        clips: [{ x: 3, y: 3 }],
      }),
      forceMatching: true,
      crispyBonusRate: 0.3,
      gaugeRings: [
        (context) =>
          context.bonusesManager.add(
            context.swapBonus,
            1,
            new PIXI.Point(200, -2000)
          ),
        (context, ring) =>
          context.activate(
            new entity.EntitySequence([
              new entity.FunctionCallEntity(() => {
                context.bonusesManager.add(
                  context.timeBonus,
                  1,
                  new PIXI.Point(500, -2000)
                );
                context.timeBonus.highlight = true;
              }),
              new popup.TutorialPopup({
                title: "Freeze",
                content:
                  "Click the freeze bonus to stop the clock for 5 seconds",
                image: "images/bonus_time.png",
                popupOptions: {
                  id: "popup ring 1",
                  from: ring.position,
                  coolDown: 2000,
                  logo: "images/icon_freeze.png",
                },
              }),
            ]),
            null
          ),
      ],
      hooks: [
        new l.Hook({
          id: "intro",
          event: "init",
          once: true,
          entity: new entity.FunctionCallEntity(() => {
            context.disablingAnimation("preventVirus", true);
            context.activate(
              new popup.TutorialPopup({
                title: "Time attack!",
                content: `Crunch the sequences before they hit the grid!\n\nReach ${context.options.gaugeOptions.final} points to continue`,
                popupOptions: {
                  id: "intro popup",
                  logo: "images/icon_timed.png",
                  withBlackBackground: false,
                  minimizeOnClose: false,
                  coolDown: 2000,
                },
              }),
              context.foreContainer
            );
          }),
        }),
        new l.Hook({
          id: "minimized popup ring 1",
          event: "minimizedPopup",
          filter: (p) => p.id === "popup ring 1",
          entity: new entity.FunctionCallEntity(() => {
            context.timeBonus.highlight = false;
          }),
        }),
        new l.Hook({
          id: "start",
          event: "closedPopup",
          filter: (p) => p.id === "intro popup",
          entity: new entity.FunctionCallEntity(() => {
            context.disablingAnimation("preventVirus", false);
          }),
        }),
        new l.Hook({
          id: "go title",
          event: "injectedSequence",
          entity: new entity.FunctionCallEntity(() => {
            if (context.isEnded && !context.finished)
              context.activate(
                anim.title(context.container, "Go!"),
                context.middleContainer
              );
          }),
        }),
      ],
    })),
  Classic: () =>
    new l.Level("Classic", (context) => ({
      variant: "turn",
      minStarNeeded: 1,
      forceMatching: true,
      noCrispyBonus: false,
      crispyBonusRate: 0.2,
      gridShape: grid.makeGrid({
        ...grid.gridMakerPresets.medium,
        clips: [{ x: 3, y: 3 }],
      }),
      gaugeRings: [
        (context, ring) =>
          context.activate(
            new entity.EntitySequence([
              new entity.FunctionCallEntity(() => {
                context.bonusesManager.add(
                  context.swapBonus,
                  1,
                  new PIXI.Point(500, -2000)
                );
                context.swapBonus.highlight = true;
              }),
              new popup.TutorialPopup({
                title: "The Swap bonus",
                content: "Can swap two nucleotides",
                popupOptions: {
                  id: "popup ring 1",
                  from: ring.position,
                  coolDown: 2000,
                  logo: "images/bonus_swap.png",
                  logoPosition: { x: 0, y: -110 },
                  logoScale: 1.3,
                },
              }),
            ]),
            null
          ),
      ],
      hooks: [
        new l.Hook({
          id: "minimized popup ring 1",
          event: "minimizedPopup",
          filter: (p) => p.id === "popup ring 1",
          entity: new entity.FunctionCallEntity(() => {
            context.swapBonus.highlight = false;
          }),
        }),
        new l.Hook({
          id: "intro",
          event: "init",
          once: true,
          entity: new entity.FunctionCallEntity(() => {
            context.activate(
              new popup.TutorialPopup({
                title: "Turn by turn",
                content: `Now you know the basics, try with some longer sequences.\n\nKill ${context.options.gaugeOptions.final} viruses to continue!`,
                popupOptions: {
                  minimizeOnClose: false,
                  coolDown: 2000,
                },
              }),
              context.foreContainer
            );
          }),
        }),
      ],
    })),

  // Intro
  Tutorial: () =>
    new l.Level("Tutorial", {
      endConditionText: "Defeat 2 viruses\nwithout infection",
      variant: "turn",
      noCrispyBonus: true,
      disableClips: true,
      gridShape: [],
      sequences: [["red", "green", "blue"]],
      disableButton: true,
      disableBonuses: true,
      disableGauge: true,
      disableScore: true,
      disablingAnimations: ["tutorial"],
      checks: {
        "Not infected": (context) => !context.wasInfected,
      },
      hooks: [
        new l.Hook({
          id: "step 1",
          event: "init",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Welcome",
            content:
              "Here comes a virus, it wants to inject its own DNA so that your bacteria will reproduce it.",
            image: "images/mini_bob_idle.json",
            imageHeight: 300,
            popupOptions: {
              minimizeOnClose: false,
              coolDown: 2000,
            },
          }),
        }),
        new l.Hook({
          id: "step 1.2",
          event: "injectedSequence",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Your job",
            content:
              "As the CRISPR Designer, it’s your job to create a matching CRISPR sequence.",
            popupOptions: {
              id: "popup step 1.2",
              minimizeOnClose: false,
              coolDown: 2000,
            },
          }),
        }),
        new l.Hook({
          id: "step 1 => step 2",
          event: "closedPopup",
          filter: (p) => p.id === "popup step 1.2",
          reset: (context) => ({
            resetGrid: true,
            disableClips: true,
            disableButton: true,
            resetSequences: false,
            gridShape: [
              [],
              [],
              [null, null, "yellow", "green", "red"],
              [null, null, "blue", "green", "green"],
              [null, null, null, "blue"],
              [],
              [],
            ],
            hooks: [
              new l.Hook({
                id: "step 2",
                event: "init",
                delay: 2000,
                entity: new entity.FunctionCallEntity(() => {
                  level.disablingAnimations.clear();

                  const gridPos = level.grid.nucleotideContainer.position;

                  level.activate(
                    anim.finger(level, {
                      container: level.entityConfig.container,
                      from: { x: 562 + gridPos.x, y: 417 + gridPos.y },
                      to: { x: 321 + gridPos.x, y: 556 + gridPos.y },
                      duration: 2000,
                    }),
                    context.middleContainer
                  );
                }),
              }),
              new l.Hook({
                id: "step 2 => step 3",
                event: "sequenceDown",
                reset: {
                  gridShape: grid.makeGrid({
                    ...grid.gridMakerPresets.mini,
                    clips: [{ x: 3, y: 3 }],
                  }),
                  resetGrid: true,
                  resetSequences: true,
                  forceMatching: true,
                  disableButton: true,
                  sequenceLength: 4,
                  hooks: [
                    new l.Hook({
                      id: "step 2",
                      event: "init",
                      entity: new entity.EntitySequence([
                        new entity.WaitingEntity(1000),
                        new entity.FunctionCallEntity(() => {
                          context.activate(
                            new popup.TutorialPopup({
                              title: "PAM!",
                              content:
                                "All good CRISPR sequences begin with a PAM.\n\n" +
                                "Start with the PAM, then draw on the grid to match the virus DNA",
                              popupOptions: {
                                id: "popup step 2",
                                coolDown: 2000,
                                logo: "images/clip.png",
                                logoScale: 1.7,
                                logoPosition: { x: 0, y: -200 },
                              },
                            }),
                            context.foreContainer
                          );
                        }),
                      ]),
                    }),
                    new l.Hook({
                      id: "step 2 unlock",
                      once: true,
                      event: "minimizedPopup",
                      filter: (p) => p.id === "popup step 2",
                      entity: new entity.FunctionCallEntity(() => {
                        level.disablingAnimation("tutorial", false);
                      }),
                    }),
                    new l.Hook({
                      id: "step 3 => step 4",
                      event: "sequenceDown",
                      reset: (context) => ({
                        resetGrid: true,
                        resetSequences: true,
                        gridShape: [
                          null,
                          [null, null, "yellow", "yellow", "blue"],
                          [null, "blue", "yellow", "blue", "yellow", "blue"],
                          [null, "blue", "yellow", "clip", "blue", "blue"],
                          [null, "yellow", "blue", "blue", "yellow", "blue"],
                          [null, null, null, "yellow"],
                        ],
                        sequences: [["green", "red", "green", "red", "red"]],
                        sequenceLength: 6,
                        forceMatching: true,
                        disableButton: false,
                        disableClips: false,
                        maxLife: 2,
                        hooks: [
                          new l.Hook({
                            id: "step 4",
                            once: true,
                            event: "init",
                            entity: new popup.TutorialPopup({
                              title: "Skip button",
                              content:
                                "Sometimes you’ll get stuck, and you can’t make a matching sequence.\n\nIn that case, press the skip button.",
                              popupOptions: {
                                id: "popup skip button",
                                coolDown: 2000,
                                logo: "images/hud_action_button.png",
                              },
                            }),
                          }),
                          new l.Hook({
                            id: "step 4 unlock and finger",
                            once: true,
                            event: "minimizedPopup",
                            filter: (p) => p.id === "popup skip button",
                            delay: 2000,
                            entity: new entity.FunctionCallEntity(() => {
                              level.disablingAnimation("tutorial", false);

                              const buttonPos =
                                level.actionButton.sprite.position;

                              level.activate(
                                new entity.EntitySequence([
                                  new entity.WaitingEntity(1000),
                                  anim.finger(level, {
                                    container: level.entityConfig.container,
                                    to: { x: buttonPos.x, y: buttonPos.y },
                                    duration: 2000,
                                  }),
                                ]),
                                null
                              );
                            }),
                          }),
                          new l.Hook({
                            id: "press button and infect",
                            event: "actionButtonPressed",
                            once: true,
                            entity: new entity.FunctionCallEntity(() => {
                              context.disablingAnimation("tutorial", true);
                              context.disablingAnimation("preventVirus", true);
                            }),
                          }),
                          new l.Hook({
                            id: "step 4.1",
                            event: "infected",
                            once: true,
                            entity: new entity.EntitySequence([
                              new entity.WaitingEntity(1500),
                              new entity.FunctionCallEntity(() => {
                                context.wasInfected = false;
                                context.activate(
                                  new popup.TutorialPopup({
                                    title: "Infection",
                                    image: "images/mini_bob_swim.json",
                                    imageHeight: 400,
                                    content:
                                      "When you skip, the virus will infect you.\nIf you get infected too many times, it’s game over.",
                                    popupOptions: {
                                      id: "popup step 4.1",
                                      minimizeOnClose: false,
                                      coolDown: 2000,
                                    },
                                  }),
                                  context.foreContainer
                                );
                              }),
                            ]),
                          }),
                          new l.Hook({
                            id: "step 4.3",
                            event: "closedPopup",
                            filter: (p) => p.id === "popup step 4.1",
                            entity: new entity.FunctionCallEntity(() => {
                              context.disablingAnimation("tutorial", false);
                              context.disablingAnimation("preventVirus", false);
                              context.emitLevelEvent("canReset");
                              context.wasInfected = false;
                              context.killedViruses = 0;
                            }),
                          }),
                          new l.Hook({
                            id: "step 4 => step 5",
                            event: "canReset",
                            reset: {
                              gridShape: grid.makeGrid({
                                ...grid.gridMakerPresets.medium,
                                clips: [{ x: 3, y: 3 }],
                              }),
                              crispyBonusRate: 0.2,
                              noCrispyBonus: false,
                              resetGrid: true,
                              resetScore: true,
                              resetSequences: true,
                              sequenceLength: 5,
                              maxLife: 5,
                              sequences: null,
                              disableClips: false,
                              disableScore: false,
                              disableGauge: false,
                              forceMatching: true,
                              gaugeOptions: {
                                initial: 0,
                                final: 2,
                              },
                              hooks: [
                                new l.Hook({
                                  id: "step 5",
                                  once: true,
                                  event: "init",
                                  entity: new entity.EntitySequence([
                                    new entity.WaitingEntity(1500),
                                    new entity.FunctionCallEntity(() => {
                                      context.wasInfected = false;
                                      context.life = 5;
                                      context.disablingAnimation(
                                        "preventVirus",
                                        false
                                      );
                                      context.activate(
                                        new popup.TutorialPopup({
                                          title: "Nice work!",
                                          content:
                                            `You get points for each sequence you match. The longer the sequence, the more points.` +
                                            `\n\nNow try to kill 2 viruses!`,
                                          popupOptions: {
                                            minimizeOnClose: false,
                                            coolDown: 1000,
                                            onClose: () => {
                                              context.activate(
                                                anim.title(
                                                  context.container,
                                                  "Go!"
                                                ),
                                                context.middleContainer
                                              );
                                              context.disablingAnimation(
                                                "tutorial",
                                                false
                                              );
                                            },
                                          },
                                        }),
                                        context.foreContainer
                                      );
                                    }),
                                  ]),
                                }),
                              ],
                            },
                          }),
                        ],
                      }),
                    }),
                  ],
                },
              }),
            ],
          }),
        }),
      ],
    }),

  // Editor
  Editor: () =>
    new l.Level("Editor", (ctx) => {
      ctx.finished = true;

      const editorGridShape: grid.GridArrayShape<
        keyof typeof nucleotide.NucleotideSignatures
      > = new Array(7);

      for (let i = 0; i < editorGridShape.length; i++) {
        editorGridShape[i] = new Array(7).fill("hole");
      }

      editorGridShape[editorGridShape.length - 1] = editorGridShape[
        editorGridShape.length - 1
      ].map((val, x) => {
        if (x % 2 === 0) return null;
        else return val;
      });

      const editorDOM: editor.EditorDOM = new editor.EditorDOM(
        ctx,
        editorGridShape
      );

      editorDOM.refreshOutput();

      const updatedNucleotideHook = new l.Hook({
        id: "update cell",
        event: "clickedNucleotide",
        filter: (n) => {
          const pos = ctx.grid.getGridPositionOf(n);
          const sign = editorDOM.getCurrentSignature();

          editorDOM.gridShape[pos.y][pos.x] = sign;

          const info = nucleotide.Nucleotide.fromSignature(
            nucleotide.NucleotideSignatures[sign]
          );

          n.color = info.color;

          ctx.activate(n.switchTypeAnimation(info.type, 300), null);

          if (editorDOM.getBigCheckbox()) {
            const neighbours = ctx.grid.getNeighbors(n);
            neighbours.forEach((neigh) => {
              if (neigh) {
                const neighPos = ctx.grid.getGridPositionOf(neigh);

                editorDOM.gridShape[neighPos.y][neighPos.x] = sign;

                const info = nucleotide.Nucleotide.fromSignature(
                  nucleotide.NucleotideSignatures[sign]
                );

                neigh.color = info.color;

                ctx.activate(neigh.switchTypeAnimation(info.type, 300), null);
              }
            });
          }

          editorDOM.refreshOutput();

          return true;
        },
      });

      const reloadedGridHook = new l.Hook({
        id: "reload grid",
        event: "triggerHook",
      });

      reloadedGridHook.options.reset = {
        gridShape: editorDOM.gridShape,
        resetGrid: true,
        hooks: [updatedNucleotideHook, reloadedGridHook],
      };

      reloadedGridHook.options.filter = (
        id: string,
        gridShape: grid.GridArrayShape<
          keyof typeof nucleotide.NucleotideSignatures
        >
      ) => {
        if (id !== reloadedGridHook.options.id) return false;

        reloadedGridHook.options.reset = {
          ...reloadedGridHook.options.reset,
          gridShape,
        };

        return true;
      };

      return {
        variant: "turn",
        minStarNeeded: 3,
        forceMatching: false,
        gridShape: editorDOM.gridShape,
        clipCount: 0,
        sequenceLength: -1,
        disableButton: true,
        disableBonuses: true,
        disableGauge: true,
        hooks: [
          updatedNucleotideHook,
          reloadedGridHook,
          new l.Hook({
            id: "activate editor",
            once: true,
            event: "init",
            entity: new entity.FunctionCallEntity(() =>
              ctx.activate(editorDOM, null)
            ),
          }),
        ],
      };
    }),
};

if (!crispr.inDebugMode()) delete levels.Editor;

export const levelNames = Object.keys(levels);
export type LevelName = keyof Levels;
export type Levels = typeof levels;

export const sections = {
  Intro: [levels.Tutorial],
  Easy: [levels.Classic, levels.Chrono, levels.Zen, levels.Boss],
  Medium: [
    levels["Two Islands"],
    levels.Butterfly,
    levels["Four Islands"],
    levels["Chrono Portal"],
    levels.Bean,
    levels.Claw,
    levels["Classic Portal"],
    levels.Around,
    levels.LadyBug,
    levels["Medium Boss"],
  ],
  Hard: [
    levels.Fabric,
    levels.Croissant,
    levels.Caribbean,
    levels.Broth,
    levels["Big Around"],
    levels["Big Boss"],
  ],
};

export type SectionName = keyof typeof sections;

export function getSectionNameOfLevel(
  levelName: LevelName
): keyof typeof sections | null {
  for (const sectionName in sections) {
    const section = sections[sectionName as keyof typeof sections];
    if (section.some((level) => levels[levelName] === level))
      return sectionName as keyof typeof sections;
  }

  return null;
}

export function getLevelNamesOfSection(sectionName: SectionName): LevelName[] {
  const section = sections[sectionName];
  const levelNames = section.map((l) => {
    const entries = Object.entries(levels);
    const entry = entries.find((e) => e[1] === l);
    return entry[0];
  });
  return levelNames as LevelName[];
}

export function levelIsPassed(levelName: LevelName): boolean {
  return !!localStorage.getItem(levelName);
}

export function countStars() {
  let starCount = 0;

  for (const levelName of Object.keys(levels) as LevelName[]) {
    if (levelIsPassed(levelName)) {
      const raw = localStorage.getItem(levelName);
      const data = JSON.parse(raw) as l.LevelResults;
      starCount += data.starCount;
    }
  }

  return starCount;
}

export function getNeededStars(levelName: LevelName): number {
  if (!levelName.includes("Boss")) return 0;

  return Math.floor(
    (levelNames.slice().reverse().indexOf(levelName) - 1) * 3 * 0.85
  );
}
