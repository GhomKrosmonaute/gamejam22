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

      reloadButton.onclick = () => {
        level.emitLevelEvent("triggerHook", "reload grid");
      };

      this._divEditor.append(reloadButton);
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
        let output = document.createElement("textarea");

        output.id = "gridTextArea";
        output.name = "gridTextArea";
        output.disabled = true;
        output.cols = 50;

        flex.append(output);
      }

      this._divEditor.append(flex);
    }

    document.body.append(this._divEditor);
  }

  get separator(): HTMLElement {
    return document.createElement("hr");
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

  refreshOutput(
    gridShape: grid.GridArrayShape<keyof typeof nucleotide.NucleotideSignatures>
  ) {
    this._divEditor.querySelector("textarea").innerHTML = JSON.stringify(
      gridShape
    ).replace(/"hole"/g, "null");
  }
}
