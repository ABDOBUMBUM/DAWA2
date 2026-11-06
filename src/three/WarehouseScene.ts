/**
 * DAWA 3D Warehouse Engine — Master Three.js Scene Controller
 * Production-grade WebGL rendering engine with ACESFilmic PBR, RoomEnvironment reflections,
 * real carved doorway portals in perimeter walls, 360-degree rack rotation, edit lock,
 * cursor-targeted deep zoom (down to 0.45m cell level), and multi-mode camera controller.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  WarehouseRack,
  ArchitecturalElement,
  WarehouseDimensions,
  WarehouseEnvironmentConfig,
  DEFAULT_ENVIRONMENT_CONFIG,
  GraphicsQualityConfig,
  DEFAULT_GRAPHICS_CONFIG,
  FefoRadarConfig,
  DEFAULT_FEFO_CONFIG,
  WallDisplayMode,
  CameraMode,
  JOURNEY_STAGES,
  SelectionState,
  WorkerConfig,
  PackageConfig,
  FloatingLabelData,
  getRackRotationDeg,
  resolveRackCell,
  getCellMedicines,
  computeCellExpiryStatus,
} from '../types/warehouse';
import {
  WarehouseMaterials,
  getCartonBoxTexture,
  getSkyBackdropTexture,
} from './materials';
import {
  HumanWorker3D,
  createRackModel,
  createArchitecturalModel,
} from './proceduralModels';
import { WarehouseNavGraph } from './navigation';
import { computeLodTier } from '../utils/qrCodeGenerator';

export interface SceneCallbacks {
  onSelectTarget: (selection: SelectionState) => void;
  onLiveDragRack: (rackId: string, px: number, pz: number, rotation?: number) => void;
  onLiveDragElement: (elementId: string, x: number, z: number, rot?: boolean, rotation?: number) => void;
  onWorkerArrived: (targetRackId?: string) => void;
  onLockedDragAttempt?: (label: string) => void;
  onActiveMoveTargetChanged?: (id: string | null) => void;
  onContextMenu: (e: {
    clientX: number;
    clientY: number;
    type: 'RACK' | 'ELEMENT' | 'FLOOR' | 'WORKER';
    id: string | null;
    worldX: number;
    worldZ: number;
  }) => void;
}

export class WarehouseScene {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public composer: EffectComposer | null = null;
  public afterimagePass: AfterimagePass | null = null;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public materials: WarehouseMaterials;
  public navGraph: WarehouseNavGraph;
  public worker: HumanWorker3D;
  private isSoftwareGl = false;

  // Dynamic LOD & Performance Telemetry
  public currentFps = 60;
  public activeLodCounts: { lod0: number; lod1: number; lod2: number } = { lod0: 0, lod1: 0, lod2: 0 };
  private lodFrameCounter = 0;

  // Scene objects
  private floorMesh: THREE.Mesh | null = null;
  private rackModels = new Map<string, THREE.Group>();
  private elementModels = new Map<string, THREE.Group>();
  private zoneMeshes = new Map<string, THREE.Group>();
  private propsGroup = new THREE.Group();
  private volumetricCones: THREE.Mesh[] = [];
  private selectionHalo: THREE.Mesh;
  private pathLine: THREE.Line | null = null;

  // Lights
  public keyLight: THREE.DirectionalLight;
  public fillLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;

  // State
  public dimensions: WarehouseDimensions = { ww: 24, wd: 16, wh: 8 };
  public envConfig: WarehouseEnvironmentConfig = { ...DEFAULT_ENVIRONMENT_CONFIG };
  public graphicsConfig: GraphicsQualityConfig = { ...DEFAULT_GRAPHICS_CONFIG };
  public fefoRadar: FefoRadarConfig = { ...DEFAULT_FEFO_CONFIG };
  public cachedElements: ArchitecturalElement[] = [];
  public cachedRacks: WarehouseRack[] = [];
  public cameraMode: CameraMode = 'ORBIT';
  public isDarkTheme = false;
  public isEditLocked = false;
  public activeMoveTargetId: string | null = null; // Explicit Move Mode ID so left-clicking never drags accidentally!
  public simSpeed = 1.0;
  public isPaused = false;
  public selection: SelectionState = { type: null };
  public onLabelsUpdated?: (labels: FloatingLabelData[]) => void;
  public showFloatingLabels = true;
  public showWorker = true;
  private labelFrameCount = 0;

  // Touch tracking for mobile & Expo Go WebView
  private touchStartDist = 0;
  private touchStartRadius = 24;
  private lastTouchMidX = 0;
  private lastTouchMidY = 0;

  // Camera Orbit & Deep Zoom state
  private targetOrbitLookAt = new THREE.Vector3(12, 1.2, 8);
  private currentOrbitLookAt = new THREE.Vector3(12, 1.2, 8);
  private cameraRadius = 24;
  private cameraTheta = -Math.PI / 4.5;
  private cameraPhi = Math.PI / 3.2;
  public targetCameraRadius = 24;
  private targetCameraTheta = -Math.PI / 4.5;
  private targetCameraPhi = Math.PI / 3.2;

  // Worker navigation & task state
  public workerPos = new THREE.Vector3(10.5, 0, 2.2);
  public workerTarget: THREE.Vector3 | null = null;
  public workerRotationY = 0;
  public workerWalkSpeed = 1.6;
  public workerPath: Array<[number, number]> = [];
  public workerPathIndex = 0;
  public workerAction: 'IDLE' | 'WALKING' | 'SCANNING' | 'PICKING' | 'REACHING_HIGH' | 'BENDING_LOW' = 'IDLE';
  public workerActionTimer = 0;
  public workerCarryingBox = false;
  public activeDestinationRackId: string | null = null;
  public activeTargetCellLevel: number | null = null;

  // Package Journey simulation state
  public isSimulatingJourney = false;
  public journeyStageIndex = 0;
  public journeyStageTimer = 0;
  public simulatedPackageMesh: THREE.Mesh;
  private lastPkgSignature = '';

  // Interaction & Drag state
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isPointerDown = false;
  private pointerButton = 0;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerMoved = 0;
  private draggingRackId: string | null = null;
  private draggingElementId: string | null = null;
  private dragOffset = new THREE.Vector3();
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Callbacks
  private callbacks: SceneCallbacks;

  // Animation Loop
  private animFrameId = 0;
  private lastTime = performance.now();

  constructor(container: HTMLElement, callbacks: SceneCallbacks, isDark = false) {
    this.container = container;
    this.callbacks = callbacks;
    this.isDarkTheme = isDark;

    // 1. Detect software WebGL guard
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Initialize High-Precision 4K WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = isDark ? 1.08 : 1.18;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio * 1.25, 2.25));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Sky Backdrop
    this.scene = new THREE.Scene();
    this.scene.background = getSkyBackdropTexture(isDark ? 'NIGHT_CYBER' : 'OUTDOOR_HORIZON');
    this.scene.fog = new THREE.FogExp2(isDark ? 0x090d16 : 0xdbeafe, 0.007);

    // 4. Perspective Camera (near plane = 0.05m for ultra-close cell inspection!)
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.05,
      350,
    );
    this.updateCameraOrbit(0);

    // 5. Studio Environment Reflection via PMREMGenerator & RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Materials & Navigation Setup
    this.materials = new WarehouseMaterials(isDark);
    this.navGraph = new WarehouseNavGraph();

    // 7. Balanced 3-Point 4K Studio Lighting
    this.keyLight = new THREE.DirectionalLight(0xfff7ed, isDark ? 1.55 : 1.95);
    this.keyLight.position.set(22, 30, 18);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.width = this.isSoftwareGl ? 1024 : 4096;
    this.keyLight.shadow.mapSize.height = this.isSoftwareGl ? 1024 : 4096;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 110;
    this.keyLight.shadow.camera.left = -35;
    this.keyLight.shadow.camera.right = 35;
    this.keyLight.shadow.camera.top = 35;
    this.keyLight.shadow.camera.bottom = -35;
    this.keyLight.shadow.bias = -0.0003;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.HemisphereLight(
      isDark ? 0x38bdf8 : 0xbae6fd,
      isDark ? 0x1e293b : 0xe2e8f0,
      isDark ? 0.85 : 1.05,
    );
    this.scene.add(this.fillLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.42 : 0.62);
    this.scene.add(this.ambientLight);

    // 8. Human Worker Model
    this.worker = new HumanWorker3D(this.materials);
    this.worker.group.position.copy(this.workerPos);
    this.scene.add(this.worker.group);

    // 9. Simulated Package Mesh (PKG-572)
    const pkgMat = new THREE.MeshStandardMaterial({
      map: getCartonBoxTexture('#f59e0b', 'PKG-572', 'طرد توزيع دوائي'),
      roughness: 0.6,
      metalness: 0.1,
    });
    this.simulatedPackageMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.55), pkgMat);
    this.simulatedPackageMesh.castShadow = true;
    this.simulatedPackageMesh.position.set(18.5, 0.45, 2.2);
    this.simulatedPackageMesh.userData = { id: 'pkg-572', type: 'PACKAGE' };
    this.simulatedPackageMesh.visible = true;
    this.scene.add(this.simulatedPackageMesh);

    // 10. Selection Halo Wireframe Box
    this.selectionHalo = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.selectHaloMat,
    );
    this.selectionHalo.visible = false;
    this.scene.add(this.selectionHalo);

    // 11. Props Group (Perimeter Walls with Real Cutout Doorways & Windows, Exterior Apron, Trusses)
    this.propsGroup.userData = { type: 'WAREHOUSE', id: 'warehouse-structure' };
    this.scene.add(this.propsGroup);

    // 11b. Setup Post-Processing Composer & Motion Blur Pass (AfterimagePass)
    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      this.afterimagePass = new AfterimagePass(0.78);
      this.afterimagePass.enabled = Boolean(this.graphicsConfig.motionBlur);
      this.composer.addPass(this.afterimagePass);

      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);
    }

    // 12. Setup Event Listeners
    this.setupEventListeners();

    // 13. Start Render Loop
    this.lastTime = performance.now();
    this.animate();
  }

  /**
   * Explicitly enables or disables Move/Drag mode for a specific Rack or Element ID.
   * Prevents accidental dragging when simply left-clicking objects!
   */
  public setActiveMoveTarget(id: string | null) {
    this.activeMoveTargetId = id;
    this.callbacks.onActiveMoveTargetChanged?.(id);
  }

  /**
   * Live 4K Ultra Graphics Quality & Cinematic Lighting Controller
   */
  public syncGraphicsQuality(config: GraphicsQualityConfig) {
    this.graphicsConfig = { ...config };
    if (!this.isSoftwareGl) {
      this.renderer.setPixelRatio(Math.min(2.5, Math.max(0.75, config.dprScale)));
      if (this.keyLight.shadow.mapSize.width !== config.shadowMapSize) {
        this.keyLight.shadow.mapSize.set(config.shadowMapSize, config.shadowMapSize);
        if (this.keyLight.shadow.map) {
          this.keyLight.shadow.map.dispose();
          this.keyLight.shadow.map = null;
        }
      }
    }

    this.renderer.toneMappingExposure = config.exposure;
    this.materials.applyGraphicsQuality(config.floorReflectivity, config.anisotropyLevel);

    const envMult = this.envConfig.lightIntensity ?? 1.0;
    const spotMult = config.spotlightIntensity ?? 1.4;
    this.keyLight.intensity = (this.isDarkTheme ? 1.2 : 1.55) * envMult * (spotMult * 0.85);
    this.fillLight.intensity = (this.isDarkTheme ? 0.75 : 0.95) * envMult * (0.5 + spotMult * 0.35);

    this.volumetricCones.forEach((cone) => {
      cone.visible = Boolean(config.volumetricBeams);
      const mat = cone.material as THREE.MeshBasicMaterial;
      mat.opacity = (this.isDarkTheme ? 0.14 : 0.085) * Math.min(1.8, spotMult);
    });

    if (this.afterimagePass) {
      this.afterimagePass.enabled = Boolean(config.motionBlur);
    }

    this.applyGlobalProductOpacity();

    // Run an immediate LOD pass when graphics config changes
    this.updateDynamicLod(true);
  }

  /**
   * Dynamically applies the global productOpacity multiplier across all 3D medicine cartons
   * combined with each cell/medicine's individual baseOpacity.
   */
  public applyGlobalProductOpacity() {
    const globalProdOpacity = Math.max(
      0.12,
      Math.min(1.0, this.graphicsConfig.productOpacity ?? 1.0),
    );
    this.rackModels.forEach((model) => {
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && child.userData?.isCartonBoxMesh) {
          const mesh = child as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat) {
            const baseOp = typeof mesh.userData.baseOpacity === 'number' ? mesh.userData.baseOpacity : 1.0;
            const finalOp = Math.max(0.1, Math.min(1.0, baseOp * globalProdOpacity));
            const isTrans = finalOp < 0.99;
            if (mat.transparent !== isTrans || Math.abs(mat.opacity - finalOp) > 0.005) {
              mat.transparent = isTrans;
              mat.opacity = finalOp;
              mat.depthWrite = finalOp >= 0.85;
              mat.roughness = isTrans ? 0.25 : 0.48;
              mat.needsUpdate = true;
            }
            mesh.castShadow = !isTrans;
          }
        }
      });
    });
  }

  /**
   * Live FEFO Expiry Radar Controller (Highlights Expired / <30d / <90d cells in 3D space)
   */
  public syncFefoRadar(config: FefoRadarConfig) {
    const prevSig = JSON.stringify(this.fefoRadar);
    const nextSig = JSON.stringify(config);
    this.fefoRadar = { ...config };
    if (prevSig !== nextSig) {
      this.syncRacks(this.cachedRacks);
    }
  }

  /**
   * Updates the environment configuration (textures, wall modes, background sky, lighting) and rebuilds the architecture.
   */
  public syncEnvironmentConfig(config: WarehouseEnvironmentConfig) {
    this.envConfig = { ...config };
    const effectivePreset = this.isDarkTheme ? 'NIGHT_CYBER' : config.backgroundPreset;
    this.scene.background = getSkyBackdropTexture(effectivePreset);

    const fogColorMap: Record<string, number> = {
      DAYLIGHT_STUDIO: 0xe2e8f0,
      OUTDOOR_HORIZON: 0xdbeafe,
      SUNSET_GOLDEN: 0x451a03,
      NIGHT_CYBER: 0x090d16,
      CLEAN_WHITE: 0xf8fafc,
    };
    const fogHex = fogColorMap[effectivePreset] || 0xe2e8f0;
    this.scene.fog = new THREE.FogExp2(fogHex, effectivePreset === 'CLEAN_WHITE' ? 0.003 : 0.007);

    this.materials.applyEnvironmentPresets(
      config.floorTexture,
      config.wallTexture,
      this.isDarkTheme,
      config.wallColor,
      config.floorColor,
    );

    const mult = config.lightIntensity ?? 1.0;
    const spotMult = this.graphicsConfig.spotlightIntensity ?? 1.4;
    this.keyLight.intensity = (this.isDarkTheme ? 1.2 : 1.55) * mult * (spotMult * 0.85);
    this.fillLight.intensity = (this.isDarkTheme ? 0.75 : 0.95) * mult;
    this.ambientLight.intensity = (this.isDarkTheme ? 0.38 : 0.58) * mult;

    this.buildEnvironment(this.dimensions, this.cachedElements);
  }

  /**
   * Builds a perimeter wall along X (North/South) or Z (West/East) with REAL physical openings
   * carved out wherever a DOOR or WINDOW element is positioned on that wall!
   */
  private buildWallWithOpenings(
    wallSide: 'NORTH' | 'SOUTH' | 'WEST' | 'EAST',
    spanLength: number,
    wh: number,
    thickness: number,
    mode: WallDisplayMode,
    elements: ArchitecturalElement[],
  ) {
    if (mode === 'OPEN') return;

    const { ww, wd } = this.dimensions;
    const isAlongX = wallSide === 'NORTH' || wallSide === 'SOUTH';
    const wallMat = mode === 'GLASS' ? this.materials.glassMat : this.materials.wallMat;

    // Low boundary curb mode
    if (mode === 'CURB') {
      const curbH = 0.22;
      const geo = isAlongX
        ? new THREE.BoxGeometry(spanLength, curbH, thickness)
        : new THREE.BoxGeometry(thickness, curbH, spanLength);
      const curb = new THREE.Mesh(geo, this.materials.wallMat);
      if (wallSide === 'NORTH') curb.position.set(ww / 2, curbH / 2, -thickness / 2);
      if (wallSide === 'SOUTH') curb.position.set(ww / 2, curbH / 2, wd + thickness / 2);
      if (wallSide === 'WEST') curb.position.set(-thickness / 2, curbH / 2, wd / 2);
      if (wallSide === 'EAST') curb.position.set(ww + thickness / 2, curbH / 2, wd / 2);
      curb.userData = { type: 'WAREHOUSE', id: `curb-${wallSide.toLowerCase()}` };
      this.propsGroup.add(curb);
      return;
    }

    // Collect all DOOR and WINDOW elements attached to this wall so we carve real walk-through/see-through openings!
    const portals: Array<{ start: number; end: number; bottomY: number; topY: number }> = [];
    elements.forEach((el) => {
      if (el.type !== 'DOOR' && el.type !== 'WINDOW') return;
      const bottomY = el.type === 'WINDOW' ? 1.1 : 0;
      const topY = el.type === 'WINDOW' ? Math.min(wh - 0.1, 1.1 + el.h) : Math.min(wh - 0.1, el.h);

      if (wallSide === 'NORTH' && el.z < 1.25) {
        portals.push({
          start: Math.max(0, el.x),
          end: Math.min(spanLength, el.x + el.w),
          bottomY,
          topY,
        });
      } else if (wallSide === 'SOUTH' && el.z + el.d > wd - 1.25) {
        portals.push({
          start: Math.max(0, el.x),
          end: Math.min(spanLength, el.x + el.w),
          bottomY,
          topY,
        });
      } else if (wallSide === 'WEST' && el.x < 1.25) {
        portals.push({
          start: Math.max(0, el.z),
          end: Math.min(spanLength, el.z + Math.max(el.w, el.d)),
          bottomY,
          topY,
        });
      } else if (wallSide === 'EAST' && el.x + el.d > ww - 1.25) {
        portals.push({
          start: Math.max(0, el.z),
          end: Math.min(spanLength, el.z + Math.max(el.w, el.d)),
          bottomY,
          topY,
        });
      }
    });

    // Sort portals by start position
    portals.sort((a, b) => a.start - b.start);

    const addWallSegment = (segStart: number, segEnd: number, yBottom: number, yTop: number) => {
      const segLen = segEnd - segStart;
      const segH = yTop - yBottom;
      if (segLen <= 0.05 || segH <= 0.05) return;

      const midPos = segStart + segLen / 2;
      const midY = yBottom + segH / 2;
      const geo = isAlongX
        ? new THREE.BoxGeometry(segLen, segH, thickness)
        : new THREE.BoxGeometry(thickness, segH, segLen);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.castShadow = mode === 'SOLID';
      mesh.receiveShadow = true;

      if (wallSide === 'NORTH') mesh.position.set(midPos, midY, -thickness / 2);
      if (wallSide === 'SOUTH') mesh.position.set(midPos, midY, wd + thickness / 2);
      if (wallSide === 'WEST') mesh.position.set(-thickness / 2, midY, midPos);
      if (wallSide === 'EAST') mesh.position.set(ww + thickness / 2, midY, midPos);

      mesh.userData = {
        type: 'WAREHOUSE',
        id: `wall-${wallSide.toLowerCase()}`,
        isSolidWall: mode === 'SOLID',
      };
      this.propsGroup.add(mesh);
    };

    // Walk along wall span and emit full-height wall segments between openings, sill below windows, and lintel above!
    let cursor = 0;
    portals.forEach((p) => {
      if (p.start > cursor) {
        addWallSegment(cursor, p.start, 0, wh);
      }
      // Sill wall below window opening
      if (p.bottomY > 0.05) {
        addWallSegment(p.start, p.end, 0, p.bottomY);
      }
      // Header wall segment above the open doorway/window
      if (p.topY < wh) {
        addWallSegment(p.start, p.end, p.topY, wh);
      }
      cursor = Math.max(cursor, p.end);
    });

    if (cursor < spanLength) {
      addWallSegment(cursor, spanLength, 0, wh);
    }
  }

  /**
   * Builds the warehouse floor slab, exterior loading apron, carved perimeter walls, roof trusses, and 4K volumetric lamps.
   */
  public buildEnvironment(dimensions: WarehouseDimensions, elements?: ArchitecturalElement[]) {
    this.dimensions = dimensions;
    if (elements) this.cachedElements = elements;
    const { ww, wd, wh } = dimensions;
    const cfg = this.envConfig;

    // Dispose old floor
    if (this.floorMesh) {
      this.scene.remove(this.floorMesh);
      this.floorMesh.geometry.dispose();
    }

    // Update floor texture repeat to match dimensions
    if (this.materials.floorMat.map) {
      this.materials.floorMat.map.repeat.set(Math.max(2, ww / 4), Math.max(2, wd / 4));
    }

    // 1. Concrete / Epoxy / Tile Interior Floor Slab (4K Physical Clearcoat Material)
    const floorGeo = new THREE.PlaneGeometry(ww, wd, 1, 1);
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.translate(ww / 2, 0, wd / 2);
    this.floorMesh = new THREE.Mesh(floorGeo, this.materials.floorMat);
    this.floorMesh.receiveShadow = true;
    this.floorMesh.userData = { type: 'WAREHOUSE', id: 'warehouse-floor' };
    this.scene.add(this.floorMesh);

    // Clear previous building walls/markings
    while (this.propsGroup.children.length > 0) {
      this.propsGroup.remove(this.propsGroup.children[0]);
    }
    this.volumetricCones = [];

    // 2. Exterior Loading Dock Apron & Road outside the entrance
    if (cfg.showExteriorYard) {
      const yardDepth = 7.0;
      const yardGeo = new THREE.PlaneGeometry(ww + 12, yardDepth);
      yardGeo.rotateX(-Math.PI / 2);
      const yardMesh = new THREE.Mesh(yardGeo, this.materials.asphaltMat);
      yardMesh.position.set(ww / 2, -0.01, -yardDepth / 2);
      yardMesh.receiveShadow = true;
      yardMesh.userData = { type: 'WAREHOUSE', id: 'exterior-apron' };
      this.propsGroup.add(yardMesh);

      this.cachedElements
        .filter((e) => e.type === 'DOOR' && e.z < 1.5)
        .forEach((door) => {
          [door.x + 0.15, door.x + door.w - 0.15].forEach((lx) => {
            const guideGeo = new THREE.PlaneGeometry(0.12, 4.8);
            guideGeo.rotateX(-Math.PI / 2);
            const guide = new THREE.Mesh(guideGeo, this.materials.laneMarkingMat);
            guide.position.set(lx, 0.005, -2.6);
            this.propsGroup.add(guide);
          });

          if (door.subType === 'MAIN_ENTRANCE') {
            const walkGeo = new THREE.PlaneGeometry(door.w - 0.3, 3.2);
            walkGeo.rotateX(-Math.PI / 2);
            const walkMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.85 });
            const walk = new THREE.Mesh(walkGeo, walkMat);
            walk.position.set(door.x + door.w / 2, 0.008, -1.6);
            this.propsGroup.add(walk);
          }
        });
    }

    // 3. Build All 4 Perimeter Walls with Real Carved Doorway & Window Openings
    const wallT = cfg.wallThickness || 0.28;
    this.buildWallWithOpenings('NORTH', ww, wh, wallT, cfg.northWall, this.cachedElements);
    this.buildWallWithOpenings('SOUTH', ww, wh, wallT, cfg.southWall, this.cachedElements);
    this.buildWallWithOpenings('WEST', wd, wh, wallT, cfg.westWall, this.cachedElements);
    this.buildWallWithOpenings('EAST', wd, wh, wallT, cfg.eastWall, this.cachedElements);

    // 4. Clerestory Glass Windows on North Wall
    if (cfg.showClerestoryWindows && cfg.northWall === 'SOLID' && wh >= 5.0) {
      for (let wx = 3.5; wx < ww - 3; wx += 5.5) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, wallT + 0.06), this.materials.glassMat);
        win.position.set(wx, wh - 1.5, -wallT / 2);
        win.userData = { type: 'WAREHOUSE', id: `clerestory-win-${wx}` };
        this.propsGroup.add(win);
      }
    }

    // 5. Safety Traffic Markings (Yellow lanes & Zebra crosswalk)
    if (cfg.showFloorMarkings) {
      const laneY = 0.015;
      const mainLaneGeo = new THREE.PlaneGeometry(Math.max(2, ww - 3), 0.14);
      mainLaneGeo.rotateX(-Math.PI / 2);
      const mainLane = new THREE.Mesh(mainLaneGeo, this.materials.laneMarkingMat);
      mainLane.position.set(ww / 2, laneY, wd / 2);
      this.propsGroup.add(mainLane);

      const crossLaneGeo = new THREE.PlaneGeometry(0.14, Math.max(2, wd - 2));
      crossLaneGeo.rotateX(-Math.PI / 2);
      const crossLane = new THREE.Mesh(crossLaneGeo, this.materials.laneMarkingMat);
      crossLane.position.set(Math.max(2, ww - 4.5), laneY, wd / 2);
      this.propsGroup.add(crossLane);

      for (let i = 0; i < 6; i++) {
        const stripeGeo = new THREE.PlaneGeometry(0.32, 1.8);
        stripeGeo.rotateX(-Math.PI / 2);
        const stripe = new THREE.Mesh(stripeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        stripe.position.set(10.0 + i * 0.5, laneY, 1.3);
        this.propsGroup.add(stripe);
      }
    }

    // 6. Industrial Open-Web Steel Roof Trusses & High-Bay Pendant LED Lamps with 4K Volumetric Light Cones
    const trussYTop = wh - 0.2;
    const trussYBot = wh - 0.85;
    if (cfg.showRoofTrusses || cfg.showLights) {
      for (let tz = 2.5; tz < wd; tz += 4.5) {
        if (cfg.showRoofTrusses) {
          const topChord = new THREE.Mesh(new THREE.BoxGeometry(ww - 0.5, 0.1, 0.1), this.materials.trussMat);
          topChord.position.set(ww / 2, trussYTop, tz);
          this.propsGroup.add(topChord);

          const botChord = new THREE.Mesh(new THREE.BoxGeometry(ww - 0.5, 0.08, 0.08), this.materials.trussMat);
          botChord.position.set(ww / 2, trussYBot, tz);
          this.propsGroup.add(botChord);

          for (let tx = 2.0; tx < ww - 2; tx += 3.5) {
            const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6), this.materials.trussMat);
            strut.position.set(tx, (trussYTop + trussYBot) / 2, tz);
            strut.rotation.z = Math.PI / 6;
            this.propsGroup.add(strut);
          }
        }

        if (cfg.showLights) {
          const lampXPositions = [ww * 0.22, ww * 0.5, ww * 0.78];
          lampXPositions.forEach((lx, li) => {
            const lampGroup = new THREE.Group();
            const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), this.materials.trussMat);
            cable.position.set(0, -0.45, 0);
            lampGroup.add(cable);

            const shade = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.28, 12, 1, true), this.materials.lampHousingMat);
            shade.position.set(0, -0.9, 0);
            shade.rotation.x = Math.PI;
            lampGroup.add(shade);

            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), this.materials.lampBulbMat);
            bulb.position.set(0, -0.88, 0);
            lampGroup.add(bulb);

            // 4K Cinematic Volumetric Light Cone beneath High-Bay LED Fixture
            const coneH = Math.max(2.5, trussYTop - 1.2);
            const coneGeo = new THREE.ConeGeometry(2.1, coneH, 16, 1, true);
            const coneMat = new THREE.MeshBasicMaterial({
              color: 0xfef9c3,
              transparent: true,
              opacity: this.isDarkTheme ? 0.12 : 0.075,
              depthWrite: false,
              side: THREE.DoubleSide,
            });
            const volumetricCone = new THREE.Mesh(coneGeo, coneMat);
            volumetricCone.position.set(0, -0.95 - coneH / 2, 0);
            volumetricCone.visible = Boolean(this.graphicsConfig.volumetricBeams);
            lampGroup.add(volumetricCone);
            this.volumetricCones.push(volumetricCone);

            lampGroup.position.set(lx, trussYTop, tz);
            lampGroup.userData = { type: 'WAREHOUSE', id: `highbay-lamp-${tz}-${li}` };
            this.propsGroup.add(lampGroup);
          });
        }
      }
    }

    this.updateSelectionHalo();
  }

  /**
   * Syncs procedural racks with the 3D scene and rebuilds changed rack geometries in real time.
   */
  public syncRacks(racks: WarehouseRack[]) {
    this.cachedRacks = racks;
    const currentIds = new Set(racks.map((r) => r.id));
    this.rackModels.forEach((model, id) => {
      if (!currentIds.has(id)) {
        this.scene.remove(model);
        this.rackModels.delete(id);
      }
    });

    const activeCellForRack =
      this.selection.type === 'CELL' && this.selection.rackId && this.selection.cellLevel && this.selection.cellSlot
        ? {
            rackId: this.selection.rackId,
            level: this.selection.cellLevel,
            slot: this.selection.cellSlot,
          }
        : null;

    racks.forEach((rack) => {
      const cellSel =
        activeCellForRack && activeCellForRack.rackId === rack.id
          ? { level: activeCellForRack.level, slot: activeCellForRack.slot }
          : null;

      const geomSignature = JSON.stringify({
        code: rack.code,
        rackType: rack.rackType,
        materialFinish: rack.materialFinish,
        w: rack.w,
        d: rack.d,
        h: rack.h,
        levels: rack.levels,
        cellsPerLevel: rack.cellsPerLevel,
        storageType: rack.storageType,
        customColor: rack.customColor,
        customCells: rack.customCells,
        cellSel,
        fefoRadar: this.fefoRadar,
      });

      const existingModel = this.rackModels.get(rack.id);
      const rotDeg = getRackRotationDeg(rack);
      if (!existingModel || existingModel.userData.geomSignature !== geomSignature) {
        if (existingModel) {
          this.scene.remove(existingModel);
        }
        const newModel = createRackModel(rack, this.materials, cellSel, this.fefoRadar);
        newModel.userData.geomSignature = geomSignature;
        newModel.userData.rack = rack;
        this.scene.add(newModel);
        this.rackModels.set(rack.id, newModel);
      } else {
        if (this.draggingRackId !== rack.id) {
          existingModel.position.set(rack.px, 0, rack.pz);
        }
        existingModel.rotation.y = (rotDeg * Math.PI) / 180;
        existingModel.userData.rack = rack;
      }
    });

    this.applyGlobalProductOpacity();
    this.navGraph.rebuild(this.dimensions, racks, this.cachedElements);
    this.updateSelectionHalo();
  }

  /**
   * Syncs architectural & equipment elements and updates wall doorway/window cutouts automatically.
   */
  public syncElements(elements: ArchitecturalElement[]) {
    this.cachedElements = elements;
    this.elementModels.forEach((model) => this.scene.remove(model));
    this.elementModels.clear();

    this.zoneMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.zoneMeshes.clear();

    elements.forEach((el) => {
      if (el.type === 'ZONE') {
        const zoneGroup = new THREE.Group();
        const fillMat = new THREE.MeshBasicMaterial({
          color: el.color || 0x3b82f6,
          transparent: true,
          opacity: this.isDarkTheme ? 0.24 : 0.16,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });

        const zoneFloor = new THREE.Mesh(new THREE.PlaneGeometry(el.w, el.d), fillMat);
        zoneFloor.rotateX(-Math.PI / 2);
        zoneFloor.position.set(el.x + el.w / 2, 0.02, el.z + el.d / 2);
        zoneFloor.userData = { id: el.id, type: 'ELEMENT', element: el };
        zoneGroup.add(zoneFloor);

        const borderGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(el.x, 0.03, el.z),
          new THREE.Vector3(el.x + el.w, 0.03, el.z),
          new THREE.Vector3(el.x + el.w, 0.03, el.z + el.d),
          new THREE.Vector3(el.x, 0.03, el.z + el.d),
          new THREE.Vector3(el.x, 0.03, el.z),
        ]);
        const borderMat = new THREE.LineBasicMaterial({
          color: el.color || 0x3b82f6,
          linewidth: 2,
        });
        const borderLine = new THREE.Line(borderGeo, borderMat);
        zoneGroup.add(borderLine);

        zoneGroup.userData = { id: el.id, type: 'ELEMENT', element: el };
        this.scene.add(zoneGroup);
        this.zoneMeshes.set(el.id, zoneGroup);
      } else {
        const model = createArchitecturalModel(el, this.materials, elements);
        this.scene.add(model);
        this.elementModels.set(el.id, model);
      }
    });

    // Rebuild perimeter walls so any moved/resized DOOR or WINDOW cuts its real opening at the new position!
    this.buildEnvironment(this.dimensions, elements);
    this.updateSelectionHalo();
  }

  public syncWorkerConfig(config: WorkerConfig) {
    this.worker.updateAppearance(config);
    this.workerWalkSpeed = config.walkSpeed;
    this.workerCarryingBox = config.carryingBox;
    if (this.workerAction !== 'WALKING' || config.actionState !== 'WALKING') {
      if (config.actionState !== 'WALKING') {
        this.workerAction = config.actionState;
        this.workerActionTimer = 0;
      }
    }
  }

  public setWorkerVisible(visible: boolean) {
    this.showWorker = visible;
    this.worker.group.visible = visible;
    if (this.pathLine) {
      this.pathLine.visible = visible;
    }
  }

  /**
   * Magnetically snaps architectural elements (DOOR, WINDOW, PILLAR) flush against:
   * 1. Any of the 4 perimeter walls (North, South, West, East)
   * 2. Any newly added custom WALL element (`type === 'WALL'`)!
   */
  public applyMagneticWallSnap(
    el: ArchitecturalElement,
    rawX: number,
    rawZ: number,
  ): { x: number; z: number; rot?: boolean; rotation?: number } {
    const { ww, wd } = this.dimensions;
    const snapThresh = 1.15;
    let x = rawX;
    let z = rawZ;
    let rot = el.rot;
    let rotation = el.rotation;

    if (el.type === 'DOOR' || el.type === 'WINDOW') {
      let snappedToCustomWall = false;

      // 1. Check custom interior/new WALL elements first!
      const customWalls = this.cachedElements.filter((w) => w.type === 'WALL' && w.id !== el.id);
      for (const wall of customWalls) {
        const wRot = ((typeof wall.rotation === 'number' ? wall.rotation : wall.rot ? 90 : 0) % 360 + 360) % 360;
        const isVertZ = (wRot >= 45 && wRot < 135) || (wRot >= 225 && wRot < 315) || wall.d > wall.w * 1.5;
        const wCenterX = wall.x + wall.w / 2;
        const wCenterZ = wall.z + wall.d / 2;
        const elCenterX = rawX + el.w / 2;
        const elCenterZ = rawZ + el.d / 2;

        if (isVertZ) {
          const halfSpan = Math.max(wall.w, wall.d) / 2;
          if (
            Math.abs(elCenterX - wCenterX) < snapThresh &&
            elCenterZ >= wCenterZ - halfSpan &&
            elCenterZ <= wCenterZ + halfSpan
          ) {
            x = wCenterX - el.w / 2;
            rot = true;
            rotation = 90;
            snappedToCustomWall = true;
            break;
          }
        } else {
          const halfSpan = wall.w / 2;
          if (
            Math.abs(elCenterZ - wCenterZ) < snapThresh &&
            elCenterX >= wCenterX - halfSpan &&
            elCenterX <= wCenterX + halfSpan
          ) {
            z = wCenterZ - el.d / 2;
            rot = false;
            rotation = 0;
            snappedToCustomWall = true;
            break;
          }
        }
      }

      // 2. Check the 4 perimeter walls if not snapped to a custom wall
      if (!snappedToCustomWall) {
        if (Math.abs(z) < snapThresh) {
          z = -0.14;
          rot = false;
          rotation = 0;
        } else if (Math.abs(z - (wd - el.d)) < snapThresh) {
          z = wd - el.d + 0.14;
          rot = false;
          rotation = 180;
        } else if (Math.abs(x) < snapThresh) {
          x = -0.14;
          rot = true;
          rotation = 90;
        } else if (Math.abs(x - (ww - el.w)) < snapThresh) {
          x = ww - el.w + 0.14;
          rot = true;
          rotation = 270;
        }
      }
    } else if (el.type === 'PILLAR') {
      if (Math.abs(z) < snapThresh) z = 0;
      if (Math.abs(x) < snapThresh) x = 0;

      const gridX = Math.round(x / 4) * 4;
      if (Math.abs(x - gridX) < 0.45) x = gridX;
      const gridZ = Math.round(z / 4) * 4;
      if (Math.abs(z - gridZ) < 0.45) z = gridZ;
    }

    const minBound = this.envConfig.openSpaceMode ? -15 : -0.2;
    const maxBoundX = this.envConfig.openSpaceMode ? ww + 15 : ww - el.w + 0.2;
    const maxBoundZ = this.envConfig.openSpaceMode ? wd + 15 : wd - el.d + 0.2;

    const clampedX = Math.max(minBound, Math.min(maxBoundX, Math.round(x * 10) / 10));
    const clampedZ = Math.max(minBound, Math.min(maxBoundZ, Math.round(z * 10) / 10));
    return { x: clampedX, z: clampedZ, rot, rotation };
  }

  /**
   * Smart Rack-to-Wall Recognition & Flush Alignment (تعرف الرفوف على الجدران المحيطية والجدران الجديدة)
   * Snaps racks flush against perimeter walls or custom interior WALL elements!
   */
  public applyMagneticRackWallSnap(
    rack: WarehouseRack,
    rawX: number,
    rawZ: number,
    forceSnapToNearest = false,
  ): { px: number; pz: number; rotation?: number; wallName?: string } {
    const { ww, wd } = this.dimensions;
    const rd = Math.max(0.3, rack.d || (rack.rackType === 'WOODEN_CABINET' ? 0.65 : 1.0));
    const halfD = rd / 2 + 0.08;
    const snapThresh = forceSnapToNearest ? 999 : 0.95;

    type CandidateWall = {
      dist: number;
      px: number;
      pz: number;
      rotation: number;
      wallName: string;
    };
    const candidates: CandidateWall[] = [];

    // 1. Check Custom Interior/New WALL Elements
    const customWalls = this.cachedElements.filter((w) => w.type === 'WALL');
    for (const wall of customWalls) {
      const wRot = ((typeof wall.rotation === 'number' ? wall.rotation : wall.rot ? 90 : 0) % 360 + 360) % 360;
      const isVertZ = (wRot >= 45 && wRot < 135) || (wRot >= 225 && wRot < 315) || wall.d > wall.w * 1.5;
      const wCenterX = wall.x + wall.w / 2;
      const wCenterZ = wall.z + wall.d / 2;
      const wallThick = isVertZ ? Math.min(wall.w, wall.d) : wall.d;

      if (isVertZ) {
        const halfSpan = Math.max(wall.w, wall.d) / 2;
        if (forceSnapToNearest || (rawZ >= wCenterZ - halfSpan && rawZ <= wCenterZ + halfSpan)) {
          const dist = Math.abs(rawX - wCenterX) - (halfD + wallThick / 2);
          if (Math.abs(dist) < snapThresh) {
            const side = rawX >= wCenterX ? 1 : -1;
            candidates.push({
              dist: Math.abs(rawX - wCenterX),
              px: Math.round((wCenterX + side * (halfD + wallThick / 2)) * 10) / 10,
              pz: Math.max(wCenterZ - halfSpan + 0.5, Math.min(wCenterZ + halfSpan - 0.5, rawZ)),
              rotation: side > 0 ? 90 : 270,
              wallName: wall.label || 'جدار داخلي مخصص',
            });
          }
        }
      } else {
        const halfSpan = wall.w / 2;
        if (forceSnapToNearest || (rawX >= wCenterX - halfSpan && rawX <= wCenterX + halfSpan)) {
          const dist = Math.abs(rawZ - wCenterZ) - (halfD + wallThick / 2);
          if (Math.abs(dist) < snapThresh) {
            const side = rawZ >= wCenterZ ? 1 : -1;
            candidates.push({
              dist: Math.abs(rawZ - wCenterZ),
              px: Math.max(wCenterX - halfSpan + 0.5, Math.min(wCenterX + halfSpan - 0.5, rawX)),
              pz: Math.round((wCenterZ + side * (halfD + wallThick / 2)) * 10) / 10,
              rotation: side > 0 ? 0 : 180,
              wallName: wall.label || 'جدار داخلي مخصص',
            });
          }
        }
      }
    }

    // 2. Check Perimeter Walls (North z=0, South z=wd, West x=0, East x=ww)
    if (this.envConfig.northWall !== 'OPEN') {
      const dNorth = Math.abs(rawZ - halfD);
      if (dNorth < snapThresh) {
        candidates.push({
          dist: dNorth,
          px: rawX,
          pz: Math.round(halfD * 10) / 10,
          rotation: 0,
          wallName: 'الجدار الشمالي (North Wall)',
        });
      }
    }
    if (this.envConfig.southWall !== 'OPEN') {
      const dSouth = Math.abs(wd - halfD - rawZ);
      if (dSouth < snapThresh) {
        candidates.push({
          dist: dSouth,
          px: rawX,
          pz: Math.round((wd - halfD) * 10) / 10,
          rotation: 180,
          wallName: 'الجدار الجنوبي (South Wall)',
        });
      }
    }
    if (this.envConfig.westWall !== 'OPEN') {
      const dWest = Math.abs(rawX - halfD);
      if (dWest < snapThresh) {
        candidates.push({
          dist: dWest,
          px: Math.round(halfD * 10) / 10,
          pz: rawZ,
          rotation: 90,
          wallName: 'الجدار الغربي (West Wall)',
        });
      }
    }
    if (this.envConfig.eastWall !== 'OPEN') {
      const dEast = Math.abs(ww - halfD - rawX);
      if (dEast < snapThresh) {
        candidates.push({
          dist: dEast,
          px: Math.round((ww - halfD) * 10) / 10,
          pz: rawZ,
          rotation: 270,
          wallName: 'الجدار الشرقي (East Wall)',
        });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.dist - b.dist);
      const best = candidates[0];
      return {
        px: best.px,
        pz: best.pz,
        rotation: best.rotation,
        wallName: best.wallName,
      };
    }

    const minX = this.envConfig.openSpaceMode ? -25 : 0.2;
    const maxX = this.envConfig.openSpaceMode ? ww + 25 : ww - 0.2;
    const minZ = this.envConfig.openSpaceMode ? -25 : 0.2;
    const maxZ = this.envConfig.openSpaceMode ? wd + 25 : wd - 0.2;

    return {
      px: Math.max(minX, Math.min(maxX, Math.round(rawX * 10) / 10)),
      pz: Math.max(minZ, Math.min(maxZ, Math.round(rawZ * 10) / 10)),
    };
  }

  public syncPackageConfig(pkg: PackageConfig) {
    const sig = `${pkg.color}|${pkg.code}|${pkg.quantity}|${pkg.productName}`;
    if (sig !== this.lastPkgSignature) {
      this.lastPkgSignature = sig;
      const mat = this.simulatedPackageMesh.material as THREE.MeshStandardMaterial;
      mat.map = getCartonBoxTexture(pkg.color || '#f59e0b', pkg.code || 'PKG-572', pkg.productName || '');
      mat.needsUpdate = true;
      const scale = Math.max(0.7, Math.min(1.5, 0.8 + (pkg.quantity / 100) * 0.4));
      this.simulatedPackageMesh.scale.set(scale, scale, scale);
    }
  }

  public sendWorkerToRack(rackId: string, cellLevel?: number) {
    const sp = this.navGraph.rackStandpoints.get(rackId);
    if (!sp) return;

    this.activeDestinationRackId = rackId;
    this.activeTargetCellLevel = cellLevel || null;
    const startPoint: [number, number] = [this.workerPos.x, this.workerPos.z];
    const targetPoint: [number, number] = [sp[0], sp[1]];

    this.workerPath = this.navGraph.findPath(startPoint, targetPoint);
    this.workerPathIndex = 1;
    this.workerAction = 'WALKING';

    this.renderPathLine(this.workerPath);
  }

  public sendWorkerToPosition(targetX: number, targetZ: number) {
    this.activeDestinationRackId = null;
    this.activeTargetCellLevel = null;
    const startPoint: [number, number] = [this.workerPos.x, this.workerPos.z];
    const targetPoint: [number, number] = [targetX, targetZ];

    this.workerPath = this.navGraph.findPath(startPoint, targetPoint);
    this.workerPathIndex = 1;
    this.workerAction = 'WALKING';

    this.renderPathLine(this.workerPath);
  }

  private renderPathLine(path: Array<[number, number]>) {
    if (this.pathLine) {
      this.scene.remove(this.pathLine);
      this.pathLine.geometry.dispose();
      this.pathLine = null;
    }

    if (path.length < 2) return;

    const points = path.map(([x, z]) => new THREE.Vector3(x, 0.06, z));
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 0.5,
      gapSize: 0.25,
      linewidth: 3,
    });
    this.pathLine = new THREE.Line(geo, mat);
    this.pathLine.computeLineDistances();
    this.scene.add(this.pathLine);
  }

  /**
   * Computes the exact 3D World Position of a specific cell (level, slot) on a rack.
   */
  public getCellWorldPosition(rack: WarehouseRack, levelNum: number, slotNum: number): THREE.Vector3 {
    const rw = Math.max(0.6, rack.w || 2.4);
    const levels = Math.max(1, rack.levels || 4);
    const rh = Math.max(1.0, rack.h || (rack.rackType === 'WOODEN_CABINET' ? 2.6 : 2.2 + levels * 0.4));
    const cellsCount = Math.max(1, rack.cellsPerLevel || 3);
    const isWooden = rack.rackType === 'WOODEN_CABINET';

    const tierH = isWooden ? (rh - 0.16) / levels : (rh - 0.35) / levels;
    const slotW = isWooden ? (rw - 0.08) / cellsCount : (rw - 0.2) / cellsCount;

    const localX = isWooden
      ? -rw / 2 + 0.04 + (slotNum - 1) * slotW + slotW / 2
      : -rw / 2 + 0.1 + (slotNum - 1) * slotW + slotW / 2;
    const localY = (isWooden ? 0.08 : 0.2) + (levelNum - 1) * tierH + tierH * 0.42;

    const rotRad = (getRackRotationDeg(rack) * Math.PI) / 180;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    const worldX = rack.px + localX * cosR;
    const worldZ = rack.pz - localX * sinR;

    return new THREE.Vector3(worldX, localY, worldZ);
  }

  /**
   * Smoothly zooms and focuses the 3D camera directly onto a specific cell & its label!
   */
  public focusOnCell(rackId: string, levelNum: number, slotNum: number) {
    const rack = this.cachedRacks.find((r) => r.id === rackId);
    if (!rack) return;

    const cellWorldPos = this.getCellWorldPosition(rack, levelNum, slotNum);
    const rotRad = (getRackRotationDeg(rack) * Math.PI) / 180;

    if (this.cameraMode === 'FOLLOW_WORKER' || this.cameraMode === 'FOLLOW_PACKAGE') {
      this.cameraMode = 'ORBIT';
    }

    this.targetOrbitLookAt.copy(cellWorldPos);
    this.targetCameraRadius = 2.05; // Close-up inspection of the slot and its label!
    this.targetCameraTheta = rotRad;
    this.targetCameraPhi = Math.PI / 2.25;
  }

  /**
   * Smoothly focuses the 3D camera onto any selected object (Rack, Cell, Element, Worker, Package).
   */
  public focusOnSelection(sel?: SelectionState) {
    const activeSel = sel || this.selection;
    if (!activeSel || !activeSel.type) {
      this.setCameraPreset('ORBIT');
      return;
    }

    if (this.cameraMode === 'FOLLOW_WORKER' || this.cameraMode === 'FOLLOW_PACKAGE') {
      this.cameraMode = 'ORBIT';
    }

    if (activeSel.type === 'CELL' && activeSel.rackId && activeSel.cellLevel && activeSel.cellSlot) {
      this.focusOnCell(activeSel.rackId, activeSel.cellLevel, activeSel.cellSlot);
      return;
    }

    if (activeSel.type === 'RACK' && activeSel.rackId) {
      const rack = this.cachedRacks.find((r) => r.id === activeSel.rackId);
      if (rack) {
        const rh = rack.h || 3.2;
        const rw = rack.w || 2.4;
        const rotRad = (getRackRotationDeg(rack) * Math.PI) / 180;
        this.targetOrbitLookAt.set(rack.px, rh * 0.52, rack.pz);
        this.targetCameraRadius = Math.max(4.2, Math.min(18, rw * 1.65));
        this.targetCameraTheta = rotRad - 0.25;
        this.targetCameraPhi = Math.PI / 2.6;
      }
      return;
    }

    if (activeSel.type === 'ELEMENT' && activeSel.elementId) {
      const el = this.cachedElements.find((e) => e.id === activeSel.elementId);
      if (el) {
        this.targetOrbitLookAt.set(el.x + el.w / 2, (el.h || 2) * 0.5, el.z + el.d / 2);
        this.targetCameraRadius = Math.max(4.5, Math.max(el.w, el.d) * 1.8);
        this.targetCameraPhi = Math.PI / 2.7;
      }
      return;
    }

    if (activeSel.type === 'WORKER') {
      this.targetOrbitLookAt.set(this.workerPos.x, 1.2, this.workerPos.z);
      this.targetCameraRadius = 4.0;
      return;
    }

    if (activeSel.type === 'PACKAGE') {
      this.targetOrbitLookAt.copy(this.simulatedPackageMesh.position);
      this.targetCameraRadius = 3.2;
    }
  }

  /**
   * Direct programmatic zoom control (for UI +/- buttons and slider in all modes).
   */
  public zoomBy(factor: number) {
    this.targetCameraRadius = Math.max(0.45, Math.min(140, this.targetCameraRadius * factor));
  }

  public setZoomRadius(radius: number) {
    this.targetCameraRadius = Math.max(0.45, Math.min(140, radius));
  }

  /**
   * Sets active camera perspective preset.
   */
  public setCameraPreset(mode: CameraMode) {
    this.cameraMode = mode;
    const { ww, wd } = this.dimensions;

    if (mode === 'ORBIT' || mode === 'ISOMETRIC') {
      this.targetCameraRadius = 24;
      this.targetCameraTheta = -Math.PI / 4.5;
      this.targetCameraPhi = Math.PI / 3.2;
      this.targetOrbitLookAt.set(ww / 2, 1.2, wd / 2);
    } else if (mode === 'TOP_DOWN') {
      this.targetCameraRadius = Math.max(ww, wd) * 1.1;
      this.targetCameraTheta = 0;
      this.targetCameraPhi = 0.04;
      this.targetOrbitLookAt.set(ww / 2, 0, wd / 2);
    } else if (mode === 'FRONT_ELEVATION') {
      this.targetCameraRadius = 22;
      this.targetCameraTheta = 0;
      this.targetCameraPhi = Math.PI / 2.08;
      this.targetOrbitLookAt.set(ww / 2, 2.0, wd / 2);
    } else if (mode === 'FOLLOW_WORKER') {
      this.targetCameraRadius = 5.5;
    } else if (mode === 'FOLLOW_PACKAGE') {
      this.targetCameraRadius = 6.5;
    }
  }

  public setTheme(isDark: boolean) {
    this.isDarkTheme = isDark;
    this.materials.updateTheme(isDark);
    this.syncEnvironmentConfig(this.envConfig);
  }

  /**
   * Sets selection state and updates the 3D wireframe bounding box halo.
   * When selecting a CELL from the UI, smoothly centers the camera look-at toward that cell!
   */
  public setSelection(sel: SelectionState, racks?: WarehouseRack[]) {
    const prevCellKey = `${this.selection.rackId || ''}-${this.selection.cellLevel || ''}-${this.selection.cellSlot || ''}`;
    const nextCellKey = `${sel.rackId || ''}-${sel.cellLevel || ''}-${sel.cellSlot || ''}`;
    this.selection = sel;

    if (prevCellKey !== nextCellKey && racks) {
      this.syncRacks(racks);
      if (sel.type === 'CELL' && sel.rackId && sel.cellLevel && sel.cellSlot) {
        const targetRack = racks.find((r) => r.id === sel.rackId);
        if (targetRack) {
          const cellPos = this.getCellWorldPosition(targetRack, sel.cellLevel, sel.cellSlot);
          this.targetOrbitLookAt.copy(cellPos);
          if (this.targetCameraRadius > 6.5) {
            this.targetCameraRadius = 3.2;
          }
        }
      }
    } else {
      this.updateSelectionHalo();
    }
  }

  private updateSelectionHalo() {
    const sel = this.selection;
    if (!sel || !sel.type) {
      this.selectionHalo.visible = false;
      return;
    }

    if (sel.type === 'RACK' || sel.type === 'CELL') {
      if (!sel.rackId) {
        this.selectionHalo.visible = false;
        return;
      }
      const model = this.rackModels.get(sel.rackId);
      if (model) {
        const rack = model.userData.rack as WarehouseRack;
        const rw = rack.w || 2.4;
        const rd = rack.d || 1.0;
        const levels = rack.levels || 4;
        const rh = rack.h || 2.2 + levels * 0.4;
        this.selectionHalo.scale.set(rw + 0.18, rh + 0.18, rd + 0.18);
        this.selectionHalo.position.set(model.position.x, rh / 2, model.position.z);
        this.selectionHalo.rotation.y = model.rotation.y;
        this.selectionHalo.visible = true;
      }
    } else if (sel.type === 'ELEMENT' && sel.elementId) {
      const model = this.elementModels.get(sel.elementId);
      const zone = this.zoneMeshes.get(sel.elementId);
      if (model) {
        const el = model.userData.element as ArchitecturalElement;
        const eh = el.h || 2.0;
        this.selectionHalo.scale.set(el.w + 0.2, eh + 0.2, el.d + 0.2);
        this.selectionHalo.position.set(model.position.x, eh / 2, model.position.z);
        this.selectionHalo.rotation.y = model.rotation.y;
        this.selectionHalo.visible = true;
      } else if (zone) {
        const el = zone.userData.element as ArchitecturalElement;
        this.selectionHalo.scale.set(el.w + 0.15, 0.35, el.d + 0.15);
        this.selectionHalo.position.set(el.x + el.w / 2, 0.18, el.z + el.d / 2);
        this.selectionHalo.rotation.y = 0;
        this.selectionHalo.visible = true;
      }
    } else if (sel.type === 'WORKER') {
      this.selectionHalo.scale.set(0.95, 2.05, 0.95);
      this.selectionHalo.position.set(this.workerPos.x, 1.02, this.workerPos.z);
      this.selectionHalo.rotation.y = this.workerRotationY;
      this.selectionHalo.visible = true;
    } else if (sel.type === 'PACKAGE') {
      this.selectionHalo.scale.set(0.8, 0.7, 0.8);
      this.selectionHalo.position.copy(this.simulatedPackageMesh.position);
      this.selectionHalo.rotation.y = 0;
      this.selectionHalo.visible = true;
    } else if (sel.type === 'WAREHOUSE') {
      const { ww, wd, wh } = this.dimensions;
      this.selectionHalo.scale.set(ww + 0.2, wh + 0.2, wd + 0.2);
      this.selectionHalo.position.set(ww / 2, wh / 2, wd / 2);
      this.selectionHalo.rotation.y = 0;
      this.selectionHalo.visible = true;
    } else {
      this.selectionHalo.visible = false;
    }
  }

  /**
   * Updates camera position based on current mode and target (supports zoom in ALL modes!).
   */
  private updateCameraOrbit(dt: number) {
    const k = 9.0;

    if (this.cameraMode === 'FOLLOW_WORKER') {
      this.cameraRadius = THREE.MathUtils.damp(this.cameraRadius, this.targetCameraRadius, k, dt);
      const offsetDist = Math.max(1.2, Math.min(25, this.cameraRadius));
      const offsetHeight = Math.max(1.1, offsetDist * 0.55);
      const desiredCamX = this.workerPos.x - Math.sin(this.workerRotationY) * offsetDist;
      const desiredCamZ = this.workerPos.z - Math.cos(this.workerRotationY) * offsetDist;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredCamX, 5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, offsetHeight, 5, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredCamZ, 5, dt);

      const lookTargetX = this.workerPos.x + Math.sin(this.workerRotationY) * 1.8;
      const lookTargetZ = this.workerPos.z + Math.cos(this.workerRotationY) * 1.8;
      this.currentOrbitLookAt.x = THREE.MathUtils.damp(this.currentOrbitLookAt.x, lookTargetX, 8, dt);
      this.currentOrbitLookAt.y = THREE.MathUtils.damp(this.currentOrbitLookAt.y, 1.35, 8, dt);
      this.currentOrbitLookAt.z = THREE.MathUtils.damp(this.currentOrbitLookAt.z, lookTargetZ, 8, dt);
      this.camera.lookAt(this.currentOrbitLookAt);
    } else if (this.cameraMode === 'FOLLOW_PACKAGE' && this.simulatedPackageMesh.visible) {
      const pkgPos = this.simulatedPackageMesh.position;
      this.targetOrbitLookAt.set(pkgPos.x, pkgPos.y + 0.35, pkgPos.z);

      this.cameraRadius = THREE.MathUtils.damp(this.cameraRadius, this.targetCameraRadius, k, dt);
      this.cameraTheta = THREE.MathUtils.damp(this.cameraTheta, this.targetCameraTheta, k, dt);
      this.cameraPhi = THREE.MathUtils.damp(this.cameraPhi, this.targetCameraPhi, k, dt);

      this.currentOrbitLookAt.x = THREE.MathUtils.damp(this.currentOrbitLookAt.x, this.targetOrbitLookAt.x, k, dt);
      this.currentOrbitLookAt.y = THREE.MathUtils.damp(this.currentOrbitLookAt.y, this.targetOrbitLookAt.y, k, dt);
      this.currentOrbitLookAt.z = THREE.MathUtils.damp(this.currentOrbitLookAt.z, this.targetOrbitLookAt.z, k, dt);

      const sinPhi = Math.sin(this.cameraPhi);
      this.camera.position.set(
        this.currentOrbitLookAt.x + this.cameraRadius * sinPhi * Math.sin(this.cameraTheta),
        this.currentOrbitLookAt.y + this.cameraRadius * Math.cos(this.cameraPhi),
        this.currentOrbitLookAt.z + this.cameraRadius * sinPhi * Math.cos(this.cameraTheta),
      );
      this.camera.lookAt(this.currentOrbitLookAt);
    } else {
      const factor = dt > 0 ? 1 - Math.exp(-k * dt) : 1;
      this.cameraRadius += (this.targetCameraRadius - this.cameraRadius) * factor;
      this.cameraTheta += (this.targetCameraTheta - this.cameraTheta) * factor;
      this.cameraPhi += (this.targetCameraPhi - this.cameraPhi) * factor;

      this.currentOrbitLookAt.lerp(this.targetOrbitLookAt, factor);

      const sinPhi = Math.sin(this.cameraPhi);
      this.camera.position.set(
        this.currentOrbitLookAt.x + this.cameraRadius * sinPhi * Math.sin(this.cameraTheta),
        this.currentOrbitLookAt.y + this.cameraRadius * Math.cos(this.cameraPhi),
        this.currentOrbitLookAt.z + this.cameraRadius * sinPhi * Math.cos(this.cameraTheta),
      );
      this.camera.lookAt(this.currentOrbitLookAt);
    }
  }

  /**
   * Main 60fps Animation Loop
   */
  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const dt = delta * (this.isPaused ? 0 : this.simSpeed);

    // 1. Update Human Worker Navigation & Kinematics
    if (this.workerAction === 'WALKING' && this.workerPath.length > 0 && this.workerPathIndex < this.workerPath.length) {
      const target = this.workerPath[this.workerPathIndex];
      const dx = target[0] - this.workerPos.x;
      const dz = target[1] - this.workerPos.z;
      const dist = Math.hypot(dx, dz);
      const walkSpeed = this.workerWalkSpeed;

      if (dist < 0.2) {
        this.workerPathIndex++;
        if (this.workerPathIndex >= this.workerPath.length) {
          if (this.activeTargetCellLevel && this.activeTargetCellLevel >= 4) {
            this.workerAction = 'REACHING_HIGH';
          } else if (this.activeTargetCellLevel && this.activeTargetCellLevel === 1) {
            this.workerAction = 'BENDING_LOW';
          } else {
            this.workerAction = this.workerCarryingBox ? 'PICKING' : 'SCANNING';
          }
          this.workerActionTimer = 0;
          this.callbacks.onWorkerArrived(this.activeDestinationRackId || undefined);
        }
      } else {
        const step = Math.min(dist, walkSpeed * dt);
        this.workerPos.x += (dx / dist) * step;
        this.workerPos.z += (dz / dist) * step;

        const targetAngle = Math.atan2(dx, dz);
        let diff = targetAngle - this.workerRotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.workerRotationY += diff * Math.min(1.0, 10 * dt);
      }
    } else if (
      this.workerAction === 'SCANNING' ||
      this.workerAction === 'PICKING' ||
      this.workerAction === 'REACHING_HIGH' ||
      this.workerAction === 'BENDING_LOW'
    ) {
      this.workerActionTimer += dt;
      if (this.workerActionTimer > 3.2) {
        this.workerAction = 'IDLE';
        this.workerActionTimer = 0;
      }
    }

    this.worker.group.position.copy(this.workerPos);
    this.worker.group.rotation.y = this.workerRotationY;
    this.worker.update(
      dt,
      this.workerAction === 'WALKING',
      this.workerWalkSpeed,
      this.workerAction,
      this.workerActionTimer / 3.2,
      this.workerCarryingBox,
    );

    if (this.selection.type === 'WORKER') {
      this.updateSelectionHalo();
    }

    // 2. Update Fulfillment Journey Simulation (PKG-572)
    if (this.isSimulatingJourney) {
      this.simulatedPackageMesh.visible = true;
      this.journeyStageTimer += dt * 0.45;

      const curStage = JOURNEY_STAGES[this.journeyStageIndex];
      const nextStage = JOURNEY_STAGES[(this.journeyStageIndex + 1) % JOURNEY_STAGES.length];
      const t = Math.min(1.0, this.journeyStageTimer);

      this.simulatedPackageMesh.position.set(
        curStage.targetPos[0] + (nextStage.targetPos[0] - curStage.targetPos[0]) * t,
        0.4 + Math.sin(t * Math.PI) * 0.35,
        curStage.targetPos[2] + (nextStage.targetPos[2] - curStage.targetPos[2]) * t,
      );

      if (this.selection.type === 'PACKAGE') {
        this.updateSelectionHalo();
      }

      if (this.journeyStageTimer >= 1.0) {
        this.journeyStageTimer = 0;
        this.journeyStageIndex = (this.journeyStageIndex + 1) % JOURNEY_STAGES.length;

        const nextTarget = JOURNEY_STAGES[this.journeyStageIndex];
        this.sendWorkerToPosition(nextTarget.targetPos[0], nextTarget.targetPos[2] + 0.8);
      }
    } else {
      this.simulatedPackageMesh.visible = true;
      const curStage = JOURNEY_STAGES[this.journeyStageIndex] || JOURNEY_STAGES[0];
      this.simulatedPackageMesh.position.set(curStage.targetPos[0], 0.35, curStage.targetPos[2]);
      if (this.selection.type === 'PACKAGE') {
        this.updateSelectionHalo();
      }
    }

    // 3. Smooth Camera Update
    const prevCamX = this.camera.position.x;
    const prevCamZ = this.camera.position.z;
    this.updateCameraOrbit(delta);
    const camSpeed = Math.hypot(this.camera.position.x - prevCamX, this.camera.position.z - prevCamZ) / Math.max(0.001, delta);

    // 3b. Rolling FPS & Dynamic LOD Manager Update
    if (delta > 0.001) {
      const instFps = Math.min(120, 1 / delta);
      this.currentFps = this.currentFps * 0.92 + instFps * 0.08;
    }
    this.lodFrameCounter++;
    if (this.lodFrameCounter % 10 === 0) {
      this.updateDynamicLod(false);
    }

    // 4. Render Scene (with Post-Processing Motion Blur when enabled on GPU)
    if (!this.isSoftwareGl && this.composer && this.graphicsConfig.motionBlur && this.afterimagePass) {
      const isMovingFast = this.workerAction === 'WALKING' || this.isSimulatingJourney || camSpeed > 1.2;
      this.afterimagePass.enabled = true;
      this.afterimagePass.uniforms['damp'].value = isMovingFast ? 0.84 : 0.62;
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 5. Project 3D Floating Labels (Racks, Elements, and Close-Up Individual Cells!)
    this.updateFloatingLabels();
  };

  /**
   * Dynamic Level of Detail (LOD) Manager
   * Dynamically reduces geometry complexity for distant racks & architectural elements or when FPS dips,
   * ensuring a smooth 60fps 4K experience.
   */
  public updateDynamicLod(force = false) {
    const camPos = this.camera.position;
    const lodEnabled = this.graphicsConfig.dynamicLod !== false;
    let lod0 = 0;
    let lod1 = 0;
    let lod2 = 0;

    // 1. Evaluate LOD for each 3D Rack
    this.rackModels.forEach((rackGroup) => {
      const dist = camPos.distanceTo(rackGroup.position);
      const isSelectedRack =
        this.selection.rackId && rackGroup.userData?.rack?.id === this.selection.rackId;
      const tier = isSelectedRack ? 0 : computeLodTier(dist, this.currentFps, lodEnabled);
      if (tier === 0) lod0++;
      else if (tier === 1) lod1++;
      else lod2++;

      if (!force && rackGroup.userData.currentLodTier === tier) return;
      rackGroup.userData.currentLodTier = tier;

      rackGroup.traverse((child) => {
        if (child === rackGroup) return;
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh && !child.userData?.isCarton) return;

        // Carton group: keep visible at LOD 0 and LOD 1; at LOD 2 hide internal plaques/sub-boxes
        if (child.userData?.isCarton) {
          child.children.forEach((sub, idx) => {
            // idx 0 is the main carton mesh; idx > 0 are front plaques, FEFO beacons, or secondary stacked boxes
            if (idx > 0) {
              sub.visible = tier === 0 || (tier === 1 && idx === 1);
            }
          });
        } else if (mesh.geometry && mesh.geometry.type === 'PlaneGeometry') {
          // Small plaque planes or decals on racks
          mesh.visible = tier <= 1;
        }
      });
    });

    // 2. Evaluate LOD for Architectural Elements
    this.elementModels.forEach((elemGroup) => {
      const dist = camPos.distanceTo(elemGroup.position);
      const tier = computeLodTier(dist, this.currentFps, lodEnabled);
      if (!force && elemGroup.userData.currentLodTier === tier) return;
      elemGroup.userData.currentLodTier = tier;

      // For distant elements (LOD 2), hide tiny accent sub-parts (index > 3) while preserving primary silhouette
      elemGroup.children.forEach((part, idx) => {
        if (idx > 3 && !part.userData?.isWallMesh) {
          part.visible = tier < 2;
        }
      });
    });

    this.activeLodCounts = { lod0, lod1, lod2 };
  }

  /**
   * Projects 3D world coordinates of Racks, Elements, AND Individual Cells (when zoomed in or selected)
   * into 2D screen positions.
   */
  private updateFloatingLabels() {
    if (!this.onLabelsUpdated || !this.showFloatingLabels || !this.container) return;
    this.labelFrameCount++;
    if (this.labelFrameCount % 2 !== 0) return;

    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    if (cw === 0 || ch === 0) return;

    const labels: FloatingLabelData[] = [];
    const tempVec = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const camPos = this.camera.position;

    // 1. Project Racks & Individual Cells
    this.rackModels.forEach((model) => {
      const rack = model.userData.rack as WarehouseRack;
      if (!rack) return;
      const isWooden = rack.rackType === 'WOODEN_CABINET';
      const rh = isWooden ? (rack.h || 2.6) : (rack.h || 2.2 + (rack.levels || 4) * 0.4);

      model.getWorldPosition(tempVec);
      tempVec.y += rh + 0.35;
      const dist = camPos.distanceTo(tempVec);

      const toLabel = new THREE.Vector3().subVectors(tempVec, camPos).normalize();
      const dot = camDir.dot(toLabel);
      if (dot >= 0.15) {
        tempVec.project(this.camera);
        const isVisible =
          tempVec.z > 0.0 &&
          tempVec.z < 1.0 &&
          tempVec.x >= -1.05 &&
          tempVec.x <= 1.05 &&
          tempVec.y >= -1.05 &&
          tempVec.y <= 1.05;

        if (isVisible) {
          const screenX = (tempVec.x * 0.5 + 0.5) * cw;
          const screenY = (-(tempVec.y * 0.5) + 0.5) * ch;

          const totalCells = (rack.levels || 4) * (rack.cellsPerLevel || 3);
          const occupiedCells = rack.customCells
            ? rack.customCells.filter((c) => c.occupied !== false).length
            : totalCells;

          labels.push({
            id: rack.id,
            type: 'RACK',
            code: rack.code,
            nameAr: rack.nameAr || rack.name,
            nameEn: rack.nameEn || rack.code,
            badgeText: isWooden
              ? '🪵 خزانة خشبية'
              : rack.storageType === 'COLD'
              ? '❄️ تبريد (2-8°C)'
              : rack.storageType === 'QUARANTINE'
              ? '⚠️ حجر صحي'
              : '🌡️ حرارة الغرفة',
            badgeColor: isWooden
              ? '#854d0e'
              : rack.storageType === 'COLD'
              ? '#0284c7'
              : rack.storageType === 'QUARANTINE'
              ? '#d97706'
              : '#10b981',
            statsText: `${occupiedCells}/${totalCells} خانة`,
            screenX,
            screenY,
            visible: true,
            distance: dist,
            isWooden,
            isLocked: rack.locked,
            thumbnailUrl: rack.thumbnailUrl,
          });
        }
      }

      // Project Individual Cell Floating Labels when zoomed in close (cameraRadius < 10.5m) OR when this rack/cell is selected!
      const isRackActive = this.selection.rackId === rack.id;
      if (isRackActive || this.cameraRadius < 10.5) {
        const levels = rack.levels || 4;
        const slots = rack.cellsPerLevel || 3;
        for (let l = 1; l <= levels; l++) {
          for (let s = 1; s <= slots; s++) {
            const isSelectedCell =
              this.selection.type === 'CELL' &&
              this.selection.rackId === rack.id &&
              this.selection.cellLevel === l &&
              this.selection.cellSlot === s;

            // If many cells exist, show all cells on close zoom (< 7.5m) or selected rack's cells
            if (!isSelectedCell && this.cameraRadius > 7.5 && !isRackActive) continue;

            const cellPos = this.getCellWorldPosition(rack, l, s);
            const cellDist = camPos.distanceTo(cellPos);
            if (cellDist > 12.5 && !isSelectedCell) continue;

            const toCell = new THREE.Vector3().subVectors(cellPos, camPos).normalize();
            if (camDir.dot(toCell) < 0.2) continue;

            const proj = cellPos.clone().project(this.camera);
            if (proj.z <= 0 || proj.z >= 1 || Math.abs(proj.x) > 0.98 || Math.abs(proj.y) > 0.98) continue;

            const cellData = resolveRackCell(rack, l, s);
            const isOcc = cellData.occupied !== false;
            const movCat = cellData.movementCategory || 'AVAILABLE';
            const cellMeds = getCellMedicines(cellData);

            labels.push({
              id: `${rack.id}-L${l}-S${s}`,
              type: 'CELL',
              rackId: rack.id,
              rackCode: rack.code,
              rackName: rack.nameAr || rack.name,
              cellLevel: l,
              cellSlot: s,
              cellLabel: cellData.cellLabel || `خانة ${cellData.code}`,
              code: cellData.code,
              nameAr: isOcc ? cellData.productName || 'صنف دوائي' : 'خانة فارغة (+ إضافة)',
              nameEn: cellData.batchNumber || `L${l}-S${s}`,
              badgeText: isOcc
                ? `${cellData.quantity ?? 75} عبوة${cellMeds.length > 1 ? ` · ${cellMeds.length} أدوية` : ''}`
                : 'شاغرة',
              badgeColor: isSelectedCell
                ? '#06b6d4'
                : movCat === 'EXPIRED'
                ? '#e11d48'
                : movCat === 'ORDER_PICK'
                ? '#0284c7'
                : movCat === 'RETURNED'
                ? '#9333ea'
                : isOcc
                ? '#0d9488'
                : '#d97706',
              barcode: cellData.barcode,
              batchNumber: cellData.batchNumber,
              expiryDate: cellData.expiryDate,
              quantity: cellData.quantity,
              movementCategory: movCat,
              medicines: cellMeds,
              matrixCols: cellData.matrixCols,
              matrixRows: cellData.matrixRows,
              isSelectedCell,
              screenX: (proj.x * 0.5 + 0.5) * cw,
              screenY: (-(proj.y * 0.5) + 0.5) * ch,
              visible: true,
              distance: cellDist,
            });
          }
        }
      }
    });

    // 2. Project Architectural & Equipment Elements
    this.elementModels.forEach((model) => {
      const el = model.userData.element as ArchitecturalElement;
      if (!el) return;

      model.getWorldPosition(tempVec);
      tempVec.y += (el.h || 2.0) + 0.3;
      const dist = camPos.distanceTo(tempVec);

      const toLabel = new THREE.Vector3().subVectors(tempVec, camPos).normalize();
      const dot = camDir.dot(toLabel);
      if (dot < 0.15) return;

      tempVec.project(this.camera);
      const isVisible =
        tempVec.z > 0.0 &&
        tempVec.z < 1.0 &&
        tempVec.x >= -1.05 &&
        tempVec.x <= 1.05 &&
        tempVec.y >= -1.05 &&
        tempVec.y <= 1.05;

      if (!isVisible) return;

      const screenX = (tempVec.x * 0.5 + 0.5) * cw;
      const screenY = (-(tempVec.y * 0.5) + 0.5) * ch;

      labels.push({
        id: el.id,
        type: 'ELEMENT',
        code: el.subType,
        nameAr: el.label,
        nameEn: el.type,
        badgeText:
          el.type === 'DOOR'
            ? `🚪 مدخل (${Math.round((el.openRatio ?? 0.85) * 100)}% مفتوح)`
            : el.type === 'FORKLIFT'
            ? '🚜 رافعة شوكية'
            : '🏛️ عنصر إنشائي',
        badgeColor: el.color || '#3b82f6',
        screenX,
        screenY,
        visible: true,
        distance: dist,
        isLocked: el.locked,
      });
    });

    this.onLabelsUpdated(labels);
  }

  private setupEventListeners() {
    const el = this.renderer.domElement;
    window.addEventListener('resize', this.onResize);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('dblclick', this.onDoubleClick);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('contextmenu', this.onContextMenu);

    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
  };

  private isMiddlePointerDown = false;

  /**
   * Computes the closest raycast hit distance against solid perimeter walls and custom WALL elements.
   * Ensures clicking on a wall NEVER selects or drags racks/cells/elements hidden behind that wall!
   */
  private getClosestSolidWallDistance(): number {
    let closest = Infinity;

    // 1. Check solid perimeter wall segments (buildWallWithOpenings tags SOLID/GLASS walls with isSolidWall: true)
    const propHits = this.raycaster.intersectObjects(this.propsGroup.children, true);
    for (const hit of propHits) {
      if (hit.object.userData?.isSolidWall) {
        if (hit.distance < closest) closest = hit.distance;
        break;
      }
    }

    // 2. Check custom interior WALL elements
    const elemHits = this.raycaster.intersectObjects(Array.from(this.elementModels.values()), true);
    for (const hit of elemHits) {
      let cur: THREE.Object3D | null = hit.object;
      let isWall = false;
      while (cur) {
        if (cur.userData?.isWallMesh || cur.userData?.element?.type === 'WALL') {
          isWall = true;
          break;
        }
        cur = cur.parent;
      }
      if (isWall && hit.distance < closest) {
        closest = hit.distance;
        break;
      }
    }

    return closest;
  }

  /**
   * Double-clicking any Cell, Rack, Door, or Worker smoothly flies & zooms the camera straight to it!
   * Respects wall occlusion so objects behind walls are not triggered.
   */
  private onDoubleClick = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const closestWallDist = this.getClosestSolidWallDistance();

    const rackHits = this.raycaster.intersectObjects(Array.from(this.rackModels.values()), true);
    if (rackHits.length > 0 && rackHits[0].distance < closestWallDist + 0.05) {
      const firstHit = rackHits[0].object;
      let cartonObj: THREE.Object3D | null = firstHit;
      while (cartonObj && !cartonObj.userData?.isCarton && cartonObj.parent) {
        cartonObj = cartonObj.parent;
      }
      let rackObj: THREE.Object3D | null = firstHit;
      while (rackObj && !rackObj.userData?.rack && rackObj.parent) {
        rackObj = rackObj.parent;
      }
      if (cartonObj && cartonObj.userData?.isCarton && rackObj?.userData?.rack) {
        const rack = rackObj.userData.rack as WarehouseRack;
        const lvl = Number(cartonObj.userData.level);
        const slt = Number(cartonObj.userData.slot);
        this.focusOnCell(rack.id, lvl, slt);
        return;
      }
      if (rackObj && rackObj.userData?.rack) {
        const rack = rackObj.userData.rack as WarehouseRack;
        this.focusOnSelection({ type: 'RACK', rackId: rack.id });
        return;
      }
    }

    const elemHits = this.raycaster.intersectObjects(Array.from(this.elementModels.values()), true);
    if (elemHits.length > 0 && elemHits[0].distance < closestWallDist + 0.15) {
      let topObj: THREE.Object3D | null = elemHits[0].object;
      while (topObj && !topObj.userData?.element && topObj.parent) {
        topObj = topObj.parent;
      }
      if (topObj?.userData?.element) {
        this.focusOnSelection({ type: 'ELEMENT', elementId: topObj.userData.element.id });
      }
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    // Support Middle Mouse Button (e.button === 1) for effortless 360° camera rotation (or Alt+Middle to rotate selected element)
    if (e.button === 1) {
      e.preventDefault();
      this.isMiddlePointerDown = true;
      this.isPointerDown = true;
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
      this.pointerMoved = 0;
      this.draggingRackId = null;
      this.draggingElementId = null;
      return;
    }

    if (e.button !== 0) return;
    this.isMiddlePointerDown = false;
    this.isPointerDown = true;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;
    this.pointerMoved = 0;
    this.draggingRackId = null;
    this.draggingElementId = null;

    // If global edit lock is enabled OR no element is in explicit Move Mode, do not start dragging objects!
    // Left-clicking without Move Mode active will only select the item on pointerup or orbit the camera on drag.
    if (this.isEditLocked || !this.activeMoveTargetId) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const closestWallDist = this.getClosestSolidWallDistance();

    const planeIntersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, planeIntersect);

    // 1. Check hit test for rack dragging (ONLY if this rack is the explicit activeMoveTargetId and not behind a wall)
    const rackIntersects = this.raycaster.intersectObjects(Array.from(this.rackModels.values()), true);
    if (rackIntersects.length > 0 && rackIntersects[0].distance < closestWallDist + 0.05) {
      let topObj: THREE.Object3D | null = rackIntersects[0].object;
      while (topObj && !topObj.userData?.rack && topObj.parent) {
        topObj = topObj.parent;
      }
      if (topObj && topObj.userData?.rack) {
        const rack = topObj.userData.rack as WarehouseRack;
        if (this.activeMoveTargetId !== rack.id) {
          return;
        }
        if (rack.locked) {
          this.callbacks.onLockedDragAttempt?.(rack.code);
          return;
        }
        this.draggingRackId = rack.id;
        if (planeIntersect) {
          this.dragOffset.set(rack.px - planeIntersect.x, 0, rack.pz - planeIntersect.z);
        }
        return;
      }
    }

    // 2. Check hit test for 3D architectural/equipment element dragging (ONLY if this element is activeMoveTargetId)
    const elemIntersects = this.raycaster.intersectObjects(Array.from(this.elementModels.values()), true);
    if (elemIntersects.length > 0 && elemIntersects[0].distance < closestWallDist + 0.2) {
      let topObj: THREE.Object3D | null = elemIntersects[0].object;
      while (topObj && !topObj.userData?.element && topObj.parent) {
        topObj = topObj.parent;
      }
      if (topObj && topObj.userData?.element) {
        const el = topObj.userData.element as ArchitecturalElement;
        if (this.activeMoveTargetId !== el.id) {
          return;
        }
        if (el.locked) {
          this.callbacks.onLockedDragAttempt?.(el.label);
          return;
        }
        this.draggingElementId = el.id;
        if (planeIntersect) {
          this.dragOffset.set(el.x - planeIntersect.x, 0, el.z - planeIntersect.z);
        }
      }
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isPointerDown) return;
    const dx = e.clientX - this.pointerStartX;
    const dy = e.clientY - this.pointerStartY;
    this.pointerMoved += Math.abs(dx) + Math.abs(dy);

    // Middle Mouse Button (or Alt + Middle Mouse to rotate selected Rack/Element in 360°)
    if (this.isMiddlePointerDown || (e.buttons & 4) === 4) {
      if ((e.altKey || e.ctrlKey) && !this.isEditLocked) {
        if ((this.selection.type === 'RACK' || this.selection.type === 'CELL') && this.selection.rackId) {
          const rackModel = this.rackModels.get(this.selection.rackId);
          const rack = this.cachedRacks.find((r) => r.id === this.selection.rackId);
          if (rackModel && rack && !rack.locked) {
            const curRot = getRackRotationDeg(rack);
            const nextRot = Math.round(((curRot + dx * 0.8) % 360 + 360) % 360);
            rackModel.rotation.y = (nextRot * Math.PI) / 180;
            this.updateSelectionHalo();
            this.callbacks.onLiveDragRack(rack.id, rack.px, rack.pz, nextRot);
            this.pointerStartX = e.clientX;
            this.pointerStartY = e.clientY;
            return;
          }
        } else if (this.selection.type === 'ELEMENT' && this.selection.elementId) {
          const elemModel = this.elementModels.get(this.selection.elementId);
          const el = this.cachedElements.find((item) => item.id === this.selection.elementId);
          if (elemModel && el && !el.locked) {
            const curRot = typeof el.rotation === 'number' ? el.rotation : el.rot ? 90 : 0;
            const nextRot = Math.round(((curRot + dx * 0.8) % 360 + 360) % 360);
            elemModel.rotation.y = (nextRot * Math.PI) / 180;
            this.updateSelectionHalo();
            this.callbacks.onLiveDragElement(el.id, el.x, el.z, el.rot, nextRot);
            this.pointerStartX = e.clientX;
            this.pointerStartY = e.clientY;
            return;
          }
        }
      }

      // Smooth 360° Middle-Mouse Camera Orbit
      if (this.cameraMode === 'FOLLOW_WORKER') {
        this.cameraMode = 'ORBIT';
      }
      this.targetCameraTheta -= dx * 0.0075;
      this.targetCameraPhi = Math.max(0.05, Math.min(Math.PI / 2.02, this.targetCameraPhi - dy * 0.006));
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
      return;
    }

    if (!this.isEditLocked && this.draggingRackId && this.pointerMoved > 6) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersection);

      if (intersection) {
        const rackModel = this.rackModels.get(this.draggingRackId);
        if (rackModel) {
          const rack = rackModel.userData.rack as WarehouseRack;
          const rawX = intersection.x + this.dragOffset.x;
          const rawZ = intersection.z + this.dragOffset.z;
          const { px: snappedX, pz: snappedZ, rotation: snappedRot } = this.applyMagneticRackWallSnap(
            rack,
            rawX,
            rawZ,
            false,
          );
          rackModel.position.set(snappedX, 0, snappedZ);
          if (typeof snappedRot === 'number') {
            rackModel.rotation.y = (snappedRot * Math.PI) / 180;
          }
          this.updateSelectionHalo();
          this.callbacks.onLiveDragRack(this.draggingRackId, snappedX, snappedZ, snappedRot);
        }
      }
    } else if (!this.isEditLocked && this.draggingElementId && this.pointerMoved > 6) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersection);

      if (intersection) {
        const elemModel = this.elementModels.get(this.draggingElementId);
        if (elemModel) {
          const el = elemModel.userData.element as ArchitecturalElement;
          const rawX = intersection.x + this.dragOffset.x;
          const rawZ = intersection.z + this.dragOffset.z;
          const { x: snappedX, z: snappedZ, rot, rotation } = this.applyMagneticWallSnap(el, rawX, rawZ);
          elemModel.position.set(snappedX + el.w / 2, 0, snappedZ + el.d / 2);
          if (typeof rotation === 'number') {
            elemModel.rotation.y = (rotation * Math.PI) / 180;
          } else if (rot !== undefined) {
            elemModel.rotation.y = rot ? Math.PI / 2 : 0;
          }
          this.updateSelectionHalo();
          this.callbacks.onLiveDragElement(this.draggingElementId, snappedX, snappedZ, rot, rotation);
        }
      }
    } else {
      // Orbit camera rotation / pan (works in all modes!)
      if (this.cameraMode === 'FOLLOW_WORKER') {
        this.cameraMode = 'ORBIT';
      }
      if (e.buttons === 2 || e.shiftKey) {
        const panSpeed = 0.02 * Math.max(0.25, this.cameraRadius / 22);
        this.targetOrbitLookAt.x -= dx * panSpeed * Math.cos(this.targetCameraTheta);
        this.targetOrbitLookAt.z += dx * panSpeed * Math.sin(this.targetCameraTheta);
        this.targetOrbitLookAt.y = Math.max(0.1, this.targetOrbitLookAt.y + dy * panSpeed);
      } else {
        this.targetCameraTheta -= dx * 0.0065;
        this.targetCameraPhi = Math.max(0.05, Math.min(Math.PI / 2.02, this.targetCameraPhi - dy * 0.0055));
      }
    }

    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    if (this.isMiddlePointerDown) {
      this.isMiddlePointerDown = false;
      return;
    }

    if (this.pointerMoved < 7) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const closestWallDist = this.getClosestSolidWallDistance();

      // 1. Check Simulated Package (PKG-572) — only if not occluded by a wall
      if (this.simulatedPackageMesh.visible) {
        const pkgHits = this.raycaster.intersectObject(this.simulatedPackageMesh, true);
        if (pkgHits.length > 0 && pkgHits[0].distance < closestWallDist + 0.05) {
          const sel: SelectionState = { type: 'PACKAGE' };
          this.setSelection(sel);
          this.callbacks.onSelectTarget(sel);
          this.draggingRackId = null;
          this.draggingElementId = null;
          return;
        }
      }

      // 2. Check Human Worker — only if not occluded by a wall
      const workerHits = this.raycaster.intersectObject(this.worker.group, true);
      if (workerHits.length > 0 && workerHits[0].distance < closestWallDist + 0.05) {
        const sel: SelectionState = { type: 'WORKER' };
        this.setSelection(sel);
        this.callbacks.onSelectTarget(sel);
        this.draggingRackId = null;
        this.draggingElementId = null;
        return;
      }

      // 3. Check Racks & Individual Rack Cells (Cartons & Plaques) — only if in front of any solid wall!
      const rackHits = this.raycaster.intersectObjects(Array.from(this.rackModels.values()), true);
      if (rackHits.length > 0 && rackHits[0].distance < closestWallDist + 0.05) {
        const firstHit = rackHits[0].object;

        let cartonObj: THREE.Object3D | null = firstHit;
        while (cartonObj && !cartonObj.userData?.isCarton && cartonObj.parent) {
          cartonObj = cartonObj.parent;
        }

        let rackObj: THREE.Object3D | null = firstHit;
        while (rackObj && !rackObj.userData?.rack && rackObj.parent) {
          rackObj = rackObj.parent;
        }

        if (cartonObj && cartonObj.userData?.isCarton && rackObj?.userData?.rack) {
          const rack = rackObj.userData.rack as WarehouseRack;
          const lvl = Number(cartonObj.userData.level);
          const slt = Number(cartonObj.userData.slot);
          const sel: SelectionState = {
            type: 'CELL',
            rackId: rack.id,
            cellLevel: lvl,
            cellSlot: slt,
            cellCode: String(cartonObj.userData.cellCode),
          };
          // If another item was in Move Mode, clear it when selecting a new item
          if (this.activeMoveTargetId && this.activeMoveTargetId !== rack.id) {
            this.setActiveMoveTarget(null);
          }
          this.setSelection(sel, this.cachedRacks);
          this.callbacks.onSelectTarget(sel);
          this.draggingRackId = null;
          this.draggingElementId = null;
          return;
        } else if (rackObj && rackObj.userData?.rack) {
          const rack = rackObj.userData.rack as WarehouseRack;
          const sel: SelectionState = {
            type: 'RACK',
            rackId: rack.id,
          };
          if (this.activeMoveTargetId && this.activeMoveTargetId !== rack.id) {
            this.setActiveMoveTarget(null);
          }
          this.setSelection(sel);
          this.callbacks.onSelectTarget(sel);
          this.draggingRackId = null;
          this.draggingElementId = null;
          return;
        }
      }

      // 4. Check 3D Architectural & Equipment Elements (only if not occluded behind a closer wall)
      const elemHits = this.raycaster.intersectObjects(Array.from(this.elementModels.values()), true);
      if (elemHits.length > 0 && elemHits[0].distance < closestWallDist + 0.2) {
        let topObj: THREE.Object3D | null = elemHits[0].object;
        while (topObj && !topObj.userData?.element && topObj.parent) {
          topObj = topObj.parent;
        }
        if (topObj && topObj.userData?.element) {
          const el = topObj.userData.element as ArchitecturalElement;
          const sel: SelectionState = {
            type: 'ELEMENT',
            elementId: el.id,
          };
          if (this.activeMoveTargetId && this.activeMoveTargetId !== el.id) {
            this.setActiveMoveTarget(null);
          }
          this.setSelection(sel);
          this.callbacks.onSelectTarget(sel);
          this.draggingRackId = null;
          this.draggingElementId = null;
          return;
        }
      }

      // 5. Check Perimeter Building Walls / Windows
      const wallHits = this.raycaster.intersectObjects(this.propsGroup.children, true);
      if (wallHits.length > 0 && wallHits[0].object.userData?.type === 'WAREHOUSE') {
        if (this.activeMoveTargetId) {
          this.setActiveMoveTarget(null);
        }
        const sel: SelectionState = { type: 'WAREHOUSE' };
        this.setSelection(sel);
        this.callbacks.onSelectTarget(sel);
        this.draggingRackId = null;
        this.draggingElementId = null;
        return;
      }

      // 6. Check Floor Zones (only if not occluded behind a solid wall)
      const zoneHits = this.raycaster.intersectObjects(Array.from(this.zoneMeshes.values()), true);
      if (zoneHits.length > 0 && zoneHits[0].distance < closestWallDist + 0.05) {
        let topObj: THREE.Object3D | null = zoneHits[0].object;
        while (topObj && !topObj.userData?.element && topObj.parent) {
          topObj = topObj.parent;
        }
        if (topObj && topObj.userData?.element) {
          const el = topObj.userData.element as ArchitecturalElement;
          if (this.activeMoveTargetId && this.activeMoveTargetId !== el.id) {
            this.setActiveMoveTarget(null);
          }
          const sel: SelectionState = {
            type: 'ELEMENT',
            elementId: el.id,
          };
          this.setSelection(sel);
          this.callbacks.onSelectTarget(sel);
          this.sendWorkerToPosition(zoneHits[0].point.x, zoneHits[0].point.z);
          this.draggingRackId = null;
          this.draggingElementId = null;
          return;
        }
      }

      // 7. Click on Floor Slab -> Walk Worker Here (only if floor point is not occluded by a solid wall)
      if (this.floorMesh) {
        const floorHits = this.raycaster.intersectObject(this.floorMesh);
        if (floorHits.length > 0 && floorHits[0].distance < closestWallDist + 0.05) {
          const hit = floorHits[0];
          if (this.activeMoveTargetId) {
            this.setActiveMoveTarget(null);
          }
          this.sendWorkerToPosition(hit.point.x, hit.point.z);
          if (e.shiftKey) {
            const sel: SelectionState = { type: 'WAREHOUSE' };
            this.setSelection(sel);
            this.callbacks.onSelectTarget(sel);
          }
        }
      }
    }

    this.draggingRackId = null;
    this.draggingElementId = null;
  };

  /**
   * Cursor-Aware Deep Wheel Zoom in ALL Camera Modes!
   * Zooms smoothly from 140m overview all the way down to 0.45m right in front of a medicine cell & its label!
   */
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();

    const zoomDelta = Math.max(-0.24, Math.min(0.24, e.deltaY * 0.0018));
    const prevRadius = this.targetCameraRadius;
    this.targetCameraRadius = Math.max(0.45, Math.min(140, prevRadius * (1 + zoomDelta)));

    // When zooming IN (e.deltaY < 0) in non-follow modes, subtly steer lookAt toward the 3D object/cell under the cursor!
    if (e.deltaY < 0 && this.cameraMode !== 'FOLLOW_WORKER' && this.cameraMode !== 'FOLLOW_PACKAGE') {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // First check if cursor is pointing at a rack or cell carton
      const rackHits = this.raycaster.intersectObjects(Array.from(this.rackModels.values()), true);
      if (rackHits.length > 0) {
        this.targetOrbitLookAt.lerp(rackHits[0].point, 0.22);
        return;
      }

      // Or if a cell is currently selected, steer toward the selected cell
      if (
        this.selection.type === 'CELL' &&
        this.selection.rackId &&
        this.selection.cellLevel &&
        this.selection.cellSlot
      ) {
        const rack = this.cachedRacks.find((r) => r.id === this.selection.rackId);
        if (rack) {
          const cellPos = this.getCellWorldPosition(rack, this.selection.cellLevel, this.selection.cellSlot);
          this.targetOrbitLookAt.lerp(cellPos, 0.25);
          return;
        }
      }

      // Otherwise steer gently toward the point on the floor under cursor
      const planeHit = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, planeHit)) {
        if (Math.abs(planeHit.x) < 100 && Math.abs(planeHit.z) < 100) {
          planeHit.y = Math.max(0.4, this.targetOrbitLookAt.y * 0.92);
          this.targetOrbitLookAt.lerp(planeHit, 0.14);
        }
      }
    }
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.touchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      this.touchStartRadius = this.targetCameraRadius;
      this.lastTouchMidX = (t1.clientX + t2.clientX) / 2;
      this.lastTouchMidY = (t1.clientY + t2.clientY) / 2;
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const curDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (this.touchStartDist > 0 && curDist > 0) {
        const scale = this.touchStartDist / curDist;
        this.targetCameraRadius = Math.max(0.45, Math.min(140, this.touchStartRadius * scale));
      }

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const dx = midX - this.lastTouchMidX;
      const dy = midY - this.lastTouchMidY;
      const panSpeed = 0.02 * Math.max(0.25, this.cameraRadius / 25);
      this.targetOrbitLookAt.x -= dx * panSpeed * Math.cos(this.targetCameraTheta);
      this.targetOrbitLookAt.z += dx * panSpeed * Math.sin(this.targetCameraTheta);
      this.targetOrbitLookAt.y = Math.max(0.1, this.targetOrbitLookAt.y + dy * panSpeed);
      this.lastTouchMidX = midX;
      this.lastTouchMidY = midY;
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      this.touchStartDist = 0;
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    let type: 'RACK' | 'ELEMENT' | 'FLOOR' | 'WORKER' = 'FLOOR';
    let id: string | null = null;
    let worldX = 12;
    let worldZ = 8;

    if (intersects.length > 0) {
      const hit = intersects[0];
      worldX = Math.round(hit.point.x * 10) / 10;
      worldZ = Math.round(hit.point.z * 10) / 10;

      let topObj: THREE.Object3D | null = hit.object;
      while (topObj && !topObj.userData?.type && topObj.parent) {
        topObj = topObj.parent;
      }
      if (topObj?.userData?.type === 'RACK') {
        type = 'RACK';
        id = topObj.userData.rack.id;
      } else if (topObj?.userData?.type === 'ELEMENT') {
        type = 'ELEMENT';
        id = topObj.userData.element.id;
      } else if (topObj?.userData?.type === 'WORKER') {
        type = 'WORKER';
        id = 'human-worker';
      }
    }

    this.callbacks.onContextMenu({
      clientX: e.clientX,
      clientY: e.clientY,
      type,
      id,
      worldX,
      worldZ,
    });
  };

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);

    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('dblclick', this.onDoubleClick);
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('contextmenu', this.onContextMenu);

    el.removeEventListener('touchstart', this.onTouchStart);
    el.removeEventListener('touchmove', this.onTouchMove);
    el.removeEventListener('touchend', this.onTouchEnd);
    el.removeEventListener('touchcancel', this.onTouchEnd);

    this.renderer.dispose();
    if (el.parentElement) {
      el.parentElement.removeChild(el);
    }
  }
}
