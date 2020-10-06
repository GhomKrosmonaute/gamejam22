import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";

import * as minimap from "./scenes/minimap";

import * as crisprUtil from "./crisprUtil";

const gameStates = {
  start: new minimap.Minimap(),
};

let gameTransitions = {
  turnBased: "end",
  continuous: "end",
  long: "end",
};

const graphicalAssets = [
  // images
  "images/particles_background.png",
  "images/particles_foreground.png",
  "images/background.jpg",
  "images/membrane.png",
  "images/hole.png",
  "images/arrow.png",
  "images/circle.png",
  "images/bonus_swap.png",
  "images/bonus_heal.png",
  "images/bonus_syringe.png",
  "images/infection_red.png",
  "images/infection_blue.png",
  "images/infection_green.png",
  "images/infection_yellow.png",
  "images/hud_bonus_background.png",
  "images/hud_go_button.png",
  "images/hud_gauge_background.png",
  "images/hud_gauge_bar.png",
  "images/hud_gauge_ring.png",
  "images/nucleotide_glow.png",
  "images/nucleotide_bright.png",
  "images/popup_background.png",
  "images/star.png",
  "images/cellule.png",
  "images/cellule_1.png",
  "images/cellule_2.png",
  "images/cellule_background.png",

  // animated sprites
  "images/nucleotide_red.json",
  "images/nucleotide_blue.json",
  "images/nucleotide_green.json",
  "images/nucleotide_yellow.json",
  "images/scissors.json",
  "images/hair.json",
  "images/mini_bob_idle.json",
  "images/mini_bob_sting.json",
  "images/mini_bob_walk.json",
  "images/path_arrow.json",
];

const fontAssets = ["Cardenio Modern Bold", "Cardenio Modern Regular"];

const entityInstallers: any = [
  // audio.installJukebox,
  // audio.installFxMachine,
  booyah.makeInstallMenu({
    menuButtonPosition: new PIXI.Point(crisprUtil.width, 0),
  }),
];

booyah.go({
  states: gameStates,
  //@ts-ignore
  transitions: gameTransitions,
  entityInstallers,
  screenSize: new PIXI.Point(crisprUtil.width, crisprUtil.height),
  graphicalAssets,
  fontAssets,
  graphics: {
    menu: "images/hud_menu_button.png",
  },
});
