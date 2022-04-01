interface JoysticksConfig {
  LEFT: { x: number; y: number };
  RIGHT: { x: number; y: number };
}

type ButtonsConfig = Record<string, number>;

class XPad {
  update: any;
  gamepad: Gamepad;
  emitters: any;
  buttons: any;
  joysticks: JoysticksConfig;
  updateInterval: any;

  constructor(
    public buttonsConfig: ButtonsConfig,
    public joysticksConfig: JoysticksConfig
  ) {
    this.emitters = {};

    this.buttons = {};

    this.joysticks = { LEFT: { x: 0, y: 0 }, RIGHT: { x: 0, y: 0 } };

    this.updateInterval = 10;

    this.on("update", () => {
      for (const name in this.buttonsConfig) {
        const index = this.buttonsConfig[name];
        const value = XPad.getButtonValue(this.gamepad.buttons[index]);
        if (this.buttons[name] !== value) {
          this.buttons[name] = value;
          this.emit("buttonUpdate", name, value, index);
          if (value === 1) this.emit("buttonPressed", name, index);
          else if (value === 0) this.emit("buttonReleased", name, index);
        }
      }

      for (const side in this.joysticksConfig) {
        // @ts-ignore
        for (const orientation in this.joysticksConfig[side]) {
          // @ts-ignore
          const index = this.joysticksConfig[side][orientation];
          const value = this.gamepad.axes[index];
          // @ts-ignore
          if (this.joysticks[side][orientation] !== value) {
            // @ts-ignore
            this.joysticks[side][orientation] = value;
            this.emit("joysticksUpdate", this.joysticks, index);
            // @ts-ignore
            this.emit(side + "joystickUpdate", this.joysticks[side], index);
          }
        }
      }
    });

    window.addEventListener("gamepadconnected", (event) => {
      if (event.gamepad.id === "xinput") {
        for (const name in this.buttonsConfig) {
          const index = this.buttonsConfig[name];
          this.buttons[name] = XPad.getButtonValue(
            event.gamepad.buttons[index]
          );
        }

        for (const side in this.joysticksConfig) {
          // @ts-ignore
          for (const orientation in this.joysticksConfig[side]) {
            // @ts-ignore
            const index = this.joysticksConfig[side][orientation];
            // @ts-ignore
            this.joysticks[side][orientation] = event.gamepad.axes[index];
          }
        }
        this.update = setInterval(
          () => this.emit("update"),
          this.updateInterval
        );
        this.gamepad = event.gamepad;
        this.emit("connected");
      }
    });

    window.addEventListener("gamepaddisconnected", (event) => {
      if (event.gamepad === this.gamepad) {
        clearInterval(this.update);
        this.gamepad = null;
        this.emit("disconnected");
      }
    });
  }

  get connected() {
    return !!this.gamepad;
  }

  on(eventName: string, callback: () => unknown) {
    if (this.emitters.hasOwnProperty(eventName))
      this.emitters[eventName].push(callback);
    else this.emitters[eventName] = [callback];
    return this;
  }

  once(eventName: string, callback: () => unknown) {
    // @ts-ignore
    callback.onlyOneTime = true;
    this.on(eventName, callback);
    return this;
  }

  emit(eventName: string, ...args: any) {
    if (this.emitters.hasOwnProperty(eventName))
      this.emitters[eventName] = this.emitters[eventName].filter(
        (callback: (...args: any) => unknown) => {
          callback(...args);
          // @ts-ignore
          return !callback.onlyOneTime;
        }
      );
    return this;
  }

  static getButtonValue(b: number | { value: number }) {
    return typeof b == "number" ? b : b.value;
  }
}

// Xbox Gamepad
export const xPad = new XPad(
  {
    A: 0,
    B: 1,
    X: 2,
    Y: 3,
    LB: 4,
    RB: 5,
    LT: 6,
    RT: 7,
    BACK: 8,
    START: 9,
    L_STICK: 10,
    R_STICK: 11,
    UP: 12,
    DOWN: 13,
    LEFT: 14,
    RIGHT: 15,
  },
  {
    LEFT: { x: 0, y: 1 },
    RIGHT: { x: 2, y: 3 },
  }
);
