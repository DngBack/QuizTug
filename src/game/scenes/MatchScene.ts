import Phaser from "phaser";
import { EventBus } from "../EventBus";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import type { RoomSnapshot } from "@/types/room";
import type { RoundResultPayload } from "@/types/events";

const ROPE_BAR_WIDTH = 400;
const ROPE_BAR_HEIGHT = 24;
const ROPE_MIN = -100;
const ROPE_MAX = 100;
const CHAR_SIZE = 28;
const CHAR_Y = 180;

export default class MatchScene extends Phaser.Scene {
  private ropePos = 0;
  private ropeBar!: Phaser.GameObjects.Graphics;
  private ropeIndicator!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private questionText!: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Text[] = [];
  private teamAChars: Phaser.GameObjects.Rectangle[] = [];
  private teamBChars: Phaser.GameObjects.Rectangle[] = [];
  private overlay!: Phaser.GameObjects.Rectangle;
  private serverStartTs = 0;
  private timeLimitSec = 10;
  private timerRunning = false;
  private roundLocked = false;
  private currentRoundId: string | null = null;
  private roomCode = "";
  private playerId = "";
  private isPlayerTeamA = false;
  private onSubmitAnswer: (roundId: string, choice: string) => void = () => {};
  private onSnapshotUpdate: (snap: RoomSnapshot) => void = () => {};

  constructor() {
    super({ key: "Match" });
  }

  init(data: { roomCode?: string; playerId?: string; snapshot?: RoomSnapshot; onSubmitAnswer?: (roundId: string, choice: string) => void; onSnapshotUpdate?: (snap: RoomSnapshot) => void }) {
    this.roomCode = data.roomCode ?? "";
    this.playerId = data.playerId ?? "";
    this.onSubmitAnswer = data.onSubmitAnswer ?? (() => {});
    this.onSnapshotUpdate = data.onSnapshotUpdate ?? (() => {});
    if (data.snapshot) {
      const me = data.snapshot.players.find((p) => p.id === this.playerId);
      const teamA = data.snapshot.teams.find((t) => t.name === "A");
      this.isPlayerTeamA = !!(me?.team_id && teamA && me.team_id === teamA.id);
      this.applySnapshot(data.snapshot);
    }
  }

  create() {
    const centerX = GAME_WIDTH / 2;
    const barY = 80;

    this.ropeBar = this.add.graphics();
    this.drawRopeBar(barY);

    this.ropeIndicator = this.add.rectangle(centerX, barY + ROPE_BAR_HEIGHT / 2, 12, ROPE_BAR_HEIGHT - 4, 0xffdd00);
    this.ropeIndicator.setDepth(1);

    for (let i = 0; i < 3; i++) {
      const x = 80 + i * 36;
      const r = this.add.rectangle(x, CHAR_Y, CHAR_SIZE, CHAR_SIZE, 0x22aa22);
      this.teamAChars.push(r);
    }
    for (let i = 0; i < 3; i++) {
      const x = GAME_WIDTH - 80 - i * 36;
      const r = this.add.rectangle(x, CHAR_Y, CHAR_SIZE, CHAR_SIZE, 0xaa2222);
      this.teamBChars.push(r);
    }

    this.overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0xff0000).setAlpha(0).setDepth(100).setInteractive();

    this.timerText = this.add.text(centerX, 130, "0:00", { fontSize: "24px", color: "#fff" }).setOrigin(0.5);

    this.questionText = this.add.text(centerX, 260, "Waiting for question…", { fontSize: "18px", color: "#eee", wordWrap: { width: GAME_WIDTH - 80 }, align: "center" }).setOrigin(0.5);

    const choiceLabels = ["A", "B", "C", "D"];
    this.choiceButtons = choiceLabels.map((label, i) => {
      const btn = this.add
        .text(centerX, 360 + i * 48, `${label}.`, { fontSize: "18px", color: "#ccc", backgroundColor: "#444", padding: { x: 12, y: 8 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.on("pointerdown", () => this.handleChoice(label.toLowerCase()));
      return btn;
    });

    EventBus.on("ROOM_SNAPSHOT", (snap: unknown) => this.applySnapshot(snap as RoomSnapshot));
    EventBus.on("ROUND_RESULT", (payload: unknown) => this.onRoundResult(payload as RoundResultPayload));
    EventBus.on("ROUND_LOCK", () => { this.roundLocked = true; });
    EventBus.on("ANSWER_ACK", (payload: unknown) => this.onAnswerAck(payload as { isCorrect: boolean }));
  }

  private onAnswerAck(payload: { isCorrect: boolean }) {
    if (payload.isCorrect) {
      this.playPullHit();
      this.ropeJerk();
      this.cameraShake();
      this.floatingText("+PULL", 0x88ff88);
    } else {
      this.showWrongOverlay();
      this.playStun();
    }
  }

  private playPullHit() {
    const frontA = this.teamAChars[this.teamAChars.length - 1];
    const frontB = this.teamBChars[this.teamBChars.length - 1];
    [frontA, frontB].forEach((c) => {
      this.tweens.add({ targets: c, scaleX: 1.3, scaleY: 1.3, duration: 80, yoyo: true, ease: "Power2" });
    });
  }

  private ropeJerk() {
    const barY = 80;
    const baseX = (GAME_WIDTH - ROPE_BAR_WIDTH) / 2 + ROPE_BAR_WIDTH / 2 + (this.ropePos / 100) * (ROPE_BAR_WIDTH / 2);
    this.tweens.add({
      targets: this.ropeIndicator,
      x: baseX + 15,
      duration: 60,
      yoyo: true,
      ease: "Power2",
      onComplete: () => {
        this.ropeIndicator.x = baseX;
      },
    });
  }

  private cameraShake() {
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      scrollX: 4,
      duration: 40,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        cam.scrollX = 0;
      },
    });
  }

  private floatingText(text: string, color: number) {
    const t = this.add.text(GAME_WIDTH / 2, CHAR_Y - 40, text, { fontSize: "20px", color: "#ffffff" }).setOrigin(0.5).setTint(color);
    this.tweens.add({ targets: t, y: CHAR_Y - 80, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }

  private showWrongOverlay() {
    this.overlay.setAlpha(0.25);
    this.time.delayedCall(2000, () => {
      this.tweens.add({ targets: this.overlay, alpha: 0, duration: 300 });
    });
  }

  private playStun() {
    const chars = this.isPlayerTeamA ? this.teamAChars : this.teamBChars;
    chars.forEach((c) => {
      this.tweens.add({ targets: c, alpha: 0.4, duration: 200 });
      this.time.delayedCall(2000, () => {
        this.tweens.add({ targets: c, alpha: 1, duration: 200 });
      });
    });
  }

  private drawRopeBar(barY: number) {
    const g = this.ropeBar;
    g.clear();
    g.fillStyle(0x444444, 1);
    g.fillRoundedRect((GAME_WIDTH - ROPE_BAR_WIDTH) / 2, barY, ROPE_BAR_WIDTH, ROPE_BAR_HEIGHT, 4);
    g.fillStyle(0x226622, 0.6);
    const leftW = ((this.ropePos - ROPE_MIN) / (ROPE_MAX - ROPE_MIN)) * (ROPE_BAR_WIDTH / 2);
    g.fillRect((GAME_WIDTH - ROPE_BAR_WIDTH) / 2, barY, ROPE_BAR_WIDTH / 2 + leftW - 2, ROPE_BAR_HEIGHT);
    g.fillStyle(0x662222, 0.6);
    g.fillRect(GAME_WIDTH / 2 + leftW + 2, barY, ROPE_BAR_WIDTH / 2 - leftW - 2, ROPE_BAR_HEIGHT);
  }

  private applySnapshot(snap: RoomSnapshot) {
    const prevRope = this.ropePos;
    this.ropePos = snap.rope_pos;
    const barY = 80;
    this.drawRopeBar(barY);
    const targetX = (GAME_WIDTH - ROPE_BAR_WIDTH) / 2 + ROPE_BAR_WIDTH / 2 + (this.ropePos / 100) * (ROPE_BAR_WIDTH / 2);
    if (prevRope !== this.ropePos) {
      this.tweens.add({ targets: this.ropeIndicator, x: targetX, duration: 500, ease: "Power2" });
    } else {
      this.ropeIndicator.x = targetX;
    }

    if (snap.round?.question && snap.round.state === "answering") {
      this.currentRoundId = snap.round.id;
      this.questionText.setText(snap.round.question.prompt);
      const labels = ["A", "B", "C", "D"];
      const keys = ["a", "b", "c", "d"] as const;
      keys.forEach((k, i) => {
        if (this.choiceButtons[i]) this.choiceButtons[i].setText(`${labels[i]}. ${snap.round!.question!.choices[k]}`);
      });
      this.roundLocked = false;
      if (snap.round.started_at) {
        this.serverStartTs = new Date(snap.round.started_at).getTime();
        this.timeLimitSec = snap.time_limit;
        this.timerRunning = true;
      }
    } else if (snap.round?.state === "locked" || snap.round?.state === "scored" || snap.round?.state === "revealed") {
      this.roundLocked = true;
      this.timerRunning = false;
    }

    if (snap.state === "finished") {
      EventBus.emit("MATCH_END", snap);
    }
  }

  private onRoundResult(payload: RoundResultPayload) {
    this.ropePos = payload.ropePos;
    this.tweens.add({
      targets: this.ropeIndicator,
      x: (GAME_WIDTH - ROPE_BAR_WIDTH) / 2 + ROPE_BAR_WIDTH / 2 + (this.ropePos / 100) * (ROPE_BAR_WIDTH / 2),
      duration: 500,
      ease: "Power2",
    });
    this.drawRopeBar(80);
    this.timerRunning = false;
  }

  private handleChoice(choice: string) {
    if (this.roundLocked || !this.currentRoundId) return;
    this.onSubmitAnswer(this.currentRoundId, choice);
    this.roundLocked = true;
  }

  update(_t: number, dt: number) {
    if (!this.timerRunning || this.roundLocked) return;
    const elapsed = (Date.now() - this.serverStartTs) / 1000;
    const remaining = Math.max(0, this.timeLimitSec - elapsed);
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    this.timerText.setText(`${m}:${s.toString().padStart(2, "0")}`);
    if (remaining <= 0) this.timerRunning = false;
  }
}
