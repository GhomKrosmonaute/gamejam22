import * as level from "./scenes/level";

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
    maxScore: 50,
  }),
};

export const levelNames = Object.keys(levels);
export type LevelName = keyof Levels;
export type Levels = typeof levels;
