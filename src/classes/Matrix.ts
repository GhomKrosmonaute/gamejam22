import { Container, Point, Renderer, interaction } from "pixi.js";
import Nucleotide from "./Nucleotide"
import {opposedIndexOf} from "../utils";
import GridEntity from "../entities/Grid";

export default class Matrix {

  public nucleotides: Nucleotide[] = []
  public container = new Container()
  public mouseIsDown: boolean = false
  public mouseButton: 'right'|'left'

  constructor(
    public grid: GridEntity,
    public colCount: number,
    public rowCount: number,
    public cutCount: number,
    public nucleotideRadius: number
  ) {
    for (let x = 0; x < colCount; x++)
      for (let y = 0; y < rowCount; y++)
        this.nucleotides.push(
          new Nucleotide(this,new Point(x, y)))

    this.addCuts()
    this.render()
  }

  get renderer(): Renderer {
    return this.grid.entityConfig.app.renderer
  }

  get mouse(): interaction.InteractionData {
    return this.renderer.plugins.interaction.mouse
  }

  slide( neighborIndex: number ){
    const opposedNeighborIndex = opposedIndexOf(neighborIndex)
    for (const nucleotide of this.nucleotides)
      if(nucleotide.state === "hole"){
        nucleotide.generate()
        nucleotide.recursiveSwap(opposedNeighborIndex)
      }
    this.addCuts()
  }

  addCuts(){
    while (this.nucleotides.filter(n => n.state === "cut").length < this.cutCount) {
      let randomIndex
      do { randomIndex = Math.floor(Math.random() * this.nucleotides.length) }
      while (this.nucleotides[randomIndex].state === "cut")
      this.nucleotides[randomIndex].state = "cut"
    }
  }

  update() {
    for (const nucleotide of this.nucleotides)
      nucleotide.update()
  }

  render() {
    for (const nucleotide of this.nucleotides)
      nucleotide.render()
    if(!this.grid.container.children.includes(this.container))
      this.grid.container.addChild(this.container)
  }

  mouseDown(){}
  mouseUp(){}
}