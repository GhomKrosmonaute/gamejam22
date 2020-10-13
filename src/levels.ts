import * as level from "./scenes/level";

import * as popup from "./entities/popup";
import * as bonuses from "./entities/bonus";

export const levels = {
  // first real level
  "Level 1": new level.Level({
    variant: "turnBased",
    initialBonuses: [
      {
        bonus: bonuses.swapBonus,
        quantity: 3,
      },
    ],
    hooks: [
      new level.Hook({
        event: "maxScoreReached",
        entity: new popup.TerminatedLevelPopup(),
      }),
    ],
  }),

  // Infections
  "Tuto 3": new level.Level({
    variant: "turnBased",
    gridShape: "medium",
    scissorCount: 4,
    sequenceLength: 6,
    disableGauge: true,
    disableScore: true,
    disableBonuses: true,
    disableExtraSequence: true,
    checks: {
      "Surviving infection": (level) => !level.failed,
    },
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
  }),

  // Missing Scissors
  "Tuto 2": new level.Level({
    variant: "turnBased",
    gridShape: "mini",
    scissorCount: 1,
    sequenceLength: 4,
    forceMatching: true,
    disableButton: true,
    disableBonuses: true,
    disableGauge: true,
    disableScore: true,
    checks: {
      "Includes scissors": () => true,
    },
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
        entity: new popup.TerminatedLevelPopup(),
      }),
    ],
  }),

  // Sequence de 3
  "Tuto 1": new level.Level({
    variant: "turnBased",
    gridShape: "mini",
    scissorCount: 0,
    sequenceLength: 3,
    forceMatching: true,
    disableButton: true,
    disableBonuses: true,
    disableGauge: true,
    disableScore: true,
    checks: {
      "Crunch a sequence": () => true,
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
        entity: new popup.TerminatedLevelPopup(),
      }),
    ],
  }),
};

export const levelNames = Object.keys(levels);
export type LevelName = keyof Levels;
export type Levels = typeof levels;
