import * as booyah from "booyah/src/booyah";
import * as PIXI from "pixi.js";
import Party from "./scenes/Party";

export const width = 1080;
export const height = 1920;
export const size = new PIXI.Point(width, height);

const gameStates = {
  start: new Party(),
};

const graphicalAssets = [
  // images
  "images/particles_background.png",
  "images/particles_foreground.png",
  "images/space_background.png",
  "images/background.jpg",
  "images/membrane.png",
  "images/hole.png",
  "images/arrow.png",
  "images/circle.png",

  // animated sprites
  "images/nucleotide_red.json",
  "images/nucleotide_blue.json",
  "images/nucleotide_green.json",
  "images/nucleotide_yellow.json",
  "images/scissors.json",
];

let gameTransitions = {};

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
