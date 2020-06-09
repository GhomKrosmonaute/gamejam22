import Nucleotide from './Nucleotide';
import Matrix from "./Matrix";
import {Graphics} from "pixi.js";
import {getRandomSequence} from "../utils";

export default class Path {

  public items: Nucleotide[] = []
  public graphics = new Graphics

  constructor(
    public matrix: Matrix,
    start: Nucleotide
  ) {
    this.items.push(start)
  }

  get length(): number {
    return this.nucleotides.length
  }

  get nucleotides(): Nucleotide[] {
    return this.items.filter(n => n.state !== "cut")
  }

  get cuts(): Nucleotide[] {
    return this.items.filter(n => n.state === "cut")
  }

  get isValidSequence(): boolean {
    const signature = this.nucleotides.map(n => n.colorName).join(',')
    return this.cuts.length >= 1 && (
      signature === this.matrix.grid.sequence.join(',') ||
      signature === this.matrix.grid.sequence.slice(0).reverse().join(',')
    )
  }

  get maxLength(): number {
    return this.matrix.grid.pathMaxLength
  }

  get first(): Nucleotide | null {
    return this.items[0]
  }

  get last(): Nucleotide | null {
    return this.items[this.items.length-1]
  }

  update(nucleotide: Nucleotide): void {

    // in crunch path case
    if(this.matrix.grid.state === "crunch"){
      // check if the current nucleotide is a wall/hole/cut
      if(this.length > 0 && nucleotide.state === "hole") return
      if(this.first.state === "hole") return
    }

    // check the cancellation & cancel to previous nucleotide
    if(
      this.items[this.items.length-2] &&
      this.items[this.items.length-2] === nucleotide
    ) {
      this.items.pop()
      return
    }

    // check if this path is terminated or not
    if(this.length >= (
      this.matrix.grid.state === "crunch" ? this.maxLength : 2
    )) return

    // check if nucleotide is already in this path
    if(this.items.includes(nucleotide)) return

    // check if the current nucleotide is a neighbor of the last checked nucleotide
    if(
      this.items[this.items.length-1] &&
      this.items[this.items.length-1].getNeighborIndex(nucleotide) === -1
    ) return null

    // push in this path the checked nucleotide
    this.items.push(nucleotide)
  }

  render(){

    let last: Nucleotide = null
    let color = this.isValidSequence ? 0xFFFFFF : 0x000000

    this.graphics.clear()

    // for all nucleotide in path
    for(const nucleotide of this.items){

      this.graphics
        .beginFill(color)
        .drawEllipse(
          nucleotide.x,
          nucleotide.y,
          nucleotide.width * .4,
          nucleotide.height * .4
        )

      if(last)
        this.graphics
          .lineStyle(5,color)
          .moveTo(last.x,last.y)
          .lineTo(nucleotide.x,nucleotide.y)

      last = nucleotide

      if(!this.matrix.grid.container.children.includes(this.graphics))
        this.matrix.grid.container.addChild(this.graphics)
    }
  }

  crunch(){
    if(this.isValidSequence){
      this.items.forEach(n => n.state = "hole")
      this.matrix.grid.sequence = getRandomSequence()
    }
  }

  slide(){
    if(!this.items[1]) return
    const neighborIndex = this.items[0].getNeighborIndex(this.items[1])
    this.matrix.slide(neighborIndex)
  }
}