import { Card } from "@blueprintjs/core";
import { Agent } from "../../../game/agent";
import "./agent-details.scss";

interface AgentDetailsProps {
  agent: Agent;
}

export function AgentDetails({ agent }: AgentDetailsProps) {
  return (
    <div className="agent-details">
      <Card>Agent</Card>
    </div>
  );
}
