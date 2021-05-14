import * as PIXI from "pixi.js";

import { OutlineFilter } from "@pixi/filter-outline";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";
import * as util from "booyah/src/util";

import * as popup from "./entities/popup";
import * as grid from "./entities/grid";

import * as level from "./scenes/level";

import * as crispr from "./crispr";
import * as anim from "./animations";

export const levels = {
  Timed: () =>
    new level.Level("Timed", (ctx) => ({
      gridShape: "hole",
      virus: "medium",
      checks: {
        "Reach 1000pts": (ctx) => ctx.score > 1000,
      },
      score: {
        max: 120000,
        devise: (score, ctx) =>
          crispr.sprite(ctx, "images/bonus_time.png", (it) => {
            it.anchor.set(0.5);
            it.scale.set(0.5);
            it.position.x = 90;
            //it.tint = 0xff4141
          }),
        show: (score) => `${Math.round(score / 1000)} s`,
        get: (ctx) => 120000 - ctx.playTime,
        set: (value, ctx) => (ctx.playTime = 120000 - value),
        color: 0xff4141,
        initial: 120000,
      },
    })),

  Caribbean: () =>
    new level.Level("Caribbean", (ctx) => ({
      gridShape: "fourIslands",
      forceMatching: false,
      clipCount: 4,
      sequenceLength: 4,
      portalsCount: 4,
      maxLife: 10,
      crispyBonusRate: 0.6,
      score: {
        max: 1000,
      },
      initialBonuses: [
        {
          bonus: (ctx) => ctx.swapBonus,
          quantity: 2,
        },
      ],
      hooks: [
        new level.Hook({
          id: "intro",
          event: "init",
          once: true,
          entity: new entity.FunctionCallEntity(() => {
            ctx.activate(
              new popup.TutorialPopup({
                title: "Land in sight!",
                content: `Loot the Caribbean treasures, collect at least ${ctx.options.score.max}!`,
                image: "images/crispy.png",
                imageHeight: 200,
                popupOptions: {
                  minimizeOnClose: false,
                  coolDown: 2000,
                },
              })
            );
          }),
        }),
      ],
    })),

  Hive: () =>
    new level.Level("Hive", (context) => ({
      gridShape: "hive",
      maxLife: 3,
      forceMatching: true,
      sequenceLength: 8,
      canCrunchParts: {
        fromLeft: true,
        possibleParts: [
          {
            glowColor: 0x00ff00,
            length: 4,
          },
          {
            glowColor: 0x00ffff,
            length: 6,
          },
        ],
      },
      score: {
        max: 5,
        initial: 0,
        color: crispr.yellowNumber,
        get: () => context.killedViruses,
        set: (value) => (context.killedViruses = value),
        show: (value) => String(value) + " kill" + (value === 1 ? "" : "s"),
        devise: (value, ctx) => {
          const spriteEntity = util.makeAnimatedSprite(
            ctx.entityConfig.app.loader.resources["images/mini_bob_idle.json"]
          );
          ctx.activate(spriteEntity);
          const sp = spriteEntity.sprite;
          sp.autoUpdate = true;
          sp.animationSpeed = 20 / 60;
          sp.loop = true;
          sp.play();
          sp.scale.set(0.08);
          sp.anchor.set(0.5);
          sp.position.x = 150;
          return sp;
        },
      },
      portalsCount: 4,
    })),

  Hole: () =>
    new level.Level("Hole", (context) => ({
      gridShape: "hole",
      // gridCleaning: true,
      // score: {
      //   max: () => context.grid.nucleotides.length,
      //   initial: 0,
      //   color: crisp.yellowNumber,
      //   get: () =>
      //     context.grid.nucleotides.filter((n) => n.state === "inactive").length,
      //   set: (value) => (context.killedViruses = value),
      //   show: (value) => String(value) + " crh",
      // },
      forceMatching: true,
    })),

  "Bow Tie": () =>
    new level.Level("Bow Tie", (context) => ({
      gridShape: "bowTie",
      forceMatching: true,
    })),

  "Little\nBridge": () =>
    new level.Level("Little\nBridge", (context) => ({
      gridShape: "littleBridge",
      forceMatching: true,
      portalsCount: 2,
    })),

  "Four\nIslands": () =>
    new level.Level("Four\nIslands", (context) => ({
      gridShape: "fourIslands",
      forceMatching: true,
      clipCount: 3,
      sequenceLength: 5,
      portalsCount: 4,
    })),

  Boss: () =>
    new level.Level("Boss", (context) => ({
      virus: "big",
      variant: "fall",
      dropSpeed: 1,
      gridShape: "medium",
      sequenceLength: 7,
      forceMatching: true,
      clipCount: 3,
      portalsCount: 4,
      gaugeRings: [
        (context) => {
          context.options.dropSpeed = 1.2;
          context.activate(
            anim.title(context.container, "Speed 120%", 2000, (t) => t, 2)
          );
        },
        (context) =>
          context.bonusesManager.add(
            context.timeBonus,
            1,
            new PIXI.Point(500, -2000)
          ),
        (context) => {
          context.options.dropSpeed = 1.3;
          context.activate(
            anim.title(context.container, "Speed 130%", 2000, (t) => t, 2)
          );
        },
      ],
      hooks: [
        new level.Hook({
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
        new level.Hook({
          id: "go title",
          event: "injectedSequence",
          entity: new entity.FunctionCallEntity(() => {
            if (context.isEnded)
              context.activate(anim.title(context.container, "Go!"));
          }),
        }),
      ],
    })),

  // todo: intermediary levels with medium virus

  // Zen: () =>
  //   new level.Level("Zen", {
  //     variant: "zen",
  //     forceMatching: true,
  //     disableBonuses: true,
  //     portalsCount: 4,
  //     zenMoves: 10,
  //     clipCount: 0,
  //     checks: {
  //       "Reach 1000 pts": (context) =>
  //         context.score >= context.options.maxScore,
  //       "One shot sequence": (context) => context.oneShotLongSequence,
  //       "Win in 5 moves or less": (context) =>
  //         context.options.zenMoves - context.zenMovesIndicator.count <= 5,
  //     },
  //     hooks: [
  //       new level.Hook({
  //         id: "intro",
  //         event: "setup",
  //         once: true,
  //         entity: new popup.TutorialPopup({
  //           title: "Zen",
  //           content:
  //             "No viruses, no scissors. You can even start in the middle.\n\nChill out and enjoy making long DNA sequences.\n\nYou have 10 moves to rack up 1000 points and continue",
  //           popupOptions: {
  //             minimizeOnClose: false,
  //             coolDown: 2000,
  //           },
  //         }),
  //       }),
  //       new level.Hook({
  //         id: "outro",
  //         event: "maxScoreReached",
  //         entity: new popup.TerminatedLevelPopup(),
  //       }),
  //     ],
  //   }),

  "Chrono\nPortal": () =>
    new level.Level("Chrono\nPortal", (context) => ({
      variant: "fall",
      gridShape: "medium",
      forceMatching: true,
      clipCount: 3,
      portalsCount: 2,
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
            ])
          ),
      ],
      hooks: [
        new level.Hook({
          id: "go title",
          event: "injectedSequence",
          entity: new entity.FunctionCallEntity(() => {
            if (context.isEnded)
              context.activate(anim.title(context.container, "Go!"));
          }),
        }),
      ],
    })),

  Chrono: () =>
    new level.Level("Chrono", (context) => ({
      variant: "fall",
      gridShape: "medium",
      forceMatching: true,
      clipCount: 3,
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
            ])
          ),
      ],
      hooks: [
        new level.Hook({
          id: "minimized popup ring 1",
          event: "minimizedPopup",
          filter: (p) => p.id === "popup ring 1",
          entity: new entity.FunctionCallEntity(() => {
            context.timeBonus.highlight = false;
          }),
        }),
        new level.Hook({
          id: "intro",
          event: "init",
          once: true,
          entity: new entity.FunctionCallEntity(() => {
            context.disablingAnimation("preventVirus", true);
            context.activate(
              new popup.TutorialPopup({
                title: "Time attack!",
                content: `Crunch the sequences before they hit the grid!\n\nReach ${context.options.score.max} points to continue`,
                popupOptions: {
                  id: "intro popup",
                  logo: "images/icon_timed.png",
                  minimizeOnClose: false,
                  coolDown: 2000,
                },
              })
            );
          }),
        }),
        new level.Hook({
          id: "start",
          event: "closedPopup",
          filter: (p) => p.id === "intro popup",
          entity: new entity.FunctionCallEntity(() => {
            context.disablingAnimation("preventVirus", false);
          }),
        }),
        new level.Hook({
          id: "go title",
          event: "injectedSequence",
          entity: new entity.FunctionCallEntity(() => {
            if (context.isEnded)
              context.activate(anim.title(context.container, "Go!"));
          }),
        }),
      ],
    })),

  Classic: () =>
    new level.Level("Classic", (context) => ({
      variant: "turn",
      minStarNeeded: 1,
      forceMatching: true,
      gridShape: "medium",
      clipCount: 3,
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
            ])
          ),
      ],
      hooks: [
        new level.Hook({
          id: "minimized popup ring 1",
          event: "minimizedPopup",
          filter: (p) => p.id === "popup ring 1",
          entity: new entity.FunctionCallEntity(() => {
            context.swapBonus.highlight = false;
          }),
        }),
        new level.Hook({
          id: "intro",
          event: "init",
          once: true,
          entity: new entity.FunctionCallEntity(() => {
            context.activate(
              new popup.TutorialPopup({
                title: "Turn by turn",
                content: `Now you know the basics, try with some longer sequences.\n\nReach ${context.options.score.max} points to continue!`,
                popupOptions: {
                  minimizeOnClose: false,
                  coolDown: 2000,
                },
              })
            );
          }),
        }),
      ],
    })),

  Editor: () =>
    new level.Level("Editor", (ctx) => {
      ctx.finished = true;
      var editorGridShape: grid.GridShape = new Array(6).fill(
        new Array(7).fill("h")
      );
      editorGridShape[editorGridShape.length - 1] = editorGridShape[
        editorGridShape.length - 1
      ].map((val, x) => {
        if (x % 2 === 0) return null;
        else return val;
      });
      return {
        variant: "turn",
        minStarNeeded: 3,
        forceMatching: false,
        gridShape: editorGridShape,
        clipCount: 0,
        sequenceLength: -1,
        disableButton: true,
        disableBonuses: true,
      };
    }),
};

export const levelNames = Object.keys(levels);
export type LevelName = keyof Levels;
export type Levels = typeof levels;
