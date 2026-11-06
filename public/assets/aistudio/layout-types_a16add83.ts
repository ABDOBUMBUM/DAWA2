/**
 * DAWA Desktop — نماذج وتعاريف مصمم المستودع ثلاثي الأبعاد المتقدم
 * مستوحى ومدمج من أفضل ممارسات WDA (Warehouse Design Automation) و Warehouse Journey 3D
 */

export interface RackCell {
  id: string;
  code: string; // صيغة نصية أو رقمية بكل الأشكال: 01، A-01، COLD-01، خزينة-1
  level: number | string;
  slot: number | string;
  nameAr?: string;
  nameEn?: string;
  capacity?: number;
  occupied?: boolean;
  productName?: string;
  batchNumber?: string;
  formatType?: 'NUMERIC' | 'ALPHANUMERIC' | 'CUSTOM';
}

export interface WarehouseLayoutPlacement {
  id: string;
  code: string;
  name: string;
  nameAr?: string; // التسمية بالعربية
  nameEn?: string; // التسمية بالإنجليزية
  zone: string;
  shelf: string;
  levelVal: string;
  status?: string;
  storageType?: string;
  isNew?: boolean;
  px?: number;
  pz?: number;
  rot?: boolean;
  w?: number;
  d?: number;
  h?: number;
  levels?: number;
  cellsPerLevel?: number;
  customCells?: RackCell[];
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetType: 'RACK' | 'ELEMENT' | 'FLOOR';
  targetId: string | null;
  worldX?: number;
  worldZ?: number;
}

export interface AshrafTouchState {
  active: boolean;
  selectedRackId: string | null;
  bottomSheetOpen: boolean;
  radialMenuOpen: boolean;
  radialX: number;
  radialY: number;
  cameraActive: boolean;
  capturedPhoto: string | null;
}

export type ArchitecturalElementType = 'DOOR' | 'WINDOW' | 'WALL' | 'PILLAR' | 'ZONE';

export type DoorSubType = 'MAIN_ENTRANCE' | 'DOCK_BAY' | 'COLD_ROOM' | 'EMERGENCY_EXIT';
export type WindowSubType = 'CLERESTORY' | 'OFFICE_GLASS' | 'VIEWING_PANEL';
export type WallSubType = 'EXTERIOR' | 'INTERNAL_PARTITION' | 'INSULATED_COLD';
export type PillarSubType = 'CONCRETE_ROUND' | 'STEEL_H_BEAM';
export type ZoneSubType = 'RECEIVING' | 'STORAGE' | 'COLD_CHAIN' | 'QUARANTINE' | 'QC_INSPECTION' | 'PACKING' | 'DISPATCH';

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
  rotation?: number; // 0, 90, 180, 270 degrees
  color?: string;
  temperatureBand?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface WarehouseBlueprintVisibility {
  visibleToAll: boolean;
  allowedUserIds: string[];
  allowedRoles: string[];
}

export interface WarehouseBlueprint {
  dimensions: {
    widthM: number;
    depthM: number;
    heightM: number;
  };
  elements: ArchitecturalElement[];
  rackOverrides?: Record<string, Partial<WarehouseLayoutPlacement>>;
  visibility: WarehouseBlueprintVisibility;
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string;
  publisherName?: string;
  notes?: string;
}

export interface JourneyStageDef {
  id: string;
  stageNumber: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  zoneId: string;
  color: string;
  targetPos: [number, number, number];
}

export const JOURNEY_STAGES: JourneyStageDef[] = [
  {
    id: 'receiving',
    stageNumber: '01',
    titleAr: 'الاستلام والتحقق',
    titleEn: 'Inbound Receiving',
    descriptionAr: 'فحص إشعار الشحنة، مسح باركود الطرد، ووزنه وتوثيقه',
    zoneId: 'receiving',
    color: '#3b82f6',
    targetPos: [19, 1.2, 1.8],
  },
  {
    id: 'storage',
    stageNumber: '02',
    titleAr: 'التسكين في الرفوف',
    titleEn: 'Putaway & Storage',
    descriptionAr: 'نقل الصنف للرف وتسكينه حسب التصنيف وسلسلة الصلاحية FEFO',
    zoneId: 'storage',
    color: '#06b6d4',
    targetPos: [7.5, 2.0, 7.5],
  },
  {
    id: 'qc',
    stageNumber: '03',
    titleAr: 'الفحص وضبط الجودة',
    titleEn: 'QC & Inspection',
    descriptionAr: 'معاينة العبوات، التحقق من درجة الحرارة وسلامة الأختام',
    zoneId: 'qc',
    color: '#10b981',
    targetPos: [4.5, 1.4, 3.5],
  },
  {
    id: 'consolidation',
    stageNumber: '04',
    titleAr: 'تجميع أصناف الطلبية',
    titleEn: 'Consolidation',
    descriptionAr: 'جمع خطوط الطلبية من ممرات الرفوف المختلفة في محطة التحضير',
    zoneId: 'consolidation',
    color: '#8b5cf6',
    targetPos: [11.5, 1.4, 4.0],
  },
  {
    id: 'packing',
    stageNumber: '05',
    titleAr: 'التغليف ووضع الملصقات',
    titleEn: 'Packing & Labeling',
    descriptionAr: 'التغليف الآمن في كراتين الشحن وطباعة ملصق التسليم الرقمي',
    zoneId: 'packing',
    color: '#f59e0b',
    targetPos: [14.5, 1.3, 3.8],
  },
  {
    id: 'dispatch',
    stageNumber: '06',
    titleAr: 'الشحن والترحيل الخارجي',
    titleEn: 'Outbound Dispatch',
    descriptionAr: 'تسليم الشحنة لسيارات التوزيع وبوابة رصيف الشحن',
    zoneId: 'dispatch',
    color: '#2563eb',
    targetPos: [21.5, 1.5, 2.2],
  },
];


// العناصر المعمارية القياسية للمستودع الدوائي
export const DEFAULT_ARCHITECTURAL_ELEMENTS: ArchitecturalElement[] = [
  {
    id: 'elem-door-main',
    type: 'DOOR',
    subType: 'MAIN_ENTRANCE',
    label: 'بوابة المستودع الرئيسية (Main Entrance)',
    x: 10.5,
    z: 0.2,
    w: 3.0,
    d: 0.35,
    h: 3.2,
    color: '#10b981',
  },
  {
    id: 'elem-dock-1',
    type: 'DOOR',
    subType: 'DOCK_BAY',
    label: 'رصيف استلام الشاحنات BAY 01',
    x: 15.5,
    z: 0.2,
    w: 3.4,
    d: 0.4,
    h: 3.6,
    color: '#2563eb',
  },
  {
    id: 'elem-dock-2',
    type: 'DOOR',
    subType: 'DOCK_BAY',
    label: 'رصيف تفريغ الحاويات BAY 02',
    x: 19.5,
    z: 0.2,
    w: 3.4,
    d: 0.4,
    h: 3.6,
    color: '#2563eb',
  },
  {
    id: 'elem-zone-1-receiving',
    type: 'ZONE',
    subType: 'RECEIVING',
    label: '01 / الاستلام والتوريد (Inbound Receiving)',
    x: 14.5,
    z: 0.5,
    w: 9.0,
    d: 3.5,
    h: 0.1,
    color: '#3b82f6',
    metadata: { stageNumber: '01' },
  },
  {
    id: 'elem-zone-2-storage',
    type: 'ZONE',
    subType: 'STORAGE',
    label: '02 / التخزين والرفوف الصناعية (Putaway & Storage)',
    x: 0.8,
    z: 6.5,
    w: 12.5,
    d: 9.0,
    h: 0.1,
    color: '#06b6d4',
    metadata: { stageNumber: '02' },
  },
  {
    id: 'elem-zone-3-qc',
    type: 'ZONE',
    subType: 'QC_INSPECTION',
    label: '03 / الفحص وضبط الجودة (QC & Inspection)',
    x: 0.8,
    z: 0.6,
    w: 6.5,
    d: 5.2,
    h: 0.1,
    color: '#10b981',
    metadata: { stageNumber: '03' },
  },
  {
    id: 'elem-zone-4-consolidation',
    type: 'ZONE',
    subType: 'STORAGE',
    label: '04 / تجميع الطلبيات (Consolidation)',
    x: 7.8,
    z: 0.6,
    w: 6.2,
    d: 5.2,
    h: 0.1,
    color: '#8b5cf6',
    metadata: { stageNumber: '04' },
  },
  {
    id: 'elem-zone-5-packing',
    type: 'ZONE',
    subType: 'PACKING',
    label: '05 / التعبئة والتغليف (Packing & Labeling)',
    x: 14.5,
    z: 4.8,
    w: 9.0,
    d: 5.0,
    h: 0.1,
    color: '#f59e0b',
    metadata: { stageNumber: '05' },
  },
  {
    id: 'elem-zone-6-dispatch',
    type: 'ZONE',
    subType: 'DISPATCH',
    label: '06 / رصيف الشحن والتوزيع (Outbound Dispatch)',
    x: 14.5,
    z: 10.2,
    w: 9.0,
    d: 5.3,
    h: 0.1,
    color: '#2563eb',
    metadata: { stageNumber: '06' },
  },
  {
    id: 'elem-pillar-1',
    type: 'PILLAR',
    subType: 'CONCRETE_ROUND',
    label: 'عمود إنشائي C1',
    x: 7.5,
    z: 6.0,
    w: 0.6,
    d: 0.6,
    h: 7.5,
    color: '#64748b',
  },
  {
    id: 'elem-pillar-2',
    type: 'PILLAR',
    subType: 'CONCRETE_ROUND',
    label: 'عمود إنشائي C2',
    x: 14.0,
    z: 6.0,
    w: 0.6,
    d: 0.6,
    h: 7.5,
    color: '#64748b',
  },
];
