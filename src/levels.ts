import * as level from "./scenes/level";

import * as popup from "./entities/popup";
import * as bonuses from "./entities/bonus";

export const levels = {
  // first real level
  "Level 1": () =>
    new level.Level({
      variant: "turnBased",
      maxScore: 200,
      initialBonuses: [
        {
          bonus: bonuses.swapBonus,
          quantity: 3,
        },
      ],
      hooks: [
        new level.Hook({
          event: "setup",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Enjoy!",
            content:
              "Let's try the normal turn by turn level.\n\nReach 200 pts!",
          }),
        }),
        new level.Hook({
          event: "maxScoreReached",
          entity: new popup.TerminatedLevelPopup(),
        }),
      ],
    }),

  Tutorial: () =>
    new level.Level({
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
        "Surviving infection": (level) =>
          level.crunchedSequenceCount > 2 && !level.failed,
      },
      hooks: [
        new level.Hook({
          event: "setup",
          once: true,
          entity: new popup.TutorialPopup({
            title: "Tutorial",
            content:
              "Try to crunch your first sequence! Simply reproduce on the grid the sequence which floats above.",
          }),
        }),
        new level.Hook({
          event: "sequenceDown",
          reset: {
            scissorCount: 1,
            sequenceLength: 4,
            hooks: [
              new level.Hook({
                event: "setup",
                once: true,
                entity: new popup.TutorialPopup({
                  title: "Tutorial",
                  content: "Crunch a sequence, but includes scissors!",
                }),
              }),
              new level.Hook({
                event: "sequenceDown",
                reset: {
                  gridShape: "medium",
                  scissorCount: 4,
                  sequenceLength: 6,
                  disableButton: false,
                  disableExtraSequence: true,
                  hooks: [
                    new level.Hook({
                      event: "setup",
                      once: true,
                      entity: new popup.TutorialPopup({
                        title: "Tutorial",
                        content:
                          "If you no longer have a solution, click on the Skip button ... But beware of infection!",
                      }),
                    }),
                    new level.Hook({
                      event: "sequenceDown",
                      entity: new popup.TerminatedLevelPopup(),
                    }),
                  ],
                },
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
