import * as booyah from "booyah/src/booyah";
import * as PIXI from "pixi.js";
import Level from "./scenes/Level";

import { OutlineFilter } from "@pixi/filter-outline";
import { GlowFilter } from "@pixi/filter-glow";

export const width = 1080;
export const height = 1920;
export const size = new PIXI.Point(width, height);

export const filters: { [key: string]: any } = {
  glow40: new GlowFilter({ distance: 40 }),
  glow: new GlowFilter(),
  outline: new OutlineFilter(3, 0xffee00ff),
};

const gameStates = {
  start: new Level(),
};

const graphicalAssets = [
  // images
  "images/particles_background.png",
  "images/particles_foreground.png",
  "images/background.jpg",
  "images/membrane.png",
  "images/inventory.png",
  "images/hole.png",
  "images/arrow.png",
  "images/circle.png",
  "images/bonus_swap.png",

  // animated sprites
  "images/nucleotide_red.json",
  "images/nucleotide_blue.json",
  "images/nucleotide_green.json",
  "images/nucleotide_yellow.json",
  "images/scissors.json",
];

let gameTransitions = {
  start: "start",
  game_over: "none",
};

const entityInstallers: any = [
  // audio.installJukebox,
  // audio.installFxMachine,
  // booyah.installMenu,
];

booyah.go({
  states: gameStates,
  //@ts-ignore
  transitions: gameTransitions,
  entityInstallers,
  screenSize: new PIXI.Point(width, height),
  graphicalAssets,
});
