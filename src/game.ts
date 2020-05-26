// import { FontFaceObserver } from "fontfaceobserver";
// const FontFaceObserver = require("fontfaceobserver");

// // @ts-ignore
// const FontFaceObserver = require("fontfaceobserver");
// const font = new FontFaceObserver("fantasy");

// font.load().then(
//   function () {
//     console.log("Font is available");
//   },
//   function () {
//     console.log("Font is not available");
//   }
// );

// import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";

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
