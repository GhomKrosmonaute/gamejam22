import {
  FunctionCallEntity,
  CompositeEntity,
  EntitySequence,
  WaitingEntity,
} from "booyah/src/entity";
import { Container, Sprite, Text } from "pixi.js";
import { Detective_se_leve_et_marche } from "./detective_se_leve_et_marche";

export class Detective_assis_recois_appel extends CompositeEntity {
  container: Container;
  background: Sprite;
  chapeau: Sprite;
  pipe: Sprite;
  dring: Sprite;

  _setup() {
    this.container = new Container();

    this.background = new Sprite(
      this._entityConfig.app.loader.resources[
        "images/Plan_appart_inspecteur_1.png"
      ].texture
    );
    this.background.width = 1920;
    this.background.height = 1080;

    this.chapeau = new Sprite(
      this._entityConfig.app.loader.resources["images/chapeau.webp"].texture
    );
    this.chapeau.scale.set(0.5);
    this.chapeau.anchor.set(0.5);
    this.chapeau.position.set(600, 500);

    this.pipe = new Sprite(
      this._entityConfig.app.loader.resources["images/pipe.png"].texture
    );
    this.pipe.scale.set(-0.04, 0.04);
    this.pipe.anchor.set(0.5);
    this.pipe.position.set(900, 650);
    this.pipe.angle = -30;

    this.container.addChild(this.background, this.chapeau, this.pipe);

    this._entityConfig.container.addChild(this.container);

    this.start();
  }

  _update() {
    this.pipe.position.y = 650 + Math.cos(Date.now() / 500) * 15;
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
  }

  start() {
    this._entityConfig.jukebox.play("gamejam22");

    const dring = new Sprite(
      this._entityConfig.app.loader.resources["images/dring.png"].texture
    );
    dring.position.set(500, 50);

    const text = new Text("");
    text.scale.set(2);
    text.anchor.set(0.5);
    text.position.set(1920 / 2, 200);

    this._activateChildEntity(
      new EntitySequence([
        new WaitingEntity(2000),
        new FunctionCallEntity(() => {
          this.container.addChild(dring);
          this._entityConfig.fxMachine.play("dring");
        }),
        new WaitingEntity(2000),
        new FunctionCallEntity(() => {
          this.container.removeChild(dring);
        }),
        new WaitingEntity(2000),
        new FunctionCallEntity(() => {
          text.text = "Inspecteur Manstik de Racoon city a l'appareil";
          this.container.addChild(text);
        }),
        new WaitingEntity(4000),
        new FunctionCallEntity(() => {
          this.container.removeChild(text);
        }),
        new WaitingEntity(500),
        new FunctionCallEntity(() => {
          // todo: ajouter une bulle (#@!&)
          this._entityConfig.fxMachine.play("bwa");
        }),
        new WaitingEntity(4000),
        new FunctionCallEntity(() => {
          text.text =
            "Très bien je vais enquêter sur cette soi disante disparition mystérieuse.";
          this.container.addChild(text);
        }),
        new WaitingEntity(5000),
        new FunctionCallEntity(() => {
          this.container.removeChild(text);
        }),
        new WaitingEntity(2000),
        new FunctionCallEntity(() => {
          this._entityConfig.monitor.switch(new Detective_se_leve_et_marche());
        }),
      ])
    );
  }
}
