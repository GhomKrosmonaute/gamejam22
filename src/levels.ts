import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as level from "./scenes/level";

import * as popup from "./entities/popup";
import * as bonuses from "./entities/bonus";

import * as crisprUtil from "./crisprUtil";

export const levels = {
  "Level 3": () =>
    new level.Level("Level 3", {
      variant: "long",
      maxScore: 1000,
      scissorCount: 0,
      checks: {
        "Not infected": (level) => !level.wasInfected,
        "No bonus used": (level) => !level.bonusesManager.wasBonusUsed,
        "One shot sequence": (level) => level.oneShotLongSequence,
      },
      gaugeRings: [
        (level) => level.bonusesManager.add(bonuses.swapBonus),
        (level) => level.bonusesManager.add(bonuses.swapBonus),
        (level) => level.bonusesManager.add(bonuses.swapBonus),
      ],
      hooks: [
        new level.Hook({
          id: "intro",
          event: "setup",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Zen mode",
            content:
              "On this variant, have fun making very long DNA sequences.\n\nReach 1000 pts!",
          }),
        }),
        new level.Hook({
          id: "outro",
          event: "maxScoreReached",
          entity: new popup.TerminatedLevelPopup(),
        }),
      ],
    }),

  "Level 2": () =>
    new level.Level("Level 2", {
      variant: "continuous",
      gridShape: "medium",
      forceMatching: true,
      maxScore: 400,
      gaugeRings: [
        (level) => level.bonusesManager.add(bonuses.swapBonus),
        (level, ring) =>
          level.activate(
            new entity.EntitySequence([
              new entity.FunctionCallEntity(() => {
                level.bonusesManager.add(bonuses.timeBonus);
                bonuses.timeBonus.highlight = true;
              }),
              new popup.TutorialPopup({
                title: "The Time bonus",
                content: "Can freeze the game for 5 seconds!",
                image: "images/bonus_time.png",
                popupOptions: {
                  from: ring.position,
                  logo: "🥶",
                },
              }),
              new entity.FunctionCallEntity(() => {
                bonuses.timeBonus.highlight = false;
              }),
            ])
          ),
      ],
      hooks: [
        new level.Hook({
          id: "intro",
          event: "init",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Oh no!",
            content:
              "It's a time bomb, crunch the sequences before they hit the grid!\n\nReach 400 pts!",
            popupOptions: {
              logo: "😱",
            },
          }),
        }),
        new level.Hook({
          id: "outro",
          event: "maxScoreReached",
          entity: new popup.TerminatedLevelPopup(),
        }),
      ],
    }),

  "Level 1": () =>
    new level.Level("Level 1", {
      variant: "turnBased",
      maxScore: 300,
      retryOnFail: true,
      gaugeRings: [
        (level, ring) =>
          level.activate(
            new entity.EntitySequence([
              new entity.FunctionCallEntity(() => {
                level.bonusesManager.add(bonuses.swapBonus);
                bonuses.swapBonus.highlight = true;
              }),
              new popup.TutorialPopup({
                title: "The Swap bonus",
                content: "Can swap two nucleotides",
                image: "images/bonus_swap.png",
                popupOptions: {
                  from: ring.position,
                },
              }),
              new entity.FunctionCallEntity(() => {
                bonuses.swapBonus.highlight = false;
              }),
            ])
          ),
      ],
      hooks: [
        new level.Hook({
          id: "intro",
          event: "init",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Enjoy!",
            content:
              "Let's try the normal turn-by-turn variant.\n\nReach 300 pts!",
          }),
        }),
        new level.Hook({
          id: "outro",
          event: "maxScoreReached",
          entity: new popup.TerminatedLevelPopup(),
        }),
      ],
    }),

  Tutorial: () =>
    new level.Level("Tutorial", {
      variant: "turnBased",
      scissorCount: 0,
      gridShape: [],
      sequences: [["r", "g", "b"]],
      disableButton: true,
      disableBonuses: true,
      disableGauge: true,
      disableScore: true,
      disablingAnimations: ["tutorial"],
      checks: {
        "Crunch a sequence": (level) => level.sequenceWasCrunched,
        "Includes scissors": (level) =>
          level.triggeredHooks.has("step 3 => step 4"),
        "Surviving infection": (level) =>
          level.triggeredHooks.has("end") && !level.failed,
      },
      hooks: [
        new level.Hook({
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
        new level.Hook({
          id: "step 1.2",
          event: "injectedSequence",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Your job",
            content:
              "As the CRISPR Designer, it’s your job to create a matching CRISPR sequence.",
            popupOptions: {
              id: "step 1.2",
              minimizeOnClose: false,
              coolDown: 2000,
            },
          }),
        }),
        new level.Hook({
          id: "step 1 => step 2",
          event: "closedPopup",
          filter: (p) => p.id === "step 1.2",
          reset: (context) => ({
            resetGrid: true,
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
              new level.Hook({
                id: "step 2",
                event: "init",
                entity: new entity.EntitySequence([
                  new entity.WaitingEntity(1000),
                  new entity.FunctionCallEntity(() => {
                    context.activate(
                      new popup.TutorialPopup({
                        title: "Draw!",
                        content:
                          "Go ahead and draw on the grid to match the virus DNA",
                        popupOptions: {
                          id: "step 2",
                          minimizeOnClose: false,
                          coolDown: 2000,
                        },
                      })
                    );
                  }),
                ]),
              }),
              new level.Hook({
                id: "step 2.1",
                event: "closedPopup",
                filter: (p) => p.id === "step 2",
                entity: new entity.FunctionCallEntity(() => {
                  context.disablingAnimation("tutorial", false);
                }),
              }),
              new level.Hook({
                id: "step 2 => step 3",
                event: "sequenceDown",
                reset: {
                  gridShape: "mini",
                  resetGrid: true,
                  resetSequences: true,
                  forceMatching: true,
                  scissorCount: 1,
                  sequenceLength: 4,
                  hooks: [
                    new level.Hook({
                      id: "step 3",
                      event: "init",
                      once: true,
                      entity: new popup.TutorialPopup({
                        title: "Scissors",
                        content:
                          "To destroy the virus DNA, you’ll need to include the CRISPR scissors in your sequence.\n\n" +
                          "The scissors have to be somewhere in the middle of the sequence,  not at the beginning or end.",
                        image: "images/scissors.json",
                        popupOptions: {
                          logo: "✂️",
                          coolDown: 2000,
                        },
                      }),
                    }),
                    new level.Hook({
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
                        scissorCount: 3,
                        sequenceLength: 6,
                        disableButton: false,
                        disableExtraSequence: true,
                        hooks: [
                          new level.Hook({
                            id: "step 4",
                            event: "init",
                            once: true,
                            entity: new popup.TutorialPopup({
                              title: "Skip button",
                              content:
                                "If you no longer have a solution, click on the Skip button ... But beware of infection!",
                              popupOptions: {
                                coolDown: 2000,
                              },
                            }),
                          }),
                          new level.Hook({
                            id: "step 4.1",
                            event: "infected",
                            once: true,
                            entity: new entity.EntitySequence([
                              new entity.WaitingEntity(1500),
                              new entity.FunctionCallEntity(() => {
                                context.disablingAnimation("tutorial", true);
                                context.activate(
                                  new popup.TutorialPopup({
                                    title: "Infection",
                                    content:
                                      "For each skipped turn, certain nucleotides are infected.\n\nIf you pass your turn when all the nucleotides are already infected, you fail the game.",
                                    image: "images/infection_red.png",
                                    popupOptions: {
                                      id: "step 4.1",
                                      logo: "🦠",
                                      coolDown: 2000,
                                    },
                                  })
                                );
                              }),
                            ]),
                          }),
                          new level.Hook({
                            id: "step 4 => step 5",
                            event: "minimizedPopup",
                            filter: (p) => p.id === "step 4.1",
                            reset: {
                              gridShape: "medium",
                              resetGrid: true,
                              resetScore: true,
                              resetSequences: true,
                              disableExtraSequence: false,
                              sequenceLength: 5,
                              scissorCount: 4,
                              disableScore: false,
                              disableGauge: false,
                              maxScore: 200,
                              hooks: [
                                new level.Hook({
                                  id: "step 5",
                                  once: true,
                                  event: "init",
                                  entity: new entity.EntitySequence([
                                    new entity.WaitingEntity(1500),
                                    new entity.FunctionCallEntity(() => {
                                      context.activate(
                                        new popup.TutorialPopup({
                                          title: "Survive!",
                                          content: "Reach 200 pts.",
                                          popupOptions: {
                                            minimizeOnClose: false,
                                            coolDown: 1000,
                                            onClose: () => {
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
                                new level.Hook({
                                  id: "end",
                                  event: "maxScoreReached",
                                  entity: new popup.TerminatedLevelPopup(),
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

  // Tutorial: () =>
  //   new level.Level("Tutorial", {
  //     variant: "turnBased",
  //     gridShape: "mini",
  //     scissorCount: 0,
  //     sequenceLength: 3,
  //     forceMatching: true,
  //     disableButton: true,
  //     disableBonuses: true,
  //     disableGauge: true,
  //     disableScore: true,
  //     retryOnFail: true,
  //     checks: {
  //       "Crunch a sequence": (level) => level.sequenceWasCrunched,
  //       "Includes scissors": (level) =>
  //         level.crunchedSequenceCount > 1 && level.scissorsWasIncludes,
  //       "Surviving infection": (level) => !level.failed,
  //     },
  //     hooks: [
  //       new level.Hook({
  //         id: "intro (step 1)",
  //         event: "init",
  //         once: true,
  //         entity: new popup.TutorialPopup({
  //           title: "Let's CRUNCH!",
  //           content:
  //             "Try to crunch your first DNA sequence!\n\nSimply reproduce on the grid the sequence which floats above.",
  //         }),
  //       }),
  //       new level.Hook({
  //         id: "step 1 done, reset",
  //         event: "sequenceDown",
  //         reset: {
  //           scissorCount: 1,
  //           sequenceLength: 4,
  //           hooks: [
  //             new level.Hook({
  //               id: "intro scissors (step 2)",
  //               event: "init",
  //               once: true,
  //               entity: new popup.TutorialPopup({
  //                 title: "Scissors",
  //                 content:
  //                   "Crunch a sequence, but includes scissors now!\n\nDNA sequences must include at least a pair of scissors between two nucleotides",
  //                 image: "images/scissors.json",
  //                 popupOptions: {
  //                   logo: "✂️",
  //                 },
  //               }),
  //             }),
  //             new level.Hook({
  //               id: "step 2 done, reset",
  //               event: "sequenceDown",
  //               reset: (context) => ({
  //                 gridShape: [
  //                   null,
  //                   [null, null, "y", "y", "b"],
  //                   [null, "b", "y", "b", "y", "b"],
  //                   [null, "b", "y", "y", "b", "b"],
  //                   [null, "y", "b", "b", "y", "b"],
  //                   [null, null, null, "y"],
  //                 ],
  //                 sequences: [["g", "r", "g", "r", "r"]],
  //                 scissorCount: 3,
  //                 sequenceLength: 6,
  //                 displayTurnTitles: true,
  //                 forceMatching: false,
  //                 disableButton: false,
  //                 disableExtraSequence: true,
  //                 hooks: [
  //                   new level.Hook({
  //                     id: "intro skip button (step 3)",
  //                     event: "init",
  //                     once: true,
  //                     entity: new popup.TutorialPopup({
  //                       title: "Skip button",
  //                       content:
  //                         "If you no longer have a solution, click on the Skip button ... But beware of infection!",
  //                     }),
  //                   }),
  //                   new level.Hook({
  //                     id: "intro infection (step 4)",
  //                     event: "infected",
  //                     once: true,
  //                     entity: new entity.EntitySequence([
  //                       new entity.WaitingEntity(1000),
  //                       new entity.FunctionCallEntity(() => {
  //                         context.activate(
  //                           new popup.TutorialPopup({
  //                             title: "Infection",
  //                             content:
  //                               "For each skipped turn, certain nucleotides are infected.\n\nIf you pass your turn when all the nucleotides are already infected, you fail the game.",
  //                             image: "images/infection_red.png",
  //                             popupOptions: {
  //                               logo: "🦠",
  //                             },
  //                           }),
  //                         );
  //                       })
  //                     ]),
  //                   }),
  //                   new level.Hook({
  //                     id: "step 3 and 4 done, reset",
  //                     event: "minimizedPopup",
  //                     filter: (popup) =>
  //                       popup.body.children.some((child) => {
  //                         return (
  //                           child instanceof PIXI.Text &&
  //                           child.text === "Infection"
  //                         );
  //                       }),
  //                     reset: {
  //                       gridShape: "medium",
  //                       sequences: null,
  //                       forceMatching: false,
  //                       disableExtraSequence: false,
  //                       sequenceLength: 5,
  //                       scissorCount: 4,
  //                       disableScore: false,
  //                       disableGauge: false,
  //                       maxScore: 200,
  //                       hooks: [
  //                         new level.Hook({
  //                           id: "intro survival (step 5)",
  //                           once: true,
  //                           event: "init",
  //                           entity: new popup.TutorialPopup({
  //                             title: "Let's survive!",
  //                             content: "Reach 200 pts.",
  //                           }),
  //                         }),
  //                         new level.Hook({
  //                           id: "outro",
  //                           event: "maxScoreReached",
  //                           entity: new popup.TerminatedLevelPopup(),
  //                         }),
  //                       ],
  //                     },
  //                   }),
  //                 ],
  //               }),
  //             }),
  //           ],
  //         },
  //       }),
  //     ],
  //   }),
};

export const levelNames = Object.keys(levels);
export type LevelName = keyof Levels;
export type Levels = typeof levels;
