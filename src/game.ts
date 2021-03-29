import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as audio from "booyah/src/audio";
import * as entity from "booyah/src/entity";

import * as minimap from "./scenes/minimap";

import * as crispr from "./crispr";
import * as levels from "./levels";

const main = new minimap.Minimap();

const gameStates = {
  start: main,
  default: main,
  ...levels.levels,
};

const graphicalAssets = [
  "images/titlescreen_background.png",
  "images/titlescreen_menu_button.png",
  //"images/titlescreen_play_button.png",
  "images/titlescreen_title.png",

  "images/map_background.png",
  "images/particles_background.png",
  "images/particles_foreground.png",
  "images/background.png",
  "images/background_cell.png",
  "images/background_layer_1.png",
  "images/background_layer_2.png",
  "images/background_layer_3-eclaircir.png",
  "images/background_layer_4-lumiere_tamisee.png",
  "images/membrane.png",

  "images/minimap_background.png",
  "images/minimap_layer_1.png",
  "images/minimap_layer_2.png",
  "images/minimap_level.png",
  "images/minimap_level_disabled.png",
  "images/minimap_virus_0.png",
  "images/minimap_virus_1.png",
  "images/minimap_virus_2.png",
  "images/minimap_virus_3.png",
  "images/minimap_virus_4.png",

  "images/menu_home_button.png",
  "images/menu_music_range_full.png",
  "images/menu_music_range_middle.png",
  "images/menu_music_range_disabled.png",
  "images/menu_sound_range_full.png",
  "images/menu_sound_range_middle.png",
  "images/menu_sound_range_disabled.png",
  "images/menu_fullscreen_button.png",
  "images/menu_fullscreen_button_disabled.png",
  "images/menu_subtitles_button.png",
  "images/menu_subtitles_button_disabled.png",
  "images/menu_playcurious_logo.png",
  "images/menu_back_button.png",
  "images/menu_background.png",
  "images/menu_title.png",

  "images/bonus_swap.png",
  "images/bonus_heal.png",
  "images/bonus_time.png",
  "images/bonus_swap_disabled.png",
  "images/bonus_heal_disabled.png",
  "images/bonus_time_disabled.png",

  "images/hole.png",
  "images/bubble.png",

  "images/infection_red.png",
  "images/infection_blue.png",
  "images/infection_green.png",
  "images/infection_yellow.png",

  "images/nucleotide_glow.png",
  "images/nucleotide_bright.png",

  "images/particle.png",

  "images/hud_bonus_background.png",
  "images/hud_action_button.png",
  "images/hud_action_button_crunch.png",
  "images/hud_action_button_disabled.png",
  "images/hud_missing_scissors.png",
  "images/hud_menu_button.png",
  "images/hud_gauge_background.png",
  "images/hud_gauge_bar.png",
  "images/hud_gauge_ring.png",
  "images/hud_gauge_ring_disabled.png",

  "images/popup_background.png",
  "images/popup_background_bis.png",
  "images/popup_background_rounded.png",

  "images/icon.png",
  "images/icon_freeze.png",
  "images/icon_heal.png",
  "images/icon_infection.png",
  "images/icon_scissors.png",
  "images/icon_timed.png",

  "images/reward_stars_0.png",
  "images/reward_stars_1.png",
  "images/reward_stars_2.png",
  "images/reward_stars_3.png",
  "images/reward_title.png",
  "images/reward_check.png",
  "images/reward_cross.png",

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
  "images/scissors_mini.json",
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

const fontAssets = [
  "Cardenio Modern Bold",
  "Cardenio Modern Regular",
  "Alien League",
  "Geosans Light",
];

const fxAssets = [
  "notification",
  "virus_move",
  "virus_sting",
  "virus_death",
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
  "spawn",
  "skip",
  "bonus_pick",
  "bonus_swap",
  "bonus_time",
  "validate",
  "tile_red",
  "tile_green",
  "tile_yellow",
  "tile_blue",
  "tile_scissors",
];

const musicAssets = ["menu", "time_challenge", "turn_by_turn", "zen"];

const entityInstallers: ((
  rootConfig: entity.EntityConfig,
  rootEntity: entity.Entity
) => unknown)[] = [
  audio.installJukebox,
  audio.installFxMachine,
  // booyah.makeInstallMenu({
  //   menuButtonPosition: new PIXI.Point(crispr.width - 111, 106),
  // }),
];

booyah.go({
  states: gameStates,
  entityInstallers,
  screenSize: new PIXI.Point(crispr.width, crispr.height),
  graphicalAssets,
  musicAssets,
  fontAssets,
  fxAssets,
  splashScreen: "images/titlescreen_background.png",
  graphics: {
    //menu: "images/hud_menu_button.png",
    play: "images/titlescreen_play_button.png",
  },
  loader: {
    position: {
      x: crispr.width / 2,
      y: crispr.height * 0.7,
    },
    scale: 3,
  },
});
