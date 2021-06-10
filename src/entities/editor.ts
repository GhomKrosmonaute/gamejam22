import * as entity from "booyah/src/entity";

import * as l from "../scenes/level";

import * as grid from "./grid";
import * as nucleotide from "./nucleotide";

export class EditorDOM extends entity.EntityBase {
  private get _divEditor(): HTMLDivElement {
    return document.getElementById("editor") as HTMLDivElement;
  }

  constructor(
    public level: l.Level,
    public gridShape: grid.GridArrayShape<
      keyof typeof nucleotide.NucleotideSignatures
    >
  ) {
    super();

    this._divEditor.innerHTML = "";

    this._divEditor.append(this.separator);

    {
      const reloadButton = document.createElement("input");

      reloadButton.setAttribute("type", "submit");
      reloadButton.setAttribute("value", "Reload");

      reloadButton.onclick = () => {
        level.emitLevelEvent("triggerHook", "reload grid");
      };

      this._divEditor.append(reloadButton);
    }

    this._divEditor.append(this.separator);

    {
      const bigCheckbox = document.createElement("input");
      bigCheckbox.setAttribute("type", "checkbox");
      bigCheckbox.setAttribute("name", "bigCheckbox");
      bigCheckbox.id = "bigCheckbox";

      const bigCheckboxLabel = document.createElement("label");
      bigCheckboxLabel.setAttribute("for", "bigCheckbox");
      bigCheckboxLabel.innerHTML = "Big Brush";

      this._divEditor.append(bigCheckbox, bigCheckboxLabel);
    }

    this._divEditor.append(this.separator);

    {
      const flex = document.createElement("div");

      flex.style.display = "flex";
      flex.style.width = "100vw";

      {
        const radios = document.createElement("div");

        radios.style.width = "40vh";

        radios.innerHTML = `
          <label><input name="type" type="radio" value="random"> Random color </label><br>
          <label><input name="type" type="radio" value="hole"> Hole </label><br>
          <label><input name="type" type="radio" value="portal"> Portal </label><br>
          <label><input name="type" type="radio" value="clip"> Clip </label><br>
          <label><input name="type" type="radio" value="joker"> Joker </label><br>
          <label><input name="type" type="radio" value="red"> Red </label><br>
          <label><input name="type" type="radio" value="green"> Green </label><br>
          <label><input name="type" type="radio" value="blue"> Blue </label><br>
          <label><input name="type" type="radio" value="yellow"> Yellow </label><br>
        `;

        flex.append(radios);
      }

      {
        const put = document.createElement("textarea");
        const warn = document.createElement("div");

        warn.style.padding = "20px";
        warn.style.fontSize = "20px";
        warn.style.color = "red";

        put.id = "gridTextArea";
        put.name = "gridTextArea";
        put.cols = 50;

        put.onblur = (event) => {
          const value = put.value;
          let json: any;

          try {
            json = JSON.parse(value.replace(/null/g, '"hole"'));
            warn.innerHTML = "";
          } catch (err) {
            warn.innerHTML = err.message;
            return;
          }

          if (!grid.isGridArrayShape(json)) {
            warn.innerHTML +=
              (warn.innerHTML ? "<hr>" : "") + "Invalid gridShape given.";
            return;
          }

          while (json.length < 7) json.push(new Array(7).fill("hole"));
          json[6] = json[6].map((val, i) => (i % 2 === 0 ? null : val));

          this.gridShape = json;

          this.refreshOutput();

          this.level.emitLevelEvent("triggerHook", "reload grid", json);
        };

        flex.append(put, warn);
      }

      this._divEditor.append(flex);
    }

    document.body.append(this._divEditor);
  }

  _setup() {}

  _update() {
    const hovered = this.level.grid.getHovered();

    this.level.grid.nucleotides.forEach((n) => {
      if (n) n.highlighted = false;
    });

    if (hovered) {
      hovered.highlighted = true;
      if (this.getBigCheckbox()) {
        const neighbours = this.level.grid.getNeighbors(hovered);
        neighbours.forEach((n) => {
          if (n) n.highlighted = true;
        });
      }
    }
  }

  get separator(): HTMLElement {
    return document.createElement("hr");
  }

  getBigCheckbox(): boolean {
    const bigCheckbox = document.querySelector<HTMLInputElement>(
      "input[name='bigCheckbox'][type='checkbox']"
    );
    return bigCheckbox.checked;
  }

  getCurrentSignature(): keyof typeof nucleotide.NucleotideSignatures {
    const radioButtons = Array.from(
      document.querySelectorAll("input[name='type'][type='radio']")
    ) as HTMLInputElement[];
    return (
      (Array.from(radioButtons).find((radioButton) => {
        return radioButton.checked;
      })?.value as keyof typeof nucleotide.NucleotideSignatures) ?? "random"
    );
  }

  refreshOutput() {
    const put = this._divEditor.querySelector("textarea");

    const displayedGridShape = JSON.stringify(this.gridShape).replace(
      /"hole"/g,
      "null"
    );

    put.innerHTML = displayedGridShape;
    put.value = displayedGridShape;
  }
}
