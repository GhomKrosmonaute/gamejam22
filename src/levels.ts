import * as PIXI from "pixi.js";

import { OutlineFilter } from "@pixi/filter-outline";

import * as easing from "booyah/src/easing";
import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as util from "booyah/src/util";

import * as popup from "./entities/popup";

import * as crispr from "./crispr";
import * as anim from "./animations";

import * as l from "./scenes/level";

declare var level: l.Level;

export const levels = {
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

  Caribbean: () =>
    new l.Level("Caribbean", (ctx) => ({
      gridShape: "fourIslands",
      forceMatching: false,
      clipCount: 4,
      sequenceLength: 4,
      portalsCount: 4,
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
    new l.Level("Hive", (context) => ({
      gridShape: "hive",
      maxLife: 3,
      forceMatching: true,
      sequenceLength: 8,
      // canCrunchParts: {
      //   fromLeft: true,
      //   possibleParts: [
      //     {
      //       glowColor: 0x00ff00,
      //       length: 4,
      //     },
      //     {
      //       glowColor: 0x00ffff,
      //       length: 6,
      //     },
      //   ],
      // },
      portalsCount: 4,
    })),

  Hole: () =>
    new l.Level("Hole", (context) => ({
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
    new l.Level("Bow Tie", (context) => ({
      gridShape: "bowTie",
      forceMatching: true,
    })),

  "Little\nBridge": () =>
    new l.Level("Little\nBridge", (context) => ({
      gridShape: "littleBridge",
      forceMatching: true,
      portalsCount: 2,
    })),

  "Four\nIslands": () =>
    new l.Level("Four\nIslands", (context) => ({
      gridShape: "fourIslands",
      forceMatching: true,
      clipCount: 3,
      sequenceLength: 5,
      portalsCount: 4,
    })),

  Boss: () =>
    new l.Level("Boss", (context) => ({
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
    new l.Level("Chrono\nPortal", (context) => ({
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
        new l.Hook({
          id: "go title",
          event: "injectedSequence",
          entity: new entity.FunctionCallEntity(() => {
            if (context.isEnded && !context.finished)
              context.activate(anim.title(context.container, "Go!"));
          }),
        }),
      ],
    })),

  Chrono: () =>
    new l.Level("Chrono", (context) => ({
      variant: "fall",
      gridShape: "medium",
      forceMatching: true,
      crispyBonusRate: 0.3,
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
        new l.Hook({
          id: "minimized popup ring 1",
          event: "minimizedPopup",
          filter: (p) => p.id === "popup ring 1",
          entity: new entity.FunctionCallEntity(() => {
            context.timeBonus.highlight = false;
          }),
        }),
        new l.Hook({
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
              context.activate(anim.title(context.container, "Go!"));
          }),
        }),
      ],
    })),

  Classic: () =>
    new l.Level("Classic", (context) => ({
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
                content: `Now you know the basics, try with some longer sequences.\n\nKill ${context.options.score.max} viruses to continue!`,
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

  Tutorial: () =>
    new l.Level("Tutorial", {
      variant: "turn",
      noCrispyBonus: true,
      disableClips: true,
      gridShape: [],
      sequences: [["r", "g", "b"]],
      disableButton: true,
      disableBonuses: true,
      disableGauge: true,
      disableScore: true,
      disablingAnimations: ["tutorial"],
      checks: {
        "Crunch a sequence": (context) => context.sequenceWasCrunched,
        "Reach 200 pts": (context) => context.score >= 200,
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
              [null, null, "y", "g", "r"],
              [null, null, "b", "g", "g"],
              [null, null, null, "b"],
              [],
              [],
            ],
            hooks: [
              new l.Hook({
                id: "step 2",
                event: "init",
                delay: 2000,
                entity: new entity.FunctionCallEntity(() => {
                  level.disablingAnimation("tutorial", false);

                  const gridPos = level.grid.nucleotideContainer.position;

                  level.activate(
                    anim.finger(level, {
                      container: level.entityConfig.container,
                      from: { x: 562 + gridPos.x, y: 417 + gridPos.y },
                      to: { x: 321 + gridPos.x, y: 556 + gridPos.y },
                      duration: 2000,
                    })
                  );
                }),
              }),
              new l.Hook({
                id: "step 2 => step 3",
                event: "sequenceDown",
                reset: {
                  gridShape: "mini",
                  resetGrid: true,
                  resetSequences: true,
                  forceMatching: true,
                  disableButton: true,
                  clipCount: 1,
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
                            })
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
                          [null, null, "y", "y", "b"],
                          [null, "b", "y", "b", "y", "b"],
                          [null, "b", "y", "y", "b", "b"],
                          [null, "y", "b", "b", "y", "b"],
                          [null, null, null, "y"],
                        ],
                        sequences: [["g", "r", "g", "r", "r"]],
                        clipCount: 1,
                        sequenceLength: 6,
                        forceMatching: true,
                        disableButton: false,
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
                            delay: 5000,
                            entity: new entity.FunctionCallEntity(() => {
                              level.disablingAnimation("tutorial", false);

                              const buttonPos =
                                level.actionButton.sprite.position;

                              level.activate(
                                new entity.EntitySequence([
                                  new entity.WaitingEntity(2000),
                                  anim.finger(level, {
                                    container: level.entityConfig.container,
                                    to: { x: buttonPos.x, y: buttonPos.y },
                                    duration: 2000,
                                  }),
                                ])
                              );
                            }),
                          }),
                          new l.Hook({
                            id: "step 4.1",
                            event: "infected",
                            once: true,
                            entity: new entity.EntitySequence([
                              new entity.FunctionCallEntity(() => {
                                context.disablingAnimation("tutorial", true);
                                context.disablingAnimation(
                                  "preventVirus",
                                  true
                                );
                              }),
                              new entity.WaitingEntity(1500),
                              new entity.FunctionCallEntity(() => {
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
                                  })
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
                            }),
                          }),
                          new l.Hook({
                            id: "step 4 => step 5",
                            event: "canReset",
                            reset: {
                              gridShape: "medium",
                              resetGrid: true,
                              resetScore: true,
                              resetSequences: true,
                              sequenceLength: 5,
                              maxLife: 5,
                              clipCount: 3,
                              sequences: null,
                              disableScore: false,
                              disableGauge: false,
                              forceMatching: true,
                              score: {
                                initial: 0,
                                max: 2,
                              },
                              hooks: [
                                new l.Hook({
                                  id: "step 5",
                                  once: true,
                                  event: "init",
                                  entity: new entity.EntitySequence([
                                    new entity.WaitingEntity(1500),
                                    new entity.FunctionCallEntity(() => {
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
                                                )
                                              );
                                              context.disablingAnimation(
                                                "tutorial",
                                                false
                                              );
                                            },
                                          },
                                        })
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
};

export const levelNames = Object.keys(levels);
export type LevelName = keyof Levels;
export type Levels = typeof levels;
