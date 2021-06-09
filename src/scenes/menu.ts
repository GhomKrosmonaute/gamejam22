import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

import * as crispr from "../crispr";

interface Settings {
  fx: number;
  music: number;
  subTitles: boolean;
  fullscreen: boolean;
}

const defaultSettings: Settings = {
  fx: 1,
  music: 1,
  subTitles: false,
  fullscreen: util.inFullscreen(),
};

const creditsOptions: Partial<booyah.CreditsEntityOptions> = {
  credits: {
    Programming: "Camille Abella",
    "Game Design": "Jesse Himmelstein",
    "Graphic Design": [
      "Naëlane Lefebvre Thillier",
      "Nawel Nenrhannou",
      "Mathieu Lim",
    ],
    Animation: ["Dilane Kerfanto", "Anthony Bastide"],
    Science: "Jake Wintermute",
    "Sound Design": "Jean-Baptiste Mar",
    "Creative Direction": "JC Letraublon",
    QA: ["Ilyes Khamassi", "Eliot Marechal"],
  },
  fontFamily: "Optimus",
  textSize: 40,
};

export class Menu extends entity.CompositeEntity {
  private settings: Settings;

  private opened: boolean;
  private container: PIXI.Container;

  private blackBackground: PIXI.Graphics;
  private background: PIXI.Sprite;
  private popupBackground: PIXI.Sprite;
  private homeButton: PIXI.Sprite;
  private menuButton: PIXI.Sprite;
  private backButton: PIXI.Sprite;
  private playCuriousLogo: PIXI.Sprite;
  private creditButton: PIXI.Text;
  private creditsEntity: booyah.CreditsEntity;
  private title: PIXI.Text;

  private fullscreenSwitcher: SpriteSwitcher;
  // private subTitleSwitcher: SpriteSwitcher;
  private musicVolumeSwitcher: SpriteSwitcher<
    Record<"0" | "0.5" | "1", string>
  >;
  private soundVolumeSwitcher: SpriteSwitcher<
    Record<"0" | "0.5" | "1", string>
  >;

  private debugPressCount: number;

  private saveSettings() {
    localStorage.setItem("settings", JSON.stringify(this.settings));
  }

  _setup() {
    const raw =
      localStorage.getItem("settings") || JSON.stringify(defaultSettings);

    this.settings = JSON.parse(raw);

    this.container = new PIXI.Container();

    this.container.visible = false;

    {
      this.blackBackground = new PIXI.Graphics()
        .beginFill()
        .drawRect(0, 0, crispr.width, crispr.height)
        .endFill();
      this.container.addChild(this.blackBackground);
    }

    {
      this.menuButton = crispr.sprite(this, "images/hud_menu_button.png");
      this.menuButton.anchor.set(1, 0);
      this.menuButton.position.set(crispr.width, 0);
      this.menuButton.buttonMode = true;
      this.menuButton.interactive = true;
      this._on(this.menuButton, "pointerup", this.open);
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

      this.playCuriousLogo.interactive = true;
      this.playCuriousLogo.buttonMode = true;
      this._on(this.playCuriousLogo, "pointertap", this._onTapPCLogo);
      this.container.addChild(this.playCuriousLogo);
    }

    {
      this.creditButton = crispr.makeText("credits", {
        fontSize: 75,
        fill: crispr.yellow,
      });
      this.creditButton.position.set(crispr.width / 2, crispr.height * 0.74);
      this.creditButton.interactive = true;
      this.creditButton.buttonMode = true;
      this._on(this.creditButton, "pointertap", this._showCredits);
      this.container.addChild(this.creditButton);

      // Credits entity starts null, and is created only when the button is pressed
      this.creditsEntity = null;
    }

    {
      this.homeButton = crispr.sprite(this, "images/menu_home_button.png");
      this.homeButton.buttonMode = true;
      this.homeButton.interactive = true;
      this._on(this.homeButton, "pointerup", () => {
        this.close();
        this._entityConfig.currentLevelHolder.level.exit();
      });
      this.container.addChild(this.homeButton);
    }

    {
      this.backButton = crispr.sprite(this, "images/menu_back_button.png");
      this.backButton.buttonMode = true;
      this.backButton.interactive = true;
      this.backButton.anchor.set(1, 0);
      this.backButton.position.set(crispr.width, 0);
      this._on(this.backButton, "pointerup", this.close);
      this.container.addChild(this.backButton);
    }

    {
      this.title = crispr.makeText("M.E.N.U", {
        fontSize: 150,
        fill: crispr.yellow,
        fontStyle: "italic bold",
        fontFamily: "Alien League",
      });
      this.title.anchor.set(0.5);
      this.title.position.set(crispr.width / 2, crispr.height / 6);
      this.container.addChild(this.title);

      // Put in "debug mode" easter egg
      this.title.interactive = true;
      this._on(this.title, "pointertap", this._onDebugPress);
    }

    if (util.supportsFullscreen()) {
      // if (false) {
      this.fullscreenSwitcher = new SpriteSwitcher(
        {
          on: "images/menu_fullscreen_button.png",
          off: "images/menu_fullscreen_button_disabled.png",
        },
        this.settings.fullscreen ? "on" : "off"
      );
      this.fullscreenSwitcher.container.position.set(-200, -200);
      this.fullscreenSwitcher.onStateChange((state) => {
        if (state === "on")
          util.requestFullscreen(document.getElementById("game-parent"));
        else if (util.inFullscreen()) util.exitFullscreen();
        this.settings.fullscreen = state === "on";
        this.saveSettings();
      });
    }

    // Currently subtitles can't be controlled
    // {
    //   this.subTitleSwitcher = new SpriteSwitcher(
    //     {
    //       on: "images/menu_subtitles_button.png",
    //       off: "images/menu_subtitles_button_disabled.png",
    //     },
    //     this.settings.subTitles ? "on" : "off"
    //   );
    //   this.subTitleSwitcher.container.position.set(200, -200);
    //   this.subTitleSwitcher.onStateChange((state) => {
    //     this._entityConfig.playOptions.setOption(
    //       "showSubtitles",
    //       state === "on"
    //     );
    //     this.settings.subTitles = state === "on";
    //     this.saveSettings();
    //   });
    // }

    {
      this.musicVolumeSwitcher = new SpriteSwitcher(
        {
          "0": "images/menu_music_range_disabled.png",
          "0.5": "images/menu_music_range_middle.png",
          "1": "images/menu_music_range_full.png",
        },
        this.settings.music ? "1" : "0",
        function (event) {
          const cursor = event.data.getLocalPosition(this.currentSprite);
          if (
            cursor.x + this.currentSprite.width / 2 <
            this.currentSprite.width * 0.4
          ) {
            this.switch("0");
          } else if (
            cursor.x + this.currentSprite.width / 2 <
            this.currentSprite.width * 0.75
          ) {
            this.switch("0.5");
          } else {
            this.switch("1");
          }
        }
      );
      this.musicVolumeSwitcher.container.position.y += 200;
      this.musicVolumeSwitcher.onStateChange((state) => {
        this._entityConfig.playOptions.setOption("musicOn", state !== "0");
        // Set volume to be 0.5 max
        const volume = Number(state) / 2;
        this.settings.music = volume;
        this._entityConfig.jukebox.changeVolume(volume);
        this.saveSettings();
      });
    }

    {
      this.soundVolumeSwitcher = new SpriteSwitcher(
        {
          "0": "images/menu_sound_range_disabled.png",
          "0.5": "images/menu_sound_range_middle.png",
          "1": "images/menu_sound_range_full.png",
        },
        this.settings.fx ? "1" : "0",
        function (event) {
          const cursor = event.data.getLocalPosition(this.currentSprite);
          if (
            cursor.x + this.currentSprite.width / 2 <
            this.currentSprite.width * 0.4
          ) {
            this.switch("0");
          } else if (
            cursor.x + this.currentSprite.width / 2 <
            this.currentSprite.width * 0.75
          ) {
            this.switch("0.5");
          } else {
            this.switch("1");
          }
        }
      );
      this.soundVolumeSwitcher.onStateChange((state) => {
        this._entityConfig.playOptions.setOption("fxOn", state !== "0");
        const volume = Number(state);
        this.settings.fx = volume;
        this._entityConfig.fxMachine.changeVolume(volume);
        this._entityConfig.fxMachine.play("note_8");
        this.saveSettings();
      });
    }

    if (this.fullscreenSwitcher) {
      this._activateChildEntity(
        this.fullscreenSwitcher,
        entity.extendConfig({
          container: this.popupBackground,
        })
      );
    }

    // this._activateChildEntity(
    //   this.subTitleSwitcher,
    //   entity.extendConfig({
    //     container: this.popupBackground,
    //   })
    // );
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
    if (this.opened) return;

    booyah.changeGameState("paused");
    this.debugPressCount = 0;

    // Displaying the menu will be done in _onSignal()
  }

  close() {
    if (!this.opened) return;

    booyah.changeGameState("playing");
    // Hiding the menu will be done in _onSignal()
  }

  _onSignal(frameInfo: entity.FrameInfo, signal: string, data?: any): void {
    if (signal === "pause" && !this.opened) {
      this.opened = true;
      this.menuButton.visible = false;
      this.container.visible = true;

      this._onOpen();
    } else if (signal === "play" && this.opened) {
      this.opened = false;
      this.menuButton.visible = true;
      this.container.visible = false;
    }
  }

  _update(frameInfo: entity.FrameInfo) {
    if (this.creditsEntity) {
      if (this.creditsEntity.transition) {
        this._deactivateChildEntity(this.creditsEntity);
        this.creditsEntity = null;
      }
    }
  }

  private _onOpen() {
    this.blackBackground.visible = !!this._entityConfig.currentLevelHolder.level
      ?.options.mustBeHiddenOnPause;
    this.homeButton.visible = !!this._entityConfig.currentLevelHolder.level;
  }

  private _showCredits() {
    this.creditsEntity = new booyah.CreditsEntity(creditsOptions);
    this._activateChildEntity(this.creditsEntity);
  }

  private _onTapPCLogo() {
    window.open("https://playcurious.games", "_blank");
  }

  private _onDebugPress() {
    if (++this.debugPressCount === 9) {
      crispr.setInDebugMode(true);
      this._entityConfig.fxMachine.play("score_ring");
    }
  }
}

export function makeInstallMenu() {
  return (
    rootConfig: entity.EntityConfig,
    rootEntity: entity.ParallelEntity
  ) => {
    rootConfig.menu = new Menu();
    rootEntity.addChildEntity(rootConfig.menu);
  };
}

/**
 * Emit:
 * - newState: keyof States
 */
export class SpriteSwitcher<
  States extends Record<string, string> = Record<"on" | "off", string>
> extends entity.EntityBase {
  public currentSprite?: PIXI.Sprite;
  public currentState?: keyof States;
  public container = new PIXI.Container();

  constructor(
    private states: States,
    private initialState?: keyof States,
    private stateController?: (
      this: SpriteSwitcher<States>,
      event: PIXI.InteractionEvent
    ) => unknown
  ) {
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
    this._once(
      this.currentSprite,
      "pointerup",
      this.stateController?.bind(this) ?? this.next.bind(this)
    );
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
