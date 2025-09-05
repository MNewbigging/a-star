import { Button, Card, Text } from "@blueprintjs/core";
import { Agent } from "../../../game/agent";
import "./agent-details.scss";
import { GameState } from "../../../game/game-state";
import { useEventUpdater } from "../../../events/use-event-updater";

interface AgentDetailsProps {
  agent: Agent;
  gameState: GameState;
}

export function AgentDetails({ agent, gameState }: AgentDetailsProps) {
  useEventUpdater("agent-follow-path-change");

  return (
    <div className="agent-details">
      <Card className="agent-card">
        <Text className="name">{agent.model.name}</Text>

        {!agent.followingPath && (
          <Button
            className="button"
            icon="route"
            onClick={(e) => {
              e.stopPropagation();
              gameState.onSetAgentDestination(agent);
            }}
          />
        )}

        {agent.followingPath && (
          <Button
            className="button"
            icon="ban-circle"
            onClick={() => agent.stop()}
          />
        )}

        <Button
          className="button"
          icon="trash"
          onClick={() => gameState.onRemoveAgent(agent)}
        />

        <Button
          className="button"
          icon="cross"
          onClick={() => gameState.onDeselectAgent(agent)}
        />
      </Card>
    </div>
  );
}
