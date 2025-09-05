import { GameState } from "../game/game-state";
import { AssetManager } from "../game/asset-manager";
import { eventUpdater } from "../events/event-updater";

export class AppState {
  loaded = false;
  started = false;

  gameState?: GameState;

  private assetManager = new AssetManager();

  constructor() {
    // Give loading UI time to mount
    setTimeout(() => this.loadGame(), 10);
  }

  startGame = () => {
    this.gameState = new GameState(this.assetManager);
    this.started = true;
    eventUpdater.fire("game-started", null);
  };

  private async loadGame() {
    this.assetManager.load().then(this.onLoad);
  }

  private onLoad = () => {
    this.loaded = true;
    eventUpdater.fire("game-loaded", null);
  };
}
