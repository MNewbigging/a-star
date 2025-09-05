import * as THREE from "three";
import { AssetManager } from "./asset-manager";
import { GridBuilder, GridCell } from "./grid-builder";
import { eventUpdater } from "../events/event-updater";

export class Agent {
  model: THREE.Object3D;
  currentCell?: GridCell;
  destinationCell?: GridCell;

  path: GridCell[] = [];
  private targetCell?: GridCell;
  private direction = new THREE.Vector3();

  private mixer: THREE.AnimationMixer;
  private animations = new Map<string, THREE.AnimationAction>();
  private currentAction?: THREE.AnimationAction;

  constructor(
    private assetManager: AssetManager,
    private gridBuilder: GridBuilder
  ) {
    // Setup the model
    this.model = this.assetManager.cloneModel("dummy");
    this.assetManager.applyModelTexture(this.model, "dummy");

    // Setup animations
    this.mixer = new THREE.AnimationMixer(this.model);
    const idleClip = this.assetManager.animations.get("idle");
    const idleAction = this.mixer.clipAction(idleClip);
    this.animations.set(idleClip.name, idleAction);

    const walkClip = this.assetManager.animations.get("walk");
    const walkAction = this.mixer.clipAction(walkClip);
    this.animations.set(walkClip.name, walkAction);
  }

  get followingPath(): boolean {
    return !!this.path.length;
  }

  stop() {
    if (!this.targetCell) return;

    // Just remove all other cells ahead of target
    this.gridBuilder.resetFloorCells(this.path);
    this.path = [];
  }

  update(dt: number) {
    this.mixer.update(dt);

    this.followPath(dt);
  }

  setPath(path: GridCell[]) {
    this.path = path;

    this.playAnimation("walk");
    this.setNextTargetCell();

    eventUpdater.fire("agent-follow-path-change", null);
  }

  clearPath() {
    // Ensure colours are reset before clearing references
    this.gridBuilder.resetFloorCells(this.path);
    if (this.currentCell) this.gridBuilder.resetFloorCell(this.currentCell);
    if (this.targetCell) this.gridBuilder.resetFloorCell(this.targetCell);

    this.path = [];
    this.targetCell = undefined;
    this.currentCell = undefined;
    this.destinationCell = undefined;
  }

  playAnimation(name: string) {
    // Find the new action with the given name
    const nextAction = this.animations.get(name);
    if (!nextAction) {
      throw Error(
        "Could not find action with name " + name + "for character " + this
      );
    }

    // Reset the next action then fade to it from the current action
    nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);

    this.currentAction
      ? nextAction.crossFadeFrom(this.currentAction, 0.25, false).play()
      : nextAction.play();

    // Next is now current
    this.currentAction = nextAction;
  }

  private followPath(dt: number) {
    // If there is no target to head towards, stop
    if (!this.targetCell || !this.currentCell) {
      return;
    }

    // As the agent steps off a cell, it should turn black immediately
    if (!this.isOnCell(this.currentCell)) {
      this.colourCellBlack(this.currentCell);
    }

    // Have we reached the target?
    if (this.hasReachedCell(this.targetCell)) {
      // The target is now the current cell
      this.currentCell = this.targetCell;

      // Get the next target cell in the path
      this.setNextTargetCell();

      // If there is no next target cell, path is done
      if (!this.targetCell) {
        this.onFinishPath();
      }

      return;
    }

    // Keep moving towards the target cell
    const cellPosition = this.targetCell.position.clone();
    this.direction = cellPosition.sub(this.model.position).normalize();

    const moveStep = this.direction.clone().multiplyScalar(dt * 2);
    const nextPos = this.model.position.clone().add(moveStep);

    this.model.lookAt(nextPos);
    this.model.position.copy(nextPos);
  }

  private hasReachedCell(cell: GridCell) {
    // Current position close enough to target cell
    const cellPos = cell.position.clone();
    const currentPos = this.model.position.clone();

    return cellPos.distanceTo(currentPos) < 0.01;
  }

  private setNextTargetCell() {
    this.targetCell = this.path.shift();
  }

  private colourCellBlack(cell?: GridCell) {
    if (cell) {
      this.gridBuilder.resetFloorCell(cell);
    }
  }

  private isOnCell(cell: GridCell) {
    // Create a bounding volume of the floor cell, raised up by 2 metres
    const cellBounds = new THREE.Box3().setFromObject(cell.object);
    cellBounds.expandByVector(new THREE.Vector3(0, 2, 0));

    // Get the  model bounds
    const modelBounds = new THREE.Box3().setFromObject(this.model);

    return modelBounds.intersectsBox(cellBounds);
  }

  private onFinishPath() {
    this.playAnimation("idle");

    if (this.currentCell) {
      this.colourCellBlack(this.currentCell);
    }

    eventUpdater.fire("agent-follow-path-change", null);
  }
}
