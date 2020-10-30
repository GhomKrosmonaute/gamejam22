import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as audio from "booyah/src/audio";

import * as minimap from "./scenes/minimap";

import * as crisprUtil from "./crisprUtil";
import * as levels from "./levels";

const main = new minimap.Minimap();

const gameStates = {
  start: main,
  default: main,
  ...levels.levels,
};

const graphicalAssets = [
  // images
  "images/particles_background.png",
  "images/particles_foreground.png",
  "images/background.jpg",
  "images/membrane.png",
  "images/hole.png",
  "images/bonus_swap.png",
  "images/bonus_heal.png",
  "images/bonus_time.png",
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
  "images/path_arrow.json",
  // Mini Nob
  "images/mini_bob_idle.json",
  "images/mini_bob_sting.json",
  "images/mini_bob_walk.json",
  "images/mini_bob_dead.json",
  // Medium Bob
  "images/medium_bob_idle.json",
  "images/medium_bob_sting.json",
  "images/medium_bob_walk.json",
  "images/medium_bob_dead.json",
  // Big Bob
  "images/big_bob_idle.json",
  "images/big_bob_sting.json",
  "images/big_bob_walk.json",
  "images/big_bob_dead.json",
];

const fontAssets = ["Cardenio Modern Bold", "Cardenio Modern Regular"];

const fxAssets = [
  "notification",
  "virus_move",
  "virus_sting",
  "explode_1",
  "explode_2",
  "explode_3",
  "note_1",
  "note_2",
  "note_3",
  "note_4",
  "note_5",
  "note_6",
  "note_7",
  "note_8",
  "infection",
  "score_ring",
  "star_0",
  "star_1",
  "star_2",
  "star_3",
];

const entityInstallers: any = [
  // audio.installJukebox,
  audio.installFxMachine,
  booyah.makeInstallMenu({
    menuButtonPosition: new PIXI.Point(crisprUtil.width, 0),
  }),
];

booyah.go({
  states: gameStates,
  entityInstallers,
  screenSize: new PIXI.Point(crisprUtil.width, crisprUtil.height),
  graphicalAssets,
  fxAssets,
  fontAssets,
  graphics: {
    menu: "images/hud_menu_button.png",
  },
});
