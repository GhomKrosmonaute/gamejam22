import * as entity from "booyah/src/entity";
import * as popup from "./entities/popup";
import * as level from "./scenes/level";
import * as anim from "./animations";
import { contains } from "booyah/dist/util";

export const levels = {
  "MV Mod": () =>
    new level.Level("MV Mod", {
      virus: "big",
      variant: "fall",
      dropSpeed: 1,
      gridShape: "medium",
      sequenceLength: 7,
      forceMatching: true,
      scissorCount: 3,
      gaugeRings: [
        (context) => (context.options.dropSpeed = 1.2),
        (context) => context.bonusesManager.add(context.timeBonus),
        (context) => (context.options.dropSpeed = 1.3),
      ],
    }),

  // todo: intermediary levels with medium virus

  "Zen mode": () =>
    new level.Level("Zen mode", {
      variant: "zen",
      maxScore: 1000,
      forceMatching: true,
      disableBonuses: true,
      zenMoves: 10,
      scissorCount: 0,
      checks: {
        "Reach 1000 pts": (context) =>
          context.score >= context.options.maxScore,
        "One shot sequence": (context) => context.oneShotLongSequence,
        "Win in 5 moves or less": (context) =>
          context.options.zenMoves - context.zenMovesIndicator.count <= 5,
      },
      hooks: [
        new level.Hook({
          id: "intro",
          event: "setup",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Zen mode",
            content:
              "On this variant, have fun making very long DNA sequences.\n\nReach 1000 pts!",
            popupOptions: {
              minimizeOnClose: false,
              coolDown: 2000,
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

  "Time challenge": () =>
    new level.Level("Time challenge", (context) => ({
      variant: "fall",
      gridShape: "medium",
      forceMatching: true,
      scissorCount: 3,
      maxScore: 400,
      gaugeRings: [
        (context) => context.bonusesManager.add(context.swapBonus),
        (context, ring) =>
          context.activate(
            new entity.EntitySequence([
              new entity.FunctionCallEntity(() => {
                context.bonusesManager.add(context.timeBonus);
                context.timeBonus.highlight = true;
              }),
              new popup.TutorialPopup({
                title: "The Time bonus",
                content: "Can freeze the game for 5 seconds!",
                image: "images/bonus_time.png",
                popupOptions: {
                  id: "popup ring 1",
                  from: ring.position,
                  coolDown: 2000,
                  logo: "🥶",
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
          entity: new popup.TutorialPopup({
            title: "Oh no!",
            content:
              "It's a time bomb, crunch the sequences before they hit the grid!\n\nReach 400 pts!",
            popupOptions: {
              logo: "😱",
              minimizeOnClose: false,
              coolDown: 2000,
            },
          }),
        }),
        new level.Hook({
          id: "outro",
          event: "maxScoreReached",
          entity: new popup.TerminatedLevelPopup(),
        }),
      ],
    })),

  "Turn mode": () =>
    new level.Level("Turn mode", (context) => ({
      variant: "turn",
      maxScore: 300,
      minStarNeeded: 1,
      gaugeRings: [
        (context, ring) =>
          context.activate(
            new entity.EntitySequence([
              new entity.FunctionCallEntity(() => {
                context.bonusesManager.add(context.swapBonus);
                context.swapBonus.highlight = true;
              }),
              new popup.TutorialPopup({
                title: "The Swap bonus",
                content: "Can swap two nucleotides",
                image: "images/bonus_swap.png",
                popupOptions: {
                  id: "popup ring 1",
                  from: ring.position,
                  coolDown: 2000,
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
          entity: new popup.TutorialPopup({
            title: "Enjoy!",
            content: "Let's try the turn-by-turn variant.\n\nReach 300 pts!",
            popupOptions: {
              minimizeOnClose: false,
              coolDown: 2000,
            },
          }),
        }),
        new level.Hook({
          id: "outro",
          event: "maxScoreReached",
          entity: new popup.TerminatedLevelPopup(),
        }),
      ],
    })),

  Tutorial: () =>
    new level.Level("Tutorial", {
      variant: "turn",
      scissorCount: 0,
      gridShape: [],
      sequences: [["r", "g", "b"]],
      disableButton: true,
      disableBonuses: true,
      disableGauge: true,
      disableScore: true,
      disablingAnimations: ["tutorial"],
      checks: {
        "Crunch a sequence": (context) => context.sequenceWasCrunched,
        "Includes scissors": (context) =>
          context.triggeredHooks.has("step 3 => step 4"),
        "Reach 200 pts": (context) => context.score >= 200,
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
              id: "popup step 1.2",
              minimizeOnClose: false,
              coolDown: 2000,
            },
          }),
        }),
        new level.Hook({
          id: "step 1 => step 2",
          event: "closedPopup",
          filter: (p) => p.id === "popup step 1.2",
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
                          id: "popup step 2",
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
                filter: (p) => p.id === "popup step 2",
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
                        forceMatching: true,
                        disableButton: false,
                        hooks: [
                          new level.Hook({
                            id: "step 4",
                            event: "init",
                            once: true,
                            entity: new popup.TutorialPopup({
                              title: "Skip button",
                              content:
                                "Sometimes you’ll get stuck, and you can’t make a matching sequence.\n\nIn that case, press the skip button.",
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
                              new entity.FunctionCallEntity(() => {
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
                                    content:
                                      "When you skip, parts of your grid will get infected.\n\nIf the entire grid gets infected, it’s game over.",
                                    image: "images/infection_red.png",
                                    popupOptions: {
                                      id: "popup step 4.1",
                                      logo: "🦠",
                                      coolDown: 2000,
                                    },
                                  })
                                );
                                context.disablingAnimation("tutorial", true);
                              }),
                            ]),
                          }),
                          new level.Hook({
                            id: "step 4 .2",
                            event: "minimizedPopup",
                            filter: (p) =>
                              p.id === "popup step 4.1" &&
                              context.disablingAnimations.has("tutorial"),
                            entity: new popup.TutorialPopup({
                              title: "Clean up infections!",
                              content: "Using the infected DNA in a sequence.",
                              image: "images/infection_red.png",
                              popupOptions: {
                                minimizeOnClose: false,
                                id: "popup step 4.2",
                                logo: "💉",
                                coolDown: 2000,
                              },
                            }),
                          }),
                          new level.Hook({
                            id: "step 4.3",
                            event: "closedPopup",
                            filter: (p) => p.id === "popup step 4.2",
                            entity: new entity.FunctionCallEntity(() => {
                              context.disablingAnimation("tutorial", false);
                              context.disablingAnimation("preventVirus", false);
                            }),
                          }),
                          new level.Hook({
                            id: "step 4 => step 5",
                            event: "cleanedInfection",
                            entity: new entity.EntitySequence([
                              new entity.WaitForEvent(context, "sequenceDown"),
                              new entity.FunctionCallEntity(() => {
                                context.emit("canReset");
                              }),
                            ]),
                          }),
                          new level.Hook({
                            id: "step 4 => step 5",
                            event: "canReset",
                            reset: {
                              gridShape: "medium",
                              resetGrid: true,
                              resetScore: true,
                              resetSequences: true,
                              sequenceLength: 5,
                              scissorCount: 3,
                              disableScore: false,
                              disableGauge: false,
                              forceMatching: true,
                              maxScore: 200,
                              hooks: [
                                new level.Hook({
                                  id: "step 5",
                                  once: true,
                                  event: "init",
                                  entity: new entity.EntitySequence([
                                    new entity.WaitingEntity(1500),
                                    new entity.FunctionCallEntity(() => {
                                      context.disablingAnimation(
                                        "preventVirus",
                                        false
                                      );
                                      context.activate(
                                        new popup.TutorialPopup({
                                          title: "Nice work!",
                                          content:
                                            "You get points for each sequence you match. The longer the sequence, the more points.\n\nNow try to make 200 points.",
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
};

export const levelNames = Object.keys(levels);
export type LevelName = keyof Levels;
export type Levels = typeof levels;
