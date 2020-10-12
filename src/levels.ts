import * as level from "./scenes/level";

import * as popup from "./entities/popup";

export const levels = {
  // first real level
  "Level 1": new level.Level({
    variant: "turnBased",
  }),

  // Infections
  "Tuto 3": new level.Level({
    variant: "turnBased",
  }),

  // Missing Scissors
  "Tuto 2": new level.Level({
    variant: "turnBased",
    gridShape: "mini",
    scissorCount: 1,
    sequenceLength: 3,
    forceMatching: true,
    gaugeRingCount: 0,
    maxScore: 50,
  }),

  // Sequence de 3
  "Tuto 1": new level.Level({
    variant: "turnBased",
    gridShape: "mini",
    scissorCount: 0,
    sequenceLength: 3,
    forceMatching: true,
    gaugeRingCount: 0,
    maxScore: 1,
    endsBy: "none",
    disableButton: true,
    disableBonuses: true,
    hooks: [
      new level.Hook({
        event: "setup",
        once: true,
        entity: new popup.TutorialPopup({
          title: "Tutorial",
          content: "Draw a line to make a sequence",
        }),
      }),
      new level.Hook({
        event: "scoreUpdated",
        entity: new popup.TerminatedLevelPopup(),
        filter: (score) => {
          return score > 0;
        },
      }),
    ],
  }),
};

export const levelNames = Object.keys(levels);
export type LevelName = keyof Levels;
export type Levels = typeof levels;
