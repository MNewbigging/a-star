import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { RenderPipeline } from "./render-pipeline";
import { AssetManager } from "./asset-manager";
import { Agent } from "./agent";
import { AStar } from "./astar";
import { eventUpdater } from "../events/event-updater";
import { GridBuilder, gridCellsAreEqual } from "./grid-builder";

export class GameState {
  private renderPipeline: RenderPipeline;
  private clock = new THREE.Clock();

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private controls: OrbitControls;

  private raycaster = new THREE.Raycaster();

  private agents: Agent[] = [];
  private placingAgent?: Agent;
  private settingAgentDestination?: Agent;
  private highlightedAgent?: Agent;
  selectedAgent?: Agent;

  private gridBuilder: GridBuilder;

  private gridSize = 10;

  private reused = {
    ndc: new THREE.Vector2(),
  };

  constructor(private assetManager: AssetManager) {
    // Scene
    this.setupCamera();
    this.renderPipeline = new RenderPipeline(this.scene, this.camera);

    this.setupLights();

    this.controls = new OrbitControls(this.camera, this.renderPipeline.canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.target.set(this.gridSize / 2, 0, this.gridSize / 2);

    this.scene.background = new THREE.Color("#1680AF");

    // Grid
    this.gridBuilder = new GridBuilder(this.scene, assetManager);

    // Starting grid
    this.gridBuilder.buildGrid(this.gridSize);
    this.gridBuilder.displayGrid();

    window.addEventListener("mousemove", this.defaultMouseMove);
    window.addEventListener("click", this.defaultClick);

    // Start game
    this.update();
  }

  onGenerateGrid = () => {
    this.clearAgents();
    this.gridBuilder.disposeGrid();
    this.gridBuilder.buildGrid(this.gridSize);
    this.gridBuilder.displayGrid();
  };

  onPlaceAgent = () => {
    const agent = new Agent(this.assetManager, this.gridBuilder);
    agent.model.name = `Agent #${this.agents.length + 1}`;

    // Add the agent model to the scene out of view
    agent.model.position.set(0, 200, 0);
    agent.playAnimation("idle");
    this.scene.add(agent.model);

    // Prevent the default behaviour
    window.removeEventListener("mousemove", this.defaultMouseMove);
    window.removeEventListener("click", this.defaultClick);

    // Add place agent behaviour
    this.placingAgent = agent;
    window.addEventListener("mousemove", this.placeAgentMouseMove);
    window.addEventListener("click", this.placeAgentClick);
  };

  onSetAgentDestination = (agent: Agent) => {
    // Remove any previous path for this agent
    this.gridBuilder.resetFloorCells(agent.path);

    // Prevent the default  behaviour
    window.removeEventListener("mousemove", this.defaultMouseMove);
    window.removeEventListener("click", this.defaultClick);

    // Add set destination behaviour
    this.settingAgentDestination = agent;
    window.addEventListener("mousemove", this.setDestinationMouseMove);
    window.addEventListener("click", this.setDestinationClick);
  };

  onRemoveAgent = (agent: Agent) => {
    this.removeAgent(agent);
  };

  onDeselectAgent = (agent: Agent) => {
    this.deselectAgent(agent);
  };

  private setupCamera() {
    this.camera.fov = 75;
    this.camera.far = 500;
    this.camera.position.set(this.gridSize, 10, this.gridSize);
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(undefined, Math.PI);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(undefined, Math.PI);
    directLight.position.copy(new THREE.Vector3(0.75, 1, 0.75).normalize());
    this.scene.add(directLight);
  }

  private deselectAgent(agent: Agent) {
    if (agent === this.selectedAgent) {
      this.renderPipeline.removeSelectOutlineObject(agent.model);
      this.selectedAgent = undefined;
      eventUpdater.fire("selected-agent-change", null);
    }
  }

  private clearAgents() {
    this.agents.forEach((agent) => this.removeAgent(agent));
  }

  private removeAgent(agent: Agent) {
    agent.clearPath();
    this.scene.remove(agent.model);

    if (this.selectedAgent === agent) {
      this.selectedAgent = undefined;
      this.renderPipeline.removeSelectOutlineObject(agent.model);
      eventUpdater.fire("selected-agent-change", null);
    }

    if (this.highlightedAgent === agent) {
      this.highlightedAgent = undefined;
      this.renderPipeline.removeHoverOutlineObject(agent.model);
    }

    this.agents = this.agents.filter((a) => a !== agent);
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    this.controls.update();

    this.agents.forEach((agent) => agent.update(dt));

    this.renderPipeline.render(dt);
  };

  private placeAgentMouseMove = (e: MouseEvent) => {
    if (!this.placingAgent) return;

    getNdc(e, this.reused.ndc);
    this.raycaster.setFromCamera(this.reused.ndc, this.camera);

    for (const floorCell of this.gridBuilder.floorCells) {
      const intersections = this.raycaster.intersectObject(
        floorCell.object,
        false
      );
      if (intersections.length) {
        // Outline
        this.renderPipeline.clearHoverOutlines();
        this.renderPipeline.hoverOutlineObject(floorCell.object);

        // Place agent at the center of this grid cell
        this.placingAgent.model.position.copy(floorCell.position);
        this.placingAgent.currentCell = floorCell;

        break;
      }
    }
  };

  private placeAgentClick = () => {
    if (!this.placingAgent || !this.placingAgent.currentCell) {
      return;
    }

    // Add to list of placed agents and clear placing ref
    this.agents.push(this.placingAgent);
    this.placingAgent = undefined;

    // Remove listeners and outlines
    window.removeEventListener("mousemove", this.placeAgentMouseMove);
    window.removeEventListener("click", this.placeAgentClick);
    this.renderPipeline.clearHoverOutlines();

    // Can resume default behaviour
    window.addEventListener("mousemove", this.defaultMouseMove);
    window.addEventListener("click", this.defaultClick);
  };

  private setDestinationMouseMove = (e: MouseEvent) => {
    if (!this.settingAgentDestination) return;

    getNdc(e, this.reused.ndc);

    this.raycaster.setFromCamera(this.reused.ndc, this.camera);
    for (const floorCell of this.gridBuilder.floorCells) {
      // Ignore the floor cell the agent is on
      const currentCell = this.settingAgentDestination.currentCell;
      if (currentCell && gridCellsAreEqual(currentCell, floorCell)) {
        continue;
      }

      const intersections = this.raycaster.intersectObject(
        floorCell.object,
        false
      );
      if (intersections.length) {
        this.renderPipeline.clearHoverOutlines();
        this.renderPipeline.hoverOutlineObject(floorCell.object);

        this.settingAgentDestination.destinationCell = floorCell;
      }
    }
  };

  private setDestinationClick = () => {
    if (!this.settingAgentDestination) return;

    // Remove listeners and outlines
    window.removeEventListener("mousemove", this.setDestinationMouseMove);
    window.removeEventListener("click", this.setDestinationClick);
    this.renderPipeline.clearHoverOutlines();

    // Can resume default behaviour
    window.addEventListener("mousemove", this.defaultMouseMove);
    window.addEventListener("click", this.defaultClick);

    // Find a path to the destination
    const fromCell = this.settingAgentDestination.currentCell;
    const toCell = this.settingAgentDestination.destinationCell;

    if (fromCell && toCell) {
      const aStar = new AStar();
      const path = aStar.getPath(fromCell, toCell, this.gridBuilder.grid);
      if (path) {
        // Change the path floor tiles to green
        this.gridBuilder.colourPath(path);
        // Set the agent off on the path
        this.settingAgentDestination.setPath(path);
      } else {
        // Change the destination floor tile to red
        this.gridBuilder.colourDesintationCell(toCell);
      }
    }

    this.settingAgentDestination = undefined;
  };

  private defaultMouseMove = (e: MouseEvent) => {
    getNdc(e, this.reused.ndc);
    this.raycaster.setFromCamera(this.reused.ndc, this.camera);

    // Hover is cleared with each move
    this.renderPipeline.clearHoverOutlines();
    this.highlightedAgent = undefined;

    // Highlight any hovered agent
    for (const agent of this.agents) {
      const intersections = this.raycaster.intersectObject(agent.model, true);
      if (!intersections.length) continue;

      // Ensure we don't highlight a selected model
      if (agent === this.selectedAgent) return;

      this.renderPipeline.hoverOutlineObject(agent.model);
      this.highlightedAgent = agent;

      return;
    }
  };

  private defaultClick = () => {
    // Just use last-highlighted agent instead of redoing intersection test on the click
    if (!this.highlightedAgent) return;

    // If the clicked agent is already selected, stop early
    if (this.selectedAgent === this.highlightedAgent) return;

    // If nothing is currently selected
    if (!this.selectedAgent) {
      this.selectedAgent = this.highlightedAgent;
    } else if (this.selectedAgent !== this.highlightedAgent) {
      // Different thing is selected, clear previous one first
      this.onDeselectAgent(this.selectedAgent);
      this.selectedAgent = this.highlightedAgent;
    }

    this.renderPipeline.selectOutlineObject(this.selectedAgent.model);
    eventUpdater.fire("selected-agent-change", null);
  };
}

function getNdc(e: MouseEvent, target: THREE.Vector2) {
  target.x = (e.clientX / window.innerWidth) * 2 - 1;
  target.y = -(e.clientY / window.innerHeight) * 2 + 1;
}
