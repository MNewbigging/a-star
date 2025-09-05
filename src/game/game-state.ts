import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { RenderPipeline } from "./render-pipeline";
import { AssetManager } from "./asset-manager";
import { Agent } from "./agent";
import { AStar } from "./astar";
import { eventUpdater } from "../events/event-updater";

export interface GridCell {
  position: THREE.Vector3;
  obstacle: boolean;
  object: THREE.Object3D;
}

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

  private floorBlackMaterial: THREE.MeshLambertMaterial;
  private floorGreenMaterial: THREE.MeshLambertMaterial;
  private floorRedMaterial: THREE.MeshLambertMaterial;
  private obstacleMaterial: THREE.MeshLambertMaterial;
  private gridSize = 10;
  private grid: GridCell[][] = [];
  private floorCells: GridCell[] = [];

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
    this.floorBlackMaterial = new THREE.MeshLambertMaterial({
      map: this.assetManager.textures.get("floor-black"),
    });
    this.floorGreenMaterial = new THREE.MeshLambertMaterial({
      map: this.assetManager.textures.get("floor-green"),
    });
    this.floorRedMaterial = new THREE.MeshLambertMaterial({
      map: this.assetManager.textures.get("floor-red"),
    });

    const obstacleTexture = this.assetManager.textures.get("obstacle-orange");
    obstacleTexture.wrapS = THREE.RepeatWrapping;
    obstacleTexture.wrapT = THREE.RepeatWrapping;
    obstacleTexture.repeat = new THREE.Vector2(1, 3);
    this.obstacleMaterial = new THREE.MeshLambertMaterial({
      map: obstacleTexture,
    });

    // Starting grid
    this.buildGrid(this.gridSize);
    this.displayGrid(this.grid);

    // Agent
    this.agent = new Agent(this.assetManager, this.floorBlackMaterial);

    // Start game
    this.update();
  }

  generateGrid = () => {
    this.removeAgent();
    this.disposeGrid(this.grid);
    this.buildGrid(this.gridSize);
    this.displayGrid(this.grid);
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
    this.floorCells.forEach((cell) =>
      this.changeFloorMaterial(cell, this.floorBlackMaterial)
    );

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

  private buildGrid(gridSize: number) {
    const grid: GridCell[][] = [];
    // We only intersect against floors when placing agents and routes,
    // So we pull out the floor cells once to avoid re-iterating the grid later
    const floorCells: GridCell[] = [];

    for (let z = 0; z < gridSize; z++) {
      // Init the array for this row
      grid[z] = [];

      for (let x = 0; x < gridSize; x++) {
        // Random chance of being an obstacle
        const obstacle = Math.random() > 0.8;

        let cell: GridCell | undefined;
        if (obstacle) {
          cell = this.createObstacleCell(x, z);
        } else {
          cell = this.createFloorCell(x, z);
          floorCells.push(cell);
        }

        grid[z][x] = cell;
      }
    }

    // Assign the new grid and floor cells
    this.grid = grid;
    this.floorCells = floorCells;
  }

  private createFloorCell(x: number, z: number): GridCell {
    const object = new THREE.Mesh(
      new THREE.BoxGeometry(),
      this.floorBlackMaterial
    );

    object.position.set(x, -0.5, z); // offset y so that top of box is at 0

    return {
      position: new THREE.Vector3(x, 0, z),
      obstacle: false,
      object,
    };
  }

  private createObstacleCell(x: number, z: number): GridCell {
    const object = new THREE.Mesh(
      new THREE.BoxGeometry(1, 3, 1),
      this.obstacleMaterial
    );

    object.position.set(x, 0.5, z); // offset y so bottom matches floors

    return {
      position: new THREE.Vector3(x, 0, z),
      obstacle: true,
      object,
    };
  }

  private displayGrid(grid: GridCell[][]) {
    grid.forEach((row) => row.forEach((cell) => this.scene.add(cell.object)));
  }

  private disposeGrid(grid: GridCell[][]) {
    grid.forEach((row) =>
      row.forEach((cell) => this.scene.remove(cell.object))
    );
  }

  private removeAgent() {
    this.agent.clearPath();
    this.floorCells.forEach((cell) =>
      this.changeFloorMaterial(cell, this.floorBlackMaterial)
    );
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

    for (const floorCell of this.floorCells) {
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
    for (const floorCell of this.floorCells) {
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
      const path = aStar.getPath(fromCell, toCell, this.grid);
      if (path) {
        // Change the path floor tiles to green
        path.forEach((cell) => {
          this.changeFloorMaterial(cell, this.floorGreenMaterial);
        });
        // Set the agent off on the path
        this.agent.setPath(path);
      } else {
        // Change the destination floor tile to red
        this.changeFloorMaterial(toCell, this.floorRedMaterial);
      }
    }
  };

  private changeFloorMaterial(cell: GridCell, material: THREE.Material) {
    (cell.object as THREE.Mesh).material = material;
  }
}

export function gridCellsAreEqual(a: GridCell, b: GridCell) {
  return a.position.equals(b.position);
}
