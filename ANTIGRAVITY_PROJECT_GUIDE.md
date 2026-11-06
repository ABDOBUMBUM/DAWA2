# 📘 دليل Antigravity الشامل لمعمارية محرك المستودع ثلاثي الأبعاد والربط البرمجي وتسليم المشرف أشرف (بخانات فارغة)
# DAWA 3D Warehouse Engine — Complete Antigravity Architecture, Integration & Ashraf Empty-Cell Handover Specification

---

## 1. نظرة عامة على المشروع (Project Executive Summary for Antigravity)
هذا المشروع عبارة عن **توأم رقمي ثلاثي الأبعاد للمستودعات الدوائية (3D Pharmaceutical Warehouse CAD & Real-Time Inventory Digital Twin)** مبني باستخدام:
- **الواجهة الأمامية والرسوميات (Frontend & 3D WebGL Engine)**:
  - `React 19` + `TypeScript` + `Tailwind CSS`.
  - `Three.js` (معمارية Procedural 3D خالية تماماً من أي روابط خارجية أو ملفات GLTF خارجية — جميع الرفوف، الألواح الخشبية الأفقية، الكراتين، الملصقات بدقة 4K، الأبواب، والعامل البشري تُبنى برمجياً بالكامل).
- **الخادم الخلفي وقاعدة البيانات اللحظية (Backend & Real-Time Database)**:
  - `Express` + `better-sqlite3` (`warehouse_realtime_v2.db`) في الملف `/server.ts` على المنفذ `3000`.
  - بث حي فوري عبر `Server-Sent Events (SSE)` على المسار `/api/warehouse/stream`.

---

## 2. كيف يعمل نظام الرفوف والخانات ومصفوفة الأخشاب الأفقية (The 3D Rack, Cell & Horizontal Wooden Matrix System)
1. **هيكل المستودع (`WarehouseDimensions`)**:
   - الأبعاد بالمتر: العرض `ww` (محور `X`)، العمق `wd` (محور `Z`)، والارتفاع `wh` (محور `Y`).
2. **هيكل الرفوف (`WarehouseRack`)**:
   - يدعم نوعين من الرفوف:
     - `STEEL_INDUSTRIAL`: رفوف فولاذية صناعية ثقيلة للأدوية والطبليات.
     - `WOODEN_CABINET`: خزائن جدارية خشبية للأدوية الخاصة والفيتامينات.
   - يتكون كل رف من:
     - `levels`: عدد الطوابق الرئيسية من الأسفل للأعلى (`1 .. levels`).
     - `cellsPerLevel`: عدد الخانات الأفقية في كل طابق (`1 .. cellsPerLevel`).
     - `customCells`: مصفوفة الخانات (`RackCell[]`) التي تحتوي على بيانات كل خانة وأدويتها.
3. **نظام الـ Matrix داخل الخانة (`Horizontal Stacked Wooden Boards — واحد فوق التالي`)**:
   - داخل كل خانة (`RackCell`)، لا توضع الأدوية بشكل قواطع عمودية؛ بل تترتب **واحداً فوق التالي على ألواح خشبية أفقية متراصة فوق بعضها (`Y-axis`)**:
     - `matrixRows` (أو `matrixLayersY`): عدد الألواح الخشبية الأفقية المتراصة فوق بعضها داخل الخانة (`R1` اللوح السفلي، `R2` اللوح الأوسط، `R3` اللوح العلوي...).
     - `matrixCols`: عدد مواضع الأدوية المرتبة أفقياً بجانب بعضها على كل لوح خشبي (`C1, C2, ...`).
     - كل دواء داخل الخانة (`CellMedicineItem`) يأخذ كود موضع دقيق مثل: `A-01/R1-C1`، `A-01/R2-C1`.
4. **نظام التنبيهات المرئية لإعادة التوريد (`Quantity vs Capacity Visual Alerts`)**:
   - الدالة النقية `computeCellStockAlert(quantity, capacity, occupied, criticalRemainingPct, warningRemainingPct)` في `src/types/warehouse.ts` تحسب نسبة الإشغال والاستهلاك تلقائياً:
     - 🔴 **أحمر حرج (`CRITICAL_RED`)**: عندما يكون الرصيد المتبقي `<= 25%` من السعة القصوى (`capacity`) (أي استهلاك `>= 75%`) — يتغير لون الخانة تلقائياً إلى الأحمر مع إصدار توصية إعادة توريد فوري.
     - 🟡 **أصفر تحذيري (`WARNING_YELLOW`)**: عندما يكون الرصيد المتبقي بين `26%` و `55%` من السعة القصوى — يتغير لون الخانة تلقائياً إلى الأصفر للتنبيه باقتراب الحاجة للتوريد.
     - 🟢 **أخضر آمن (`SAFE_GREEN`)**: عندما يكون الرصيد المتبقي `> 55%`.
     - ⚪ **فارغة (`EMPTY`)**: عندما تكون الخانة مفرغة (`occupied: false` أو `quantity: 0`) وجاهزة لتعبئة المشرف أشرف.

---

## 3. وضع التسليم للمشرف أشرف بخانات فارغة (Ashraf Empty-Cell Handover Workflow)
> **قاعدة العمل الأساسية لـ Antigravity**:
> يجب تسليم المستودع للمشرف **أشرف** وهو يحتوي على **التصميم الهندسي الكامل للرفوف والممرات والأبواب والمناطق الـ 6، ولكن بخانات فارغة تماماً (`occupied: false, quantity: 0, medicines: []`)** بحيث يقوم أشرف بتعبئة كل خانة وتحديد تقسيم الألواح الخشبية الأفقية (`Matrix`) والأصناف والباركود والكميات والسعات القصوى حسب مشروع المخزن الفعلي.

### كيف يتم تفعيل وضع التسليم لأشرف بخانات فارغة؟
1. **من داخل واجهة التطبيق (بضغطة زر واحدة)**:
   - الضغط على زر **«📘 دليل Antigravity وتسليم أشرف»** في الشريط العلوي ثم اختيار **«🧹 تفريغ جميع الخانات لتسليمها لأشرف (0 عبوة)»**، أو من داخل نافذة **«🪵 استعراض الـ Matrix»** عبر زر **«تفريغ الرف لأشرف (0%)»**.
2. **برمجياً عبر الـ API (عند الربط مع نظام Antigravity / ERP)**:
   - إرسال طلب:
     ```http
     POST /api/warehouse/handover-empty
     ```
   - يقوم هذا المسار بتصفير جميع الكميات (`quantity = 0`) وتفريغ أسماء الأدوية في قاعدة البيانات `SQLite` مع الإبقاء على هيكل الرفوف وأكواد الخانات (`A-01`, `B-02`, `W1-01`...) والسعات القصوى (`capacity = 120`) وبث التحديث فوراً عبر `SSE`.
3. **في الواجهة الأمامية (`src/types/warehouse.ts`)**:
   - الدالة `createEmptyRackCellsForAshraf(rack)` تولد لجميع طوابق وخانات الرف خلايا فارغة جاهزة للتعبئة:
     ```json
     {
       "id": "rack-a1-L1-S1",
       "code": "A-01",
       "cellLabel": "خانة A-01 (فارغة - جاهزة لتعبئة أشرف)",
       "level": 1,
       "slot": 1,
       "occupied": false,
       "capacity": 120,
       "quantity": 0,
       "productName": "",
       "barcode": "6281000001101",
       "arrangementMode": "MATRIX_2D",
       "matrixCols": 2,
       "matrixRows": 2,
       "showInternalDividers": true,
       "medicines": []
     }
     ```

### كيف يقوم المشرف أشرف بتعبئة الخانات بعد الاستلام؟
1. **الطريقة الأولى (من نافذة «🪵 استعراض الـ Matrix»)**:
   - يختار أشرف الرف والطابق والخانة، يحدد عدد الألواح الخشبية الأفقية فوق بعضها (`Rows`) وعدد الأدوية بكل لوح (`Cols`)، ثم يضغط **«+ تعبئة دواء هنا»** على أي موضع فوق اللوح الخشبي (`R1-C1`, `R1-C2`, `R2-C1`...) ويدخل اسم الدواء، الكمية، الباركود، تاريخ الصلاحية، والسعة القصوى (`Capacity`).
2. **الطريقة الثانية (من الخريطة ثلاثية الأبعاد مباشرة)**:
   - ينقر أشرف على أي خانة فارغة في الرف الـ 3D، فتفتح لوحة التحرير الجانبية (`SideEditorDrawer`) لتعبئة الخانة وتقسيم الـ Matrix.
3. **الطريقة الثالثة (عبر الربط المباشر مع نظام ERP / WMS الخاص بـ Antigravity)**:
   - إرسال بيانات الصنف من النظام الخارجي إلى `/api/warehouse/cell-sync`.

---

## 4. عقود الربط البرمجي الكاملة لـ Antigravity (API & Database Integration Contract)

يجب على `Antigravity` ربط نقاط النهاية (`Endpoints`) التالية في `/server.ts`:

### أ. قراءة حالة المستودع والخانات الحية (`GET /api/warehouse/realtime`)
- **الاستجابة (`200 OK`)**:
  ```json
  {
    "inventory": [
      {
        "id": "rack-a1-L1-S1",
        "rackId": "rack-a1",
        "rackCode": "WH-MAIN-A1",
        "level": 1,
        "slot": 1,
        "cellCode": "A-01",
        "productName": "أوجمنتين 1 جم",
        "nameEn": "Augmentin 1g",
        "scientificName": "Co-Amoxiclav",
        "barcode": "628100010111",
        "batchNumber": "AUG-2026-11A",
        "expiryDate": "2027-09-30",
        "quantity": 84,
        "capacity": 120,
        "storageCondition": "ROOM",
        "movementCategory": "AVAILABLE",
        "orderRef": "",
        "returnReason": "",
        "updatedAt": "2026-11-05T12:00:00.000Z"
      }
    ],
    "transactions": [],
    "summary": {
      "totalCells": 69,
      "totalUnits": 4120,
      "orderPickCount": 6,
      "expiredCount": 4,
      "returnedCount": 3,
      "availableCount": 56
    }
  }
  ```

### ب. البث اللحظي المباشر (`GET /api/warehouse/stream` — Server-Sent Events)
- يفتح قناة `EventSource` مستمرة تدفع أحدث حالة لـ `inventory` و`transactions` فور حدوث أي عملية تعبئة أو سحب أو جرد.

### ج. تسكين أو تعديل بيانات خانة من قِبل أشرف أو النظام (`POST /api/warehouse/cell-sync`)
- **جسم الطلب (`Request Body`)**:
  ```json
  {
    "id": "rack-a1-L1-S1",
    "rackId": "rack-a1",
    "rackCode": "WH-MAIN-A1",
    "level": 1,
    "slot": 1,
    "cellCode": "A-01",
    "productName": "بانادول إكسترا 500 مجم",
    "nameEn": "Panadol Extra 500mg",
    "scientificName": "Paracetamol + Caffeine",
    "barcode": "628100010111",
    "batchNumber": "BCH-2026-01",
    "expiryDate": "2028-06-30",
    "quantity": 90,
    "capacity": 120,
    "storageCondition": "ROOM",
    "movementCategory": "AVAILABLE"
  }
  ```

### د. تنفيذ حركات السحب والتوريد والمرتجعات (`POST /api/warehouse/pull`)
- **جسم الطلب (`Request Body`)**:
  ```json
  {
    "cellId": "rack-a1-L1-S1",
    "rackId": "rack-a1",
    "level": 1,
    "slot": 1,
    "actionType": "ORDER_PICK | EXPIRED_PULL | RETURN_PROCESS | RESTOCK",
    "qty": 15,
    "operatorName": "المشرف أشرف",
    "referenceCode": "ORD-2026-9001"
  }
  ```

### هـ. تسليم المستودع فارغاً للمشرف أشرف (`POST /api/warehouse/handover-empty`)
- يصفر جميع الخانات في قاعدة البيانات لتسليم المشروع نظيفاً وجاهزاً للتعبئة الفعلية.

---

## 5. خريطة الملفات الأساسية في المشروع (Key File Map for Antigravity)
| المسار | الوظيفة التقنية |
|---|---|
| `/server.ts` | خادم Express + قاعدة بيانات SQLite + بث SSE + مسارات التوريد والتفريغ لأشرف |
| `/src/types/warehouse.ts` | جميع الأنواع والواجهات، حساب مصفوفة الأخشاب `computeCellMatrixLayout`، حساب التنبيهات المرئية `computeCellStockAlert`، وتوليد الخانات الفارغة لأشرف `createEmptyRackCellsForAshraf` |
| `/src/three/proceduralModels.ts` | بناء الرفوف الثلاثية الأبعاد، الألواح الخشبية الأفقية المتراصة (`واحد فوق التالي`)، كراتين الأدوية، والعامل البشري |
| `/src/three/WarehouseScene.ts` | محرك المشهد الثلاثي الأبعاد، الكاميرات، الإضاءة، مسارات حركة العامل، وتقريب الكاميرا للخانات |
| `/src/components/MatrixExplorerModal.tsx` | واجهة استعراض الـ Matrix والألواح الخشبية الأفقية + نظام التنبيهات المرئية (الأحمر/الأصفر/الأخضر/الفارغ) بناءً على `Quantity vs Capacity` |
| `/src/components/SideEditorDrawer.tsx` | لوحة التحكم التفصيلية بالرفوف، الخانات، الجدران، وإعدادات ترتيب الـ Matrix |
| `/src/components/JourneyHUD.tsx` | شريط المحطات الـ 6 الأفقي الكامل مع إعدادات الترتيب التفصيلية |
| `/src/components/AntigravityGuideModal.tsx` | نافذة التوثيق التفاعلي لـ Antigravity وأزرار التسليم الفوري للمشرف أشرف بخانات فارغة |
