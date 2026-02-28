import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "Boot" });
  }

  preload() {}

  create() {
    const raw = typeof window !== "undefined" ? (window as unknown as { __tugmindInit?: Record<string, unknown> }).__tugmindInit : undefined;
    const data = raw && typeof raw === "object" ? raw : {};
    this.scene.start("Match", data);
  }
}
