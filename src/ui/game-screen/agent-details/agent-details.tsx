import { Button, Card, Text } from "@blueprintjs/core";
import { Agent } from "../../../game/agent";
import "./agent-details.scss";
import { GameState } from "../../../game/game-state";

interface AgentDetailsProps {
  agent: Agent;
  gameState: GameState;
}

export function AgentDetails({ agent, gameState }: AgentDetailsProps) {
  return (
    <div className="agent-details">
      <Card className="agent-card">
        <Text>Agent #1</Text>
        <Button
          className="button"
          text="Set Destination"
          icon="route"
          onClick={(e) => {
            e.stopPropagation();
            gameState.onSetAgentDestination();
          }}
        />
      </Card>
    </div>
  );
}
