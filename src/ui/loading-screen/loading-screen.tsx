import "./loading-screen.scss";
import React from "react";
import { Spinner } from "@blueprintjs/core";
import { SpinnerSize } from "@blueprintjs/core/lib/esm/components";

import { AppState } from "../../app/app-state";
import { useEventUpdater } from "../../events/use-event-updater";

interface LoadingScreenProps {
  appState: AppState;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ appState }) => {
  useEventUpdater("game-loaded");

  const loaded = appState.loaded;

  return (
    <div className="loading-screen">
      {!loaded && <Spinner size={SpinnerSize.LARGE} />}

      {loaded && (
        <div className="start-button" onClick={appState.startGame}>
          Start
        </div>
      )}
    </div>
  );
};
