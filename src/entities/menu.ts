import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

import * as crispr from "../crispr";

export class Menu extends entity.CompositeEntity {
  private opened: boolean;
  private container: PIXI.Container;

  private background: PIXI.Sprite;
  private popupBackground: PIXI.Sprite;
  private homeButton: PIXI.Sprite;
  private menuButton: PIXI.Sprite;
  private backButton: PIXI.Sprite;
  private playCuriousLogo: PIXI.Sprite;
  private creditButton: PIXI.Text;
  private title: PIXI.Text;

  private fullscreenSwitcher: SpriteSwitcher;
  private subTitleSwitcher: SpriteSwitcher;
  private musicVolumeSwitcher: SpriteSwitcher<
    Record<"0" | "0.5" | "1", string>
  >;
  private soundVolumeSwitcher: SpriteSwitcher<
    Record<"0" | "0.5" | "1", string>
  >;

  _setup() {
    this.container = new PIXI.Container();

    this.container.visible = false;

    {
      this.menuButton = crispr.sprite(this, "images/hud_menu_button.png");
      this.menuButton.anchor.set(1, 0);
      this.menuButton.position.set(crispr.width, 0);
      this.menuButton.buttonMode = true;
      this.menuButton.interactive = true;
      this._on(this.menuButton, "pointerup", this.open.bind(this));
    }

    {
      this.background = crispr.sprite(this, "images/popup_background_bis.png");
      this.background.interactive = true;
      this.container.addChild(this.background);
    }

    {
      this.popupBackground = crispr.sprite(this, "images/menu_background.png");
      this.popupBackground.anchor.set(0.5);
      this.popupBackground.position.set(crispr.width / 2, crispr.height / 2);
      this.container.addChild(this.popupBackground);
    }

    {
      this.playCuriousLogo = crispr.sprite(
        this,
        "images/menu_playcurious_logo.png"
      );
      this.playCuriousLogo.anchor.set(0.5);
      this.playCuriousLogo.position.set(crispr.width / 2, crispr.height * 0.85);
      this.container.addChild(this.playCuriousLogo);
    }

    {
      this.creditButton = crispr.makeText("credits", {
        fontSize: 75,
        fill: "#ffda6b",
      });
      this.creditButton.position.set(crispr.width / 2, crispr.height * 0.74);
      this.container.addChild(this.creditButton);
    }

    if (this._entityConfig.level) {
      this.homeButton = crispr.sprite(this, "images/menu_home_button.png");
      this.homeButton.buttonMode = true;
      this.homeButton.interactive = true;
      this._on(this.homeButton, "pointerup", () => {
        this.close();
        this._entityConfig.level.exit();
      });
      this.container.addChild(this.homeButton);
    }

    {
      this.backButton = crispr.sprite(this, "images/menu_back_button.png");
      this.backButton.buttonMode = true;
      this.backButton.interactive = true;
      this.backButton.anchor.set(1, 0);
      this.backButton.position.set(crispr.width, 0);
      this._on(this.backButton, "pointerup", this.close.bind(this));
      this.container.addChild(this.backButton);
    }

    {
      this.title = crispr.makeText("M.E.N.U", {
        fontSize: 150,
        fill: "#ffda6b",
        fontStyle: "italic bold",
        fontFamily: "Alien League",
      });
      this.title.anchor.set(0.5);
      this.title.position.set(crispr.width / 2, crispr.height / 6);
      this.container.addChild(this.title);
    }

    {
      this.fullscreenSwitcher = new SpriteSwitcher(
        {
          on: "images/menu_fullscreen_button.png",
          off: "images/menu_fullscreen_button_disabled.png",
        },
        util.inFullscreen() ? "on" : "off"
      );
      this.fullscreenSwitcher.container.position.set(-200, -200);
      this.fullscreenSwitcher.onStateChange((state) => {
        if (state === "on")
          util.requestFullscreen(document.getElementById("game-parent"));
        else if (util.inFullscreen()) util.exitFullscreen();
      });
    }

    {
      this.subTitleSwitcher = new SpriteSwitcher(
        {
          on: "images/menu_subtitles_button.png",
          off: "images/menu_subtitles_button_disabled.png",
        },
        this._entityConfig.playOptions.getOption("showSubtitles") ? "on" : "off"
      );
      this.subTitleSwitcher.container.position.set(200, -200);
      this.subTitleSwitcher.onStateChange((state) => {
        this._entityConfig.playOptions.setOption(
          "showSubtitles",
          state === "on"
        );
      });
    }

    {
      this.musicVolumeSwitcher = new SpriteSwitcher(
        {
          "0": "images/menu_music_range_disabled.png",
          "0.5": "images/menu_music_range_middle.png",
          "1": "images/menu_music_range_full.png",
        },
        this._entityConfig.playOptions.getOption("musicOn") ? "1" : "0"
      );
      this.musicVolumeSwitcher.container.position.y += 200;
      this.musicVolumeSwitcher.onStateChange((state) => {
        this._entityConfig.playOptions.setOption("musicOn", state !== "0");
      });
    }

    {
      this.soundVolumeSwitcher = new SpriteSwitcher(
        {
          "0": "images/menu_sound_range_disabled.png",
          "0.5": "images/menu_sound_range_middle.png",
          "1": "images/menu_sound_range_full.png",
        },
        this._entityConfig.playOptions.getOption("fxOn") ? "1" : "0"
      );
      this.soundVolumeSwitcher.onStateChange((state) => {
        this._entityConfig.playOptions.setOption("fxOn", state !== "0");
      });
    }

    this._activateChildEntity(
      this.fullscreenSwitcher,
      entity.extendConfig({
        container: this.popupBackground,
      })
    );
    this._activateChildEntity(
      this.subTitleSwitcher,
      entity.extendConfig({
        container: this.popupBackground,
      })
    );
    this._activateChildEntity(
      this.musicVolumeSwitcher,
      entity.extendConfig({
        container: this.popupBackground,
      })
    );
    this._activateChildEntity(
      this.soundVolumeSwitcher,
      entity.extendConfig({
        container: this.popupBackground,
      })
    );

    this._entityConfig.container.addChild(this.container);
    this._entityConfig.container.addChild(this.menuButton);
  }

  _teardown() {
    this.container.removeChildren();
    this._entityConfig.container.removeChild(this.container);
    this._entityConfig.container.removeChild(this.menuButton);
  }

  open() {
    if (this.opened) throw new Error("nope");
    booyah.changeGameState("paused");
    this.opened = true;
    this.menuButton.visible = false;
    this.container.visible = true;
  }

  close() {
    if (!this.opened) throw new Error("nope");
    booyah.changeGameState("playing");
    this.opened = false;
    this.menuButton.visible = true;
    this.container.visible = false;
  }
}

/**
 * Emit:
 * - newState: keyof States
 */
export class SpriteSwitcher<
  States extends Record<string, string> = Record<"on" | "off", string>
> extends entity.EntityBase {
  private currentSprite?: PIXI.Sprite;
  private currentState?: keyof States;
  public container = new PIXI.Container();

  constructor(private states: States, private initialState?: keyof States) {
    super();
  }

  _setup() {
    this._entityConfig.container.addChild(this.container);
    this.switch(this.initialState ?? Object.keys(this.states)[0]);
  }

  _teardown() {
    this.currentSprite = null;
    this.container.removeChildren();
    this._entityConfig.container.removeChild(this.container);
  }

  onStateChange(cb: (newState: keyof States) => unknown) {
    this._on(this, "newState", cb);
  }

  switch(stateName: keyof States) {
    this.currentState = stateName;
    this.container.removeChildren();
    this.currentSprite = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[this.states[stateName]].texture
    );
    this.currentSprite.buttonMode = true;
    this.currentSprite.interactive = true;
    this.currentSprite.anchor.set(0.5);
    this._once(this.currentSprite, "pointerup", this.next.bind(this));
    this.container.addChild(this.currentSprite);
    this.emit("newState", stateName);
  }

  next() {
    const stateNames = Object.keys(this.states);
    const newState =
      stateNames[stateNames.indexOf(this.currentState as string) + 1];
    this.switch(newState ?? stateNames[0]);
  }
}
