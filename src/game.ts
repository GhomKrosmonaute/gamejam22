import * as booyah from "booyah/src/booyah";
import * as pixi from "pixi.js";
import Party from "./scenes/Party";

export const width = 1080;
export const height = 1920;

const gameStates = {
  start: new Party(),
};

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
  screenSize: new pixi.Point(width, height),
});
