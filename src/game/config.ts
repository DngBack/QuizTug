export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  backgroundColor: "#2d2d2d",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [] as Phaser.Types.Scenes.SettingsConfig[],
  physics: { default: "arcade" },
};
