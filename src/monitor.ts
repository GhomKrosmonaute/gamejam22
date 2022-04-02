import {
  CompositeEntity,
  extendConfig,
  makeTransition,
} from "booyah/src/entity";
import { Container } from "pixi.js";
import { Detective_assis_recois_appel } from "./levels/detective_assis_reçois_appel";

export class Monitor extends CompositeEntity {
  container: Container;
  level?: CompositeEntity;

  switch(level?: CompositeEntity) {
    if (!level) {
      this._transition = makeTransition();
      return;
    }

    if (this.level?.isSetup) this._deactivateChildEntity(this.level);

    this.level = level;

    this._activateChildEntity(
      level,
      extendConfig({
        container: this.container,
        monitor: this,
      })
    );
  }

  _setup() {
    this.container = new Container();

    this.switch(new Detective_assis_recois_appel());

    this._entityConfig.app.stage.addChild(this.container);
  }

  _teardown() {
    this._entityConfig.app.stage.removeChild(this.container);
  }
}
