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
      labelClip
    );

    document.body.append(this._divEditor);
  }

  GetTypeChecked(): string {
    const children = this._divEditor.getElementsByTagName("input");
    for (var i = 0; i < children.length; i++) {
      if (children[i].checked) {
        return children[i].id.substring(5);
      }
    }
    return null;
  }
}
