// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRackRotationDeg,
  resolveRackCell,
  getCellMedicines,
  computeCellMatrixLayout,
  computeCellExpiryStatus,
  computeCellStockAlert,
  createEmptyRackCellsForAshraf,
  WarehouseRack,
} from '../../types/warehouse';
import {
  computeLodTier,
  parseVoiceCommand,
  generateQrMatrix,
  buildRackSyncUri,
} from '../../utils/qrCodeGenerator';
import { WarehouseNavGraph } from '../navigation';

describe('DAWA 3D Warehouse Engine Pure Logic', () => {
  it('normalizes 360-degree rack rotation and legacy rot boolean', () => {
    const rackA: WarehouseRack = {
      id: 'r1',
      code: 'R-01',
      name: 'Rack 1',
      zone: 'A',
      shelf: '1',
      levelVal: '01',
      px: 5,
      pz: 5,
      rotation: 275,
    };
    assert.equal(getRackRotationDeg(rackA), 275);

    const rackNeg: WarehouseRack = {
      ...rackA,
      rotation: -45,
    };
    assert.equal(getRackRotationDeg(rackNeg), 315);

    const rackLegacy: WarehouseRack = {
      ...rackA,
      rotation: undefined,
      rot: true,
    };
    assert.equal(getRackRotationDeg(rackLegacy), 90);
  });

  it('resolves cell metadata with cellLabel, barcode, batch, and 2D matrix subdivisions', () => {
    const rack: WarehouseRack = {
      id: 'rack-a1',
      code: 'WH-MAIN-A1',
      name: 'Analgesics Rack',
      zone: 'A',
      shelf: '1',
      levelVal: '01',
      px: 4.5,
      pz: 7.2,
    };

    const cell = resolveRackCell(rack, 2, 3);
    assert.equal(cell.code, 'B-03');
    assert.ok(cell.cellLabel && cell.cellLabel.includes('خانة B-03'));
    assert.equal(cell.level, 2);
    assert.equal(cell.slot, 3);
    assert.ok(cell.barcode && cell.barcode.startsWith('6281000'));
    assert.equal(cell.movementCategory, 'AVAILABLE');

    // Slot 1 & 1 has 4 subdivided medicines organized in a 2x2 matrix
    const subdividedCell = resolveRackCell(rack, 1, 1);
    const meds = getCellMedicines(subdividedCell);
    assert.equal(meds.length, 4);
    assert.equal(meds[0].subSlotCode, 'A-01/R1-C1');
    assert.equal(meds[0].matrixRow, 1);
    assert.equal(meds[0].matrixCol, 1);
    assert.equal(meds[1].subSlotCode, 'A-01/R1-C2');
    assert.equal(meds[2].subSlotCode, 'A-01/R2-C1');
    assert.equal(meds[3].subSlotCode, 'A-01/R2-C2');
  });

  it('evaluates FEFO expiry tiers accurately for expired, critical, warning, and safe batches', () => {
    const expCatEv = computeCellExpiryStatus('2028-01-01', 'EXPIRED', '2026-11-04');
    assert.equal(expCatEv.tier, 'EXPIRED');

    const pastDateEv = computeCellExpiryStatus('2025-05-01', 'AVAILABLE', '2026-11-04');
    assert.equal(pastDateEv.tier, 'EXPIRED');

    const critical15dEv = computeCellExpiryStatus('2026-11-18', 'AVAILABLE', '2026-11-04');
    assert.equal(critical15dEv.tier, 'CRITICAL_30D');

    const warning60dEv = computeCellExpiryStatus('2027-01-03', 'AVAILABLE', '2026-11-04');
    assert.equal(warning60dEv.tier, 'WARNING_90D');

    const safeFutureEv = computeCellExpiryStatus('2030-12-01', 'AVAILABLE', '2026-11-04');
    assert.equal(safeFutureEv.tier, 'SAFE');
  });

  it('computes dynamic 3D LOD tiers based on distance, FPS, and dynamicLodEnabled flag', () => {
    assert.equal(computeLodTier(28, 30, false), 0); // Disabled LOD always stays Tier 0
    assert.equal(computeLodTier(8, 60, true), 0);
    assert.equal(computeLodTier(22, 60, true), 1);
    assert.equal(computeLodTier(34, 60, true), 2);
    // When FPS drops below 36, thresholds tighten automatically
    assert.equal(computeLodTier(13, 30, true), 1);
    assert.equal(computeLodTier(22, 30, true), 2);
  });

  it('parses bilingual Arabic & English voice commands accurately', () => {
    const racks: WarehouseRack[] = [
      {
        id: 'rack-a1',
        code: 'WH-MAIN-A1',
        name: 'Rack A1',
        zone: 'A',
        shelf: '1',
        levelVal: '01',
        px: 4.5,
        pz: 7.2,
      },
      {
        id: 'rack-b2',
        code: 'WH-MAIN-B2',
        name: 'Rack B2',
        zone: 'B',
        shelf: '2',
        levelVal: '01',
        px: 9.0,
        pz: 10.2,
      },
    ];

    const cmd1 = parseVoiceCommand('Select Rack A1', racks);
    assert.equal(cmd1.type, 'SELECT_RACK');
    assert.equal(cmd1.rackId, 'rack-a1');

    const cmd2 = parseVoiceCommand('اختر رف B2', racks);
    assert.equal(cmd2.type, 'SELECT_RACK');
    assert.equal(cmd2.rackId, 'rack-b2');

    const cmd3 = parseVoiceCommand('Show FEFO alerts', racks);
    assert.equal(cmd3.type, 'SHOW_FEFO_ALERTS');

    const cmd4 = parseVoiceCommand('تراجع عن التعديل', racks);
    assert.equal(cmd4.type, 'UNDO');
  });

  it('generates deterministic 29x29 QR code matrix with finder patterns', () => {
    const rack: WarehouseRack = {
      id: 'rack-a1',
      code: 'WH-MAIN-A1',
      name: 'Rack A1',
      zone: 'A',
      shelf: '1',
      levelVal: '01',
      px: 4.5,
      pz: 7.2,
    };
    const uri = buildRackSyncUri(rack);
    assert.ok(uri.includes('DAWA3D://RACK/WH-MAIN-A1'));
    const matrix = generateQrMatrix(uri);
    assert.equal(matrix.length, 29);
    assert.equal(matrix[0].length, 29);
    assert.equal(matrix[0][0], true); // Top-left finder corner
    assert.equal(matrix[3][3], true); // Finder center
  });

  it('computes collision-free pathfinding for arbitrary 360-deg rotated racks', () => {
    const nav = new WarehouseNavGraph();
    const rack: WarehouseRack = {
      id: 'rack-rot',
      code: 'WH-ROT',
      name: 'Rotated Rack',
      zone: 'A',
      shelf: '1',
      levelVal: '01',
      px: 8,
      pz: 8,
      rotation: 135,
      w: 12,
      d: 1.0,
    };
    nav.rebuild({ ww: 24, wd: 16, wh: 8 }, [rack], []);
    const sp = nav.rackStandpoints.get('rack-rot');
    assert.ok(sp, 'Standpoint should be generated for rotated rack');

    const path = nav.findPath([2, 2], sp!);
    assert.ok(path.length >= 2, 'Path should have at least start and end points');
  });

  it('computes 2D/3D cell matrix layout (أفقي، مصفوفة، طولي، رأسي) and handles explicit overrides', () => {
    // 1 item -> 1x1x1
    assert.deepEqual(computeCellMatrixLayout(1), { cols: 1, rows: 1, layersY: 1 });
    // 2 items -> 2 cols x 1 row (عرضي)
    assert.deepEqual(computeCellMatrixLayout(2), { cols: 2, rows: 1, layersY: 1 });
    // 4 items -> 2 cols x 2 rows (2D matrix)
    assert.deepEqual(computeCellMatrixLayout(4), { cols: 2, rows: 2, layersY: 1 });
    // 6 items -> 3 cols x 2 rows
    assert.deepEqual(computeCellMatrixLayout(6), { cols: 3, rows: 2, layersY: 1 });
    // 8 items -> 4 cols x 2 rows
    assert.deepEqual(computeCellMatrixLayout(8), { cols: 4, rows: 2, layersY: 1 });

    // HORIZONTAL_ROW mode (أفقي ممتد) -> 6 cols x 1 row
    assert.deepEqual(computeCellMatrixLayout(6, undefined, undefined, 'HORIZONTAL_ROW'), {
      cols: 6,
      rows: 1,
      layersY: 1,
    });

    // DEPTH_FILE mode (طولي بالعمق) -> 1 col x 4 rows
    assert.deepEqual(computeCellMatrixLayout(4, undefined, undefined, 'DEPTH_FILE'), {
      cols: 1,
      rows: 4,
      layersY: 1,
    });

    // VERTICAL_STACK mode (تكديس رأسي) -> 1 col x 1 row x 4 layers
    assert.deepEqual(computeCellMatrixLayout(4, undefined, undefined, 'VERTICAL_STACK'), {
      cols: 1,
      rows: 1,
      layersY: 4,
    });

    // Explicit override (e.g. user selected 3x3 in UI)
    assert.deepEqual(computeCellMatrixLayout(4, 3, 3), { cols: 3, rows: 3, layersY: 1 });
    // Explicit columns override only
    assert.deepEqual(computeCellMatrixLayout(5, 2), { cols: 2, rows: 3, layersY: 1 });
    // Explicit rows override only
    assert.deepEqual(computeCellMatrixLayout(6, undefined, 2), { cols: 3, rows: 2, layersY: 1 });
  });

  it('evaluates Quantity vs Capacity visual stock alerts (Red Critical, Yellow Warning, Green Safe, Empty)', () => {
    // 15 / 100 -> 15% remaining (85% consumed) -> CRITICAL_RED
    const redAlert = computeCellStockAlert(15, 100, true, 25, 55);
    assert.equal(redAlert.tier, 'CRITICAL_RED');
    assert.equal(redAlert.fillPercent, 15);
    assert.equal(redAlert.consumptionPercent, 85);
    assert.equal(redAlert.shortageQty, 85);

    // 40 / 100 -> 40% remaining (60% consumed) -> WARNING_YELLOW
    const yellowAlert = computeCellStockAlert(40, 100, true, 25, 55);
    assert.equal(yellowAlert.tier, 'WARNING_YELLOW');
    assert.equal(yellowAlert.fillPercent, 40);
    assert.equal(yellowAlert.consumptionPercent, 60);
    assert.equal(yellowAlert.shortageQty, 60);

    // 90 / 100 -> 90% remaining (10% consumed) -> SAFE_GREEN
    const greenAlert = computeCellStockAlert(90, 100, true, 25, 55);
    assert.equal(greenAlert.tier, 'SAFE_GREEN');
    assert.equal(greenAlert.fillPercent, 90);
    assert.equal(greenAlert.shortageQty, 10);

    // 0 / 120 or occupied=false -> EMPTY (for Ashraf handover)
    const emptyAlert = computeCellStockAlert(0, 120, false, 25, 55);
    assert.equal(emptyAlert.tier, 'EMPTY');
    assert.equal(emptyAlert.fillPercent, 0);
    assert.equal(emptyAlert.shortageQty, 120);
  });

  it('generates clean empty rack cells for Ashraf handover with preserved codes and capacities', () => {
    const rack: WarehouseRack = {
      id: 'rack-a1',
      code: 'WH-MAIN-A1',
      name: 'Rack A1',
      zone: 'A',
      shelf: '1',
      levelVal: '01',
      px: 4.5,
      pz: 7.2,
      levels: 4,
      cellsPerLevel: 3,
    };
    const emptyCells = createEmptyRackCellsForAshraf(rack);
    assert.equal(emptyCells.length, 12);
    assert.equal(emptyCells[0].code, 'A-01');
    assert.equal(emptyCells[0].occupied, false);
    assert.equal(emptyCells[0].quantity, 0);
    assert.equal(emptyCells[0].capacity, 120);
    assert.equal(emptyCells[0].medicines?.length, 0);
    assert.equal(getCellMedicines(emptyCells[0]).length, 0);
  });
});
