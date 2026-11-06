/**
 * DAWA 3D Warehouse Engine — Procedural 3D Composite Models
 * Assembles multi-part procedural models (THREE.Group) with zero external asset dependencies.
 * Features:
 * - Real openable architectural doorways (Double Glass Main Entrance & Roll-Up Loading Dock Portals)
 * - Full-wall expandable racks with automatic intermediate structural uprights
 * - 360-degree continuous rotation for racks and elements
 * - High-DPI 3D shelf-edge cell plaques & HD pharmaceutical carton labels
 */

import * as THREE from 'three';
import {
  WarehouseRack,
  ArchitecturalElement,
  WorkerConfig,
  FefoRadarConfig,
  resolveRackCell,
  getCellMedicines,
  computeCellMatrixLayout,
  getRackRotationDeg,
  computeCellExpiryStatus,
} from '../types/warehouse';
import {
  WarehouseMaterials,
  getCartonBoxTexture,
  getCellPlaqueTexture,
} from './materials';

/**
 * Articulated Procedural 3D Human Worker (المشرف / العامل البشري)
 */
export class HumanWorker3D {
  public group: THREE.Group;
  public materials: WarehouseMaterials;

  private rootGroup: THREE.Group;
  private torsoGroup: THREE.Group;
  private headGroup: THREE.Group;
  private leftLegPivot: THREE.Group;
  private rightLegPivot: THREE.Group;
  private leftArmPivot: THREE.Group;
  private rightArmPivot: THREE.Group;
  private rightForearm: THREE.Group;
  private scannerGroup: THREE.Group;
  private laserBeam: THREE.Mesh;
  private carriedBox: THREE.Mesh;

  private suitMat: THREE.MeshStandardMaterial;
  private vestMat: THREE.MeshStandardMaterial;
  private helmetMat: THREE.MeshStandardMaterial;
  private lastBoxSignature = '';

  private walkCycleTime = 0;
  private currentSpeed = 0;

  constructor(materials: WarehouseMaterials) {
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.name = 'HumanWorker';
    this.group.userData = { id: 'human-worker', type: 'WORKER' };

    this.suitMat = materials.workerSuitMat.clone();
    this.vestMat = materials.workerVestMat.clone();
    this.helmetMat = materials.workerHelmetMat.clone();

    this.rootGroup = new THREE.Group();
    this.group.add(this.rootGroup);

    const hipHeight = 0.85;

    // Left Leg
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.14, hipHeight, 0);
    this.rootGroup.add(this.leftLegPivot);

    const leftThigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.055, 0.42, 12),
      this.suitMat,
    );
    leftThigh.position.set(0, -0.21, 0);
    this.leftLegPivot.add(leftThigh);

    const leftCalf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.045, 0.42, 12),
      this.suitMat,
    );
    leftCalf.position.set(0, -0.61, 0);
    this.leftLegPivot.add(leftCalf);

    const leftBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.22),
      materials.tireMat,
    );
    leftBoot.position.set(0, -0.82, 0.04);
    this.leftLegPivot.add(leftBoot);

    // Right Leg
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.14, hipHeight, 0);
    this.rootGroup.add(this.rightLegPivot);

    const rightThigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.055, 0.42, 12),
      this.suitMat,
    );
    rightThigh.position.set(0, -0.21, 0);
    this.rightLegPivot.add(rightThigh);

    const rightCalf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.045, 0.42, 12),
      this.suitMat,
    );
    rightCalf.position.set(0, -0.61, 0);
    this.rightLegPivot.add(rightCalf);

    const rightBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.22),
      materials.tireMat,
    );
    rightBoot.position.set(0, -0.82, 0.04);
    this.rightLegPivot.add(rightBoot);

    // Torso
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, hipHeight, 0);
    this.rootGroup.add(this.torsoGroup);

    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.2),
      this.suitMat,
    );
    pelvis.position.set(0, 0.07, 0);
    this.torsoGroup.add(pelvis);

    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.06, 0.22),
      materials.tireMat,
    );
    belt.position.set(0, 0.14, 0);
    this.torsoGroup.add(belt);

    const pouch = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.1, 0.06),
      this.suitMat,
    );
    pouch.position.set(0.18, 0.14, 0);
    this.torsoGroup.add(pouch);

    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.46, 0.22),
      this.vestMat,
    );
    chest.position.set(0, 0.38, 0);
    this.torsoGroup.add(chest);

    const reflectiveMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const stripeFront1 = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.04, 0.225), reflectiveMat);
    stripeFront1.position.set(0, 0.32, 0);
    this.torsoGroup.add(stripeFront1);

    const stripeFront2 = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.04, 0.225), reflectiveMat);
    stripeFront2.position.set(0, 0.44, 0);
    this.torsoGroup.add(stripeFront2);

    // Head & Hard Hat
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.65, 0);
    this.torsoGroup.add(this.headGroup);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10),
      materials.workerSkinMat,
    );
    neck.position.set(0, 0.04, 0);
    this.headGroup.add(neck);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.2, 0.18),
      materials.workerSkinMat,
    );
    head.position.set(0, 0.16, 0);
    this.headGroup.add(head);

    const helmet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.13, 0.12, 16),
      this.helmetMat,
    );
    helmet.position.set(0, 0.25, 0.01);
    this.headGroup.add(helmet);

    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16),
      this.helmetMat,
    );
    brim.position.set(0, 0.2, 0.03);
    this.headGroup.add(brim);

    // Left Arm
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.24, 0.54, 0);
    this.torsoGroup.add(this.leftArmPivot);

    const leftUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.045, 0.28, 10),
      this.suitMat,
    );
    leftUpperArm.position.set(0, -0.14, 0);
    this.leftArmPivot.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.04, 0.28, 10),
      this.suitMat,
    );
    leftForearm.position.set(0, -0.38, 0);
    this.leftArmPivot.add(leftForearm);

    const leftHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      materials.workerSkinMat,
    );
    leftHand.position.set(0, -0.52, 0);
    this.leftArmPivot.add(leftHand);

    // Right Arm
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.24, 0.54, 0);
    this.torsoGroup.add(this.rightArmPivot);

    const rightUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.045, 0.28, 10),
      this.suitMat,
    );
    rightUpperArm.position.set(0, -0.14, 0);
    this.rightArmPivot.add(rightUpperArm);

    this.rightForearm = new THREE.Group();
    this.rightForearm.position.set(0, -0.26, 0);
    this.rightArmPivot.add(this.rightForearm);

    const rightForearmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.04, 0.28, 10),
      this.suitMat,
    );
    rightForearmMesh.position.set(0, -0.12, 0);
    this.rightForearm.add(rightForearmMesh);

    const rightHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      materials.workerSkinMat,
    );
    rightHand.position.set(0, -0.26, 0);
    this.rightForearm.add(rightHand);

    // Wireless Barcode Scanner Gun
    this.scannerGroup = new THREE.Group();
    this.scannerGroup.position.set(0, -0.28, 0.06);
    this.rightForearm.add(this.scannerGroup);

    const scannerBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.12, 0.14),
      materials.tireMat,
    );
    this.scannerGroup.add(scannerBody);

    const scannerTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 }),
    );
    scannerTip.position.set(0, 0.02, 0.08);
    this.scannerGroup.add(scannerTip);

    const laserGeom = new THREE.CylinderGeometry(0.005, 0.015, 2.2, 6);
    laserGeom.rotateX(Math.PI / 2);
    laserGeom.translate(0, 0, 1.1);
    this.laserBeam = new THREE.Mesh(laserGeom, materials.laserBeamMat);
    this.laserBeam.visible = false;
    this.scannerGroup.add(this.laserBeam);

    // Carried Carton Box
    this.carriedBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.32, 0.38),
      new THREE.MeshStandardMaterial({
        map: getCartonBoxTexture('#f59e0b', 'PKG-572', 'طرد توزيع دوائي'),
        roughness: 0.7,
      }),
    );
    this.carriedBox.position.set(0, 0.44, 0.34);
    this.carriedBox.visible = false;
    this.torsoGroup.add(this.carriedBox);

    // Soft contact shadow circle beneath feet
    const shadowGeo = new THREE.CircleGeometry(0.38, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.01;
    this.group.add(shadow);
  }

  public updateAppearance(config: WorkerConfig) {
    this.vestMat.color.set(config.vestColor || '#84cc16');
    this.helmetMat.color.set(config.helmetColor || '#facc15');
    this.suitMat.color.set(config.suitColor || '#1e293b');

    const boxSig = `${config.carriedBoxColor}|${config.carriedBoxCode}`;
    if (boxSig !== this.lastBoxSignature) {
      this.lastBoxSignature = boxSig;
      const mat = this.carriedBox.material as THREE.MeshStandardMaterial;
      mat.map = getCartonBoxTexture(config.carriedBoxColor || '#f59e0b', config.carriedBoxCode || 'PKG-572');
      mat.needsUpdate = true;
    }
  }

  public update(
    dt: number,
    isWalking: boolean,
    walkSpeed: number,
    actionState: 'IDLE' | 'WALKING' | 'SCANNING' | 'PICKING' | 'REACHING_HIGH' | 'BENDING_LOW',
    actionProgress: number,
    carryingBox: boolean,
  ) {
    this.carriedBox.visible = carryingBox;

    if (isWalking) {
      this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, walkSpeed, 8, dt);
      this.walkCycleTime += dt * this.currentSpeed * 6.5;

      const legAngle = Math.sin(this.walkCycleTime) * 0.65;
      this.leftLegPivot.rotation.x = legAngle;
      this.rightLegPivot.rotation.x = -legAngle;

      if (carryingBox) {
        this.leftArmPivot.rotation.x = -0.7;
        this.rightArmPivot.rotation.x = -0.7;
        this.rightForearm.rotation.x = -0.4;
      } else {
        this.leftArmPivot.rotation.x = -legAngle * 0.75;
        this.rightArmPivot.rotation.x = legAngle * 0.75;
        this.rightForearm.rotation.x = 0;
      }

      this.rootGroup.position.y = Math.abs(Math.sin(this.walkCycleTime * 2)) * 0.035;
      this.torsoGroup.rotation.y = Math.sin(this.walkCycleTime) * 0.08;
      this.laserBeam.visible = false;
    } else {
      this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, 0, 10, dt);
      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, 0, 8, dt);
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, 0, 8, dt);
      this.rootGroup.position.y = THREE.MathUtils.damp(this.rootGroup.position.y, 0, 8, dt);

      if (actionState === 'SCANNING') {
        this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, -1.35, 8, dt);
        this.rightArmPivot.rotation.y = THREE.MathUtils.damp(this.rightArmPivot.rotation.y, -0.2, 8, dt);
        this.rightForearm.rotation.x = THREE.MathUtils.damp(this.rightForearm.rotation.x, -0.3, 8, dt);
        this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, -0.2, 8, dt);
        this.laserBeam.visible = true;
        this.laserBeam.scale.y = 0.9 + Math.sin(Date.now() * 0.02) * 0.1;
      } else if (actionState === 'REACHING_HIGH') {
        this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, -2.4, 6, dt);
        this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, -2.4, 6, dt);
        this.torsoGroup.rotation.x = THREE.MathUtils.damp(this.torsoGroup.rotation.x, -0.15, 6, dt);
        this.laserBeam.visible = false;
      } else if (actionState === 'BENDING_LOW') {
        this.torsoGroup.rotation.x = THREE.MathUtils.damp(this.torsoGroup.rotation.x, 0.65, 6, dt);
        this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, 0.2, 6, dt);
        this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, 0.2, 6, dt);
        this.rootGroup.position.y = THREE.MathUtils.damp(this.rootGroup.position.y, -0.22, 6, dt);
        this.laserBeam.visible = false;
      } else if (actionState === 'PICKING') {
        this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, -0.9, 6, dt);
        this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, -0.9, 6, dt);
        this.laserBeam.visible = false;
      } else {
        this.rightArmPivot.rotation.x = THREE.MathUtils.damp(
          this.rightArmPivot.rotation.x,
          carryingBox ? -0.7 : -0.1,
          6,
          dt,
        );
        this.leftArmPivot.rotation.x = THREE.MathUtils.damp(
          this.leftArmPivot.rotation.x,
          carryingBox ? -0.7 : -0.1,
          6,
          dt,
        );
        this.torsoGroup.rotation.x = THREE.MathUtils.damp(this.torsoGroup.rotation.x, 0, 6, dt);
        this.torsoGroup.rotation.y = THREE.MathUtils.damp(this.torsoGroup.rotation.y, 0, 6, dt);
        this.laserBeam.visible = false;
      }
    }
  }
}

/**
 * Creates heavy-duty OSHA industrial pallet rack or wooden wall cabinet
 * Supports arbitrary full-wall widths, 360-degree rotation, custom finishes,
 * high-DPI carton boxes, and 3D shelf-edge cell plaques.
 */
export function createRackModel(
  rack: WarehouseRack,
  materials: WarehouseMaterials,
  selectedCell?: { level: number; slot: number } | null,
  fefoRadar?: FefoRadarConfig,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Rack_${rack.id}`;
  group.userData = { id: rack.id, type: 'RACK', rack };

  const rw = Math.max(0.6, rack.w || 2.4);
  const rd = Math.max(0.3, rack.d || (rack.rackType === 'WOODEN_CABINET' ? 0.65 : 1.0));
  const levels = Math.max(1, rack.levels || 4);
  const rh = Math.max(1.0, rack.h || (rack.rackType === 'WOODEN_CABINET' ? 2.6 : 2.2 + levels * 0.4));
  const cellsCount = Math.max(1, rack.cellsPerLevel || 3);
  const isCold = rack.storageType === 'COLD' || rack.zone.toUpperCase().includes('COLD');
  const isQuarantine = rack.storageType === 'QUARANTINE';
  const isWooden = rack.rackType === 'WOODEN_CABINET';
  const isFefoEnabled = Boolean(fefoRadar?.enabled);

  const KRAFT_PALETTE = ['#d97706', '#b45309', '#f59e0b', '#fdba74', '#10b981', '#06b6d4', '#8b5cf6'];

  const matchesFefoFilter = (tier: 'EXPIRED' | 'CRITICAL_30D' | 'WARNING_90D' | 'SAFE') => {
    if (!isFefoEnabled || !fefoRadar) return false;
    if (fefoRadar.filter === 'EXPIRED_ONLY') return tier === 'EXPIRED';
    if (fefoRadar.filter === 'WITHIN_30_DAYS') return tier === 'EXPIRED' || tier === 'CRITICAL_30D';
    if (fefoRadar.filter === 'WITHIN_90_DAYS' || fefoRadar.filter === 'ALL_CRITICAL') return tier !== 'SAFE';
    return true;
  };

  if (isWooden) {
    // ==========================================
    // 🪵 WOODEN PHARMACEUTICAL WALL CABINET / FULL-WALL SHELF
    // ==========================================
    const woodMat = rack.materialFinish
      ? materials.getRackMaterialByFinish(rack.materialFinish, rack.customColor)
      : rack.customColor
      ? new THREE.MeshStandardMaterial({ color: rack.customColor, roughness: 0.48, metalness: 0.1 })
      : materials.woodCabinetMat;
    const dividerMat = materials.woodDividerMat;

    // 1. Backing panel
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, 0.035), woodMat);
    backWall.position.set(0, rh / 2, -rd / 2 + 0.018);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);

    // 2. Left & Right solid wooden side panels
    const sideGeo = new THREE.BoxGeometry(0.045, rh, rd);
    const leftSide = new THREE.Mesh(sideGeo, woodMat);
    leftSide.position.set(-rw / 2 + 0.0225, rh / 2, 0);
    leftSide.castShadow = true;
    group.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeo, woodMat);
    rightSide.position.set(rw / 2 - 0.0225, rh / 2, 0);
    rightSide.castShadow = true;
    group.add(rightSide);

    // 3. Top crown board & bottom plinth base
    const topBoard = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.04, 0.06, rd + 0.04), woodMat);
    topBoard.position.set(0, rh - 0.03, 0);
    topBoard.castShadow = true;
    group.add(topBoard);

    const bottomPlinth = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.02, 0.08, rd + 0.02), woodMat);
    bottomPlinth.position.set(0, 0.04, 0);
    bottomPlinth.receiveShadow = true;
    group.add(bottomPlinth);

    // 4. Horizontal wooden shelves, dividers, 3D cell plaques, and medicine cartons
    const tierH = (rh - 0.16) / levels;
    const shelfGeo = new THREE.BoxGeometry(rw - 0.08, 0.035, rd - 0.02);
    const slotW = (rw - 0.08) / cellsCount;

    for (let l = 0; l < levels; l++) {
      const levelNum = l + 1;
      const shelfY = 0.08 + l * tierH;

      const shelf = new THREE.Mesh(shelfGeo, woodMat);
      shelf.position.set(0, shelfY, 0);
      shelf.receiveShadow = true;
      group.add(shelf);

      for (let d = 1; d < cellsCount; d++) {
        const divX = -rw / 2 + 0.04 + d * slotW;
        const div = new THREE.Mesh(new THREE.BoxGeometry(0.025, tierH - 0.035, rd - 0.04), dividerMat);
        div.position.set(divX, shelfY + (tierH - 0.035) / 2 + 0.018, 0);
        group.add(div);
      }

      for (let c = 0; c < cellsCount; c++) {
        const slotNum = c + 1;
        const cellData = resolveRackCell(rack, levelNum, slotNum);
        const isOccupied = cellData.occupied !== false;
        const isThisCellSelected = Boolean(
          selectedCell && selectedCell.level === levelNum && selectedCell.slot === slotNum,
        );
        const movCat = cellData.movementCategory || 'AVAILABLE';
        const fefoEval = computeCellExpiryStatus(cellData.expiryDate, movCat);
        const isFefoTarget = isOccupied && matchesFefoFilter(fefoEval.tier) && fefoEval.tier !== 'SAFE';
        const popOutZ = isThisCellSelected ? 0.26 : isFefoTarget ? 0.11 : 0;

        const bx = -rw / 2 + 0.04 + c * slotW + slotW / 2;
        const boxW = Math.max(0.14, slotW * 0.78);
        const maxBoxH = tierH * 0.72;
        const fillScale = cellData.capacity && cellData.quantity
          ? Math.max(0.45, Math.min(1.0, 0.4 + (cellData.quantity / cellData.capacity) * 0.6))
          : 0.85;
        const boxH = maxBoxH * fillScale;
        const boxD = Math.max(0.14, rd * 0.76);

        // High-DPI 4K 3D Cell Label Plaque on front shelf edge
        const plaqueW = Math.min(0.42, slotW * 0.86);
        const plaqueH = 0.068;
        const plaqueTex = getCellPlaqueTexture(
          cellData.code,
          cellData.productName || '',
          !isOccupied,
          isThisCellSelected,
          movCat,
        );
        const plaqueMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(plaqueW, plaqueH),
          new THREE.MeshBasicMaterial({ map: plaqueTex }),
        );
        plaqueMesh.position.set(bx, shelfY + 0.005, rd / 2 + 0.005 + popOutZ);
        plaqueMesh.userData = {
          isCarton: true,
          rackId: rack.id,
          cellCode: cellData.code,
          level: levelNum,
          slot: slotNum,
          cellData,
        };
        group.add(plaqueMesh);

        if (isOccupied) {
          const defaultColor =
            movCat === 'EXPIRED'
              ? '#e11d48'
              : movCat === 'ORDER_PICK'
              ? '#0284c7'
              : movCat === 'RETURNED'
              ? '#9333ea'
              : isCold
              ? '#06b6d4'
              : isQuarantine
              ? '#ef4444'
              : KRAFT_PALETTE[(l * 3 + c) % KRAFT_PALETTE.length];
          const cellMeds = getCellMedicines(cellData);
          const arrangementMode = cellData.arrangementMode || 'MATRIX_2D';
          const matrixLayout = computeCellMatrixLayout(
            cellMeds.length,
            cellData.matrixCols,
            cellData.matrixRows,
            arrangementMode,
            cellData.matrixLayersY,
          );
          const cols = Math.max(1, matrixLayout.cols);
          const rows = Math.max(1, matrixLayout.rows);
          const layersY = Math.max(1, matrixLayout.layersY);

          // In our pharmaceutical shelf Matrix, rows stack vertically one above the next (واحد فوق التالي)
          // on horizontal wooden boards (أخشاب فوق بعضها), while columns span horizontally along X!
          const isDepthFileMode = arrangementMode === 'DEPTH_FILE';
          const verticalTiers = isDepthFileMode ? Math.max(1, layersY) : Math.max(rows, layersY);
          const depthRows = isDepthFileMode ? Math.max(rows, layersY) : Math.max(1, layersY > rows ? layersY : 1);

          const gapX = cols > 1 ? (cellData.gapX ?? 0.016) : 0;
          const gapZ = depthRows > 1 ? (cellData.gapZ ?? 0.018) : 0;
          const gapY = verticalTiers > 1 ? (cellData.gapY ?? 0.01) : 0;
          const cScale = Math.max(0.35, Math.min(1.2, cellData.cartonScale ?? 1.0));
          const cRotRad = ((cellData.cartonRotationDeg ?? 0) * Math.PI) / 180;
          const align = cellData.cellAlignment || 'CENTER';
          const fillDir = cellData.fillDirection || 'ROW_FIRST';
          const showDivs = cellData.showInternalDividers !== false;
          const divHRatio = Math.max(0.2, Math.min(1.0, cellData.dividerHeightRatio ?? 0.78));
          const staggerRatio = cellData.staggerOffsetRatio ?? 0.25;

          const woodBoardThick = showDivs ? 0.014 * Math.max(0.6, divHRatio) : 0.008;
          const tierSpanY = boxH / verticalTiers;

          const rawSubBoxW = Math.max(0.05, (boxW - gapX * (cols - 1)) / cols);
          const rawSubBoxD = Math.max(0.05, (boxD - gapZ * (depthRows - 1)) / depthRows);
          const rawSubBoxH = Math.max(0.042, tierSpanY - woodBoardThick - gapY);

          const subBoxW = rawSubBoxW * cScale;
          const subBoxD = rawSubBoxD * cScale;

          const alignOffsetX =
            align === 'LEFT' ? -boxW * 0.08 : align === 'RIGHT' ? boxW * 0.08 : 0;
          const alignOffsetZ =
            align === 'FRONT' ? boxD * 0.08 : align === 'BACK' ? -boxD * 0.08 : 0;
          const baseCenterZ = 0.02 + popOutZ + alignOffsetZ;
          const cellBaseY = shelfY + 0.032;

          // Render Horizontal Stacked Wooden Shelf Boards (أخشاب أفقية فوق بعضها واحد فوق التالي)
          if (showDivs) {
            for (let vTier = 0; vTier < verticalTiers; vTier++) {
              const boardY = cellBaseY + vTier * tierSpanY + woodBoardThick / 2;
              const woodPlank = new THREE.Mesh(
                new THREE.BoxGeometry(boxW * 1.03, woodBoardThick, boxD * 0.96),
                materials.woodCabinetMat,
              );
              woodPlank.position.set(bx + alignOffsetX, boardY, baseCenterZ);
              woodPlank.castShadow = true;
              woodPlank.receiveShadow = true;
              group.add(woodPlank);

              // Warm Walnut front edge trim on each horizontal wooden board
              const frontLip = new THREE.Mesh(
                new THREE.BoxGeometry(boxW * 1.035, woodBoardThick * 1.15, 0.012),
                materials.woodDividerMat,
              );
              frontLip.position.set(
                bx + alignOffsetX,
                boardY,
                baseCenterZ + (boxD * 0.96) / 2 + 0.004,
              );
              group.add(frontLip);
            }
          }

          cellMeds.forEach((med, mIdx) => {
            const perDepthLayer = cols * verticalTiers;
            const autoColIdx =
              fillDir === 'COL_FIRST'
                ? Math.floor((mIdx % perDepthLayer) / verticalTiers)
                : mIdx % cols;
            const autoTierIdx =
              fillDir === 'COL_FIRST'
                ? mIdx % verticalTiers
                : Math.floor((mIdx % perDepthLayer) / cols);

            const colIdx =
              typeof med.matrixCol === 'number' && med.matrixCol >= 1 && med.matrixCol <= cols
                ? med.matrixCol - 1
                : Math.min(cols - 1, autoColIdx);

            const rawRowOrLayer =
              typeof med.matrixLayerY === 'number' && med.matrixLayerY >= 1
                ? med.matrixLayerY - 1
                : typeof med.matrixRow === 'number' && med.matrixRow >= 1
                ? med.matrixRow - 1
                : autoTierIdx;

            const verticalTierIdx = isDepthFileMode
              ? Math.min(verticalTiers - 1, Math.floor(mIdx / (cols * depthRows)))
              : Math.min(verticalTiers - 1, rawRowOrLayer);

            const depthIdx = isDepthFileMode
              ? Math.min(depthRows - 1, rawRowOrLayer)
              : Math.min(depthRows - 1, Math.floor(mIdx / perDepthLayer));

            const hexOffsetX =
              arrangementMode === 'STAGGERED_HEX' && verticalTierIdx % 2 === 1
                ? rawSubBoxW * staggerRatio
                : 0;

            const subX =
              (cols === 1
                ? bx
                : bx - boxW / 2 + rawSubBoxW / 2 + colIdx * (rawSubBoxW + gapX)) +
              alignOffsetX +
              hexOffsetX;

            const subZ =
              depthRows === 1
                ? baseCenterZ
                : baseCenterZ + (boxD / 2 - rawSubBoxD / 2) - depthIdx * (rawSubBoxD + gapZ);

            const medMovCat = med.movementCategory || movCat;
            const medColorHex =
              med.color ||
              cellData.color ||
              (mIdx === 0 ? defaultColor : KRAFT_PALETTE[(l * 3 + c + mIdx) % KRAFT_PALETTE.length]);
            const boxTex = getCartonBoxTexture(
              medColorHex,
              med.subSlotCode || `${cellData.code}/R${verticalTierIdx + 1}-C${colIdx + 1}`,
              med.productName || cellData.productName || '',
              {
                barcode: med.barcode || cellData.barcode,
                batchNumber: med.batchNumber || cellData.batchNumber,
                expiryDate: med.expiryDate || cellData.expiryDate,
                movementCategory: medMovCat,
                isSelected: isThisCellSelected,
                fefoTier: isFefoEnabled ? fefoEval.tier : undefined,
                fefoDaysText: isFefoEnabled ? fefoEval.labelAr : undefined,
              },
            );

            const shouldDim =
              isFefoEnabled &&
              fefoRadar?.dimSafeCells &&
              !matchesFefoFilter(fefoEval.tier) &&
              !isThisCellSelected;

            const baseItemOpacity = Math.max(
              0.12,
              Math.min(1.0, med.opacity ?? cellData.cellOpacity ?? 1.0),
            );
            const effectiveOpacity = shouldDim ? Math.min(0.24, baseItemOpacity) : baseItemOpacity;
            const isTransparent = effectiveOpacity < 0.99;

            const boxMat = new THREE.MeshStandardMaterial({
              map: boxTex,
              roughness: isTransparent ? 0.25 : 0.48,
              metalness: 0.08,
              transparent: isTransparent,
              opacity: effectiveOpacity,
              depthWrite: effectiveOpacity >= 0.85,
              emissive: isThisCellSelected
                ? new THREE.Color(0x06b6d4)
                : isFefoTarget
                ? new THREE.Color(fefoEval.colorHex)
                : medMovCat === 'EXPIRED'
                ? new THREE.Color(0x881337)
                : new THREE.Color(0x000000),
              emissiveIntensity: isThisCellSelected
                ? 0.38
                : isFefoTarget
                ? 0.42
                : medMovCat === 'EXPIRED'
                ? 0.2
                : 0,
            });

            const subBoxH = rawSubBoxH * cScale;
            const subY =
              cellBaseY + verticalTierIdx * tierSpanY + woodBoardThick + subBoxH / 2;
            const box = new THREE.Mesh(new THREE.BoxGeometry(subBoxW, subBoxH, subBoxD), boxMat);
            box.position.set(subX, subY, subZ);
            if (cRotRad !== 0) {
              box.rotation.y = cRotRad;
            }
            box.castShadow = !isTransparent;
            box.receiveShadow = true;
            box.userData = {
              isCarton: true,
              isCartonBoxMesh: true,
              baseOpacity: effectiveOpacity,
              rackId: rack.id,
              cellCode: cellData.code,
              level: levelNum,
              slot: slotNum,
              cellData,
              medicineIndex: mIdx,
              matrixRow: verticalTierIdx + 1,
              matrixCol: colIdx + 1,
              matrixLayerY: verticalTierIdx + 1,
            };
            group.add(box);
          });

          if (isFefoTarget && fefoRadar?.pulseBeacons) {
            const beaconHalo = new THREE.Mesh(
              new THREE.BoxGeometry(boxW + 0.04, boxH + 0.04, boxD + 0.04),
              new THREE.MeshBasicMaterial({
                color: fefoEval.colorHex,
                wireframe: true,
                transparent: true,
                opacity: 0.9,
              }),
            );
            beaconHalo.position.set(bx, shelfY + 0.035 + boxH / 2, 0.02 + popOutZ);
            group.add(beaconHalo);
          }
        } else {
          const emptySlotMat = new THREE.MeshBasicMaterial({
            color: isThisCellSelected ? 0x22d3ee : 0x78350f,
            transparent: true,
            opacity: isThisCellSelected ? 0.55 : 0.18,
          });
          const emptyPad = new THREE.Mesh(new THREE.BoxGeometry(boxW, 0.025, boxD), emptySlotMat);
          emptyPad.position.set(bx, shelfY + 0.045, 0.02 + popOutZ);
          emptyPad.userData = {
            isCarton: true,
            rackId: rack.id,
            cellCode: cellData.code,
            level: levelNum,
            slot: slotNum,
            cellData,
          };
          group.add(emptyPad);
        }

        if (isThisCellSelected) {
          // Sliding pull-out tray base beneath extruded cell
          const tray = new THREE.Mesh(
            new THREE.BoxGeometry(boxW + 0.06, 0.024, boxD + 0.12),
            new THREE.MeshBasicMaterial({ color: 0x06b6d4 }),
          );
          tray.position.set(bx, shelfY + 0.022, 0.02 + popOutZ);
          group.add(tray);

          const highlightH = isOccupied ? boxH + 0.06 : tierH * 0.7;
          const cellHaloGeo = new THREE.BoxGeometry(boxW + 0.06, highlightH, boxD + 0.06);
          const cellHaloMat = new THREE.MeshBasicMaterial({
            color: 0x22d3ee,
            wireframe: true,
            transparent: true,
            opacity: 0.98,
          });
          const cellHalo = new THREE.Mesh(cellHaloGeo, cellHaloMat);
          cellHalo.position.set(bx, shelfY + 0.035 + highlightH / 2, 0.02 + popOutZ);
          group.add(cellHalo);
        }
      }
    }
  } else {
    // ==========================================
    // 🏗️ STEEL INDUSTRIAL PALLET RACK (Full-Wall Expandable)
    // ==========================================
    let postMat: THREE.Material = rack.materialFinish
      ? materials.getRackMaterialByFinish(rack.materialFinish, rack.customColor)
      : isCold
      ? materials.coldPostMat
      : materials.postMat;
    let beamMat: THREE.Material = isCold ? materials.coldBeamMat : materials.beamMat;

    if (rack.customColor && !rack.materialFinish) {
      postMat = new THREE.MeshStandardMaterial({
        color: rack.customColor,
        roughness: 0.32,
        metalness: 0.68,
      });
    } else if (isQuarantine) {
      postMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.35,
        metalness: 0.65,
      });
      beamMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.35,
        metalness: 0.55,
      });
    }

    // 1. Vertical upright slotted steel columns (including automatic intermediate bays for wide full-wall racks!)
    const postGeom = new THREE.BoxGeometry(0.09, rh, 0.09);
    const numBays = Math.max(1, Math.round(rw / 2.6));
    const baySpan = (rw - 0.09) / numBays;
    const braceMat = materials.steelMastMat;

    for (let b = 0; b <= numBays; b++) {
      const ox = -rw / 2 + 0.045 + b * baySpan;
      [-rd / 2 + 0.045, rd / 2 - 0.045].forEach((oz) => {
        const post = new THREE.Mesh(postGeom, postMat);
        post.position.set(ox, rh / 2, oz);
        post.castShadow = true;
        post.receiveShadow = true;
        group.add(post);

        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.16), materials.tireMat);
        foot.position.set(ox, 0.0125, oz);
        group.add(foot);
      });

      // Diagonal frame bracing on each upright frame
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, rh * 1.02, 8), braceMat);
      brace.position.set(ox, rh / 2, 0);
      brace.rotation.x = (b % 2 === 0 ? 1 : -1) * Math.atan2(rd, rh);
      group.add(brace);
    }

    // 2. Tiers, Beams, Pallets, 4K 3D Plaques, and Individual Editable Cartons
    const tierH = (rh - 0.35) / levels;
    const palletGeom = new THREE.BoxGeometry(rw - 0.12, 0.06, rd - 0.12);
    const beamGeomX = new THREE.BoxGeometry(rw, 0.09, 0.05);

    for (let l = 0; l < levels; l++) {
      const levelNum = l + 1;
      const y = 0.2 + l * tierH;

      const frontBeam = new THREE.Mesh(beamGeomX, beamMat);
      frontBeam.position.set(0, y, rd / 2 - 0.025);
      frontBeam.castShadow = true;
      group.add(frontBeam);

      const backBeam = new THREE.Mesh(beamGeomX, beamMat);
      backBeam.position.set(0, y, -rd / 2 + 0.025);
      backBeam.castShadow = true;
      group.add(backBeam);

      const pallet = new THREE.Mesh(palletGeom, materials.palletMat);
      pallet.position.set(0, y + 0.06, 0);
      pallet.receiveShadow = true;
      group.add(pallet);

      const slotWidth = (rw - 0.2) / cellsCount;
      for (let c = 0; c < cellsCount; c++) {
        const slotNum = c + 1;
        const cellData = resolveRackCell(rack, levelNum, slotNum);
        const isOccupied = cellData.occupied !== false;
        const isThisCellSelected = Boolean(
          selectedCell && selectedCell.level === levelNum && selectedCell.slot === slotNum,
        );
        const movCat = cellData.movementCategory || 'AVAILABLE';
        const fefoEval = computeCellExpiryStatus(cellData.expiryDate, movCat);
        const isFefoTarget = isOccupied && matchesFefoFilter(fefoEval.tier) && fefoEval.tier !== 'SAFE';
        const popOutZ = isThisCellSelected ? 0.32 : isFefoTarget ? 0.14 : 0;

        const bx = -rw / 2 + 0.1 + c * slotWidth + slotWidth / 2;
        const boxW = Math.max(0.16, slotWidth * 0.82);
        const fillScale = cellData.capacity && cellData.quantity
          ? Math.max(0.45, Math.min(1.15, 0.5 + (cellData.quantity / cellData.capacity) * 0.5))
          : 1.0;
        const boxH = tierH * 0.65 * fillScale;
        const boxD = Math.max(0.16, rd * 0.76);

        // 4K 3D Shelf Beam Cell Plaque mounted directly on front orange beam under the box
        const plaqueW = Math.min(0.46, slotWidth * 0.88);
        const plaqueH = 0.078;
        const plaqueTex = getCellPlaqueTexture(
          cellData.code,
          cellData.productName || '',
          !isOccupied,
          isThisCellSelected,
          movCat,
        );
        const plaqueFront = new THREE.Mesh(
          new THREE.PlaneGeometry(plaqueW, plaqueH),
          new THREE.MeshBasicMaterial({ map: plaqueTex }),
        );
        plaqueFront.position.set(bx, y, rd / 2 + 0.005 + popOutZ);
        plaqueFront.userData = {
          isCarton: true,
          rackId: rack.id,
          cellCode: cellData.code,
          level: levelNum,
          slot: slotNum,
          cellData,
        };
        group.add(plaqueFront);

        // Also mount plaque on the back beam so it's readable from 360 degrees
        const plaqueBack = new THREE.Mesh(
          new THREE.PlaneGeometry(plaqueW, plaqueH),
          new THREE.MeshBasicMaterial({ map: plaqueTex }),
        );
        plaqueBack.rotation.y = Math.PI;
        plaqueBack.position.set(bx, y, -rd / 2 - 0.005);
        plaqueBack.userData = plaqueFront.userData;
        group.add(plaqueBack);

        if (isOccupied) {
          const defaultColor =
            movCat === 'EXPIRED'
              ? '#e11d48'
              : movCat === 'ORDER_PICK'
              ? '#0284c7'
              : movCat === 'RETURNED'
              ? '#9333ea'
              : isCold
              ? '#06b6d4'
              : isQuarantine
              ? '#ef4444'
              : KRAFT_PALETTE[(l * 3 + c) % KRAFT_PALETTE.length];
          const cellMeds = getCellMedicines(cellData);
          const arrangementMode = cellData.arrangementMode || 'MATRIX_2D';
          const matrixLayout = computeCellMatrixLayout(
            cellMeds.length,
            cellData.matrixCols,
            cellData.matrixRows,
            arrangementMode,
            cellData.matrixLayersY,
          );
          const cols = Math.max(1, matrixLayout.cols);
          const rows = Math.max(1, matrixLayout.rows);
          const layersY = Math.max(1, matrixLayout.layersY);

          // Stack rows vertically one above the next (واحد فوق التالي) on horizontal wooden boards (أخشاب فوق بعضها)
          const isDepthFileMode = arrangementMode === 'DEPTH_FILE';
          const verticalTiers = isDepthFileMode ? Math.max(1, layersY) : Math.max(rows, layersY);
          const depthRows = isDepthFileMode ? Math.max(rows, layersY) : Math.max(1, layersY > rows ? layersY : 1);

          const gapX = cols > 1 ? (cellData.gapX ?? 0.018) : 0;
          const gapZ = depthRows > 1 ? (cellData.gapZ ?? 0.02) : 0;
          const gapY = verticalTiers > 1 ? (cellData.gapY ?? 0.01) : 0;
          const cScale = Math.max(0.35, Math.min(1.2, cellData.cartonScale ?? 1.0));
          const cRotRad = ((cellData.cartonRotationDeg ?? 0) * Math.PI) / 180;
          const align = cellData.cellAlignment || 'CENTER';
          const fillDir = cellData.fillDirection || 'ROW_FIRST';
          const showDivs = cellData.showInternalDividers !== false;
          const divHRatio = Math.max(0.2, Math.min(1.0, cellData.dividerHeightRatio ?? 0.85));
          const staggerRatio = cellData.staggerOffsetRatio ?? 0.25;

          const woodBoardThick = showDivs ? 0.016 * Math.max(0.6, divHRatio) : 0.008;
          const tierSpanY = boxH / verticalTiers;

          const rawSubBoxW = Math.max(0.05, (boxW - gapX * (cols - 1)) / cols);
          const rawSubBoxD = Math.max(0.05, (boxD - gapZ * (depthRows - 1)) / depthRows);
          const rawSubBoxH = Math.max(0.045, tierSpanY - woodBoardThick - gapY);

          const subBoxW = rawSubBoxW * cScale;
          const subBoxD = rawSubBoxD * cScale;

          const alignOffsetX =
            align === 'LEFT' ? -boxW * 0.08 : align === 'RIGHT' ? boxW * 0.08 : 0;
          const alignOffsetZ =
            align === 'FRONT' ? boxD * 0.08 : align === 'BACK' ? -boxD * 0.08 : 0;
          const baseCenterZ = popOutZ + alignOffsetZ;
          const cellBaseY = y + 0.088;

          // Render Horizontal Stacked Wooden Shelf Boards (أخشاب أفقية فوق بعضها واحد فوق التالي)
          if (showDivs) {
            for (let vTier = 0; vTier < verticalTiers; vTier++) {
              const boardY = cellBaseY + vTier * tierSpanY + woodBoardThick / 2;
              const woodPlank = new THREE.Mesh(
                new THREE.BoxGeometry(boxW * 1.03, woodBoardThick, boxD * 0.96),
                materials.woodCabinetMat,
              );
              woodPlank.position.set(bx + alignOffsetX, boardY, baseCenterZ);
              woodPlank.castShadow = true;
              woodPlank.receiveShadow = true;
              group.add(woodPlank);

              // Warm Walnut front edge trim on each horizontal wooden board
              const frontLip = new THREE.Mesh(
                new THREE.BoxGeometry(boxW * 1.035, woodBoardThick * 1.15, 0.014),
                materials.woodDividerMat,
              );
              frontLip.position.set(
                bx + alignOffsetX,
                boardY,
                baseCenterZ + (boxD * 0.96) / 2 + 0.005,
              );
              group.add(frontLip);
            }
          }

          cellMeds.forEach((med, mIdx) => {
            const perDepthLayer = cols * verticalTiers;
            const autoColIdx =
              fillDir === 'COL_FIRST'
                ? Math.floor((mIdx % perDepthLayer) / verticalTiers)
                : mIdx % cols;
            const autoTierIdx =
              fillDir === 'COL_FIRST'
                ? mIdx % verticalTiers
                : Math.floor((mIdx % perDepthLayer) / cols);

            const colIdx =
              typeof med.matrixCol === 'number' && med.matrixCol >= 1 && med.matrixCol <= cols
                ? med.matrixCol - 1
                : Math.min(cols - 1, autoColIdx);

            const rawRowOrLayer =
              typeof med.matrixLayerY === 'number' && med.matrixLayerY >= 1
                ? med.matrixLayerY - 1
                : typeof med.matrixRow === 'number' && med.matrixRow >= 1
                ? med.matrixRow - 1
                : autoTierIdx;

            const verticalTierIdx = isDepthFileMode
              ? Math.min(verticalTiers - 1, Math.floor(mIdx / (cols * depthRows)))
              : Math.min(verticalTiers - 1, rawRowOrLayer);

            const depthIdx = isDepthFileMode
              ? Math.min(depthRows - 1, rawRowOrLayer)
              : Math.min(depthRows - 1, Math.floor(mIdx / perDepthLayer));

            const hexOffsetX =
              arrangementMode === 'STAGGERED_HEX' && verticalTierIdx % 2 === 1
                ? rawSubBoxW * staggerRatio
                : 0;

            const subX =
              (cols === 1
                ? bx
                : bx - boxW / 2 + rawSubBoxW / 2 + colIdx * (rawSubBoxW + gapX)) +
              alignOffsetX +
              hexOffsetX;
            const subZ =
              depthRows === 1
                ? baseCenterZ
                : baseCenterZ + (boxD / 2 - rawSubBoxD / 2) - depthIdx * (rawSubBoxD + gapZ);

            const medMovCat = med.movementCategory || movCat;
            const medColorHex =
              med.color ||
              cellData.color ||
              (mIdx === 0 ? defaultColor : KRAFT_PALETTE[(l * 3 + c + mIdx) % KRAFT_PALETTE.length]);
            const boxTex = getCartonBoxTexture(
              medColorHex,
              med.subSlotCode || `${cellData.code}/R${verticalTierIdx + 1}-C${colIdx + 1}`,
              med.productName || cellData.productName || '',
              {
                barcode: med.barcode || cellData.barcode,
                batchNumber: med.batchNumber || cellData.batchNumber,
                expiryDate: med.expiryDate || cellData.expiryDate,
                movementCategory: medMovCat,
                isSelected: isThisCellSelected,
                fefoTier: isFefoEnabled ? fefoEval.tier : undefined,
                fefoDaysText: isFefoEnabled ? fefoEval.labelAr : undefined,
              },
            );

            const shouldDim =
              isFefoEnabled &&
              fefoRadar?.dimSafeCells &&
              !matchesFefoFilter(fefoEval.tier) &&
              !isThisCellSelected;

            const baseItemOpacity = Math.max(
              0.12,
              Math.min(1.0, med.opacity ?? cellData.cellOpacity ?? 1.0),
            );
            const effectiveOpacity = shouldDim ? Math.min(0.24, baseItemOpacity) : baseItemOpacity;
            const isTransparent = effectiveOpacity < 0.99;

            const boxMat = new THREE.MeshStandardMaterial({
              map: boxTex,
              roughness: isTransparent ? 0.25 : 0.48,
              metalness: 0.08,
              transparent: isTransparent,
              opacity: effectiveOpacity,
              depthWrite: effectiveOpacity >= 0.85,
              emissive: isThisCellSelected
                ? new THREE.Color(0x06b6d4)
                : isFefoTarget
                ? new THREE.Color(fefoEval.colorHex)
                : medMovCat === 'EXPIRED'
                ? new THREE.Color(0x881337)
                : new THREE.Color(0x000000),
              emissiveIntensity: isThisCellSelected
                ? 0.38
                : isFefoTarget
                ? 0.44
                : medMovCat === 'EXPIRED'
                ? 0.22
                : 0,
            });

            const subBoxH = rawSubBoxH * cScale;
            const subY = cellBaseY + verticalTierIdx * tierSpanY + woodBoardThick + subBoxH / 2;
            const box = new THREE.Mesh(new THREE.BoxGeometry(subBoxW, subBoxH, subBoxD), boxMat);
            box.position.set(subX, subY, subZ);
            if (cRotRad !== 0) {
              box.rotation.y = cRotRad;
            }
            box.castShadow = !isTransparent;
            box.receiveShadow = true;
            box.userData = {
              isCarton: true,
              isCartonBoxMesh: true,
              baseOpacity: effectiveOpacity,
              rackId: rack.id,
              cellCode: cellData.code,
              level: levelNum,
              slot: slotNum,
              cellData,
              medicineIndex: mIdx,
              matrixRow: verticalTierIdx + 1,
              matrixCol: colIdx + 1,
              matrixLayerY: verticalTierIdx + 1,
            };
            group.add(box);
          });

          if (isFefoTarget && fefoRadar?.pulseBeacons) {
            const beaconHalo = new THREE.Mesh(
              new THREE.BoxGeometry(boxW + 0.05, boxH + 0.05, boxD + 0.05),
              new THREE.MeshBasicMaterial({
                color: fefoEval.colorHex,
                wireframe: true,
                transparent: true,
                opacity: 0.92,
              }),
            );
            beaconHalo.position.set(bx, y + 0.09 + boxH / 2, popOutZ);
            group.add(beaconHalo);
          }
        } else {
          const emptySlotMat = new THREE.MeshBasicMaterial({
            color: isThisCellSelected ? 0x22d3ee : 0x475569,
            transparent: true,
            opacity: isThisCellSelected ? 0.6 : 0.25,
          });
          const emptyPad = new THREE.Mesh(new THREE.BoxGeometry(boxW, 0.04, boxD), emptySlotMat);
          emptyPad.position.set(bx, y + 0.11, popOutZ);
          emptyPad.userData = {
            isCarton: true,
            rackId: rack.id,
            cellCode: cellData.code,
            level: levelNum,
            slot: slotNum,
            cellData,
          };
          group.add(emptyPad);
        }

        if (isThisCellSelected) {
          // Extruded pull-out pallet tray under the selected cell
          const pullTray = new THREE.Mesh(
            new THREE.BoxGeometry(boxW + 0.08, 0.032, boxD + 0.14),
            new THREE.MeshBasicMaterial({ color: 0x06b6d4 }),
          );
          pullTray.position.set(bx, y + 0.075, popOutZ);
          group.add(pullTray);

          const highlightH = isOccupied ? boxH + 0.09 : tierH * 0.5;
          const cellHaloGeo = new THREE.BoxGeometry(boxW + 0.09, highlightH, boxD + 0.09);
          const cellHaloMat = new THREE.MeshBasicMaterial({
            color: 0x22d3ee,
            wireframe: true,
            transparent: true,
            opacity: 0.98,
          });
          const cellHalo = new THREE.Mesh(cellHaloGeo, cellHaloMat);
          cellHalo.position.set(bx, y + 0.09 + highlightH / 2, popOutZ);
          group.add(cellHalo);
        }
      }
    }
  }

  // Position and Full 0-360 Degree Rotation
  group.position.set(rack.px, 0, rack.pz);
  const rotDeg = getRackRotationDeg(rack);
  group.rotation.y = (rotDeg * Math.PI) / 180;

  return group;
}

/**
 * Creates realistic industrial forklift truck.
 */
export function createForkliftModel(
  materials: WarehouseMaterials,
  customColor?: string,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Forklift';

  const bodyMat = customColor
    ? new THREE.MeshStandardMaterial({ color: customColor, roughness: 0.35, metalness: 0.45 })
    : materials.forkliftYellowMat;

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.1), bodyMat);
  body.position.set(0, 0.45, 0);
  body.castShadow = true;
  group.add(body);

  const counterweight = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.65, 1.06),
    materials.steelMastMat,
  );
  counterweight.position.set(-0.75, 0.45, 0);
  group.add(counterweight);

  const cagePillarGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8);
  const cageCorners = [
    [-0.3, -0.45],
    [0.35, -0.45],
    [-0.3, 0.45],
    [0.35, 0.45],
  ];
  cageCorners.forEach(([cx, cz]) => {
    const p = new THREE.Mesh(cagePillarGeo, materials.steelMastMat);
    p.position.set(cx, 1.35, cz);
    group.add(p);
  });
  const cageRoof = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 1.0), materials.tireMat);
  cageRoof.position.set(0.02, 1.95, 0);
  group.add(cageRoof);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), materials.tireMat);
  seat.position.set(-0.1, 0.95, 0);
  group.add(seat);

  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.8), materials.steelMastMat);
  mast.position.set(0.85, 1.0, 0);
  group.add(mast);

  const forkTines = [0.22, -0.22];
  forkTines.forEach((fz) => {
    const fork = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.1), materials.steelMastMat);
    fork.position.set(1.35, 0.12, fz);
    fork.castShadow = true;
    group.add(fork);
  });

  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16);
  wheelGeo.rotateX(Math.PI / 2);
  const wheelPositions = [
    [0.55, 0.22, 0.58],
    [0.55, 0.22, -0.58],
    [-0.55, 0.22, 0.58],
    [-0.55, 0.22, -0.58],
  ];
  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, materials.tireMat);
    wheel.position.set(wx, wy, wz);
    group.add(wheel);
  });

  return group;
}

/**
 * Creates roller conveyor line for shipping & receiving.
 */
export function createConveyorModel(
  length = 4.0,
  width = 0.8,
  materials: WarehouseMaterials,
  customColor?: string,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Conveyor';

  const rollerRadius = 0.035;
  const rollerGeo = new THREE.CylinderGeometry(rollerRadius, rollerRadius, width - 0.08, 12);
  rollerGeo.rotateX(Math.PI / 2);
  const rollerMat = materials.steelMastMat;

  const rollerSpacing = 0.14;
  const numRollers = Math.max(4, Math.floor(length / rollerSpacing));
  for (let i = 0; i < numRollers; i++) {
    const r = new THREE.Mesh(rollerGeo, rollerMat);
    r.position.set(-length / 2 + 0.1 + i * rollerSpacing, 0.65, 0);
    group.add(r);
  }

  const railGeo = new THREE.BoxGeometry(length, 0.08, 0.04);
  const railMat = customColor
    ? new THREE.MeshStandardMaterial({ color: customColor, roughness: 0.4, metalness: 0.5 })
    : materials.beamMat;
  const leftRail = new THREE.Mesh(railGeo, railMat);
  leftRail.position.set(0, 0.68, width / 2 - 0.02);
  group.add(leftRail);

  const rightRail = new THREE.Mesh(railGeo, railMat);
  rightRail.position.set(0, 0.68, -width / 2 + 0.02);
  group.add(rightRail);

  const legGeo = new THREE.BoxGeometry(0.06, 0.65, 0.06);
  const legMat = materials.steelMastMat;
  const legXs = [-length / 2 + 0.2, length / 2 - 0.2];
  legXs.forEach((lx) => {
    [-width / 2 + 0.05, width / 2 - 0.05].forEach((lz) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.325, lz);
      group.add(leg);
    });
  });

  return group;
}

/**
 * Creates 3D CAD Architectural & Equipment Elements
 * Includes TRUE openable architectural doors, windows with sill/lintel cutouts,
 * and smart custom walls that automatically carve openings for doors & windows!
 */
export function createArchitecturalModel(
  el: ArchitecturalElement,
  materials: WarehouseMaterials,
  allElements: ArchitecturalElement[] = [],
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Element_${el.id}`;
  group.userData = { id: el.id, type: 'ELEMENT', element: el };

  const defaultDoorColor =
    el.subType === 'DOCK_BAY'
      ? 0x2563eb
      : el.subType === 'EMERGENCY_EXIT'
      ? 0xef4444
      : 0x0d9488;

  if (el.type === 'DOOR') {
    const openRatio = typeof el.openRatio === 'number' ? el.openRatio : 0.85;
    const frameMat = new THREE.MeshStandardMaterial({
      color: el.color || defaultDoorColor,
      roughness: 0.3,
      metalness: 0.65,
    });
    const darkSteelMat = materials.lampHousingMat;

    // 1. Heavy-duty Structural Door Portal Jambs (Left & Right)
    const jambW = 0.16;
    const depth = Math.max(0.42, el.d);
    const jambGeo = new THREE.BoxGeometry(jambW, el.h, depth);

    const leftJamb = new THREE.Mesh(jambGeo, frameMat);
    leftJamb.position.set(-el.w / 2 + jambW / 2, el.h / 2, 0);
    leftJamb.castShadow = true;
    group.add(leftJamb);

    const rightJamb = new THREE.Mesh(jambGeo, frameMat);
    rightJamb.position.set(el.w / 2 - jambW / 2, el.h / 2, 0);
    rightJamb.castShadow = true;
    group.add(rightJamb);

    // 2. Top Structural Header Lintel + Illuminated Portal Sign
    const lintelH = 0.26;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(el.w + 0.12, lintelH, depth + 0.08), frameMat);
    lintel.position.set(0, el.h - lintelH / 2, 0);
    lintel.castShadow = true;
    group.add(lintel);

    // Exterior Canopy Awning Over Doorway
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(el.w + 0.4, 0.08, 1.1),
      darkSteelMat,
    );
    canopy.position.set(0, el.h + 0.05, -0.55);
    canopy.castShadow = true;
    group.add(canopy);

    // Glowing Green/Cyan Entrance Status Sign on Header
    const signBulb = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(1.4, el.w * 0.5), 0.12, depth + 0.12),
      new THREE.MeshBasicMaterial({ color: openRatio > 0.2 ? 0x10b981 : 0xef4444 }),
    );
    signBulb.position.set(0, el.h - lintelH / 2, 0);
    group.add(signBulb);

    // 3. Threshold Ground Plate (Non-slip steel ramp plate)
    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(el.w - jambW * 2, 0.025, depth + 0.5),
      materials.steelMastMat,
    );
    threshold.position.set(0, 0.0125, 0);
    threshold.receiveShadow = true;
    group.add(threshold);

    // 4. OSHA Yellow Safety Bollards on both sides of the entrance
    const bollardGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.05, 12);
    [-el.w / 2 - 0.18, el.w / 2 + 0.18].forEach((bx) => {
      const bollard = new THREE.Mesh(bollardGeo, materials.forkliftYellowMat);
      bollard.position.set(bx, 0.525, 0.32);
      bollard.castShadow = true;
      group.add(bollard);
    });

    const clearW = Math.max(0.4, el.w - jambW * 2);
    const clearH = Math.max(0.6, el.h - lintelH);

    if (el.subType === 'MAIN_ENTRANCE') {
      // Double Architectural Glass & Aluminum Doors that swing open!
      const leafW = clearW / 2 - 0.02;
      const swingAngle = openRatio * (Math.PI * 0.46);

      const leftPivot = new THREE.Group();
      leftPivot.position.set(-clearW / 2, 0, 0);
      leftPivot.rotation.y = swingAngle;
      group.add(leftPivot);

      const leftGlass = new THREE.Mesh(
        new THREE.BoxGeometry(leafW, clearH, 0.05),
        materials.glassMat,
      );
      leftGlass.position.set(leafW / 2, clearH / 2, 0);
      leftPivot.add(leftGlass);

      const leftHandle = new THREE.Mesh(
        new THREE.BoxGeometry(leafW * 0.7, 0.05, 0.1),
        materials.steelMastMat,
      );
      leftHandle.position.set(leafW * 0.55, 1.05, 0);
      leftPivot.add(leftHandle);

      const rightPivot = new THREE.Group();
      rightPivot.position.set(clearW / 2, 0, 0);
      rightPivot.rotation.y = -swingAngle;
      group.add(rightPivot);

      const rightGlass = new THREE.Mesh(
        new THREE.BoxGeometry(leafW, clearH, 0.05),
        materials.glassMat,
      );
      rightGlass.position.set(-leafW / 2, clearH / 2, 0);
      rightPivot.add(rightGlass);

      const rightHandle = new THREE.Mesh(
        new THREE.BoxGeometry(leafW * 0.7, 0.05, 0.1),
        materials.steelMastMat,
      );
      rightHandle.position.set(-leafW * 0.55, 1.05, 0);
      rightPivot.add(rightHandle);
    } else {
      // Industrial Roll-up Sectional Overhead Dock Door
      const closedH = Math.max(0.18, clearH * (1 - openRatio));
      const shutter = new THREE.Mesh(
        new THREE.BoxGeometry(clearW, closedH, 0.08),
        materials.steelMastMat,
      );
      shutter.position.set(0, clearH - closedH / 2, 0);
      group.add(shutter);

      const bottomBar = new THREE.Mesh(
        new THREE.BoxGeometry(clearW, 0.12, 0.1),
        materials.hazardMat,
      );
      bottomBar.position.set(0, clearH - closedH + 0.06, 0);
      group.add(bottomBar);
    }
  } else if (el.type === 'PILLAR') {
    const colMat = el.color
      ? new THREE.MeshStandardMaterial({ color: el.color, roughness: 0.6, metalness: 0.2 })
      : materials.pillarMat;
    const isRound = el.subType === 'CONCRETE_ROUND';
    const mainGeo = isRound
      ? new THREE.CylinderGeometry(el.w / 2, el.w / 2, Math.max(0.5, el.h - 0.45), 20)
      : new THREE.BoxGeometry(el.w, Math.max(0.5, el.h - 0.45), el.d);

    const col = new THREE.Mesh(mainGeo, colMat);
    col.position.set(0, (el.h - 0.45) / 2 + 0.45, 0);
    col.castShadow = true;
    group.add(col);

    const baseGeo = isRound
      ? new THREE.CylinderGeometry(el.w / 2 + 0.04, el.w / 2 + 0.04, 0.45, 20)
      : new THREE.BoxGeometry(el.w + 0.08, 0.45, el.d + 0.08);
    const base = new THREE.Mesh(baseGeo, materials.hazardMat);
    base.position.set(0, 0.225, 0);
    group.add(base);
  } else if (el.type === 'WALL') {
    // Smart Custom Wall: Automatically recognizes any DOOR or WINDOW placed along it and carves real openings!
    const wallMat = el.color
      ? new THREE.MeshStandardMaterial({ color: el.color, roughness: 0.55, metalness: 0.15 })
      : materials.wallMat;

    const rotDeg = ((typeof el.rotation === 'number' ? el.rotation : el.rot ? 90 : 0) % 360 + 360) % 360;
    const isVerticalZ = (rotDeg >= 45 && rotDeg < 135) || (rotDeg >= 225 && rotDeg < 315) || el.d > el.w * 1.5;
    const spanLen = isVerticalZ ? Math.max(el.w, el.d) : el.w;
    const thickness = isVerticalZ ? Math.min(el.w, el.d) : el.d;

    const wallCenterX = el.x + el.w / 2;
    const wallCenterZ = el.z + el.d / 2;

    // Find overlapping DOOR or WINDOW elements on this custom wall
    const openings = allElements
      .filter((other) => other.id !== el.id && (other.type === 'DOOR' || other.type === 'WINDOW'))
      .map((other) => {
        const ocx = other.x + other.w / 2;
        const ocz = other.z + other.d / 2;
        if (isVerticalZ) {
          if (Math.abs(ocx - wallCenterX) > 1.35) return null;
          const localCenter = ocz - wallCenterZ;
          const halfSpan = Math.max(other.w, other.d) / 2;
          return {
            start: Math.max(-spanLen / 2, localCenter - halfSpan),
            end: Math.min(spanLen / 2, localCenter + halfSpan),
            bottomY: other.type === 'WINDOW' ? 1.1 : 0,
            topY: other.type === 'WINDOW' ? Math.min(el.h, 1.1 + other.h) : Math.min(el.h, other.h),
          };
        } else {
          if (Math.abs(ocz - wallCenterZ) > 1.35) return null;
          const localCenter = ocx - wallCenterX;
          const halfSpan = other.w / 2;
          return {
            start: Math.max(-spanLen / 2, localCenter - halfSpan),
            end: Math.min(spanLen / 2, localCenter + halfSpan),
            bottomY: other.type === 'WINDOW' ? 1.1 : 0,
            topY: other.type === 'WINDOW' ? Math.min(el.h, 1.1 + other.h) : Math.min(el.h, other.h),
          };
        }
      })
      .filter(
        (op): op is { start: number; end: number; bottomY: number; topY: number } =>
          op !== null && op.end - op.start > 0.15,
      )
      .sort((a, b) => a.start - b.start);

    if (openings.length === 0) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(el.w, el.h, el.d), wallMat);
      wall.position.set(0, el.h / 2, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData = { isWallMesh: true, elementId: el.id };
      group.add(wall);
    } else {
      let cursor = -spanLen / 2;
      for (const op of openings) {
        if (op.start > cursor + 0.05) {
          const segLen = op.start - cursor;
          const segCenter = cursor + segLen / 2;
          const segGeo = isVerticalZ
            ? new THREE.BoxGeometry(thickness, el.h, segLen)
            : new THREE.BoxGeometry(segLen, el.h, thickness);
          const seg = new THREE.Mesh(segGeo, wallMat);
          seg.position.set(isVerticalZ ? 0 : segCenter, el.h / 2, isVerticalZ ? segCenter : 0);
          seg.castShadow = true;
          seg.receiveShadow = true;
          seg.userData = { isWallMesh: true, elementId: el.id };
          group.add(seg);
        }

        const openLen = op.end - op.start;
        const openCenter = op.start + openLen / 2;

        // Bottom sill wall under window openings
        if (op.bottomY > 0.05) {
          const sillGeo = isVerticalZ
            ? new THREE.BoxGeometry(thickness, op.bottomY, openLen)
            : new THREE.BoxGeometry(openLen, op.bottomY, thickness);
          const sillWall = new THREE.Mesh(sillGeo, wallMat);
          sillWall.position.set(isVerticalZ ? 0 : openCenter, op.bottomY / 2, isVerticalZ ? openCenter : 0);
          sillWall.castShadow = true;
          sillWall.receiveShadow = true;
          sillWall.userData = { isWallMesh: true, elementId: el.id };
          group.add(sillWall);
        }

        // Header lintel wall above door/window opening
        if (el.h > op.topY + 0.05) {
          const headH = el.h - op.topY;
          const headGeo = isVerticalZ
            ? new THREE.BoxGeometry(thickness, headH, openLen)
            : new THREE.BoxGeometry(openLen, headH, thickness);
          const headWall = new THREE.Mesh(headGeo, wallMat);
          headWall.position.set(
            isVerticalZ ? 0 : openCenter,
            op.topY + headH / 2,
            isVerticalZ ? openCenter : 0,
          );
          headWall.castShadow = true;
          headWall.receiveShadow = true;
          headWall.userData = { isWallMesh: true, elementId: el.id };
          group.add(headWall);
        }

        cursor = Math.max(cursor, op.end);
      }

      if (cursor < spanLen / 2 - 0.05) {
        const tailLen = spanLen / 2 - cursor;
        const tailCenter = cursor + tailLen / 2;
        const tailGeo = isVerticalZ
          ? new THREE.BoxGeometry(thickness, el.h, tailLen)
          : new THREE.BoxGeometry(tailLen, el.h, thickness);
        const tail = new THREE.Mesh(tailGeo, wallMat);
        tail.position.set(isVerticalZ ? 0 : tailCenter, el.h / 2, isVerticalZ ? tailCenter : 0);
        tail.castShadow = true;
        tail.receiveShadow = true;
        tail.userData = { isWallMesh: true, elementId: el.id };
        group.add(tail);
      }
    }
  } else if (el.type === 'WINDOW') {
    // Architectural Window mounted at sill height (1.1m) with openable sliding/casement glass panes
    const sillY = 1.1;
    const openRatio = typeof el.openRatio === 'number' ? el.openRatio : 0.35;
    const frameMat = materials.lampHousingMat;
    const depth = Math.max(0.32, el.d);

    // Outer window frame
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(el.w + 0.1, 0.08, depth + 0.06), frameMat);
    topFrame.position.set(0, sillY + el.h - 0.04, 0);
    group.add(topFrame);

    const sillLedge = new THREE.Mesh(new THREE.BoxGeometry(el.w + 0.16, 0.08, depth + 0.14), materials.steelMastMat);
    sillLedge.position.set(0, sillY + 0.04, 0);
    group.add(sillLedge);

    const sideFrameGeo = new THREE.BoxGeometry(0.08, el.h, depth + 0.04);
    const leftF = new THREE.Mesh(sideFrameGeo, frameMat);
    leftF.position.set(-el.w / 2 + 0.04, sillY + el.h / 2, 0);
    group.add(leftF);

    const rightF = new THREE.Mesh(sideFrameGeo, frameMat);
    rightF.position.set(el.w / 2 - 0.04, sillY + el.h / 2, 0);
    group.add(rightF);

    const winMat = el.color
      ? new THREE.MeshPhysicalMaterial({
          color: el.color,
          transparent: true,
          opacity: 0.44,
          roughness: 0.05,
          clearcoat: 1.0,
        })
      : materials.glassMat;

    const paneW = Math.max(0.2, (el.w - 0.16) / 2);
    const paneH = Math.max(0.3, el.h - 0.16);
    const slideOffset = openRatio * (paneW * 0.75);

    const leftPane = new THREE.Mesh(new THREE.BoxGeometry(paneW, paneH, 0.04), winMat);
    leftPane.position.set(-paneW / 2 + slideOffset * 0.5, sillY + el.h / 2, -0.02);
    group.add(leftPane);

    const rightPane = new THREE.Mesh(new THREE.BoxGeometry(paneW, paneH, 0.04), winMat);
    rightPane.position.set(paneW / 2 - slideOffset * 0.5, sillY + el.h / 2, 0.02);
    group.add(rightPane);
  } else if (el.type === 'WORKSTATION') {
    const deskMat = el.color
      ? new THREE.MeshStandardMaterial({ color: el.color, roughness: 0.5, metalness: 0.3 })
      : materials.pillarMat;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(el.w, 0.85, el.d), deskMat);
    desk.position.set(0, 0.425, 0);
    desk.castShadow = true;
    group.add(desk);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.08), materials.tireMat);
    screen.position.set(0, 1.1, 0);
    group.add(screen);
  } else if (el.type === 'FORKLIFT') {
    const fk = createForkliftModel(materials, el.color);
    group.add(fk);
  } else if (el.type === 'CONVEYOR') {
    const conv = createConveyorModel(el.w, el.d, materials, el.color);
    group.add(conv);
  }

  group.position.set(el.x + el.w / 2, 0, el.z + el.d / 2);
  const rotDeg = typeof el.rotation === 'number' ? el.rotation : el.rot ? 90 : 0;
  group.rotation.y = (rotDeg * Math.PI) / 180;

  return group;
}
