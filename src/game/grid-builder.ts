import * as THREE from "three";
import { AssetManager } from "./asset-manager";

export interface GridCell {
  position: THREE.Vector3;
  obstacle: boolean;
  object: THREE.Object3D;
}

export class GridBuilder {
  grid: GridCell[][] = [];
  floorCells: GridCell[] = [];

  private floorBlackMaterial: THREE.MeshLambertMaterial;
  private floorGreenMaterial: THREE.MeshLambertMaterial;
  private floorRedMaterial: THREE.MeshLambertMaterial;
  private obstacleMaterial: THREE.MeshLambertMaterial;

  constructor(private scene: THREE.Scene, assetManager: AssetManager) {
    this.floorBlackMaterial = new THREE.MeshLambertMaterial({
      map: assetManager.textures.get("floor-black"),
    });
    this.floorGreenMaterial = new THREE.MeshLambertMaterial({
      map: assetManager.textures.get("floor-green"),
    });
    this.floorRedMaterial = new THREE.MeshLambertMaterial({
      map: assetManager.textures.get("floor-red"),
    });

    const obstacleTexture = assetManager.textures.get("obstacle-orange");
    obstacleTexture.wrapS = THREE.RepeatWrapping;
    obstacleTexture.wrapT = THREE.RepeatWrapping;
    obstacleTexture.repeat = new THREE.Vector2(1, 3);
    this.obstacleMaterial = new THREE.MeshLambertMaterial({
      map: obstacleTexture,
    });
  }

  buildGrid(gridSize: number) {
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

  displayGrid() {
    this.grid.forEach((row) =>
      row.forEach((cell) => this.scene.add(cell.object))
    );
  }

  resetGridCellColour(cell: GridCell) {
    this.changeCellMaterial(cell, this.floorBlackMaterial);
  }

  resetFloorCells(cells: GridCell[]) {
    cells.forEach((cell) =>
      this.changeCellMaterial(cell, this.floorBlackMaterial)
    );
  }

  colourPath(cells: GridCell[]) {
    cells.forEach((cell) =>
      this.changeCellMaterial(cell, this.floorGreenMaterial)
    );
  }

  colourDesintationCell(cell: GridCell) {
    this.changeCellMaterial(cell, this.floorRedMaterial);
  }

  disposeGrid() {
    this.grid.forEach((row) =>
      row.forEach((cell) => this.scene.remove(cell.object))
    );
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

  private changeCellMaterial(cell: GridCell, material: THREE.Material) {
    (cell.object as THREE.Mesh).material = material;
  }
}

export function gridCellsAreEqual(a: GridCell, b: GridCell) {
  return a.position.equals(b.position);
}
