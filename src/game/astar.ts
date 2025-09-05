import { GridCell, gridCellsAreEqual } from "./grid-builder";

// We create a search node object for each grid cell
interface PathNode extends GridCell {
  parent?: PathNode;
  costFromStart: number;
  costToEnd: number;
  costTotal: number;
}

export class AStar {
  getPath(fromCell: GridCell, toCell: GridCell, grid: GridCell[][]) {
    const openList: PathNode[] = [];
    const closedList: PathNode[] = [];

    // Create path nodes from the given cells
    const start: PathNode = {
      ...fromCell,
      parent: undefined,
      costFromStart: 0,
      costToEnd: 0,
      costTotal: 0,
    };
    const end: PathNode = {
      ...toCell,
      parent: undefined,
      costFromStart: 0,
      costToEnd: 0,
      costTotal: 0,
    };

    // We begin with the start node
    openList.push(start);

    // So long as there are nodes to explore...
    while (openList.length) {
      // Sort the open list so that the cheapest node is first
      openList.sort((a, b) => a.costTotal - b.costTotal);

      const currentNode = openList[0];

      // Is this the end node?
      if (gridCellsAreEqual(currentNode, end)) {
        // Backtrack closed list
        let current = currentNode;
        const route: PathNode[] = [];

        while (current.parent) {
          route.push(current);
          current = current.parent;
        }

        route.reverse();

        return route as GridCell[];
      }

      // Move the current node from open list to closed list
      openList.splice(0, 1);
      closedList.push(currentNode);

      // Now get the neighbours of that node
      for (const neighbour of this.getNeighbours(grid, currentNode)) {
        // If this node is an obstacle or already explored, ignore it
        if (
          neighbour.obstacle ||
          closedList.some((node) => gridCellsAreEqual(node, neighbour))
        ) {
          continue;
        }

        // Set costs
        this.calculateCosts(neighbour, currentNode, end);
        neighbour.parent = currentNode;

        // If this node is already being considered at a cheaper cost (from a different parent), skip it
        const onOpenList = openList.find((node) =>
          gridCellsAreEqual(node, neighbour)
        );
        if (onOpenList && onOpenList.costFromStart < neighbour.costFromStart) {
          continue;
        }

        // Add the node to the open list
        openList.push(neighbour);
      }
    }

    // If we reached this point, no path could be found
    return undefined;
  }

  getNeighbours(grid: GridCell[][], pathNode: PathNode): PathNode[] {
    const row = pathNode.position.z;
    const col = pathNode.position.x;

    let above, below, left, right;

    if (row > 0) {
      above = grid[row - 1][col];
    }
    if (row < grid.length - 1) {
      below = grid[row + 1][col];
    }

    if (col > 0) {
      left = grid[row][col - 1];
    }
    if (col < grid[0].length - 1) {
      right = grid[row][col + 1];
    }

    const neighbourCells = [above, below, left, right].filter(
      (cell) => cell !== undefined
    );

    return neighbourCells.map((cell) => ({
      ...cell,
      costFromStart: 0,
      costToEnd: 0,
      costTotal: 0,
    })) as PathNode[];
  }

  calculateCosts(current: PathNode, previous: PathNode, end: PathNode) {
    current.costFromStart = previous.costFromStart + 1;
    current.costToEnd = current.position.distanceToSquared(end.position);
    current.costTotal = current.costFromStart + current.costToEnd;
  }
}
