import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RealTimeCellInventoryRow {
  id: string;
  rackId: string;
  rackCode: string;
  level: number;
  slot: number;
  cellCode: string;
  productName: string;
  nameEn: string;
  scientificName: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  capacity: number;
  storageCondition: 'ROOM' | 'COLD' | 'QUARANTINE';
  movementCategory: 'AVAILABLE' | 'ORDER_PICK' | 'EXPIRED' | 'RETURNED';
  orderRef: string;
  returnReason: string;
  updatedAt: string;
}

export interface RealTimeTransactionRow {
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

// Initialize SQLite Database (file-backed with in-memory fallback)
let db: Database.Database;
try {
  db = new Database(path.join(__dirname, 'warehouse_realtime_v2.db'));
  db.pragma('journal_mode = WAL');
} catch {
  db = new Database(':memory:');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS cell_inventory (
    id TEXT PRIMARY KEY,
    rackId TEXT NOT NULL,
    rackCode TEXT NOT NULL,
    level INTEGER NOT NULL,
    slot INTEGER NOT NULL,
    cellCode TEXT NOT NULL,
    productName TEXT NOT NULL,
    nameEn TEXT NOT NULL,
    scientificName TEXT NOT NULL,
    barcode TEXT NOT NULL,
    batchNumber TEXT NOT NULL,
    expiryDate TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    storageCondition TEXT NOT NULL,
    movementCategory TEXT NOT NULL,
    orderRef TEXT DEFAULT '',
    returnReason TEXT DEFAULT '',
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    cellId TEXT NOT NULL,
    rackId TEXT NOT NULL,
    rackCode TEXT NOT NULL,
    level INTEGER NOT NULL,
    slot INTEGER NOT NULL,
    cellCode TEXT NOT NULL,
    productName TEXT NOT NULL,
    barcode TEXT NOT NULL,
    actionType TEXT NOT NULL,
    qtyDelta INTEGER NOT NULL,
    remainingQty INTEGER NOT NULL,
    operatorName TEXT NOT NULL,
    referenceCode TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
`);

const SEED_MEDICINES: Array<{
  rackId: string;
  rackCode: string;
  levels: number;
  slots: number;
  condition: 'ROOM' | 'COLD' | 'QUARANTINE';
  catalog: Array<{
    productName: string;
    nameEn: string;
    scientificName: string;
    barcode: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    capacity: number;
    movementCategory: 'AVAILABLE' | 'ORDER_PICK' | 'EXPIRED' | 'RETURNED';
    orderRef: string;
    returnReason: string;
  }>;
}> = [
  {
    rackId: 'rack-a1',
    rackCode: 'WH-MAIN-A1',
    levels: 4,
    slots: 3,
    condition: 'ROOM',
    catalog: [
      {
        productName: 'أوجمنتين 1 جم أقراص (Augmentin 1g)',
        nameEn: 'Augmentin 1g Film-Coated Tabs',
        scientificName: 'Amoxicillin 875mg + Clavulanic Acid 125mg',
        barcode: '6281000101101',
        batchNumber: 'AUG-2026-11A',
        expiryDate: '2027-09-30',
        quantity: 84,
        capacity: 100,
        movementCategory: 'ORDER_PICK',
        orderRef: 'ORD-2026-8841 (صيدلية النهدي - الفرع المركزي)',
        returnReason: '',
      },
      {
        productName: 'زيثروماكس 500 مجم كبسولات (Zithromax)',
        nameEn: 'Zithromax 500mg Capsules',
        scientificName: 'Azithromycin Dihydrate 500mg',
        barcode: '6281000101102',
        batchNumber: 'ZTH-2024-02X',
        expiryDate: '2025-01-15',
        quantity: 28,
        capacity: 100,
        movementCategory: 'EXPIRED',
        orderRef: '',
        returnReason: 'منتهي الصلاحية - مطلوب سحب فوري للحجر الإتلافي',
      },
      {
        productName: 'كلاريتين 10 مجم مضاد هيستامين (Claritin)',
        nameEn: 'Claritin 10mg Allergy Relief',
        scientificName: 'Loratadine 10mg Micronized',
        barcode: '6281000101103',
        batchNumber: 'CLR-2026-08B',
        expiryDate: '2028-03-20',
        quantity: 92,
        capacity: 100,
        movementCategory: 'AVAILABLE',
        orderRef: '',
        returnReason: '',
      },
      {
        productName: 'سيبروفلوكساسين 500 مجم (Ciprobay 500)',
        nameEn: 'Ciprobay 500mg Tablets',
        scientificName: 'Ciprofloxacin HCl 500mg',
        barcode: '6281000101104',
        batchNumber: 'CIP-2025-19R',
        expiryDate: '2027-06-10',
        quantity: 45,
        capacity: 100,
        movementCategory: 'RETURNED',
        orderRef: 'RET-2026-309',
        returnReason: 'مرتجع من صيدلية الدواء (فائض طلبية شهرية سليم الغلاف)',
      },
    ],
  },
  {
    rackId: 'rack-a2',
    rackCode: 'WH-MAIN-A2',
    levels: 4,
    slots: 3,
    condition: 'ROOM',
    catalog: [
      {
        productName: 'بنادول إكسترا مسكن (Panadol Extra Optizorb)',
        nameEn: 'Panadol Extra Red Caplets',
        scientificName: 'Paracetamol 500mg + Caffeine 65mg',
        barcode: '6281000202101',
        batchNumber: 'PND-2026-44M',
        expiryDate: '2028-08-12',
        quantity: 120,
        capacity: 120,
        movementCategory: 'ORDER_PICK',
        orderRef: 'ORD-2026-8841 (سحب 24 علبة للطلبية العاجلة)',
        returnReason: '',
      },
      {
        productName: 'فولتارين إيمولجيل 100 جم (Voltaren Gel)',
        nameEn: 'Voltaren Emulgel 1% 100g',
        scientificName: 'Diclofenac Diethylamine 1.16%',
        barcode: '6281000202102',
        batchNumber: 'VLT-2025-77K',
        expiryDate: '2027-11-30',
        quantity: 64,
        capacity: 100,
        movementCategory: 'AVAILABLE',
        orderRef: '',
        returnReason: '',
      },
      {
        productName: 'بروفين 600 مجم فوار (Brufen 600 Granules)',
        nameEn: 'Brufen 600mg Effervescent Sachets',
        scientificName: 'Ibuprofen 600mg',
        barcode: '6281000202103',
        batchNumber: 'BRF-2023-99E',
        expiryDate: '2024-12-01',
        quantity: 19,
        capacity: 100,
        movementCategory: 'EXPIRED',
        orderRef: '',
        returnReason: 'تجاوز تاريخ الانتهاء - إيقاف الصرف وسحب للمحارق الدوائية',
      },
    ],
  },
  {
    rackId: 'rack-cold-1',
    rackCode: 'WH-COLD-01',
    levels: 3,
    slots: 3,
    condition: 'COLD',
    catalog: [
      {
        productName: 'أنسولين لانتوس سولوستار مبرد (Lantus SoloStar)',
        nameEn: 'Lantus SoloStar 100 IU/ml Pens',
        scientificName: 'Insulin Glargine rDNA 100 IU/ml',
        barcode: '6281000303101',
        batchNumber: 'LNT-COLD-901',
        expiryDate: '2027-04-18',
        quantity: 60,
        capacity: 80,
        movementCategory: 'ORDER_PICK',
        orderRef: 'ORD-2026-8902 (سلسلة تبريد 2-8°C - مستشفى الملك فهد)',
        returnReason: '',
      },
      {
        productName: 'أوزمبك 1 مجم أقلام مبردة (Ozempic 1mg)',
        nameEn: 'Ozempic 1mg Solution for Injection',
        scientificName: 'Semaglutide 1.34 mg/ml',
        barcode: '6281000303102',
        batchNumber: 'OZM-COLD-402',
        expiryDate: '2027-10-05',
        quantity: 35,
        capacity: 60,
        movementCategory: 'AVAILABLE',
        orderRef: '',
        returnReason: '',
      },
      {
        productName: 'لقاح الإنفلونزا الموسمية الرباعي (Vaxigrip Tetra)',
        nameEn: 'Vaxigrip Tetra Suspension',
        scientificName: 'Inactivated Influenza Vaccine (Split Virion)',
        barcode: '6281000303103',
        batchNumber: 'VAX-2024-11C',
        expiryDate: '2025-02-01',
        quantity: 14,
        capacity: 80,
        movementCategory: 'EXPIRED',
        orderRef: '',
        returnReason: 'انتهاء موسم التحصين وتاريخ الصلاحية - سحب من الثلاجة',
      },
    ],
  },
  {
    rackId: 'rack-b1',
    rackCode: 'WH-MAIN-B1',
    levels: 4,
    slots: 3,
    condition: 'ROOM',
    catalog: [
      {
        productName: 'محلول ملح وريدي 0.9% (Normal Saline 500ml)',
        nameEn: 'Sodium Chloride 0.9% IV Infusion',
        scientificName: 'Sodium Chloride 9g/L Sterile',
        barcode: '6281000606101',
        batchNumber: 'NSL-2026-102',
        expiryDate: '2028-09-01',
        quantity: 96,
        capacity: 100,
        movementCategory: 'ORDER_PICK',
        orderRef: 'ORD-2026-8955 (توريد طوارئ المستشفيات)',
        returnReason: '',
      },
      {
        productName: 'محلول رينجر لاكتات وريدي (Ringer Lactate)',
        nameEn: 'Hartmanns Solution IV 500ml',
        scientificName: 'Compound Sodium Lactate IV',
        barcode: '6281000606102',
        batchNumber: 'RNG-2026-204',
        expiryDate: '2028-04-15',
        quantity: 82,
        capacity: 100,
        movementCategory: 'AVAILABLE',
        orderRef: '',
        returnReason: '',
      },
    ],
  },
  {
    rackId: 'rack-b2',
    rackCode: 'WH-MAIN-B2',
    levels: 4,
    slots: 3,
    condition: 'ROOM',
    catalog: [
      {
        productName: 'كونكور 5 مجم للضغط والقلب (Concor 5mg)',
        nameEn: 'Concor 5mg Film-Coated Tablets',
        scientificName: 'Bisoprolol Fumarate 5mg',
        barcode: '6281000404101',
        batchNumber: 'CNC-2026-501',
        expiryDate: '2028-05-14',
        quantity: 95,
        capacity: 100,
        movementCategory: 'ORDER_PICK',
        orderRef: 'ORD-2026-8841 (طلبية الصيدليات الموحدة)',
        returnReason: '',
      },
      {
        productName: 'ليبيتور 20 مجم كوليسترول (Lipitor 20mg)',
        nameEn: 'Lipitor 20mg Atorvastatin',
        scientificName: 'Atorvastatin Calcium 20mg',
        barcode: '6281000404102',
        batchNumber: 'LPT-2025-612',
        expiryDate: '2027-07-22',
        quantity: 52,
        capacity: 100,
        movementCategory: 'RETURNED',
        orderRef: 'RET-2026-415',
        returnReason: 'مرتجع فائض من فرع جدة - تم فحص سلامة التخزين الحراري',
      },
      {
        productName: 'بلافيكس 75 مجم مضاد الصفائح (Plavix 75mg)',
        nameEn: 'Plavix 75mg Tablets',
        scientificName: 'Clopidogrel Bisulfate 75mg',
        barcode: '6281000404103',
        batchNumber: 'PLV-2026-109',
        expiryDate: '2028-01-30',
        quantity: 78,
        capacity: 100,
        movementCategory: 'AVAILABLE',
        orderRef: '',
        returnReason: '',
      },
    ],
  },
  {
    rackId: 'rack-wood-1',
    rackCode: 'CAB-WOOD-01',
    levels: 4,
    slots: 3,
    condition: 'ROOM',
    catalog: [
      {
        productName: 'سنتروم فيتامينات متعددة (Centrum Adults)',
        nameEn: 'Centrum Multivitamin 100 Tabs',
        scientificName: 'Multivitamins & Minerals Complex',
        barcode: '6281000505101',
        batchNumber: 'CNT-2026-88W',
        expiryDate: '2028-06-01',
        quantity: 88,
        capacity: 100,
        movementCategory: 'ORDER_PICK',
        orderRef: 'ORD-2026-9010 (طلبية العناية والفيتامينات)',
        returnReason: '',
      },
      {
        productName: 'أوميجا-3 زيت السمك النقي (Omega-3 1000mg)',
        nameEn: 'Pure Alaskan Omega-3 Softgels',
        scientificName: 'EPA 360mg + DHA 240mg',
        barcode: '6281000505102',
        batchNumber: 'OMG-2025-33W',
        expiryDate: '2027-12-15',
        quantity: 41,
        capacity: 100,
        movementCategory: 'RETURNED',
        orderRef: 'RET-2026-502',
        returnReason: 'مرتجع تعديل طلبية - عبوات مختومة بالكامل',
      },
      {
        productName: 'شراب الكحة بالأعشاب يونيسبان (Prospan Ivy Syrup)',
        nameEn: 'Prospan Herbal Cough Syrup 100ml',
        scientificName: 'Hedera Helix Leaf Dry Extract',
        barcode: '6281000505103',
        batchNumber: 'PRS-2024-05W',
        expiryDate: '2025-01-20',
        quantity: 16,
        capacity: 100,
        movementCategory: 'EXPIRED',
        orderRef: '',
        returnReason: 'منتهي الصلاحية - سحب من الخزانة الخشبية الجدارية',
      },
    ],
  },
];

function seedDatabaseIfEmpty() {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM cell_inventory').get() as { cnt: number };
  if (countRow.cnt > 0) return;

  const insertCell = db.prepare(`
    INSERT INTO cell_inventory (
      id, rackId, rackCode, level, slot, cellCode,
      productName, nameEn, scientificName, barcode, batchNumber,
      expiryDate, quantity, capacity, storageCondition,
      movementCategory, orderRef, returnReason, updatedAt
    ) VALUES (
      @id, @rackId, @rackCode, @level, @slot, @cellCode,
      @productName, @nameEn, @scientificName, @barcode, @batchNumber,
      @expiryDate, @quantity, @capacity, @storageCondition,
      @movementCategory, @orderRef, @returnReason, @updatedAt
    )
  `);

  const insertTx = db.prepare(`
    INSERT INTO inventory_transactions (
      id, cellId, rackId, rackCode, level, slot, cellCode,
      productName, barcode, actionType, qtyDelta, remainingQty,
      operatorName, referenceCode, timestamp
    ) VALUES (
      @id, @cellId, @rackId, @rackCode, @level, @slot, @cellCode,
      @productName, @barcode, @actionType, @qtyDelta, @remainingQty,
      @operatorName, @referenceCode, @timestamp
    )
  `);

  const nowIso = new Date().toISOString();

  const seedTx = db.transaction(() => {
    for (const rackSeed of SEED_MEDICINES) {
      let idx = 0;
      for (let level = 1; level <= rackSeed.levels; level++) {
        for (let slot = 1; slot <= rackSeed.slots; slot++) {
          const item = rackSeed.catalog[idx % rackSeed.catalog.length];
          const isWooden = rackSeed.rackCode.startsWith('W-');
          const isCold = rackSeed.condition === 'COLD';
          const cellCode = isWooden
            ? `W${level}-${String(slot).padStart(2, '0')}`
            : isCold
            ? `COLD-${level}${slot}`
            : `${String.fromCharCode(64 + level)}-${String(slot).padStart(2, '0')}`;

          const cellId = `${rackSeed.rackId}-L${level}-S${slot}`;
          // Unique barcode suffix per slot
          const uniqueBarcode =
            item.barcode.slice(0, 10) + String(level * 10 + slot).padStart(3, '0');
          const uniqueBatch = `${item.batchNumber}-${level}${slot}`;

          insertCell.run({
            id: cellId,
            rackId: rackSeed.rackId,
            rackCode: rackSeed.rackCode,
            level,
            slot,
            cellCode,
            productName: item.productName,
            nameEn: item.nameEn,
            scientificName: item.scientificName,
            barcode: uniqueBarcode,
            batchNumber: uniqueBatch,
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            capacity: item.capacity,
            storageCondition: rackSeed.condition,
            movementCategory: item.movementCategory,
            orderRef: item.orderRef,
            returnReason: item.returnReason,
            updatedAt: nowIso,
          });

          if (idx < 6) {
            insertTx.run({
              id: `tx-init-${rackSeed.rackId}-${level}-${slot}`,
              cellId,
              rackId: rackSeed.rackId,
              rackCode: rackSeed.rackCode,
              level,
              slot,
              cellCode,
              productName: item.productName,
              barcode: uniqueBarcode,
              actionType:
                item.movementCategory === 'EXPIRED'
                  ? 'EXPIRED_PULL'
                  : item.movementCategory === 'RETURNED'
                  ? 'RETURN_PROCESS'
                  : 'ORDER_PICK',
              qtyDelta: item.movementCategory === 'RETURNED' ? 12 : -15,
              remainingQty: item.quantity,
              operatorName: idx % 2 === 0 ? 'محمد القحطاني (فني تحضير)' : 'مرعي الشهري (أمين مستودع)',
              referenceCode: item.orderRef || item.returnReason || 'ORD-2026-8841',
              timestamp: nowIso,
            });
          }

          idx++;
        }
      }
    }
  });

  seedTx();
}

function ensureNearExpiryBatchesInDb() {
  // Ensure dynamic near-expiry dates relative to current server clock so FEFO <30d and <90d alerts are always live in SQLite
  const now = Date.now();
  const in14Days = new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const in22Days = new Date(now + 22 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const in55Days = new Date(now + 55 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const in75Days = new Date(now + 75 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const updateExpiry = db.prepare(`
    UPDATE cell_inventory
    SET expiryDate = @expiryDate
    WHERE id = @id AND movementCategory != 'EXPIRED'
  `);

  const nearExpiryUpdates = [
    { id: 'rack-a1-L2-S1', expiryDate: in14Days },
    { id: 'rack-a2-L2-S2', expiryDate: in22Days },
    { id: 'rack-b1-L3-S1', expiryDate: in14Days },
    { id: 'rack-cold-1-L2-S1', expiryDate: in22Days },
    { id: 'rack-b1-L1-S2', expiryDate: in55Days },
    { id: 'rack-b2-L2-S1', expiryDate: in75Days },
    { id: 'rack-wood-1-L2-S2', expiryDate: in55Days },
  ];

  const tx = db.transaction(() => {
    for (const item of nearExpiryUpdates) {
      updateExpiry.run(item);
    }
  });
  tx();
}

seedDatabaseIfEmpty();
ensureNearExpiryBatchesInDb();

// Connected SSE clients for instant real-time push
const sseClients = new Set<express.Response>();

function broadcastRealtimeUpdate() {
  const payload = getRealtimePayload();
  const dataStr = `data: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(dataStr);
    } catch {
      sseClients.delete(res);
    }
  });
}

function getRealtimePayload() {
  const inventory = db
    .prepare('SELECT * FROM cell_inventory ORDER BY rackCode ASC, level ASC, slot ASC')
    .all() as RealTimeCellInventoryRow[];
  const transactions = db
    .prepare('SELECT * FROM inventory_transactions ORDER BY timestamp DESC LIMIT 40')
    .all() as RealTimeTransactionRow[];

  const summary = {
    totalCells: inventory.length,
    totalUnits: inventory.reduce((acc, r) => acc + r.quantity, 0),
    orderPickCount: inventory.filter((r) => r.movementCategory === 'ORDER_PICK').length,
    expiredCount: inventory.filter((r) => r.movementCategory === 'EXPIRED').length,
    returnedCount: inventory.filter((r) => r.movementCategory === 'RETURNED').length,
    availableCount: inventory.filter((r) => r.movementCategory === 'AVAILABLE').length,
  };

  return {
    inventory,
    transactions,
    summary,
    serverTime: new Date().toISOString(),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // 1. Get complete real-time warehouse cell inventory + movements
  app.get('/api/warehouse/realtime', (_req, res) => {
    res.json(getRealtimePayload());
  });

  // 2. Server-Sent Events (SSE) for real-time live sync
  app.get('/api/warehouse/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify(getRealtimePayload())}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // 3. Execute a real-time pull / movement action on a specific cell
  app.post('/api/warehouse/pull', (req, res) => {
    const {
      cellId,
      rackId,
      level,
      slot,
      actionType = 'ORDER_PICK',
      qty = 10,
      operatorName = 'محمد القحطاني',
      referenceCode = 'ORD-2026-LIVE',
    } = req.body || {};

    const targetId = cellId || `${rackId}-L${level}-S${slot}`;
    const existing = db
      .prepare('SELECT * FROM cell_inventory WHERE id = ?')
      .get(targetId) as RealTimeCellInventoryRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Cell not found in real-time database', targetId });
      return;
    }

    const numericQty = Math.max(1, Number(qty) || 10);
    const isInbound = actionType === 'RETURN_PROCESS' || actionType === 'RESTOCK';
    const qtyDelta = isInbound ? numericQty : -Math.min(existing.quantity, numericQty);
    const newQuantity = Math.max(0, Math.min(existing.capacity, existing.quantity + qtyDelta));

    let nextCategory = existing.movementCategory;
    if (actionType === 'EXPIRED_PULL' && newQuantity === 0) {
      nextCategory = 'AVAILABLE';
    } else if (actionType === 'ORDER_PICK') {
      nextCategory = 'ORDER_PICK';
    } else if (actionType === 'RETURN_PROCESS') {
      nextCategory = 'RETURNED';
    } else if (actionType === 'RESTOCK') {
      nextCategory = 'AVAILABLE';
    }

    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE cell_inventory
      SET quantity = ?, movementCategory = ?, updatedAt = ?
      WHERE id = ?
    `).run(newQuantity, nextCategory, nowIso, targetId);

    const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO inventory_transactions (
        id, cellId, rackId, rackCode, level, slot, cellCode,
        productName, barcode, actionType, qtyDelta, remainingQty,
        operatorName, referenceCode, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      txId,
      existing.id,
      existing.rackId,
      existing.rackCode,
      existing.level,
      existing.slot,
      existing.cellCode,
      existing.productName,
      existing.barcode,
      actionType,
      qtyDelta,
      newQuantity,
      operatorName,
      referenceCode,
      nowIso,
    );

    broadcastRealtimeUpdate();
    res.json({
      ok: true,
      updatedCell: db.prepare('SELECT * FROM cell_inventory WHERE id = ?').get(targetId),
      payload: getRealtimePayload(),
    });
  });

  // 4. Upsert/Edit a cell's medicine, barcode, batch, or movement category in real-time
  app.post('/api/warehouse/cell-sync', (req, res) => {
    const cell = req.body as Partial<RealTimeCellInventoryRow>;
    if (!cell || !cell.rackId || !cell.level || !cell.slot) {
      res.status(400).json({ error: 'Missing rackId, level, or slot' });
      return;
    }

    const id = cell.id || `${cell.rackId}-L${cell.level}-S${cell.slot}`;
    const existing = db
      .prepare('SELECT * FROM cell_inventory WHERE id = ?')
      .get(id) as RealTimeCellInventoryRow | undefined;

    const nowIso = new Date().toISOString();
    const merged: RealTimeCellInventoryRow = {
      id,
      rackId: cell.rackId,
      rackCode: cell.rackCode || existing?.rackCode || 'R-100',
      level: Number(cell.level),
      slot: Number(cell.slot),
      cellCode: cell.cellCode || existing?.cellCode || `A-0${cell.slot}`,
      productName: cell.productName ?? existing?.productName ?? 'مستحضر دوائي عام',
      nameEn: cell.nameEn ?? existing?.nameEn ?? 'Pharmaceutical Product',
      scientificName: cell.scientificName ?? existing?.scientificName ?? 'Active Pharmaceutical Ingredient',
      barcode: cell.barcode ?? existing?.barcode ?? `628100099${cell.level}${cell.slot}`,
      batchNumber: cell.batchNumber ?? existing?.batchNumber ?? `BCH-2026-${cell.level}${cell.slot}`,
      expiryDate: cell.expiryDate ?? existing?.expiryDate ?? '2027-12-31',
      quantity: typeof cell.quantity === 'number' ? cell.quantity : existing?.quantity ?? 75,
      capacity: typeof cell.capacity === 'number' ? cell.capacity : existing?.capacity ?? 100,
      storageCondition: cell.storageCondition || existing?.storageCondition || 'ROOM',
      movementCategory: cell.movementCategory || existing?.movementCategory || 'AVAILABLE',
      orderRef: cell.orderRef ?? existing?.orderRef ?? '',
      returnReason: cell.returnReason ?? existing?.returnReason ?? '',
      updatedAt: nowIso,
    };

    db.prepare(`
      INSERT INTO cell_inventory (
        id, rackId, rackCode, level, slot, cellCode,
        productName, nameEn, scientificName, barcode, batchNumber,
        expiryDate, quantity, capacity, storageCondition,
        movementCategory, orderRef, returnReason, updatedAt
      ) VALUES (
        @id, @rackId, @rackCode, @level, @slot, @cellCode,
        @productName, @nameEn, @scientificName, @barcode, @batchNumber,
        @expiryDate, @quantity, @capacity, @storageCondition,
        @movementCategory, @orderRef, @returnReason, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        rackCode = excluded.rackCode,
        cellCode = excluded.cellCode,
        productName = excluded.productName,
        nameEn = excluded.nameEn,
        scientificName = excluded.scientificName,
        barcode = excluded.barcode,
        batchNumber = excluded.batchNumber,
        expiryDate = excluded.expiryDate,
        quantity = excluded.quantity,
        capacity = excluded.capacity,
        storageCondition = excluded.storageCondition,
        movementCategory = excluded.movementCategory,
        orderRef = excluded.orderRef,
        returnReason = excluded.returnReason,
        updatedAt = excluded.updatedAt
    `).run(merged);

    broadcastRealtimeUpdate();
    res.json({ ok: true, cell: merged, payload: getRealtimePayload() });
  });

  // 5. Handover Warehouse with Empty Cells to Supervisor Ashraf (تسليم المستودع لأشرف بخانات فارغة جاهزة للتعبئة)
  app.post('/api/warehouse/handover-empty', (_req, res) => {
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE cell_inventory
      SET quantity = 0,
          productName = '',
          nameEn = '',
          scientificName = '',
          batchNumber = '',
          expiryDate = '',
          movementCategory = 'AVAILABLE',
          orderRef = '',
          returnReason = '',
          updatedAt = ?
    `).run(nowIso);

    db.prepare(`DELETE FROM inventory_transactions`).run();

    broadcastRealtimeUpdate();
    res.json({
      ok: true,
      mode: 'ASHRAF_EMPTY_HANDOVER',
      payload: getRealtimePayload(),
    });
  });

  // 6. Restore Sample Pharmaceutical Inventory (استعادة البيانات التجريبية للمستودع الدوائي)
  app.post('/api/warehouse/restore-sample', (_req, res) => {
    db.prepare(`DELETE FROM cell_inventory`).run();
    db.prepare(`DELETE FROM inventory_transactions`).run();
    seedDatabaseIfEmpty();
    ensureNearExpiryBatchesInDb();
    broadcastRealtimeUpdate();
    res.json({
      ok: true,
      mode: 'SAMPLE_RESTORED',
      payload: getRealtimePayload(),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DAWA 3D Warehouse Real-Time Engine listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
