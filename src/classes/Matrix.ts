import { Container, Point, Renderer, interaction } from "pixi.js";
import Nucleotide from "./Nucleotide"
import {opposedIndexOf} from "../utils";
import GridEntity from "../entities/Grid";
import Path from "./Path";

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

  getHovered(): Nucleotide | null {
    return this.nucleotides
      .find( nucleotide => nucleotide.isHovered )
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

  mouseDown(){
    const hovered = this.getHovered()
    if(hovered && (!this.grid.path || !this.grid.path.items.includes(hovered))){
      if(this.grid.state === "crunch"){
        if(hovered.state !== "cut")
          this.grid.path = new Path(this, hovered)
      }else{
        this.grid.path = new Path(this, hovered)
      }
    }
  }

  mouseUp(){
    if(this.mouseButton === "left"){
      if(this.grid.path){
        if(this.grid.path.items.length === 1) {
          const n = this.grid.path.first
          n.state = n.state === "hole" ? "none" :  "hole"
          this.grid.path = null
        }else if(this.grid.state === "slide") {
          this.grid.path.slide()
          this.grid.path = null
        }
      }
    }
  }
}