import * as booyah from "booyah/src/booyah";

const gameStates = {
  // TODO: Fill in states here
};

let gameTransitions = {};

const entityInstallers = [
  // audio.installJukebox,
  // audio.installFxMachine,
  booyah.installMenu,
];

booyah.go({
  states: gameStates,
  transitions: gameTransitions,
  entityInstallers,
});
