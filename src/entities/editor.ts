export class EditorDOM {
  private get _divEditor(): HTMLDivElement {
    return document.getElementById("editor") as HTMLDivElement;
  }

  constructor() {
    this._divEditor.innerHTML = "";

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
      document.createElement("br"),
      document.createElement("br")
    );

    let checkboxPortal = document.createElement("input");
    checkboxPortal.setAttribute("type", "checkbox");
    checkboxPortal.id = "checkboxPortal";
    checkboxPortal.onchange = (e: Event) => {
      if (checkboxPortal.checked && radioPortal.checked)
        radioCell.checked = true;
      radioPortal.checked = false;
      radioPortal.disabled = checkboxPortal.checked;
    };
    let checkboxClip = document.createElement("input");
    checkboxClip.setAttribute("type", "checkbox");
    checkboxClip.id = "checkboxClip";
    checkboxClip.onchange = (e: Event) => {
      if (checkboxClip.checked && radioClip.checked) radioCell.checked = true;
      radioClip.checked = false;
      radioClip.disabled = checkboxClip.checked;
    };

    let labelcheckboxPortal = document.createElement("label");
    labelcheckboxPortal.setAttribute("for", "checkboxPortal");
    labelcheckboxPortal.innerHTML = "Random Portals";
    let labelCheckboxClip = document.createElement("label");
    labelCheckboxClip.setAttribute("for", "checkboxClip");
    labelCheckboxClip.innerHTML = "Random Clips";

    this._divEditor.append(
      checkboxPortal,
      labelcheckboxPortal,
      document.createElement("br"),
      checkboxClip,
      labelCheckboxClip
    );

    document.body.append(this._divEditor);
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
}
