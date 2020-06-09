import * as booyah from "booyah/src/booyah";
import GridEntity from "./entities/Grid";

const grid = new GridEntity()

const gameStates = {
  start: grid
};

let gameTransitions = {

};

const entityInstallers = [
  // audio.installJukebox,
  // audio.installFxMachine,
  booyah.installMenu,
];

booyah.go({
  states: gameStates,
  //@ts-ignore
  transitions: gameTransitions,
  entityInstallers,
})
