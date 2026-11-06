/**
 * DAWA 3D Warehouse Engine & Worker Journey — Types & Data Contracts
 * Supports true 3D WebGL Three.js rendering, procedural models, CAD architecture,
 * granular cell/object selection, real-time side editing, real-time SQLite DB sync,
 * and human worker navigation.
 */

export type StorageCondition = 'ROOM' | 'COLD' | 'QUARANTINE';

export type MovementCategory = 'AVAILABLE' | 'ORDER_PICK' | 'EXPIRED' | 'RETURNED';

export type RackMaterialFinish =
  | 'POWDER_STEEL'
  | 'BRUSHED_STAINLESS'
  | 'GALVANIZED'
  | 'WALNUT_WOOD'
  | 'OAK_WOOD'
  | 'PHARMA_WHITE';

export type FloorTexturePreset =
  | 'POLISHED_CONCRETE'
  | 'EPOXY_PHARMA'
  | 'MARBLE_TILES'
  | 'DARK_ASPHALT'
  | 'WOOD_PARQUET';

export type WallTexturePreset =
  | 'INSULATED_PANELS'
  | 'PAINTED_BRICK'
  | 'CONCRETE_SLAB'
  | 'CLEANROOM_CLADDING';

export type BackgroundPreset =
  | 'DAYLIGHT_STUDIO'
  | 'OUTDOOR_HORIZON'
  | 'SUNSET_GOLDEN'
  | 'NIGHT_CYBER'
  | 'CLEAN_WHITE';

export type WallDisplayMode = 'SOLID' | 'GLASS' | 'CURB' | 'OPEN';

export interface WarehouseEnvironmentConfig {
  floorTexture: FloorTexturePreset;
  wallTexture: WallTexturePreset;
  backgroundPreset: BackgroundPreset;
  northWall: WallDisplayMode;
  southWall: WallDisplayMode;
  westWall: WallDisplayMode;
  eastWall: WallDisplayMode;
  wallThickness: number;
  wallColor?: string;
  floorColor?: string;
  showRoofTrusses: boolean;
  showLights: boolean;
  showClerestoryWindows: boolean;
  showFloorMarkings: boolean;
  showExteriorYard: boolean;
  lightIntensity: number;
  openSpaceMode: boolean; // Allows expanding and placing racks anywhere without boundary limits
}

export const DEFAULT_ENVIRONMENT_CONFIG: WarehouseEnvironmentConfig = {
  floorTexture: 'POLISHED_CONCRETE',
  wallTexture: 'INSULATED_PANELS',
  backgroundPreset: 'OUTDOOR_HORIZON',
  northWall: 'SOLID',
  southWall: 'CURB',
  westWall: 'SOLID',
  eastWall: 'CURB',
  wallThickness: 0.28,
  showRoofTrusses: true,
  showLights: true,
  showClerestoryWindows: true,
  showFloorMarkings: true,
  showExteriorYard: true,
  lightIntensity: 1.0,
  openSpaceMode: true,
};

export type CellArrangementMode =
  | 'HORIZONTAL_ROW' // صف أفقي عرضي واحد (N × 1)
  | 'MATRIX_2D'      // مصفوفة ثنائية الأبعاد (عرضي × طولي)
  | 'DEPTH_FILE'     // صف طولي في العمق (1 × N)
  | 'VERTICAL_STACK' // تكديس رأسي طابقي فوق بعض (Y-Stack)
  | 'STAGGERED_HEX'; // ترتيب متداخل / سداسي متناوب

export type CellAlignmentMode = 'CENTER' | 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT';

export type CellFillDirection = 'ROW_FIRST' | 'COL_FIRST' | 'MANUAL';

export interface CellMedicineItem {
  id: string;
  subSlotCode: string; // e.g. "A-01/R1-C1", "قسم 1", or "A-01/1"
  productName: string;
  nameEn?: string;
  scientificName?: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  movementCategory?: MovementCategory;
  color?: string;
  opacity?: number; // 0.1 to 1.0 individual medicine carton opacity/clarity
  matrixRow?: number; // 1-indexed row along cell depth (طولي - Z axis)
  matrixCol?: number; // 1-indexed column along cell width (عرضي - X axis)
  matrixLayerY?: number; // 1-indexed vertical stacking layer (رأسي - Y axis)
}

export interface RackCell {
  id: string;
  code: string; // e.g. "A-01", "01.01", "L1-S1", "COLD-01", "خزينة-1"
  cellLabel?: string; // Explicit descriptive cell name, e.g. "خانة الطوارئ A-01"
  level: number | string;
  slot: number | string;
  nameAr?: string;
  nameEn?: string;
  scientificName?: string;
  barcode?: string;
  capacity?: number;
  occupied?: boolean;
  productName?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity?: number;
  color?: string;
  storageCondition?: StorageCondition;
  movementCategory?: MovementCategory;
  orderRef?: string;
  returnReason?: string;
  updatedAt?: string;
  notes?: string;
  formatType?: 'NUMERIC' | 'ALPHANUMERIC' | 'TIER_SLOT' | 'PHARMA_COLD' | 'CUSTOM';
  cellOpacity?: number; // 0.1 to 1.0 per-cell transparency/clarity control
  arrangementMode?: CellArrangementMode; // Detailed arrangement pattern inside cell
  matrixCols?: number; // Number of columns in 2D cell matrix (عرضي - X)
  matrixRows?: number; // Number of rows in 2D cell matrix (طولي - Z)
  matrixLayersY?: number; // Number of vertical layers stacked on Y (1 to 4)
  gapX?: number; // Horizontal gap in meters between cartons (0 to 0.12)
  gapZ?: number; // Depth gap in meters between rows (0 to 0.12)
  gapY?: number; // Vertical gap in meters between stacked layers (0 to 0.06)
  cartonScale?: number; // Individual carton size multiplier (0.4 to 1.15)
  cartonRotationDeg?: number; // Rotation of cartons inside the cell (-90 to 90 deg)
  cellAlignment?: CellAlignmentMode; // Alignment of items inside cell
  fillDirection?: CellFillDirection; // Auto-indexing direction (ROW_FIRST, COL_FIRST, MANUAL)
  showInternalDividers?: boolean; // Toggle 3D physical divider grid inside cell
  dividerHeightRatio?: number; // Height ratio of 3D dividers (0.2 to 1.0)
  staggerOffsetRatio?: number; // Row offset for STAGGERED_HEX arrangement (0.0 to 0.5)
  medicines?: CellMedicineItem[]; // Subdivided medicines inside this single cell
}

export type StationsArrangementOrientation =
  | 'HORIZONTAL'
  | 'VERTICAL'
  | 'GRID_3X2'
  | 'GRID_2X3'
  | 'COMPACT_BAR';

export type StationsDockPosition =
  | 'TOP_CENTER'
  | 'BOTTOM_CENTER'
  | 'LEFT_SIDE'
  | 'RIGHT_SIDE';

export interface SixStationsLayoutConfig {
  orientation: StationsArrangementOrientation;
  dockPosition: StationsDockPosition;
  reverseOrder: boolean;
  cardScale: number; // 0.75 to 1.25
  gapPx: number; // 2 to 16
  panelOpacity: number; // 0.3 to 1.0
  showEnglishTitle: boolean;
  showDescription: boolean;
  showStageNumber: boolean;
  showCameraControls: boolean;
  showSimulateButton: boolean;
}

export const DEFAULT_SIX_STATIONS_LAYOUT: SixStationsLayoutConfig = {
  orientation: 'HORIZONTAL',
  dockPosition: 'TOP_CENTER',
  reverseOrder: false,
  cardScale: 1.0,
  gapPx: 6,
  panelOpacity: 0.94,
  showEnglishTitle: true,
  showDescription: false,
  showStageNumber: true,
  showCameraControls: true,
  showSimulateButton: true,
};

/**
 * Computes optimal 2D/3D Matrix dimensions (cols × rows × layers) for a cell given item count, mode, and explicit overrides.
 */
export function computeCellMatrixLayout(
  itemCount: number,
  explicitCols?: number,
  explicitRows?: number,
  arrangementMode?: CellArrangementMode,
  explicitLayersY?: number,
): { cols: number; rows: number; layersY: number } {
  const safeCount = Math.max(1, itemCount);
  const layersY = explicitLayersY && explicitLayersY >= 1 ? explicitLayersY : 1;

  if (arrangementMode === 'HORIZONTAL_ROW') {
    const cols = explicitCols && explicitCols >= 1 ? explicitCols : safeCount;
    return { cols, rows: 1, layersY };
  }
  if (arrangementMode === 'DEPTH_FILE') {
    const rows = explicitRows && explicitRows >= 1 ? explicitRows : safeCount;
    return { cols: 1, rows, layersY };
  }
  if (arrangementMode === 'VERTICAL_STACK') {
    const stackLayers = explicitLayersY && explicitLayersY > 1 ? explicitLayersY : safeCount;
    return {
      cols: explicitCols && explicitCols >= 1 ? explicitCols : 1,
      rows: explicitRows && explicitRows >= 1 ? explicitRows : 1,
      layersY: stackLayers,
    };
  }

  if (explicitCols && explicitRows && explicitCols >= 1 && explicitRows >= 1) {
    return { cols: explicitCols, rows: explicitRows, layersY };
  }
  if (explicitCols && explicitCols >= 1) {
    const cols = explicitCols;
    const rows = Math.max(1, Math.ceil(safeCount / (cols * layersY)));
    return { cols, rows, layersY };
  }
  if (explicitRows && explicitRows >= 1) {
    const rows = explicitRows;
    const cols = Math.max(1, Math.ceil(safeCount / (rows * layersY)));
    return { cols, rows, layersY };
  }
  if (safeCount <= 1) return { cols: 1, rows: 1, layersY };
  if (safeCount === 2) return { cols: 2, rows: 1, layersY };
  if (safeCount <= 4) return { cols: 2, rows: 2, layersY };
  if (safeCount <= 6) return { cols: 3, rows: 2, layersY };
  if (safeCount <= 8) return { cols: 4, rows: 2, layersY };
  return { cols: 3, rows: Math.max(2, Math.ceil(safeCount / 3)), layersY };
}

export interface RealTimeCellInventoryItem {
  id: string;
  rackId: string;
  rackCode: string;
  rackName?: string;
  level: number;
  slot: number;
  cellCode: string;
  cellLabel?: string;
  productName: string;
  nameEn: string;
  scientificName: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  capacity: number;
  storageCondition: StorageCondition;
  movementCategory: MovementCategory;
  orderRef: string;
  returnReason: string;
  updatedAt: string;
  medicines?: CellMedicineItem[];
}

export interface RealTimeInventoryTransaction {
  id: string;
  cellId: string;
  rackId: string;
  rackCode: string;
  level: number;
  slot: number;
  cellCode: string;
  productName: string;
  barcode: string;
  actionType: 'ORDER_PICK' | 'EXPIRED_PULL' | 'RETURN_PROCESS' | 'RESTOCK';
  qtyDelta: number;
  remainingQty: number;
  operatorName: string;
  referenceCode: string;
  timestamp: string;
}

export interface WarehouseRack {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  zone: string;
  shelf: string;
  levelVal: string;
  status?: 'APPROVED' | 'DRAFT' | 'MAINTENANCE';
  rackType?: 'STEEL_INDUSTRIAL' | 'WOODEN_CABINET';
  materialFinish?: RackMaterialFinish;
  storageType?: StorageCondition;
  customColor?: string;
  hasLedLighting?: boolean;
  isNew?: boolean;
  locked?: boolean; // Per-rack edit/drag lock
  px: number; // 3D World X in meters
  pz: number; // 3D World Z in meters
  rot?: boolean; // Legacy 90 deg flag
  rotation?: number; // Full 0 to 360 degrees rotation
  w?: number; // Width in meters (can expand to full wall or more)
  d?: number; // Depth in meters
  h?: number; // Height in meters
  levels?: number; // Number of vertical tiers
  cellsPerLevel?: number; // Slots per level
  thumbnailUrl?: string;
  customCells?: RackCell[];
}

/**
 * Helper to get rack rotation in degrees (0 - 360)
 */
export function getRackRotationDeg(rack: WarehouseRack): number {
  if (typeof rack.rotation === 'number' && !Number.isNaN(rack.rotation)) {
    return ((rack.rotation % 360) + 360) % 360;
  }
  return rack.rot ? 90 : 0;
}

export const getRackRotationDegrees = getRackRotationDeg;

/**
 * Helper to get architectural element rotation in degrees (0 - 360)
 */
export function getElementRotationDeg(el: ArchitecturalElement): number {
  if (typeof el.rotation === 'number' && !Number.isNaN(el.rotation)) {
    return ((el.rotation % 360) + 360) % 360;
  }
  return el.rot ? 90 : 0;
}

/**
 * Resolves or generates the RackCell data for a given 1-indexed level and slot.
 */
export function resolveRackCell(
  rack: WarehouseRack,
  levelIndex1: number,
  slotIndex1: number,
): RackCell {
  const existing = rack.customCells?.find(
    (c) => Number(c.level) === levelIndex1 && Number(c.slot) === slotIndex1,
  );
  if (existing) return existing;

  const isCold = rack.storageType === 'COLD' || rack.zone.toUpperCase().includes('COLD');
  const isWooden = rack.rackType === 'WOODEN_CABINET';
  const defaultCode = isWooden
    ? `W${levelIndex1}-${String(slotIndex1).padStart(2, '0')}`
    : isCold
    ? `COLD-${levelIndex1}${slotIndex1}`
    : `${String.fromCharCode(64 + levelIndex1)}-${String(slotIndex1).padStart(2, '0')}`;

  const defaultBarcode = `6281000${String(rack.code.replace(/\D/g, '') || '101').padStart(3, '0')}${levelIndex1}${String(slotIndex1).padStart(2, '0')}`;

  const isDefaultExpired = levelIndex1 === 1 && slotIndex1 === 3;
  const isDefaultCritical30 = levelIndex1 === 3 && slotIndex1 === 2;
  const isDefaultWarning90 = levelIndex1 === 4 && slotIndex1 === 3;

  const primaryName = isWooden
    ? 'مستحضرات عشبية وفيتامينات'
    : isCold
    ? 'أنسولين ولقاحات مبردة'
    : `${rack.nameAr || rack.name}`;
  const secondaryName = isWooden
    ? 'أوميجا-3 كبسولات جيلاتينية'
    : isCold
    ? 'مصل مناعي مبرد 2-8°C'
    : 'بانادول إكسترا 500 مجم (Panadol Extra)';

  const primaryQty = isDefaultExpired ? 10 : isDefaultCritical30 ? 20 : 45;
  const secondaryQty = isDefaultExpired ? 8 : isDefaultCritical30 ? 12 : 30;
  const primaryExp = isDefaultExpired
    ? '2025-01-15'
    : isDefaultCritical30
    ? '2026-11-20'
    : isDefaultWarning90
    ? '2027-01-15'
    : '2027-12-31';

  const defaultMedicines: CellMedicineItem[] = [
    {
      id: `${rack.id}-L${levelIndex1}-S${slotIndex1}-M1`,
      subSlotCode: `${defaultCode}/R1-C1`,
      matrixRow: 1,
      matrixCol: 1,
      productName: primaryName,
      nameEn: isWooden ? 'Herbal & Vitamins' : isCold ? 'Cold Chain Insulin' : rack.nameEn || rack.code,
      scientificName: 'Pharmaceutical Active Compound A',
      barcode: defaultBarcode,
      batchNumber: `BCH-26-${levelIndex1}${slotIndex1}A`,
      expiryDate: primaryExp,
      quantity: primaryQty,
      movementCategory: isDefaultExpired ? 'EXPIRED' : 'AVAILABLE',
      color: isDefaultExpired ? '#e11d48' : '#0284c7',
    },
    {
      id: `${rack.id}-L${levelIndex1}-S${slotIndex1}-M2`,
      subSlotCode: `${defaultCode}/R1-C2`,
      matrixRow: 1,
      matrixCol: 2,
      productName: secondaryName,
      nameEn: isWooden ? 'Omega-3 Softgels' : isCold ? 'Refrigerated Immune Serum' : 'Panadol Extra 500mg',
      scientificName: 'Paracetamol + Caffeine / Active B',
      barcode: `${defaultBarcode.slice(0, -1)}9`,
      batchNumber: `BCH-26-${levelIndex1}${slotIndex1}B`,
      expiryDate: '2028-04-30',
      quantity: secondaryQty,
      movementCategory: 'AVAILABLE',
      color: '#059669',
    },
    {
      id: `${rack.id}-L${levelIndex1}-S${slotIndex1}-M3`,
      subSlotCode: `${defaultCode}/R2-C1`,
      matrixRow: 2,
      matrixCol: 1,
      productName: isWooden ? 'فيتامين C زنك فوار' : isCold ? 'أنسولين سريع المفعول' : 'أموكسيسيلين 500 ملجم',
      nameEn: isWooden ? 'Vitamin C + Zinc' : isCold ? 'Rapid-acting Insulin' : 'Amoxicillin 500mg',
      scientificName: 'Amoxicillin Trihydrate',
      barcode: `${defaultBarcode.slice(0, -2)}81`,
      batchNumber: `BCH-26-${levelIndex1}${slotIndex1}C`,
      expiryDate: '2027-08-15',
      quantity: Math.max(8, Math.round(primaryQty * 0.7)),
      movementCategory: 'AVAILABLE',
      color: '#d97706',
    },
    {
      id: `${rack.id}-L${levelIndex1}-S${slotIndex1}-M4`,
      subSlotCode: `${defaultCode}/R2-C2`,
      matrixRow: 2,
      matrixCol: 2,
      productName: isWooden ? 'مستخلص الزنجبيل والكركم' : isCold ? 'لقاح الأنفلونزا الرباعي' : 'أوميبرازول 20 ملجم',
      nameEn: isWooden ? 'Ginger & Curcumin' : isCold ? 'Quadrivalent Flu Vaccine' : 'Omeprazole 20mg',
      scientificName: 'Omeprazole Magnesium',
      barcode: `${defaultBarcode.slice(0, -2)}92`,
      batchNumber: `BCH-26-${levelIndex1}${slotIndex1}D`,
      expiryDate: '2028-01-20',
      quantity: Math.max(6, Math.round(secondaryQty * 0.8)),
      movementCategory: 'AVAILABLE',
      color: '#7c3aed',
    },
  ];

  const totalCalculatedQty = defaultMedicines.reduce((sum, m) => sum + m.quantity, 0);

  return {
    id: `${rack.id}-L${levelIndex1}-S${slotIndex1}`,
    code: defaultCode,
    cellLabel: `خانة ${defaultCode} (طابق ${levelIndex1} · موقع ${slotIndex1})`,
    level: levelIndex1,
    slot: slotIndex1,
    occupied: true,
    capacity: 120,
    quantity: totalCalculatedQty,
    productName: primaryName,
    nameEn: isWooden
      ? 'Herbal & Vitamins'
      : isCold
      ? 'Cold Chain Insulin'
      : rack.nameEn || rack.code,
    scientificName: isWooden
      ? 'Multivitamin & Herbal Extract'
      : isCold
      ? 'Insulin Glargine rDNA 100 IU/ml'
      : 'Pharmaceutical Active Compound',
    barcode: defaultBarcode,
    batchNumber: `BCH-2026-${levelIndex1}${slotIndex1}`,
    expiryDate: primaryExp,
    storageCondition: rack.storageType || 'ROOM',
    movementCategory: isDefaultExpired ? 'EXPIRED' : 'AVAILABLE',
    orderRef: '',
    returnReason: '',
    matrixCols: 2,
    matrixRows: 2,
    medicines: defaultMedicines,
  };
}

/**
 * Returns the organized list of medicines inside any cell.
 * If the cell has an explicit `medicines` array, returns it; otherwise synthesizes the structured list from the cell's fields.
 */
export function getCellMedicines(cell: RackCell | RealTimeCellInventoryItem): CellMedicineItem[] {
  if ('occupied' in cell && cell.occupied === false) {
    return [];
  }
  if (cell.medicines && Array.isArray(cell.medicines)) {
    return cell.medicines;
  }
  if (typeof cell.quantity === 'number' && cell.quantity <= 0) {
    return [];
  }
  const code = 'cellCode' in cell ? cell.cellCode : cell.code;
  const totalQty = Math.max(4, cell.quantity ?? 80);
  const q1 = Math.max(1, Math.round(totalQty * 0.32));
  const q2 = Math.max(1, Math.round(totalQty * 0.26));
  const q3 = Math.max(1, Math.round(totalQty * 0.22));
  const q4 = Math.max(1, totalQty - q1 - q2 - q3);
  const baseBarcode = (cell.barcode || '6281000101').slice(0, -2);

  return [
    {
      id: `${cell.id}-M1`,
      subSlotCode: `${code}/R1-C1`,
      matrixRow: 1,
      matrixCol: 1,
      productName: cell.productName || 'بانادول إكسترا 500 مجم (Panadol Extra)',
      nameEn: cell.nameEn || 'Panadol Extra 500mg',
      scientificName: cell.scientificName || 'Paracetamol + Caffeine',
      barcode: `${baseBarcode}11`,
      batchNumber: cell.batchNumber || 'BCH-26-A1',
      expiryDate: cell.expiryDate || '2027-12-31',
      quantity: q1,
      movementCategory: cell.movementCategory || 'AVAILABLE',
      color: '#0284c7',
    },
    {
      id: `${cell.id}-M2`,
      subSlotCode: `${code}/R1-C2`,
      matrixRow: 1,
      matrixCol: 2,
      productName: 'بروفين 600 مجم مسكن ومضاد التهاب (Brufen 600)',
      nameEn: 'Brufen 600mg Film-Coated Tabs',
      scientificName: 'Ibuprofen 600mg',
      barcode: `${baseBarcode}22`,
      batchNumber: `${cell.batchNumber || 'BCH-26'}-B1`,
      expiryDate: '2028-05-15',
      quantity: q2,
      movementCategory: 'AVAILABLE',
      color: '#059669',
    },
    {
      id: `${cell.id}-M3`,
      subSlotCode: `${code}/R2-C1`,
      matrixRow: 2,
      matrixCol: 1,
      productName: 'أوجمنتين 1 جم مضاد حيوي (Augmentin 1g)',
      nameEn: 'Augmentin 1g Co-Amoxiclav',
      scientificName: 'Amoxicillin + Clavulanic Acid',
      barcode: `${baseBarcode}33`,
      batchNumber: `${cell.batchNumber || 'BCH-26'}-A2`,
      expiryDate: '2027-09-20',
      quantity: q3,
      movementCategory: 'AVAILABLE',
      color: '#d97706',
    },
    {
      id: `${cell.id}-M4`,
      subSlotCode: `${code}/R2-C2`,
      matrixRow: 2,
      matrixCol: 2,
      productName: 'نيكسيوم 40 مجم للمعدة (Nexium 40mg)',
      nameEn: 'Nexium 40mg Esomeprazole',
      scientificName: 'Esomeprazole Magnesium',
      barcode: `${baseBarcode}44`,
      batchNumber: `${cell.batchNumber || 'BCH-26'}-B2`,
      expiryDate: '2028-02-18',
      quantity: q4,
      movementCategory: 'AVAILABLE',
      color: '#7c3aed',
    },
  ];
}

export type StockAlertTier = 'EMPTY' | 'CRITICAL_RED' | 'WARNING_YELLOW' | 'SAFE_GREEN';

export interface CellStockAlertStatus {
  tier: StockAlertTier;
  fillPercent: number; // Remaining stock % (0 - 100)
  consumptionPercent: number; // Consumed stock % (0 - 100)
  remainingQty: number;
  capacity: number;
  shortageQty: number;
  labelAr: string;
  actionRecommendationAr: string;
  colorHex: string;
}

/**
 * Evaluates a cell's Quantity vs Capacity to produce automatic Red/Yellow/Green/Empty visual alerts
 * for restock decision-making in the Matrix Explorer and 3D Warehouse.
 */
export function computeCellStockAlert(
  quantity?: number,
  capacity?: number,
  occupied = true,
  criticalRemainingPct = 25,
  warningRemainingPct = 55,
): CellStockAlertStatus {
  const safeCap = Math.max(1, capacity ?? 120);
  const safeQty = !occupied ? 0 : Math.max(0, quantity ?? 0);
  const fillRatio = Math.min(1, safeQty / safeCap);
  const fillPercent = Math.round(fillRatio * 100);
  const consumptionPercent = Math.max(0, 100 - fillPercent);
  const shortageQty = Math.max(0, safeCap - safeQty);

  if (!occupied || safeQty <= 0) {
    return {
      tier: 'EMPTY',
      fillPercent: 0,
      consumptionPercent: 100,
      remainingQty: 0,
      capacity: safeCap,
      shortageQty: safeCap,
      labelAr: '⚪ خانة فارغة (جاهزة للتعبئة)',
      actionRecommendationAr: 'بانتظار تسكين الأصناف من المشرف أشرف أو أمر توريد أولي',
      colorHex: '#64748b',
    };
  }

  if (fillPercent <= criticalRemainingPct) {
    return {
      tier: 'CRITICAL_RED',
      fillPercent,
      consumptionPercent,
      remainingQty: safeQty,
      capacity: safeCap,
      shortageQty,
      labelAr: `🔴 رصيد حرج (${fillPercent}% متبقي · استهلاك ${consumptionPercent}%)`,
      actionRecommendationAr: `إصدار أمر إعادة توريد فوري (+${shortageQty} عبوة)`,
      colorHex: '#e11d48',
    };
  }

  if (fillPercent <= warningRemainingPct) {
    return {
      tier: 'WARNING_YELLOW',
      fillPercent,
      consumptionPercent,
      remainingQty: safeQty,
      capacity: safeCap,
      shortageQty,
      labelAr: `🟡 تنبيه استهلاك (${fillPercent}% متبقي · استهلاك ${consumptionPercent}%)`,
      actionRecommendationAr: `جدولة طلب تعزيز قريب (+${shortageQty} عبوة)`,
      colorHex: '#f59e0b',
    };
  }

  return {
    tier: 'SAFE_GREEN',
    fillPercent,
    consumptionPercent,
    remainingQty: safeQty,
    capacity: safeCap,
    shortageQty,
    labelAr: `🟢 مخزون آمن (${fillPercent}% متبقي · استهلاك ${consumptionPercent}%)`,
    actionRecommendationAr: 'الرصيد كافٍ — لا يتطلب إعادة توريد حالياً',
    colorHex: '#10b981',
  };
}

/**
 * Generates clean, empty cells (occupied: false, quantity: 0, medicines: []) for a rack
 * so the warehouse can be handed over to Supervisor Ashraf to populate from scratch.
 */
export function createEmptyRackCellsForAshraf(rack: WarehouseRack): RackCell[] {
  const levels = rack.levels || 4;
  const slots = rack.cellsPerLevel || 3;
  const isCold = rack.storageType === 'COLD' || rack.zone.toUpperCase().includes('COLD');
  const isWooden = rack.rackType === 'WOODEN_CABINET';
  const emptyCells: RackCell[] = [];

  for (let lv = 1; lv <= levels; lv++) {
    for (let sl = 1; sl <= slots; sl++) {
      const code = isWooden
        ? `W${lv}-${String(sl).padStart(2, '0')}`
        : isCold
        ? `COLD-${lv}${sl}`
        : `${String.fromCharCode(64 + lv)}-${String(sl).padStart(2, '0')}`;
      const defaultBarcode = `6281000${String(rack.code.replace(/\D/g, '') || '101').padStart(3, '0')}${lv}${String(sl).padStart(2, '0')}`;

      emptyCells.push({
        id: `${rack.id}-L${lv}-S${sl}`,
        code,
        cellLabel: `خانة ${code} (فارغة - جاهزة لتعبئة أشرف)`,
        level: lv,
        slot: sl,
        occupied: false,
        capacity: 120,
        quantity: 0,
        productName: '',
        nameEn: '',
        scientificName: '',
        barcode: defaultBarcode,
        batchNumber: '',
        expiryDate: '',
        storageCondition: rack.storageType || 'ROOM',
        movementCategory: 'AVAILABLE',
        arrangementMode: 'MATRIX_2D',
        matrixCols: 2,
        matrixRows: 2,
        matrixLayersY: 1,
        showInternalDividers: true,
        medicines: [],
      });
    }
  }
  return emptyCells;
}

export type ArchitecturalElementType =
  | 'DOOR'
  | 'WINDOW'
  | 'WALL'
  | 'PILLAR'
  | 'ZONE'
  | 'CONVEYOR'
  | 'WORKSTATION'
  | 'FORKLIFT';

export interface ArchitecturalElement {
  id: string;
  type: ArchitecturalElementType;
  subType: string;
  label: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rotation?: number; // 0 to 360 degrees
  rot?: boolean;
  locked?: boolean;
  openRatio?: number; // For DOOR / WINDOW: 0 (closed) to 1 (fully open entrance)
  doorOpenPercent?: number; // 0 to 100
  color?: string;
  temperatureBand?: string;
  metadata?: Record<string, string | number | boolean>;
}

export type WarehouseRackCell = RackCell;

export interface WarehouseDimensions {
  ww: number; // Width in meters (X axis)
  wd: number; // Depth in meters (Z axis)
  wh: number; // Height in meters (Y axis)
}

export interface WorkerConfig {
  name: string;
  role: string;
  walkSpeed: number;
  actionState: 'IDLE' | 'WALKING' | 'SCANNING' | 'PICKING' | 'REACHING_HIGH' | 'BENDING_LOW';
  carryingBox: boolean;
  carriedBoxCode: string;
  carriedBoxColor: string;
  vestColor: string;
  helmetColor: string;
  suitColor: string;
}

export interface PackageConfig {
  code: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  color: string;
}

export type SelectionTargetType = 'RACK' | 'CELL' | 'ELEMENT' | 'WORKER' | 'PACKAGE' | 'WAREHOUSE' | null;

export interface SelectionState {
  type: SelectionTargetType;
  rackId?: string | null;
  cellLevel?: number | null; // 1-indexed
  cellSlot?: number | null; // 1-indexed
  cellCode?: string | null;
  elementId?: string | null;
}

export interface JourneyStageDef {
  id: string;
  stageNumber: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  zoneId: string;
  color: string;
  targetPos: [number, number, number]; // [X, Y, Z]
  actionType: 'SCAN' | 'PICK' | 'INSPECT' | 'CONSOLIDATE' | 'PACK' | 'LOAD';
}

export const JOURNEY_STAGES: JourneyStageDef[] = [
  {
    id: 'receiving',
    stageNumber: '01',
    titleAr: 'الاستلام والتحقق',
    titleEn: 'Inbound Receiving',
    descriptionAr: 'فحص إشعار الشحنة، مسح باركود الطرد، وزنه وتوثيقه بالرصيف 01',
    descriptionEn: 'Verify ASN notice, scan pallet barcode, weight check at Dock Bay 01',
    zoneId: 'receiving',
    color: '#3b82f6',
    targetPos: [18.5, 0.0, 2.2],
    actionType: 'SCAN',
  },
  {
    id: 'storage',
    stageNumber: '02',
    titleAr: 'التسكين في الرفوف',
    titleEn: 'Putaway & Storage',
    descriptionAr: 'نقل الأصناف للممرات والرفوف الصناعية وفق FEFO وتاريخ الصلاحية',
    descriptionEn: 'Transfer and place cartons onto industrial racks following FEFO rules',
    zoneId: 'storage',
    color: '#06b6d4',
    targetPos: [7.2, 0.0, 7.8],
    actionType: 'PICK',
  },
  {
    id: 'qc',
    stageNumber: '03',
    titleAr: 'الفحص وضبط الجودة',
    titleEn: 'QC & Inspection',
    descriptionAr: 'معاينة عينات العبوات، فحص درجة الحرارة وسلامة الأختام الدوائية',
    descriptionEn: 'Inspect packaging seals, measure temperature, document batch compliance',
    zoneId: 'qc',
    color: '#10b981',
    targetPos: [4.2, 0.0, 3.2],
    actionType: 'INSPECT',
  },
  {
    id: 'consolidation',
    stageNumber: '04',
    titleAr: 'تجميع أصناف الطلبية',
    titleEn: 'Consolidation',
    descriptionAr: 'تجميع خطوط أصناف الطلبية من ممرات التخزين في محطة التحضير المركزية',
    descriptionEn: 'Gather pick-lines from different aisles at the central staging lane',
    zoneId: 'consolidation',
    color: '#8b5cf6',
    targetPos: [11.0, 0.0, 3.6],
    actionType: 'CONSOLIDATE',
  },
  {
    id: 'packing',
    stageNumber: '05',
    titleAr: 'التعبئة والتغليف',
    titleEn: 'Packing & Labeling',
    descriptionAr: 'التغليف المانع للرطوبة ووضع ملصقات الشحن والرمز الشريطي QR',
    descriptionEn: 'Secure pharmaceutical carton packaging and apply QR delivery labels',
    zoneId: 'packing',
    color: '#f59e0b',
    targetPos: [15.2, 0.0, 4.5],
    actionType: 'PACK',
  },
  {
    id: 'dispatch',
    stageNumber: '06',
    titleAr: 'الشحن والتوزيع الخارجي',
    titleEn: 'Outbound Dispatch',
    descriptionAr: 'تحميل الشحنات إلى سيارات التوزيع المبردة وبوابات رصيف الشحن',
    descriptionEn: 'Load consolidated pallets into refrigerated fleet at Bay 02',
    zoneId: 'dispatch',
    color: '#2563eb',
    targetPos: [21.0, 0.0, 2.5],
    actionType: 'LOAD',
  },
];

export interface WorkerState {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  targetPosition: [number, number, number] | null;
  rotationY: number;
  isWalking: boolean;
  walkSpeed: number; // meters per second
  actionState: 'IDLE' | 'WALKING' | 'SCANNING' | 'PICKING' | 'REACHING_HIGH' | 'BENDING_LOW';
  actionProgress: number; // 0 to 1
  carryingBox: boolean;
  boxColor?: string;
  activeTaskId?: string;
  targetRackId?: string;
  path: Array<[number, number]>;
}

export type CameraMode =
  | 'ORBIT'
  | 'FOLLOW_WORKER'
  | 'FOLLOW_PACKAGE'
  | 'TOP_DOWN'
  | 'FRONT_ELEVATION'
  | 'ISOMETRIC';

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetType: 'RACK' | 'ELEMENT' | 'FLOOR' | 'WORKER';
  targetId: string | null;
  worldX: number;
  worldZ: number;
}

export interface FloatingLabelData {
  id: string;
  type: 'RACK' | 'CELL' | 'ELEMENT' | 'WORKER' | 'PACKAGE';
  rackId?: string;
  rackCode?: string;
  rackName?: string;
  cellLevel?: number;
  cellSlot?: number;
  cellLabel?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  badgeText: string;
  badgeColor: string;
  statsText?: string;
  barcode?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity?: number;
  movementCategory?: MovementCategory;
  medicines?: CellMedicineItem[];
  matrixCols?: number;
  matrixRows?: number;
  screenX: number;
  screenY: number;
  visible: boolean;
  distance: number;
  isWooden?: boolean;
  isLocked?: boolean;
  isSelectedCell?: boolean;
  thumbnailUrl?: string;
}

export interface OrderPickItem {
  id: string;
  productName: string;
  rackId: string;
  rackCode: string;
  level: number;
  slot: number;
  cellCode: string;
  quantityRequired?: number;
  requiredQty?: number;
  quantityPicked?: number;
  pickedQty?: number;
  confirmed?: boolean;
  status?: 'PENDING' | 'NAVIGATING' | 'PICKED';
  unit?: string;
  condition?: StorageCondition;
}

export interface OrderTask {
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  clientName?: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  createdAt?: string;
  items: OrderPickItem[];
  status: 'IN_PROGRESS' | 'COMPLETED';
}

export type GraphicsQualityPreset = 'ULTRA_4K' | 'HIGH_2K' | 'BALANCED_MOBILE';

export interface GraphicsQualityConfig {
  preset: GraphicsQualityPreset;
  dprScale: number; // 1.0 to 2.5
  shadowMapSize: 4096 | 2048 | 1024;
  floorReflectivity: number; // 0.0 to 1.0 (Clearcoat & Specular reflection on floor)
  exposure: number; // 0.6 to 1.8 (ToneMapping Exposure)
  spotlightIntensity: number; // 0.2 to 2.5 (Overhead aisle lights)
  volumetricBeams: boolean; // Volumetric light cones under ceiling fixtures
  anisotropyLevel: 16 | 8 | 4;
  motionBlur?: boolean; // Post-processing AfterimagePass motion blur when worker moves or camera flies
  dynamicLod?: boolean; // Dynamic Level of Detail (LOD) manager for distant racks/elements
  productOpacity?: number; // 0.15 to 1.0 Global product & cell carton transparency/clarity
}

export const DEFAULT_GRAPHICS_CONFIG: GraphicsQualityConfig = {
  preset: 'ULTRA_4K',
  dprScale: 2.0,
  shadowMapSize: 4096,
  floorReflectivity: 0.85,
  exposure: 1.18,
  spotlightIntensity: 1.45,
  volumetricBeams: true,
  anisotropyLevel: 16,
  motionBlur: false,
  dynamicLod: true,
  productOpacity: 1.0,
};

export type FefoTier = 'EXPIRED' | 'CRITICAL_30D' | 'WARNING_90D' | 'SAFE';

export type FefoFilterMode =
  | 'ALL_CRITICAL'
  | 'EXPIRED_ONLY'
  | 'WITHIN_30_DAYS'
  | 'WITHIN_90_DAYS'
  | 'ALL_CELLS';

export interface FefoRadarConfig {
  enabled: boolean;
  filter: FefoFilterMode;
  pulseBeacons: boolean;
  dimSafeCells: boolean;
}

export const DEFAULT_FEFO_CONFIG: FefoRadarConfig = {
  enabled: false,
  filter: 'ALL_CRITICAL',
  pulseBeacons: true,
  dimSafeCells: true,
};

export interface CellExpiryEvaluation {
  daysRemaining: number;
  tier: FefoTier;
  labelAr: string;
  labelEn: string;
  colorHex: string;
  priorityScore: number; // Lower = more urgent
}

/**
 * Pure helper to evaluate any cell's FEFO expiry urgency against a reference date (defaults to current date).
 */
export function computeCellExpiryStatus(
  expiryDate?: string,
  movementCategory?: MovementCategory,
  referenceDateStr?: string,
): CellExpiryEvaluation {
  if (movementCategory === 'EXPIRED') {
    return {
      daysRemaining: -30,
      tier: 'EXPIRED',
      labelAr: 'منتهي الصلاحية (حجر فوري)',
      labelEn: 'EXPIRED - Quarantine',
      colorHex: '#f43f5e',
      priorityScore: -100,
    };
  }

  if (!expiryDate) {
    return {
      daysRemaining: 365,
      tier: 'SAFE',
      labelAr: 'صلاحية ممتدة آمنة',
      labelEn: 'Safe Shelf Life',
      colorHex: '#10b981',
      priorityScore: 365,
    };
  }

  const refTime = referenceDateStr ? new Date(referenceDateStr).getTime() : Date.now();
  const expTime = new Date(expiryDate).getTime();
  if (Number.isNaN(expTime)) {
    return {
      daysRemaining: 365,
      tier: 'SAFE',
      labelAr: 'صلاحية ممتدة آمنة',
      labelEn: 'Safe Shelf Life',
      colorHex: '#10b981',
      priorityScore: 365,
    };
  }

  const diffDays = Math.ceil((expTime - refTime) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      daysRemaining: diffDays,
      tier: 'EXPIRED',
      labelAr: `منتهي الصلاحية (${Math.abs(diffDays)} يوم)`,
      labelEn: 'EXPIRED',
      colorHex: '#f43f5e',
      priorityScore: diffDays,
    };
  }

  if (diffDays <= 30) {
    return {
      daysRemaining: diffDays,
      tier: 'CRITICAL_30D',
      labelAr: `حرج جداً (${diffDays} يوم متبقي)`,
      labelEn: `Critical (${diffDays}d left)`,
      colorHex: '#f97316',
      priorityScore: diffDays,
    };
  }

  if (diffDays <= 90) {
    return {
      daysRemaining: diffDays,
      tier: 'WARNING_90D',
      labelAr: `أولوية صرف FEFO (${diffDays} يوم)`,
      labelEn: `FEFO Priority (${diffDays}d)`,
      colorHex: '#f59e0b',
      priorityScore: diffDays,
    };
  }

  return {
    daysRemaining: diffDays,
    tier: 'SAFE',
    labelAr: `سليم (${diffDays} يوم متبقي)`,
    labelEn: `Safe (${diffDays}d left)`,
    colorHex: '#10b981',
    priorityScore: diffDays,
  };
}

