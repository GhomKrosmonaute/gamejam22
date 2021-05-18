/// @ts-check
/// <reference path="../../globals.d.ts" />

import { Level } from "../scenes/level";
import { GridPresetInput, GridShapeOptions } from "./grid";

export class EditorDOM {
  private get _divEditor(): HTMLDivElement {
    return document.getElementById("editor") as HTMLDivElement;
  }

  constructor(level: Level) {
    this._divEditor.innerHTML = "";

    let reloadButton = document.createElement("input");
    reloadButton.setAttribute("type", "submit");
    reloadButton.setAttribute("value", "Reload");
    reloadButton.onclick = (e) => {
      level.emitLevelEvent("triggerHook", "reload grid");
    };

    this._divEditor.append(
      this.Backline(),
      reloadButton,
      this.Backline(),
      this.Backline()
    );

    let radioCell = document.createElement("input");
    radioCell.setAttribute("type", "radio");
    radioCell.setAttribute("name", "radioType");
    radioCell.id = "radioCell";
    radioCell.checked = true;
    let radioEmpty = document.createElement("input");
    radioEmpty.setAttribute("type", "radio");
    radioEmpty.setAttribute("name", "radioType");
    radioEmpty.id = "radioEmpty";
    let radioPortal = document.createElement("input");
    radioPortal.setAttribute("type", "radio");
    radioPortal.setAttribute("name", "radioType");
    radioPortal.id = "radioPortal";
    let radioClip = document.createElement("input");
    radioClip.setAttribute("type", "radio");
    radioClip.setAttribute("name", "radioType");
    radioClip.id = "radioClip";

    let labelCell = document.createElement("label");
    labelCell.setAttribute("for", "radioCell");
    labelCell.innerHTML = "Cell";
    let labelEmpty = document.createElement("label");
    labelEmpty.setAttribute("for", "radioEmpty");
    labelEmpty.innerHTML = "Empty";
    let labelPortal = document.createElement("label");
    labelPortal.setAttribute("for", "radioPortal");
    labelPortal.innerHTML = "Portal";
    let labelClip = document.createElement("label");
    labelClip.setAttribute("for", "radioClip");
    labelClip.innerHTML = "Clip";

    this._divEditor.append(
      radioCell,
      labelCell,
      radioEmpty,
      labelEmpty,
      radioPortal,
      labelPortal,
      radioClip,
      labelClip,
      this.Backline(),
      this.Backline()
    );

    let checkboxPortal = document.createElement("input");
    checkboxPortal.setAttribute("type", "checkbox");
    checkboxPortal.id = "checkboxPortal";
    checkboxPortal.onchange = (e: Event) => {
      if (checkboxPortal.checked && radioPortal.checked)
        radioCell.checked = true;
      radioPortal.checked = false;
      radioPortal.disabled = checkboxPortal.checked;
      inputNbrPortals.disabled = !checkboxPortal.checked;
    };
    let checkboxClip = document.createElement("input");
    checkboxClip.setAttribute("type", "checkbox");
    checkboxClip.id = "checkboxClip";
    checkboxClip.onchange = (e: Event) => {
      if (checkboxClip.checked && radioClip.checked) radioCell.checked = true;
      radioClip.checked = false;
      radioClip.disabled = checkboxClip.checked;
      inputNbrClips.disabled = !checkboxClip.checked;
    };

    let labelcheckboxPortal = document.createElement("label");
    labelcheckboxPortal.setAttribute("for", "checkboxPortal");
    labelcheckboxPortal.innerHTML = "Random Portals";
    let labelCheckboxClip = document.createElement("label");
    labelCheckboxClip.setAttribute("for", "checkboxClip");
    labelCheckboxClip.innerHTML = "Random Clips";

    let inputNbrPortals = document.createElement("input");
    inputNbrPortals.setAttribute("type", "range");
    inputNbrPortals.setAttribute("min", "0");
    inputNbrPortals.setAttribute("max", "10");
    inputNbrPortals.setAttribute("step", "2");
    inputNbrPortals.id = "inputNbrPortals";
    inputNbrPortals.disabled = true;
    inputNbrPortals.oninput = (e) =>
      (labelInputNbrPortals.innerHTML = inputNbrPortals.value);
    let inputNbrClips = document.createElement("input");
    inputNbrClips.setAttribute("type", "range");
    inputNbrClips.setAttribute("min", "0");
    inputNbrClips.setAttribute("max", "10");
    inputNbrClips.setAttribute("step", "1");
    inputNbrClips.id = "inputNbrClips";
    inputNbrClips.disabled = true;
    inputNbrClips.oninput = (e) =>
      (labelInputNbrClips.innerHTML = inputNbrClips.value);

    let labelInputNbrPortals = document.createElement("label");
    labelInputNbrPortals.setAttribute("for", "inputNbrPortals");
    labelInputNbrPortals.innerHTML = "0";
    let labelInputNbrClips = document.createElement("label");
    labelInputNbrClips.setAttribute("for", "inputNbrClips");
    labelInputNbrClips.innerHTML = "0";

    this._divEditor.append(
      checkboxPortal,
      labelcheckboxPortal,
      inputNbrPortals,
      labelInputNbrPortals,
      this.Backline(),
      checkboxClip,
      labelCheckboxClip,
      inputNbrClips,
      labelInputNbrClips,
      this.Backline(),
      this.Backline()
    );

    let gridTextArea = document.createElement("textarea");
    gridTextArea.id = "gridTextArea";
    gridTextArea.name = "gridTextArea";
    gridTextArea.rows = 25;
    gridTextArea.cols = 70;
    gridTextArea.disabled = true;

    this._divEditor.append(gridTextArea);

    document.body.append(this._divEditor);
  }

  Backline(): HTMLElement {
    return document.createElement("br");
  }

  GetRadioChecked(): string {
    const children = this._divEditor.getElementsByTagName("input");
    for (var i = 0; i < children.length; i++) {
      if (children[i].checked) {
        return children[i].id.substring(5);
      }
    }
    return null;
  }

  IsFixedPortals(): boolean {
    return !this._divEditor.querySelector<HTMLInputElement>("#checkboxPortal")
      .checked;
  }

  IsFixedClips(): boolean {
    return !this._divEditor.querySelector<HTMLInputElement>("#checkboxClip")
      .checked;
  }

  NumberOfPortals(): number {
    return parseInt(
      this._divEditor.querySelector<HTMLInputElement>("#inputNbrPortals").value
    );
  }

  NumberOfClips(): number {
    return parseInt(
      this._divEditor.querySelector<HTMLInputElement>("#inputNbrClips").value
    );
  }

  ShowArrays(gridShape: GridShapeOptions) {
    // @ts-ignore
    let shape: GridPresetInput = gridShape.shape;

    let portals = gridShape.portals;
    let clips = gridShape.clips;

    let text: string = "{\n";

    text += "    shape: [\n";
    shape.forEach((row) => {
      text += "        [";
      row.forEach((cell) => {
        text += (cell && cell !== "h" ? '"' + cell + '"' : "null") + ", ";
      });
      text = text.substring(0, text.length - 2);
      text += "],\n";
    });
    text += "    ],\n";

    if (typeof portals === "number") {
      text += "    portals: " + portals + ",\n";
    } else {
      text += "    portals: [\n";
      portals.forEach((portal) => {
        text += `        { x: ${portal.x}, y: ${portal.y} },\n`;
      });
      text += "    ],\n";
    }

    if (typeof clips === "number") {
      text += "    clips: " + clips + ",\n";
    } else {
      text += "    clips: [\n";
      clips.forEach((clip) => {
        text += `        { x: ${clip.x}, y: ${clip.y} },\n`;
      });
      text += "    ],\n";
    }

    text += "}";
    this._divEditor.querySelector("textarea").innerHTML = text;
  }
}
