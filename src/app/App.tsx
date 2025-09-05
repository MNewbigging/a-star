import "./app.scss";

import React from "react";

import { AppState } from "./app-state";
import { LoadingScreen } from "../ui/loading-screen/loading-screen";
import { GameScreen } from "../ui/game-screen/game-screen";
import { useEventUpdater } from "../events/use-event-updater";

interface AppProps {
  appState: AppState;
}

export const App: React.FC<AppProps> = ({ appState }) => {
  useEventUpdater("game-started");

  const started = appState.started;
  const gameState = appState.gameState;

  return (
    <div className="ui-root">
      {!started && <LoadingScreen appState={appState} />}
      {gameState && <GameScreen gameState={gameState} />}
    </div>
  );
};
