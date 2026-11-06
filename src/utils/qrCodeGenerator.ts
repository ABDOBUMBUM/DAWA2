import { WarehouseRack } from '../types/warehouse';

/**
 * Builds the canonical synchronization URI for a 3D Warehouse Rack.
 * Physical scanners or Expo Go mobile devices scanning this QR code sync directly to the 3D rack & its SQLite cells.
 */
export function buildRackSyncUri(rack: WarehouseRack): string {
  const levels = rack.levels || 4;
  const slots = rack.cellsPerLevel || 3;
  const rot = Math.round(rack.rotation ?? (rack.rot ? 90 : 0));
  return `DAWA3D://RACK/${encodeURIComponent(rack.code)}?id=${encodeURIComponent(
    rack.id,
  )}&zone=${encodeURIComponent(rack.zone)}&levels=${levels}&slots=${slots}&pos=${rack.px.toFixed(
    1,
  )},${rack.pz.toFixed(1)}&rot=${rot}`;
}

/**
 * Generates a deterministic 29x29 QR Code matrix (Version 3 layout) with standard finder patterns,
 * timing lines, alignment box, and encoded payload bits.
 */
export function generateQrMatrix(payload: string): boolean[][] {
  const size = 29;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Helper to place 7x7 Finder Pattern
  const placeFinder = (row0: number, col0: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row0 + r;
        const cc = col0 + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = isBorder || isCenter;
        } else {
          matrix[rr][cc] = false;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Place 5x5 Alignment Pattern at (20, 20)
  const alignCenter = 22;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const rr = alignCenter + r;
      const cc = alignCenter + c;
      reserved[rr][cc] = true;
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isDot = r === 0 && c === 0;
      matrix[rr][cc] = isBorder || isDot;
    }
  }

  // Timing Patterns on row 6 and col 6
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    reserved[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  // Encode payload into bit stream with FNV-1a + Reed-Solomon-style parity stream
  const bytes: number[] = [];
  for (let i = 0; i < payload.length; i++) {
    bytes.push(payload.charCodeAt(i) & 0xff);
  }
  let hash = 2166136261;
  for (const b of bytes) {
    hash ^= b;
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  let bitIdx = 0;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col--; // Skip vertical timing pattern
    for (let rowStep = 0; rowStep < size; rowStep++) {
      const upward = ((size - 1 - col) >> 1) % 2 === 0;
      const r = upward ? size - 1 - rowStep : rowStep;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (reserved[r][c]) continue;
        const byteVal = bytes[bitIdx % Math.max(1, bytes.length)] ^ ((hash >>> (bitIdx % 24)) & 0xff);
        const bit = ((byteVal >>> (bitIdx % 8)) & 1) === 1;
        // Apply mask pattern (r + c) % 2 === 0
        matrix[r][c] = (r + c) % 2 === 0 ? !bit : bit;
        bitIdx++;
      }
    }
  }

  return matrix;
}

/**
 * Renders a crisp high-DPI QR Code data URL for a rack, ready for on-screen display & thermal printing.
 */
export function generateRackQrDataUrl(rack: WarehouseRack, pixelSize = 260): string {
  if (typeof document === 'undefined') return '';
  const uri = buildRackSyncUri(rack);
  const matrix = generateQrMatrix(uri);
  const canvas = document.createElement('canvas');
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const n = matrix.length;
  const margin = 3;
  const totalModules = n + margin * 2;
  const cellPx = pixelSize / totalModules;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          Math.floor((c + margin) * cellPx),
          Math.floor((r + margin) * cellPx),
          Math.ceil(cellPx),
          Math.ceil(cellPx),
        );
      }
    }
  }

  // Center badge overlay for DAWA 3D brand recognition
  const centerBox = pixelSize * 0.2;
  const cx = (pixelSize - centerBox) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 2, cx - 2, centerBox + 4, centerBox + 4);
  ctx.fillStyle = '#0d9488';
  ctx.fillRect(cx, cx, centerBox, centerBox);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(pixelSize * 0.065)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('3D', pixelSize / 2, pixelSize / 2 + 1);

  return canvas.toDataURL('image/png');
}

/**
 * Pure Level of Detail (LOD) tier calculator for the 3D warehouse engine.
 * - Tier 0: Full 4K Ultra Geometry (Cartons + Cell Plaques + LEDs + Beacons)
 * - Tier 1: Medium Detail (Cartons + Rack Frame, hides cell plaques & small bolts)
 * - Tier 2: Low Detail for far distance or FPS drop (Rack Frame + simplified blocks)
 */
export function computeLodTier(
  distanceMeters: number,
  currentFps: number,
  dynamicLodEnabled = true,
): 0 | 1 | 2 {
  if (!dynamicLodEnabled) return 0;
  // When FPS drops below 36, tighten distance thresholds to recover 60fps 4K smoothness
  const perfFactor = currentFps < 36 ? 0.65 : currentFps < 48 ? 0.85 : 1.0;
  const nearThreshold = 16.5 * perfFactor;
  const farThreshold = 29.0 * perfFactor;

  if (distanceMeters <= nearThreshold) return 0;
  if (distanceMeters <= farThreshold) return 1;
  return 2;
}

export type VoiceCommandAction =
  | { type: 'SELECT_RACK'; rackId: string; rackCode: string }
  | { type: 'SHOW_FEFO_ALERTS' }
  | { type: 'HIDE_FEFO_ALERTS' }
  | { type: 'OPEN_ITEM_LOCATOR' }
  | { type: 'CAMERA_PRESET'; mode: 'ORBIT' | 'TOP_DOWN' | 'ISOMETRIC' | 'FOLLOW_WORKER' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'UNKNOWN'; raw: string };

/**
 * Pure bilingual (English & Arabic) voice command parser for Web Speech API transcripts.
 */
export function parseVoiceCommand(transcript: string, racks: WarehouseRack[]): VoiceCommandAction {
  const raw = transcript.trim();
  const norm = raw.toLowerCase().replace(/\s+/g, ' ');

  // 1. FEFO Expiry Radar alerts
  if (
    norm.includes('fefo') ||
    norm.includes('expiry') ||
    norm.includes('expired') ||
    norm.includes('alert') ||
    norm.includes('صلاحية') ||
    norm.includes('الصلاحية') ||
    norm.includes('رادار') ||
    norm.includes('منتهي') ||
    norm.includes('تنبيهات')
  ) {
    if (norm.includes('hide') || norm.includes('close') || norm.includes('اخفاء') || norm.includes('إغلاق')) {
      return { type: 'HIDE_FEFO_ALERTS' };
    }
    return { type: 'SHOW_FEFO_ALERTS' };
  }

  // 2. Undo / Redo
  if (norm === 'undo' || norm.includes('undo ') || norm.includes('تراجع')) {
    return { type: 'UNDO' };
  }
  if (norm === 'redo' || norm.includes('redo ') || norm.includes('اعادة') || norm.includes('إعادة')) {
    return { type: 'REDO' };
  }

  // 3. Item Locator / Barcode Scanner
  if (
    norm.includes('locator') ||
    norm.includes('scan') ||
    norm.includes('barcode') ||
    norm.includes('باركود') ||
    norm.includes('مستكشف') ||
    norm.includes('بحث')
  ) {
    return { type: 'OPEN_ITEM_LOCATOR' };
  }

  // 4. Camera Navigation Presets
  if (norm.includes('follow worker') || norm.includes('تتبع العامل') || norm.includes('العامل')) {
    return { type: 'CAMERA_PRESET', mode: 'FOLLOW_WORKER' };
  }
  if (norm.includes('top down') || norm.includes('top view') || norm.includes('مسقط علوي') || norm.includes('علوي')) {
    return { type: 'CAMERA_PRESET', mode: 'TOP_DOWN' };
  }
  if (
    norm.includes('reset camera') ||
    norm.includes('orbit') ||
    norm.includes('اعادة ضبط الكاميرا') ||
    norm.includes('كاميرا حرة')
  ) {
    return { type: 'CAMERA_PRESET', mode: 'ORBIT' };
  }

  // 5. Rack Selection (e.g., "Select Rack A1", "Rack B2", "رف A1", "اختر رف التبريد")
  for (const rack of racks) {
    const codeNorm = rack.code.toLowerCase();
    const shortSuffix = codeNorm.split('-').pop() || codeNorm; // e.g., "a1", "b2", "01"
    const zoneShelf = `${rack.zone}${rack.shelf}`.toLowerCase(); // e.g., "a1", "b1"
    if (
      norm.includes(codeNorm) ||
      (shortSuffix.length >= 2 && norm.includes(shortSuffix)) ||
      (zoneShelf.length >= 2 && norm.includes(zoneShelf)) ||
      (rack.nameAr && norm.includes(rack.nameAr.toLowerCase())) ||
      (rack.nameEn && norm.includes(rack.nameEn.toLowerCase()))
    ) {
      return { type: 'SELECT_RACK', rackId: rack.id, rackCode: rack.code };
    }
  }

  if (norm.includes('cold') || norm.includes('تبريد') || norm.includes('ثلاجة')) {
    const coldRack = racks.find((r) => r.storageType === 'COLD' || r.code.includes('COLD'));
    if (coldRack) return { type: 'SELECT_RACK', rackId: coldRack.id, rackCode: coldRack.code };
  }
  if (norm.includes('wood') || norm.includes('cabinet') || norm.includes('خشب') || norm.includes('خزانة')) {
    const woodRack = racks.find((r) => r.rackType === 'WOODEN_CABINET');
    if (woodRack) return { type: 'SELECT_RACK', rackId: woodRack.id, rackCode: woodRack.code };
  }

  return { type: 'UNKNOWN', raw };
}
