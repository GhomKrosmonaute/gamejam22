import * as booyah from "booyah/src/booyah";
import * as pixi from "pixi.js";
import Party from "./states/Party";

export const width = 336;
export const height = 600;

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
