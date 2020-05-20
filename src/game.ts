import * as booyah from "booyah/dist/booyah.js";
// import * as PIXI from 'pixi.js';

// console.log(new PIXI.Point(1, 2));

// import * as util from "../booyah/src/util.js";
// import * as geom from "../booyah/src/geom.js";
// import * as entity from "../booyah/src/entity.js";
// import * as narration from "../booyah/src/narration.js";
// import * as audio from "../booyah/src/audio.js";

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
