import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";

import Level from "./scenes/level";

export const width = 1080;
export const height = 1920;
export const size = new PIXI.Point(width, height);

class LevelMenu extends entity.EntityBase {
  private container: PIXI.Container;

  _setup(): void {
    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);

    this.container.addChild(
      this._makeButton(
        "Turn-based",
        new PIXI.Point(this._entityConfig.app.view.width / 2, 400),
        () => (this._transition = entity.makeTransition("turnBased"))
      )
    );
    this.container.addChild(
      this._makeButton(
        "Continuous",
        new PIXI.Point(this._entityConfig.app.view.width / 2, 600),
        () => (this._transition = entity.makeTransition("continuous"))
      )
    );
    this.container.addChild(
      this._makeButton(
        "Long",
        new PIXI.Point(this._entityConfig.app.view.width / 2, 800),
        () => (this._transition = entity.makeTransition("long"))
      )
    );
  }

  _teardown(): void {
    this._entityConfig.container.removeChild(this.container);
  }

  private _makeButton(
    text: string,
    position: PIXI.Point,
    callback: (...args: any) => void
  ): PIXI.DisplayObject {
    const button: PIXI.Container & { text?: PIXI.Text } = new PIXI.Container();
    button.position.copyFrom(position);
    button.interactive = true;
    button.buttonMode = true;
    this._on(button, "pointerup", callback);

    const bg = new PIXI.Graphics()
      .beginFill(0xaaaaaa)
      .drawRect(-250, -50, 500, 100)
      .endFill();

    button.addChild(bg);

    button.text = new PIXI.Text(text, {
      fill: "#000000",
      fontSize: "50px",
    });
    button.text.anchor.set(0.5);
    button.addChild(button.text);

    return button;
  }
}

const gameStates = {
  start: new LevelMenu(),
  turnBased: new Level("turnBased"),
  continuous: new Level("continuous"),
  long: new Level("long"),
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
  "images/bonus_star.png",
  "images/bonus_kill.png",
  "images/infection_red.png",
  "images/infection_blue.png",
  "images/infection_green.png",
  "images/infection_yellow.png",
  "images/hud_bonus_background.png",
  "images/hud_go_button.png",
  "images/hud_gauge_background.png",
  "images/hud_gauge_bar.png",
  "images/hud_gauge_foreground.png",
  "images/path_point_to_0.png",
  "images/path_point_to_1.png",
  "images/path_point_to_2.png",
  "images/path_point_to_3.png",
  "images/path_point_to_4.png",
  "images/path_point_to_5.png",

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
];

const fontAssets = ["Cardenio Modern Bold", "Cardenio Modern Regular"];

const entityInstallers: any = [
  // audio.installJukebox,
  // audio.installFxMachine,
  booyah.makeInstallMenu({ menuButtonPosition: new PIXI.Point(width, 0) }),
];

booyah.go({
  states: gameStates,
  //@ts-ignore
  transitions: gameTransitions,
  entityInstallers,
  screenSize: new PIXI.Point(width, height),
  graphicalAssets,
  fontAssets,
  graphics: {
    menu: "images/hud_menu_button.png",
  },
});
