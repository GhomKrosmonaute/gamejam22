import * as uuid from "uuid";
import * as levels from "../levels";

export interface Player {
  id: string;
  crispies: number;
  inventory: string[];
  name: string;
  lastLevel: levels.LevelName;
  lastScroll: number;
}

export function getPlayer(): Player {
  const stored = localStorage.getItem("player");
  return stored
    ? JSON.parse(stored)
    : {
        crispies: 0,
        inventory: [],
        name: "Player",
        id: uuid.v4(),
        lastScroll: -9999999,
        lastLevel: null,
      };
}

export function updatePlayer(player: Partial<Player>): Player {
  const data = {
    ...getPlayer(),
    ...player,
  };
  localStorage.setItem("player", JSON.stringify(data));
  return data;
}
