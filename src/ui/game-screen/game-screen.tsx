import { Button } from "@blueprintjs/core";
import { GameState } from "../../game/game-state";
import "./game-screen.scss";
import React from "react";
import { useEventUpdater } from "../../events/use-event-updater";
import { AgentDetails } from "./agent-details/agent-details";

interface GameScreenProps {
  gameState: GameState;
}

export const GameScreen: React.FC<GameScreenProps> = ({ gameState }) => {
  useEventUpdater("can-set-destination-change", "selected-agent-change");

  const selectedAgent = gameState.selectedAgent;

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

      {selectedAgent && (
        <AgentDetails agent={selectedAgent} gameState={gameState} />
      )}

      {/* {showSetDestination && (
        <Button
          className="button"
          text="Set Destination"
          icon="route"
          onClick={(e) => {
            e.stopPropagation();
            gameState.onSetDestination();
          }}
        />
      )} */}
    </div>
  );
};
