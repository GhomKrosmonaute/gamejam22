import * as l from "../scenes/level";

import * as grid from "./grid";
import * as nucleotide from "./nucleotide";

export class EditorDOM {
  private get _divEditor(): HTMLDivElement {
    return document.getElementById("editor") as HTMLDivElement;
  }

  constructor(level: l.Level) {
    this._divEditor.innerHTML = "";

    this._divEditor.append(this.separator);

    {
      const reloadButton = document.createElement("input");
      reloadButton.setAttribute("type", "submit");
      reloadButton.setAttribute("value", "Reload");
      reloadButton.onclick = (e) => {
        level.emitLevelEvent("triggerHook", "reload grid");
      };
      this._divEditor.append(reloadButton);
    }

    this._divEditor.append(this.separator);

    {
      const div = document.createElement("div");

      div.innerHTML = `
        <input name="type" type="radio" value="random"> Random color <br>
        <input name="type" type="radio" value="hole"> Hole <br>
        <input name="type" type="radio" value="portal"> Portal <br>
        <input name="type" type="radio" value="clip"> Clip
      `;

      this._divEditor.append(div);
    }

    this._divEditor.append(this.separator);

    {
      let gridTextArea = document.createElement("textarea");
      gridTextArea.id = "gridTextArea";
      gridTextArea.name = "gridTextArea";
      gridTextArea.rows = 25;
      gridTextArea.cols = 70;
      gridTextArea.disabled = true;
      this._divEditor.append(gridTextArea);
    }

    document.body.append(this._divEditor);
  }

  get separator(): HTMLElement {
    return document.createElement("hr");
  }

  getCurrentType(): keyof typeof nucleotide.NucleotideSignatures {
    const radioButtons = Array.from(
      document.querySelectorAll("input[name='type'][type='radio']")
    ) as HTMLInputElement[];
    return (
      (Array.from(radioButtons).find((radioButton) => {
        return radioButton.checked;
      }).value as keyof typeof nucleotide.NucleotideSignatures) ?? "random"
    );
  }

  ShowArrays(
    gridShape: grid.GridArrayShape<keyof typeof nucleotide.NucleotideSignatures>
  ) {
    this._divEditor.querySelector("textarea").innerHTML = JSON.stringify(
      gridShape
    );
  }
}
