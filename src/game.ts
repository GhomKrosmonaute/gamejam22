import * as booyah from "booyah/src/booyah";
import Party from "./states/Party";

const gameStates = {
  start: new Party(),
};

let gameTransitions = {};

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
});
