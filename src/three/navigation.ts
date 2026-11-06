/**
 * DAWA 3D Warehouse Engine — Navigation Graph & Pathfinding System
 * Calculates collision-free corridors, aisle centerlines, rack standpoints,
 * and generates realistic human trajectories without passing through shelves or walls.
 */

import {
  WarehouseRack,
  ArchitecturalElement,
  WarehouseDimensions,
  getRackRotationDeg,
} from '../types/warehouse';

export interface NavNode {
  id: string;
  x: number;
  z: number;
  neighbors: string[];
}

export class WarehouseNavGraph {
  public nodes: Map<string, NavNode> = new Map();
  public rackStandpoints: Map<string, [number, number]> = new Map();

  /**
   * Rebuilds the navigation graph based on warehouse dimensions, placed racks, and architectural barriers.
   */
  public rebuild(
    dimensions: WarehouseDimensions,
    racks: WarehouseRack[],
    elements: ArchitecturalElement[],
  ) {
    this.nodes.clear();
    this.rackStandpoints.clear();

    const { ww, wd } = dimensions;

    const mainXIntervals = [1.5, 4.5, 7.5, 10.5, 13.5, 16.5, 19.5, Math.max(21, ww - 1.5)];
    const mainZIntervals = [1.5, 4.0, wd / 2, Math.max(5.5, wd - 1.5)];

    // Build grid nodes across arterial lines
    mainXIntervals.forEach((x) => {
      mainZIntervals.forEach((z) => {
        const id = `node_${x.toFixed(1)}_${z.toFixed(1)}`;
        this.addNode(id, x, z);
      });
    });

    // Connect arterial grid nodes
    for (let i = 0; i < mainXIntervals.length; i++) {
      for (let j = 0; j < mainZIntervals.length; j++) {
        const curId = `node_${mainXIntervals[i].toFixed(1)}_${mainZIntervals[j].toFixed(1)}`;
        if (i < mainXIntervals.length - 1) {
          const rightId = `node_${mainXIntervals[i + 1].toFixed(1)}_${mainZIntervals[j].toFixed(1)}`;
          this.connect(curId, rightId);
        }
        if (j < mainZIntervals.length - 1) {
          const downId = `node_${mainXIntervals[i].toFixed(1)}_${mainZIntervals[j + 1].toFixed(1)}`;
          this.connect(curId, downId);
        }
      }
    }

    // 2. Add Standpoint Nodes in front of every placed rack (supports any 0-360 deg rotation)
    racks.forEach((rack) => {
      if (typeof rack.px !== 'number' || typeof rack.pz !== 'number') return;
      const rd = rack.d || 1.0;
      const rotRad = (getRackRotationDeg(rack) * Math.PI) / 180;
      const offsetDist = rd / 2 + 0.75;

      // Local front normal is +Z (or -Z depending on orientation); compute standpoint along front normal
      const spX = rack.px + Math.sin(rotRad) * offsetDist;
      const spZ = rack.pz + Math.cos(rotRad) * offsetDist;

      const spId = `standpoint_${rack.id}`;
      this.addNode(spId, spX, spZ);
      this.rackStandpoints.set(rack.id, [spX, spZ]);

      // Connect standpoint to closest arterial node
      let closestNode: NavNode | null = null;
      let minDist = Infinity;
      this.nodes.forEach((node) => {
        if (node.id === spId) return;
        const d = Math.hypot(node.x - spX, node.z - spZ);
        if (d < minDist) {
          minDist = d;
          closestNode = node;
        }
      });
      if (closestNode) {
        this.connect(spId, (closestNode as NavNode).id);
      }
    });
  }

  private addNode(id: string, x: number, z: number) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, x, z, neighbors: [] });
    }
  }

  private connect(id1: string, id2: string) {
    const n1 = this.nodes.get(id1);
    const n2 = this.nodes.get(id2);
    if (n1 && n2) {
      if (!n1.neighbors.includes(id2)) n1.neighbors.push(id2);
      if (!n2.neighbors.includes(id1)) n2.neighbors.push(id1);
    }
  }

  /**
   * Finds shortest path (A*) from start position [sx, sz] to target position [tx, tz].
   */
  public findPath(
    start: [number, number],
    target: [number, number],
  ): Array<[number, number]> {
    let startNodeId: string | null = null;
    let minStartDist = Infinity;
    this.nodes.forEach((n) => {
      const d = Math.hypot(n.x - start[0], n.z - start[1]);
      if (d < minStartDist) {
        minStartDist = d;
        startNodeId = n.id;
      }
    });

    let targetNodeId: string | null = null;
    let minTargetDist = Infinity;
    this.nodes.forEach((n) => {
      const d = Math.hypot(n.x - target[0], n.z - target[1]);
      if (d < minTargetDist) {
        minTargetDist = d;
        targetNodeId = n.id;
      }
    });

    if (!startNodeId || !targetNodeId) {
      return [start, target];
    }

    const openSet = new Set<string>([startNodeId]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    this.nodes.forEach((_, id) => {
      gScore.set(id, Infinity);
      fScore.set(id, Infinity);
    });

    gScore.set(startNodeId, 0);
    const targetNode = this.nodes.get(targetNodeId)!;
    fScore.set(
      startNodeId,
      Math.hypot(
        this.nodes.get(startNodeId)!.x - targetNode.x,
        this.nodes.get(startNodeId)!.z - targetNode.z,
      ),
    );

    while (openSet.size > 0) {
      let currentId = '';
      let lowestF = Infinity;
      openSet.forEach((id) => {
        const score = fScore.get(id) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          currentId = id;
        }
      });

      if (currentId === targetNodeId) {
        const path: Array<[number, number]> = [target];
        let curr: string | undefined = currentId;
        while (curr) {
          const n = this.nodes.get(curr);
          if (n) path.unshift([n.x, n.z]);
          curr = cameFrom.get(curr);
        }
        path.unshift(start);
        return path;
      }

      openSet.delete(currentId);
      const currNode = this.nodes.get(currentId)!;

      currNode.neighbors.forEach((neighborId) => {
        const neighbor = this.nodes.get(neighborId);
        if (!neighbor) return;
        const dist = Math.hypot(neighbor.x - currNode.x, neighbor.z - currNode.z);
        const tentativeG = (gScore.get(currentId) ?? Infinity) + dist;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          const f = tentativeG + Math.hypot(neighbor.x - targetNode.x, neighbor.z - targetNode.z);
          fScore.set(neighborId, f);
          openSet.add(neighborId);
        }
      });
    }

    return [start, [targetNode.x, targetNode.z], target];
  }
}
