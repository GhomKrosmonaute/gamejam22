import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as level from "./scenes/level";

import * as popup from "./entities/popup";
import * as bonuses from "./entities/bonus";

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
          event: "setup",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Zen mode",
            content:
              "On this variant, have fun making very long DNA sequences.\n\nReach 1000 pts!",
          }),
        }),
        new level.Hook({
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
          event: "beforeSetup",
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
          event: "beforeSetup",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Enjoy!",
            content:
              "Let's try the normal turn-by-turn variant.\n\nReach 300 pts!",
          }),
        }),
        new level.Hook({
          event: "maxScoreReached",
          entity: new popup.TerminatedLevelPopup(),
        }),
      ],
    }),

  Tutorial: () =>
    new level.Level("Tutorial", {
      variant: "turnBased",
      gridShape: "mini",
      scissorCount: 0,
      sequenceLength: 3,
      forceMatching: true,
      disableButton: true,
      disableBonuses: true,
      disableGauge: true,
      disableScore: true,
      retryOnFail: true,
      checks: {
        "Crunch a sequence": (level) => level.sequenceWasCrunched,
        "Includes scissors": (level) =>
          level.crunchedSequenceCount > 1 && level.scissorsWasIncludes,
        "Surviving infection": (level) => !level.failed,
      },
      hooks: [
        new level.Hook({
          event: "beforeSetup",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Let's CRUNCH!",
            content:
              "Try to crunch your first DNA sequence! Simply reproduce on the grid the sequence which floats above.",
          }),
        }),
        new level.Hook({
          event: "sequenceDown",
          reset: {
            scissorCount: 1,
            sequenceLength: 4,
            hooks: [
              new level.Hook({
                event: "beforeSetup",
                once: true,
                entity: new popup.TutorialPopup({
                  title: "Scissors",
                  content:
                    "Crunch a sequence, but includes scissors now!\n\nDNA sequences must include at least a pair of scissors between two nucleotides",
                  image: "images/scissors.json",
                  popupOptions: {
                    logo: "✂️",
                  },
                }),
              }),
              new level.Hook({
                event: "sequenceDown",
                reset: (context) => ({
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
                  displayTurnTitles: true,
                  forceMatching: false,
                  disableButton: false,
                  disableExtraSequence: true,
                  hooks: [
                    new level.Hook({
                      event: "beforeSetup",
                      once: true,
                      entity: new entity.EntitySequence([
                        new popup.TutorialPopup({
                          title: "Skip button",
                          content:
                            "If you no longer have a solution, click on the Skip button ... But beware of infection!",
                        }),
                        new entity.FunctionCallEntity(() => {
                          context.goButton.shaker.setShake("tutorial", 10);
                        }),
                      ]),
                    }),
                    new level.Hook({
                      event: "infected",
                      once: true,
                      entity: new entity.EntitySequence([
                        new entity.WaitingEntity(1000),
                        new popup.TutorialPopup({
                          title: "Infection",
                          content:
                            "For each skipped turn, certain nucleotides are infected.\n\nIf you pass your turn when all the nucleotides are already infected, you fail the game.",
                          image: "images/infection_red.png",
                          popupOptions: {
                            logo: "🦠",
                          },
                        }),
                      ]),
                    }),
                    new level.Hook({
                      event: "minimizedPopup",
                      filter: (popup) =>
                        popup.body.children.some((child) => {
                          return (
                            child instanceof PIXI.Text &&
                            child.text === "Infection"
                          );
                        }),
                      reset: {
                        gridShape: "medium",
                        sequences: null,
                        forceMatching: false,
                        disableExtraSequence: false,
                        sequenceLength: 5,
                        scissorCount: 4,
                        disableScore: false,
                        disableGauge: false,
                        maxScore: 200,
                        hooks: [
                          new level.Hook({
                            event: "beforeSetup",
                            entity: new popup.TutorialPopup({
                              title: "Let's survive!",
                              content: "Reach 200 pts.",
                            }),
                          }),
                          new level.Hook({
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
};

export const levelNames = Object.keys(levels);
export type LevelName = keyof Levels;
export type Levels = typeof levels;
