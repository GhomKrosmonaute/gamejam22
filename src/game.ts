import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as audio from "booyah/src/audio";
import * as entity from "booyah/src/entity";

import { Monitor } from "./monitor";

const gameStates: { [k: string]: entity.EntityResolvable } = {
  start: new Monitor(),
};

const gameTransitions = {
  // start: entity.makeTransition("default"),
  // writeUs: entity.makeTransition("default"),
};

const graphicalAssets: string[] = [
  "images/chapeau.webp",
  "images/character.json",
  "images/Grapin.png",
  "images/Immage_scene_arbre_demande_de_laide.png",
  "images/Immage_scene_arbre_soigner_et_aidant_le_hero.png",
  "images/Montre_2.png",
  "images/pipe.png",
  "images/Pistolet_stick.png",
  "images/Plan_appart_inspecteur_1.png",
  "images/Plan_maison_1.png",
  "images/Plan_ou_on_trouve_la_montre.png",
  "images/Plan_ou_on_trouve_la_montre_monde_vert.png",
  "images/Plan_ou_on_trouve_la_montre_monde_vert_porte_ouverte.png",
  "images/dring.png",
];

const fontAssets: FontFamily[] = [
  "Alien League",
  "Geosans Light",
  "Waffle Crisp",
  "Optimus",
];
export type FontFamily =
  | "Alien League"
  | "Geosans Light"
  | "Waffle Crisp"
  | "Optimus";

const fxAssets: string[] = ["bwa", "dring"];

const musicAssets: string[] = ["gamejam22"];

const entityInstallers: ((
  rootConfig: entity.EntityConfig,
  rootEntity: entity.Entity
) => unknown)[] = [audio.installJukebox, audio.installFxMachine];

booyah.go({
  states: gameStates,
  transitions: gameTransitions,
  entityInstallers,
  screenSize: new PIXI.Point(1920, 1080),
  graphicalAssets,
  musicAssets,
  fontAssets,
  fxAssets,
  loadingGauge: {
    position: {
      x: 1920 / 2,
      y: 1080 / 2,
    },
    scale: 2,
  },
});
