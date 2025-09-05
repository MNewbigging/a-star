import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { RenderPipeline } from "./render-pipeline";
import { AssetManager } from "./asset-manager";
import { Agent } from "./agent";
import { AStar } from "./astar";
import { eventUpdater } from "../events/event-updater";
import { GridBuilder, gridCellsAreEqual } from "./grid-builder";

export class GameState {
  canSetDestination = false;

  private renderPipeline: RenderPipeline;
  private clock = new THREE.Clock();

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private controls: OrbitControls;

  private mouseNdc = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();

  private agent: Agent;

  private gridBuilder: GridBuilder;

  private gridSize = 10;

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

    // Agent
    this.agent = new Agent(this.assetManager, this.gridBuilder);

    // Start game
    this.update();
  }

  generateGrid = () => {
    this.removeAgent();
    this.gridBuilder.disposeGrid();
    this.gridBuilder.buildGrid(this.gridSize);
    this.gridBuilder.displayGrid();
  };

  startPlacingAgent = () => {
    this.removeAgent();

    // Add the agent model to the scene out of view
    this.agent.model.position.set(0, 200, 0);
    this.agent.playAnimation("idle");
    this.scene.add(this.agent.model);

    // Highlight floor spaces for agent placement
    window.addEventListener("mousemove", this.placeAgentMouseMove);
    // Listen for clicks
    window.addEventListener("click", this.placeAgentClick);
  };

  startSetDestination = () => {
    // Remove any previous path
    this.gridBuilder.resetFloorCells();

    // Highlight floor spaces for available destinations
    window.addEventListener("mousemove", this.setDestinationMouseMove);

    // Listen for clicks
    window.addEventListener("click", this.setDestinationClick);
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

  private removeAgent() {
    this.agent.clearPath();
    this.gridBuilder.resetFloorCells();
    this.scene.remove(this.agent.model);
    this.canSetDestination = false;
    eventUpdater.fire("can-set-destination-change", null);
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    this.controls.update();

    this.agent?.update(dt);

    this.renderPipeline.render(dt);
  };

  private placeAgentMouseMove = (e: MouseEvent) => {
    this.mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNdc, this.camera);

    for (const floorCell of this.gridBuilder.floorCells) {
      const intersections = this.raycaster.intersectObject(
        floorCell.object,
        false
      );
      if (intersections.length) {
        // Outline
        this.renderPipeline.clearOutlines();
        this.renderPipeline.outlineObject(floorCell.object);

        // Place agent at the center of this grid cell
        this.agent.model.position.copy(floorCell.position);
        this.agent.currentCell = floorCell;

        break;
      }
    }
  };

  private placeAgentClick = () => {
    if (!this.agent.currentCell) {
      return;
    }

    // Remove listeners and outlines
    window.removeEventListener("mousemove", this.placeAgentMouseMove);
    window.removeEventListener("click", this.placeAgentClick);
    this.renderPipeline.clearOutlines();

    // Can now set destination for the agent
    this.canSetDestination = true;
    eventUpdater.fire("can-set-destination-change", null);
  };

  private setDestinationMouseMove = (e: MouseEvent) => {
    this.mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    for (const floorCell of this.gridBuilder.floorCells) {
      // Ignore the floor cell the agent is on
      const currentCell = this.agent.currentCell;
      if (currentCell && gridCellsAreEqual(currentCell, floorCell)) {
        continue;
      }

      const intersections = this.raycaster.intersectObject(
        floorCell.object,
        false
      );
      if (intersections.length) {
        this.renderPipeline.clearOutlines();
        this.renderPipeline.outlineObject(floorCell.object);

        this.agent.destinationCell = floorCell;
      }
    }
  };

  private setDestinationClick = () => {
    // Remove listeners and outlines
    window.removeEventListener("mousemove", this.setDestinationMouseMove);
    window.removeEventListener("click", this.setDestinationClick);
    this.renderPipeline.clearOutlines();

    // Find a path to the destination
    const fromCell = this.agent.currentCell;
    const toCell = this.agent.destinationCell;

    if (fromCell && toCell) {
      const aStar = new AStar();
      const path = aStar.getPath(fromCell, toCell, this.gridBuilder.grid);
      if (path) {
        // Change the path floor tiles to green
        this.gridBuilder.colourPath(path);
        // Set the agent off on the path
        this.agent.setPath(path);
      } else {
        // Change the destination floor tile to red
        this.gridBuilder.colourDesintationCell(toCell);
      }
    }
  };
}
