# 📱 DAWA 3D Warehouse Engine — Complete Architecture & Expo / React Native Android Specification
# وثيقة المواصفات الهندسية الشاملة لإعادة بناء المحرك ثلاثي الأبعاد لنظام أندرويد عبر Expo (React Native)

---

## 📌 جدول المحتويات
1. **الرؤية العامة للمشروع (Project Vision & Mobile Concept)**
2. **المكونات والتقنيات المقترحة لـ Expo / React Native Android**
3. **مخطط هيكل البيانات والأنواع (TypeScript Schemas & State Interfaces)**
4. **هندسة الأبعاد ونظام الرفوف والخانات (3D Racks & Cells Architecture)**
5. **نظام مصفوفة الألواح الخشبية الأفقية (Horizontal Stacked Wooden Matrix — واحد فوق التالي)**
6. **نظام التنبيهات المرئية التلقائية لإعادة التوريد (Visual Alerts: Quantity vs Capacity)**
7. **محطات رحلة التحضير الست الأفقية (6-Zone Horizontal Fulfillment Journey)**
8. **شاشات وواجهات التطبيق للهواتف والتابلت (Mobile UI & Component Hierarchy)**
9. **محرك الرسوميات الثلاثي الأبعاد في Expo (Three.js via expo-gl / @react-three/fiber)**
10. **الخادم والربط وقاعدة البيانات اللحظية (SQLite / REST / SSE Architecture)**
11. **دليل التسليم لأشرف بخانات فارغة (Ashraf Empty Handover Mode)**
12. **الكود البرمجي المرجعي المباشر لنقله لـ Expo (Reference Implementation Snippets)**

---

## 1. الرؤية العامة للمشروع (Project Vision & Mobile Concept)
هذا التطبيق هو **التوأم الرقمي ثلاثي الأبعاد للمستودعات الدوائية والمخازن الذكية (3D Digital Twin)**، مصمم ليعمل بسلاسة فائقة على أجهزة أندرويد (الهواتف الذكية وأجهزة التابلت وأجهزة الجرد الصناعية مثل Zebra / Honeywell Barcode Terminals).

### الأهداف الأساسية على أندرويد:
1. **عرض ثلاثي أبعاد متكامل وتفاعلي 100%**: استكشاف المستودع، التكبير (Pinch-to-zoom)، التدوير بزاوية 360 درجة، والنقر على أي خانة لإظهار تفاصيلها وكراتينها.
2. **ترتيب الأدوية في الخانات بنظام الألواح الخشبية المتراصة (واحد فوق التالي)**: الأدوية لا توضع بقواطع عمودية، بل على ألواح خشبية أفقية متراصة رأسياً على المحور Y (`matrixRows` أفقية فوق بعضها، و `matrixCols` بجانب بعضها).
3. **تنبيهات الاستهلاك اللحظية (Quantity vs Capacity)**: تلوين الخانات تلقائياً بالأحمر الحرج (≤ 25% متبقي) أو الأصفر التحذيري (26% - 55%) لإصدار قرارات إعادة التوريد الفورية.
4. **تتبع مسار العامل (Worker Journey)**: محاكاة العامل البشري وهو يسير بين المحطات الست والممرات ويفحص الباركود بماسح الليزر.
5. **وضع تسليم فارغ للمشرف أشرف**: تسليم المستودع بهيكله الكامل ولكن بخانات فارغة (`0%`) ليقوم أشرف بتعبئتها وترتيب أصنافها من هاتفه المحمول.

---

## 2. التقنيات المقترحة لتطبيق Expo (React Native Android Stack)

عند إعادة بناء التطبيق في محادثة أخرى باستخدام **Expo**، اعتمد الحزم التالية:

| المكون | المكتبة الموصى بها في Expo | الوظيفة |
|---|---|---|
| **بيئة التشغيل** | `Expo SDK 51+` (TypeScript) | بيئة تطوير تطبيقات أندرويد وiOS موحدة |
| **محرك 3D** | `expo-gl` + `three` (أو `@react-three/fiber/native`) | تصيير المشهد ثلاثي الأبعاد على الأجهزة المحمولة بـ OpenGL ES |
| **التحكم باللمس والإيماءات** | `react-native-gesture-handler` | دوران الكاميرا باللمس وسحب الرفوف وتكبير المنظور بالاصبعين |
| **قاعدة البيانات المحلية** | `expo-sqlite` (أو `WatermelonDB`) | مزامنة بيانات الخانات والمخزون بدون انترنت وحفظ التعديلات |
| **ماسح الباركود بالكاميرا** | `expo-camera` / `expo-barcode-scanner` | مسح باركود الأدوية والرفوف عبر كاميرا هاتف المشرف |
| **توليد QR Codes** | `react-native-qrcode-svg` | توليد بطاقات الخانات وملصقات الرفوف المباشرة |
| **التصميم والواجهات** | `nativewind` (Tailwind for React Native) أو `React Native StyleSheet` | دعم واجهات RTL عربية متجاوبة للأجهزة اللوحية والهواتف |
| **التوجيه والتنقل** | `expo-router` | نظام شاشات ونوافذ عائمة متقدم |
| **الأوامر الصوتية** | `expo-speech` / `@react-native-voice/voice` | الاستجابة للأوامر الصوتية باللغتين العربية والإنجليزية |

---

## 3. مخطط هيكل البيانات والأنواع (TypeScript Schemas)

انسخ هذا الملف تماماً في مشروع Expo تحت اسم: `types/warehouse.ts`:

```typescript
export type StorageType = 'ROOM' | 'COLD' | 'QUARANTINE';
export type RackType = 'STEEL_INDUSTRIAL' | 'WOODEN_CABINET';
export type CellArrangementMode =
  | 'MATRIX_2D'
  | 'HORIZONTAL_ROW'
  | 'DEPTH_FILE'
  | 'VERTICAL_STACK'
  | 'STAGGERED_HEX';
export type CellAlignmentMode = 'CENTER' | 'LEFT' | 'RIGHT' | 'FRONT' | 'BACK';
export type CellFillDirection = 'ROW_FIRST' | 'COL_FIRST';

export interface CellMedicineItem {
  id: string;
  subSlotCode: string; // e.g. "A-01/R1-C1"
  matrixRow: number; // اللوح الخشبي الأفقي (واحد فوق التالي: 1 للسفلي، 2 للأوسط، 3 للعلوي)
  matrixCol: number; // العمود الأفقي على نفس اللوح (1, 2, 3...)
  matrixLayerY?: number;
  productName: string;
  nameEn?: string;
  scientificName?: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  movementCategory?: 'AVAILABLE' | 'ORDER_PICK' | 'EXPIRED' | 'RETURNED';
  color?: string; // Hex color for carton
  opacity?: number; // 0.1 to 1.0 (تعديل شفافية المنتج)
}

export interface RackCell {
  id: string;
  code: string; // e.g. "A-01"
  cellLabel: string;
  level: number; // 1-indexed (الطابق)
  slot: number; // 1-indexed (الموقع)
  occupied: boolean;
  capacity: number; // أقصى سعة استيعابية
  quantity: number; // الكمية الإجمالية
  productName?: string;
  nameEn?: string;
  scientificName?: string;
  barcode: string;
  batchNumber?: string;
  expiryDate?: string;
  storageCondition?: StorageType;
  movementCategory?: 'AVAILABLE' | 'ORDER_PICK' | 'EXPIRED' | 'RETURNED';
  orderRef?: string;
  returnReason?: string;
  updatedAt?: string;

  // خيارات الـ Matrix والألواح الخشبية الأفقية
  arrangementMode?: CellArrangementMode;
  matrixCols?: number; // عدد الكراتين بالعرض على اللوح الخشبي
  matrixRows?: number; // عدد الألواح الخشبية المتراصة رأسياً فوق بعضها
  matrixLayersY?: number;
  gapX?: number; // التباعد العرضي بالمتر
  gapY?: number; // المسافة بين لوح خشبي والآخر
  gapZ?: number; // التباعد بالعمق
  cartonScale?: number; // مقياس حجم الكرتون (0.35 إلى 1.2)
  cartonRotationDeg?: number;
  cellAlignment?: CellAlignmentMode;
  fillDirection?: CellFillDirection;
  showInternalDividers?: boolean; // إظهار الألواح الخشبية الأفقية 3D
  dividerHeightRatio?: number;
  cellOpacity?: number; // شفافية الخانة ككل (0.15 إلى 1.0)
  medicines?: CellMedicineItem[];
}

export interface WarehouseRack {
  id: string;
  code: string; // e.g. "WH-MAIN-A1"
  name: string;
  nameAr: string;
  nameEn?: string;
  rackType: RackType;
  zone: string; // "A", "B", "COLD", "W"
  shelf: string;
  levelVal: string;
  storageType: StorageType;
  px: number; // X position in meters
  pz: number; // Z position in meters
  rot?: boolean;
  rotation?: number; // 0 to 360 degrees
  w: number; // width in meters
  d: number; // depth in meters
  h: number; // height in meters
  levels: number; // عدد الطوابق (مثلاً 4)
  cellsPerLevel: number; // عدد الخانات بالطابق (مثلاً 3)
  customCells?: RackCell[];
  locked?: boolean;
  customColor?: string;
}

export interface ArchitecturalElement {
  id: string;
  type: 'DOOR' | 'WINDOW' | 'WALL' | 'PILLAR' | 'ZONE';
  subType: string;
  label: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rotation?: number;
  openRatio?: number;
  color?: string;
}

export interface WarehouseDimensions {
  ww: number; // العرض (مثلاً 24م)
  wd: number; // العمق (مثلاً 16م)
  wh: number; // الارتفاع (مثلاً 8م)
}

export type StockAlertTier = 'EMPTY' | 'CRITICAL_RED' | 'WARNING_YELLOW' | 'SAFE_GREEN';

export interface CellStockAlertStatus {
  tier: StockAlertTier;
  fillPercent: number; // نسبة المخزون المتبقي (0-100%)
  consumptionPercent: number; // نسبة الاستهلاك (0-100%)
  remainingQty: number;
  capacity: number;
  shortageQty: number; // عدد العبوات الناقصة للتوريد
  labelAr: string;
  actionRecommendationAr: string;
  colorHex: string;
}
```

---

## 4. دوال الحسابات النقية (Pure Business Logic)

هذه الدوال تعمل في بيئة Node و React Native و Web بدون أي تعديل (`utils/warehouseLogic.ts`):

### أ) حساب تنبيهات الاستهلاك (Visual Alerts: Quantity vs Capacity):
```typescript
export function computeCellStockAlert(
  quantity?: number,
  capacity?: number,
  occupied = true,
  criticalRemainingPct = 25,
  warningRemainingPct = 55
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
      actionRecommendationAr: 'بانتظار تسكين الأصناف من المشرف أشرف',
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
```

### ب) حساب تقسيم مصفوفة الأخشاب الأفقية (`computeCellMatrixLayout`):
```typescript
export function computeCellMatrixLayout(
  itemCount: number,
  explicitCols?: number,
  explicitRows?: number,
  mode: CellArrangementMode = 'MATRIX_2D',
  explicitLayersY?: number
): { cols: number; rows: number; layersY: number } {
  const count = Math.max(1, itemCount);
  if (explicitCols && explicitRows) {
    return { cols: explicitCols, rows: explicitRows, layersY: explicitLayersY || 1 };
  }

  switch (mode) {
    case 'HORIZONTAL_ROW':
      return { cols: count, rows: 1, layersY: 1 };
    case 'VERTICAL_STACK':
      return { cols: 1, rows: 1, layersY: count };
    case 'DEPTH_FILE':
      return { cols: 1, rows: count, layersY: 1 };
    case 'MATRIX_2D':
    default: {
      const cols = explicitCols || (count <= 2 ? count : Math.ceil(Math.sqrt(count)));
      const rows = explicitRows || Math.ceil(count / cols);
      return { cols, rows, layersY: 1 };
    }
  }
}
```

### ج) دالة تفريغ الخانات لتسليم المستودع لأشرف (`createEmptyRackCellsForAshraf`):
```typescript
export function createEmptyRackCellsForAshraf(rack: WarehouseRack): RackCell[] {
  const levels = rack.levels || 4;
  const slots = rack.cellsPerLevel || 3;
  const isCold = rack.storageType === 'COLD';
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
        barcode: defaultBarcode,
        arrangementMode: 'MATRIX_2D',
        matrixCols: 2,
        matrixRows: 2,
        showInternalDividers: true,
        medicines: [],
      });
    }
  }
  return emptyCells;
}
```

---

## 5. هندسة التصيير ثلاثي الأبعاد لـ React Native (Three.js via expo-gl)

في Expo، يُستخدم المكون `<GLView>` من حزمة `expo-gl` لربط سياق OpenGL بمكتبة Three.js.

### الفكرة المعمارية للألواح الخشبية المتراصة (واحد فوق التالي):
في ملف بناء النماذج الإجرائية (`ProceduralModels`):
```typescript
// 🪵 هندسة الألواح الخشبية الأفقية المتراصة فوق بعضها
const verticalTiers = Math.max(rows, layersY); // عدد الألواح الخشبية
const tierSpanY = boxH / verticalTiers;
const woodBoardThick = 0.016;

// 1. إنشاء الألواح الخشبية الأفقية
for (let vTier = 0; vTier < verticalTiers; vTier++) {
  const boardY = cellBaseY + vTier * tierSpanY + woodBoardThick / 2;
  const woodPlankGeo = new THREE.BoxGeometry(boxW * 1.03, woodBoardThick, boxD * 0.96);
  const woodPlank = new THREE.Mesh(woodPlankGeo, woodMat);
  woodPlank.position.set(bx, boardY, baseCenterZ);
  cellGroup.add(woodPlank);

  // حافة أمامية بلون خشب الجوز الداكن
  const frontLipGeo = new THREE.BoxGeometry(boxW * 1.035, woodBoardThick * 1.15, 0.014);
  const frontLip = new THREE.Mesh(frontLipGeo, walnutMat);
  frontLip.position.set(bx, boardY, baseCenterZ + (boxD * 0.96) / 2 + 0.005);
  cellGroup.add(frontLip);
}

// 2. وضع كل دواء فوق لوحه الخشبي المخصص
cellMeds.forEach((med) => {
  const vTierIdx = (med.matrixRow || 1) - 1; // رقم اللوح الخشبي
  const colIdx = (med.matrixCol || 1) - 1;   // العمود على اللوح

  const subX = bx - boxW / 2 + rawSubBoxW / 2 + colIdx * (rawSubBoxW + gapX);
  const subY = cellBaseY + vTierIdx * tierSpanY + woodBoardThick + subBoxH / 2;
  const subZ = baseCenterZ;

  const cartonMesh = new THREE.Mesh(new THREE.BoxGeometry(subBoxW, subBoxH, subBoxD), boxMat);
  cartonMesh.position.set(subX, subY, subZ);
  cellGroup.add(cartonMesh);
});
```

---

## 6. واجهات ومكونات التطبيق لشاشات الهاتف والتابلت (Mobile UI / Screens)

يتم تنظيم شاشات التطبيق في Expo بالشكل التالي:

```text
app/
├── (tabs)/
│   ├── index.tsx          # الشاشة الرئيسية: مشهد الـ 3D + شريط التحديد العائم + الإيماءات
│   ├── matrix.tsx         # شاشة مستعرض الـ Matrix وتنبيهات الاستهلاك (Quantity vs Capacity)
│   ├── inventory.tsx      # مستكشف الأصناف والبحث بالباركود وكاميرا الهاتف
│   ├── journey.tsx        # شريط المحطات الـ 6 الأفقي ومسار تحضير الطلبيات
│   └── settings.tsx       # إعدادات الأبعاد، الجدران، وتفريغ المستودع لأشرف
├── modals/
│   ├── cell_editor.tsx    # تعديل بيانات الخانة والسعة وعدد الألواح الخشبية
│   └── ashraf_handover.tsx# لوحة تسليم المشروع لأشرف وتصدير ملف الـ JSON
```

### وصف الشاشات الرئيسية:

### 1) الشاشة الرئيسية ثلاثية الأبعاد (`Warehouse3DScreen`):
- تعرض المستودع بالكامل عبر `GLView`.
- تدعم اللمس بإصبع واحد للدوران حول المحور، وإصبعين للتحريك (Pan) والتكبير (Zoom).
- شريط علوي يحتوي على أبعاد المستودع وزر "التبديل إلى أشرف (تصميم)" أو "محمد ومرعي (تحضير)".
- شريط إجراءات عائم يظهر عند النقر على أي رف: `تعديل الرف`، `تدوير +45°`، `محاذاة لأقرب جدار`، و `استعراض الـ Matrix`.

### 2) شاشة ومودال مستعرض الـ Matrix (`MatrixExplorerScreen`):
- المنظور الأمامي التفاعلي للخانة يعرض الألواح الخشبية الأفقية متراصة رأسياً (اللوح العلوي R3، اللوح الأوسط R2، اللوح السفلي R1).
- **شريط التنبيهات المرئية العلوي**:
  - يعرض حالة الخانة: `🔴 حرج (استهلاك ≥ 75%)` أو `🟡 تنبيه (استهلاك ≥ 45%)` أو `🟢 آمن` أو `⚪ فارغة`.
  - شريط تقدم لنسبة الاستهلاك `Quantity vs Capacity`.
  - زر مباشر: `توريد 100% (+X عبوة)` لإعادة التعبئة الفورية.
- أزرار نقل أي دواء لأعلى أو لأسفل بين الألواح الخشبية بلمسة واحدة (`ArrowUp` / `ArrowDown`).
- قوالب جاهزة: `1×4 واحد فوق التالي`، `2×2 مصفوفة أخشاب`، `2×3`، `3×2`.
- التحكم بدرجة شفافية ووضوح العبوات في الخانة عبر شريط التمرير (`Slider`).

### 3) شريط المحطات الست الأفقي (`JourneyHUD`):
- يعرض تدفق العمليات من الاستلام إلى الشحن:
  1. `01 / الاستلام والتوريد (Receiving)`
  2. `02 / التخزين والرفوف (Storage)`
  3. `03 / الفحص وضبط الجودة (QC)`
  4. `04 / تجميع الطلبيات (Consolidation)`
  5. `05 / التعبئة والتغليف (Packing)`
  6. `06 / رصيف الشحن والتوزيع (Dispatch)`
- أفقي بالكامل `6x1` على الأجهزة اللوحية، وقابل للتمرير الأفقي بسلاسة على الهواتف.

---

## 7. الربط البرمجي وقاعدة البيانات (REST & Real-time Integration)

يمكن تشغيل التطبيق محلياً بالكامل عبر `expo-sqlite`، أو ربطه بالخادم (`server.ts`):

### عقود الـ API:
1. `GET /api/warehouse/realtime`:
   - جلب مصفوفة الخانات الحية ومصفوفة الحركات.
2. `GET /api/warehouse/stream` (SSE):
   - بث مباشر لتحديث الخريطة فور إجراء أي حركة سحب أو توريد.
3. `POST /api/warehouse/cell-sync`:
   - حفظ بيانات الخانة التي يملؤها المشرف أشرف (الأصناف، الباركود، التشغيلة، السعة).
4. `POST /api/warehouse/pull`:
   - تنفيذ حركة سحب أو توريد:
     `{ cellId, actionType: 'ORDER_PICK' | 'EXPIRED_PULL' | 'RESTOCK', qty: 10 }`
5. `POST /api/warehouse/handover-empty`:
   - تصفير جميع الخانات في قاعدة البيانات لتسليم المستودع لأشرف فارغاً.

---

## 8. كيفية بدء المشروع في محادثة جديدة مع Expo (Prompt البدء الموصى به)

انسخ النص التالي وقدمه للنموذج في المحادثة الجديدة لإنشاء تطبيق Expo أندرويد مباشرة:

> "أريد منك إنشاء تطبيق **Expo (React Native) مخصص لنظام أندرويد** لمشروع **DAWA 3D Warehouse Engine** بناءً على ملف المواصفات المعمارية الكامل، بحيث يحتوي على:
> 1. تصيير 3D ثلاثي الأبعاد للمستودع عبر `expo-gl` و `three`.
> 2. ترتيب الأدوية داخل الخانة على **ألواح خشبية أفقية متراصة فوق بعضها (واحد فوق التالي - Horizontal Stacked Wooden Matrix)** مع إمكانية تعديل الشفافية `opacity`.
> 3. نظام التنبيهات المرئية التلقائي `Quantity vs Capacity` لتحويل الخانة للأحمر (≤25%) أو الأصفر (≤55%) مع زر التوريد الفوري.
> 4. شريط المحطات الست الأفقي `6x1`.
> 5. وضع تسليم المستودع للمشرف أشرف بخانات فارغة تماماً جاهزة للتعبئة."

---

## 9. خلاصة الملف التعريفي
تم حفظ هذه المواصفات الهندسية أيضاً في جذر المشروع في الملف:
`/EXPO_ANDROID_MIGRATION_SPEC.md`
ليكون متاحاً كمرجع دائم يمكنك تنزيله أو نسخه في أي وقت.
