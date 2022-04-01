import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as audio from "booyah/src/audio";
import * as entity from "booyah/src/entity";

import { Test } from "./levels/test";

const gameStates: { [k: string]: entity.EntityResolvable } = {
  start: new Test(),
};

const gameTransitions = {
  // start: entity.makeTransition("default"),
  // writeUs: entity.makeTransition("default"),
};

const graphicalAssets: string[] = [];

const fontAssets: FontFamily[] = [
  "Alien League",
  "Geosans Light",
  "Waffle Crisp",
  "Optimus",
];
export type FontFamily =
  | "Alien League"
  | "Geosans Light"
  | "Waffle Crisp"
  | "Optimus";

const fxAssets: string[] = [];

const videoAssets = ["intro"];

const musicAssets = ["menu", "time_challenge", "turn_by_turn", "zen", "intro"];

const jsonAssets = [{ key: "subtitles", url: "text/subtitles_en.json" }];

const entityInstallers: ((
  rootConfig: entity.EntityConfig,
  rootEntity: entity.Entity
) => unknown)[] = [audio.installJukebox, audio.installFxMachine];

booyah.go({
  states: gameStates,
  transitions: gameTransitions,
  entityInstallers,
  screenSize: new PIXI.Point(1920, 1080),
  graphicalAssets,
  videoAssets,
  musicAssets,
  fontAssets,
  fxAssets,
  jsonAssets,
  loadingGauge: {
    position: {
      x: 1920 / 2,
      y: 1080 * 0.7,
    },
    scale: 3,
  },
});

let mainDiv = document.createElement("div");
mainDiv.id = "editor";
document.body.append(mainDiv);
