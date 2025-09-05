import { Button } from "@blueprintjs/core";
import { GameState } from "../../game/game-state";
import "./game-screen.scss";
import React from "react";
import { useEventUpdater } from "../../events/use-event-updater";

interface GameScreenProps {
  gameState: GameState;
}

export const GameScreen: React.FC<GameScreenProps> = ({ gameState }) => {
  useEventUpdater("can-set-destination-change");

  const showSetDestination = gameState.canSetDestination;

  return (
    <div className="game-screen">
      <Button
        className="button"
        text="Generate Grid"
        icon="grid"
        onClick={gameState.onGenerateGrid}
      />

      <Button
        className="button"
        text="Place Agent"
        icon="walk"
        onClick={(e) => {
          e.stopPropagation();
          gameState.onPlaceAgent();
        }}
      />

      {showSetDestination && (
        <Button
          className="button"
          text="Set Destination"
          icon="route"
          onClick={(e) => {
            e.stopPropagation();
            gameState.onSetDestination();
          }}
        />
      )}
    </div>
  );
};
