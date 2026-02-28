import Phaser from "phaser";
import { config } from "./config";
import BootScene from "./scenes/BootScene";
import MatchScene from "./scenes/MatchScene";
import ResultScene from "./scenes/ResultScene";

export function createGame(container: string): Phaser.Game {
  return new Phaser.Game({
    ...config,
    parent: container,
    scene: [BootScene, MatchScene, ResultScene],
  });
}

export { EventBus } from "./EventBus";
