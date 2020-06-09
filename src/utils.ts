
export type NucleotideState = 'cut'|'hole'|'bonus'|'none'
export const nucleotideStates: NucleotideState[] = ['cut','hole','bonus','none']
export function getRandomNucleotideState(): NucleotideState {
  return nucleotideStates[Math.floor(Math.random()*nucleotideStates.length)]
}

export type ColorName = 'blue'|'red'|'green'|'yellow'
export const colorNames: ColorName[] = ['blue','red','green','yellow']
export function getRandomColorName(): ColorName {
  return colorNames[Math.floor(Math.random()*colorNames.length)]
}

export type GridState = "crunch" | "slide"

export function opposedIndexOf( neighborIndex: number ): number {
  let opposedNeighborIndex = neighborIndex - 3
  if(opposedNeighborIndex < 0) opposedNeighborIndex += 6
  return opposedNeighborIndex
}

export function getColorByName( name: ColorName ): number {
  switch (name) {
    case 'blue'     : return 0x247ba0
    case 'red'      : return 0xf25f5c
    case 'yellow'   : return 0xffe066
    case 'green'    : return 0x70c1b3
    default         : return 0xFFFFF
  }
}

export function dist( x1:number, y1:number, x2:number, y2:number ): number {
  return Math.hypot(x2 - x1, y2 - y1)
}

export function radians( degrees:number ): number {
  return degrees * (Math.PI/180);
}

export function getRandomSequence(): ColorName[] {
  const sequence: ColorName[] = []
  for(let i=0; i<this.pathMaxLength; i++)
    sequence.push(getRandomColorName())
  return sequence
}
