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
  "images/space-background.png",
  "images/background.jpg",
  "images/membrane.png",
  "images/particles-background.png",
  "images/particles-foreground.png",
  "images/arrow.png",
  "images/circle.png",
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
