import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import type { RoomSnapshot } from "@/types/room";

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: "Result" });
  }

  init(data: { snapshot?: RoomSnapshot }) {
    const snap = data.snapshot;
    const winner = snap && Math.abs(snap.rope_pos) >= 100 ? (snap.rope_pos >= 100 ? "A" : "B") : null;
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, winner ? `Team ${winner} wins!` : "Match over", { fontSize: "32px", color: "#fff" }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Final rope: ${snap?.rope_pos ?? 0}`, { fontSize: "20px", color: "#ccc" }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, "Back to home (close or refresh)", { fontSize: "16px", color: "#888" }).setOrigin(0.5);
  }

  create() {}
}
