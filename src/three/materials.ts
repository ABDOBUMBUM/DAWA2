/**
 * DAWA 3D Warehouse Engine — High-DPI Procedural Textures & PBR Material Cache
 * Generates crisp 1024x1024 industrial concrete, pharma epoxy, marble tiles, wood parquet,
 * insulated wall panels, painted brick, corrugated metal doors, oak/walnut wood grain,
 * sky backdrops, 3D shelf-edge cell plaques, and high-resolution barcode/QR carton labels.
 */

import * as THREE from 'three';
import {
  FloorTexturePreset,
  WallTexturePreset,
  BackgroundPreset,
  RackMaterialFinish,
  MovementCategory,
} from '../types/warehouse';

const textureCache = new Map<string, THREE.CanvasTexture>();

export function getSkyBackdropTexture(
  preset: BackgroundPreset = 'OUTDOOR_HORIZON',
): THREE.CanvasTexture {
  const key = `sky_backdrop_${preset}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);

  if (preset === 'NIGHT_CYBER') {
    grad.addColorStop(0, '#020617');
    grad.addColorStop(0.55, '#0f172a');
    grad.addColorStop(1, '#1e293b');
  } else if (preset === 'SUNSET_GOLDEN') {
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(0.45, '#7c2d12');
    grad.addColorStop(0.8, '#ea580c');
    grad.addColorStop(1, '#fde68a');
  } else if (preset === 'CLEAN_WHITE') {
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#e2e8f0');
  } else if (preset === 'DAYLIGHT_STUDIO') {
    grad.addColorStop(0, '#cbd5e1');
    grad.addColorStop(0.6, '#e2e8f0');
    grad.addColorStop(1, '#f8fafc');
  } else {
    // OUTDOOR_HORIZON
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.52, '#bae6fd');
    grad.addColorStop(0.85, '#e0f2fe');
    grad.addColorStop(1, '#f1f5f9');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}

export function getFloorTexture(
  isDarkTheme = false,
  preset: FloorTexturePreset = 'POLISHED_CONCRETE',
): THREE.CanvasTexture {
  const key = `floor_v2_${preset}_${isDarkTheme ? 'dark' : 'day'}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  if (preset === 'EPOXY_PHARMA') {
    ctx.fillStyle = isDarkTheme ? '#0f293a' : '#e0f2fe';
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      ctx.fillStyle = isDarkTheme
        ? 'rgba(56, 189, 248, 0.05)'
        : 'rgba(14, 165, 233, 0.06)';
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.strokeStyle = isDarkTheme ? 'rgba(56, 189, 248, 0.16)' : 'rgba(2, 132, 199, 0.14)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 1020, 1020);
  } else if (preset === 'MARBLE_TILES') {
    ctx.fillStyle = isDarkTheme ? '#1e293b' : '#f8fafc';
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = isDarkTheme ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.12)';
    ctx.lineWidth = 2;
    for (let v = 0; v < 24; v++) {
      ctx.beginPath();
      let vx = Math.random() * 1024;
      let vy = Math.random() * 1024;
      ctx.moveTo(vx, vy);
      for (let s = 0; s < 6; s++) {
        vx += (Math.random() - 0.4) * 140;
        vy += (Math.random() - 0.4) * 140;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = isDarkTheme ? 'rgba(203, 213, 225, 0.2)' : 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 512, 512);
    ctx.strokeRect(512, 0, 512, 512);
    ctx.strokeRect(0, 512, 512, 512);
    ctx.strokeRect(512, 512, 512, 512);
  } else if (preset === 'DARK_ASPHALT') {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 16000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const shade = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.22)';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.18)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 1020, 1020);
  } else if (preset === 'WOOD_PARQUET') {
    ctx.fillStyle = isDarkTheme ? '#452714' : '#b07d4f';
    ctx.fillRect(0, 0, 1024, 1024);
    const plankH = 128;
    for (let y = 0; y < 1024; y += plankH) {
      ctx.fillStyle = (y / plankH) % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, y, 1024, plankH);
      ctx.strokeStyle = 'rgba(28, 15, 8, 0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, y, 1024, plankH);
    }
  } else {
    ctx.fillStyle = isDarkTheme ? '#1e293b' : '#cbd5e1';
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 12000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const alpha = Math.random() * 0.04;
      ctx.fillStyle =
        Math.random() > 0.5
          ? `rgba(255,255,255,${alpha})`
          : `rgba(15,23,42,${alpha * 1.4})`;
      ctx.fillRect(x, y, 3, 3);
    }

    ctx.strokeStyle = isDarkTheme ? 'rgba(15, 23, 42, 0.65)' : 'rgba(100, 116, 139, 0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 1018, 1018);

    ctx.strokeStyle = isDarkTheme ? 'rgba(148, 163, 184, 0.14)' : 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, 1008, 1008);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  textureCache.set(key, tex);
  return tex;
}

export function getWallTexture(
  isDarkTheme = false,
  preset: WallTexturePreset = 'INSULATED_PANELS',
): THREE.CanvasTexture {
  const key = `wall_v2_${preset}_${isDarkTheme ? 'dark' : 'day'}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (preset === 'PAINTED_BRICK') {
    ctx.fillStyle = isDarkTheme ? '#334155' : '#e2e8f0';
    ctx.fillRect(0, 0, 512, 512);
    const brickH = 32;
    const brickW = 64;
    ctx.strokeStyle = isDarkTheme ? 'rgba(15,23,42,0.55)' : 'rgba(148,163,184,0.6)';
    ctx.lineWidth = 3;
    for (let row = 0; row < 512 / brickH; row++) {
      const y = row * brickH;
      const offset = (row % 2) * (brickW / 2);
      for (let col = -1; col < 512 / brickW + 1; col++) {
        ctx.strokeRect(col * brickW + offset, y, brickW, brickH);
      }
    }
  } else if (preset === 'CLEANROOM_CLADDING') {
    ctx.fillStyle = isDarkTheme ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = isDarkTheme ? 'rgba(56,189,248,0.22)' : 'rgba(14,165,233,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 508, 508);
    ctx.fillStyle = isDarkTheme ? 'rgba(56,189,248,0.06)' : 'rgba(14,165,233,0.05)';
    ctx.fillRect(0, 240, 512, 32);
  } else if (preset === 'CONCRETE_SLAB') {
    ctx.fillStyle = isDarkTheme ? '#1e293b' : '#cbd5e1';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 512, 512);
  } else {
    ctx.fillStyle = isDarkTheme ? '#1e293b' : '#f1f5f9';
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 64) {
      ctx.fillStyle = isDarkTheme ? 'rgba(15, 23, 42, 0.35)' : 'rgba(148, 163, 184, 0.22)';
      ctx.fillRect(x, 0, 4, 512);
      ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(x + 4, 0, 3, 512);
    }
    ctx.strokeStyle = isDarkTheme ? 'rgba(51, 65, 85, 0.7)' : 'rgba(203, 213, 225, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  textureCache.set(key, tex);
  return tex;
}

export function getWoodGrainTexture(variant: 'OAK' | 'WALNUT' = 'OAK'): THREE.CanvasTexture {
  const key = `wood_v2_${variant}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = variant === 'WALNUT' ? '#6b4423' : '#b07d4f';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 260; i++) {
    const y = Math.random() * 512;
    const h = 2 + Math.random() * 8;
    ctx.fillStyle =
      Math.random() > 0.5 ? 'rgba(45, 24, 10, 0.14)' : 'rgba(245, 208, 169, 0.1)';
    ctx.fillRect(0, y, 512, h);
  }

  ctx.strokeStyle = 'rgba(45, 24, 10, 0.28)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(key, tex);
  return tex;
}

export function getCellPlaqueTexture(
  cellCode: string,
  productName = '',
  isEmpty = false,
  isSelected = false,
  movementCategory: MovementCategory = 'AVAILABLE',
): THREE.CanvasTexture {
  const key = `plaque_4k_${cellCode}_${productName.slice(0, 14)}_${isEmpty ? 'e' : 'f'}_${isSelected ? 's' : 'n'}_${movementCategory}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  const bg = isSelected
    ? '#083344'
    : movementCategory === 'EXPIRED'
    ? '#4c0519'
    : movementCategory === 'ORDER_PICK'
    ? '#0c4a6e'
    : movementCategory === 'RETURNED'
    ? '#3b0764'
    : '#0f172a';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 192);

  const borderColor = isSelected
    ? '#22d3ee'
    : movementCategory === 'EXPIRED'
    ? '#f43f5e'
    : movementCategory === 'ORDER_PICK'
    ? '#38bdf8'
    : movementCategory === 'RETURNED'
    ? '#c084fc'
    : isEmpty
    ? '#f59e0b'
    : '#14b8a6';

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 1014, 182);

  // Left code badge
  ctx.fillStyle = borderColor;
  ctx.fillRect(12, 12, 336, 168);

  ctx.fillStyle = '#020617';
  ctx.font = '900 68px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(cellCode.slice(0, 8), 180, 120);

  // Right product name
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'right';
  const title = isEmpty ? 'خانة فارغة' : (productName || 'صنف دوائي').slice(0, 22);
  ctx.fillText(title, 984, 120);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  textureCache.set(key, tex);
  return tex;
}

export function getCartonBoxTexture(
  colorHex = '#d97706',
  labelCode = 'A-01',
  productName = '',
  extraMeta?: {
    barcode?: string;
    batchNumber?: string;
    expiryDate?: string;
    movementCategory?: MovementCategory;
    isSelected?: boolean;
    fefoTier?: 'EXPIRED' | 'CRITICAL_30D' | 'WARNING_90D' | 'SAFE';
    fefoDaysText?: string;
  },
): THREE.CanvasTexture {
  const cat = extraMeta?.movementCategory || 'AVAILABLE';
  const bcode = extraMeta?.barcode || '6281000101';
  const isSelected = Boolean(extraMeta?.isSelected);
  const fefoTier = extraMeta?.fefoTier || '';
  const key = `carton_box_4k_${colorHex}_${labelCode}_${productName.slice(0, 16)}_${cat}_${bcode}_${isSelected ? 's' : 'n'}_${fefoTier}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base cardboard color (4K corrugated kraft texture)
  ctx.fillStyle = isSelected ? '#fef3c7' : fefoTier === 'EXPIRED' ? '#ffe4e6' : '#d6a874';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle corrugated cardboard grain lines
  ctx.fillStyle = 'rgba(120, 75, 30, 0.08)';
  for (let y = 0; y < 1024; y += 8) {
    ctx.fillRect(0, y, 1024, 3);
  }

  // Packing tape
  ctx.fillStyle = 'rgba(180, 130, 75, 0.55)';
  ctx.fillRect(0, 40, 1024, 52);
  ctx.fillRect(472, 0, 80, 1024);

  // White pharmaceutical label
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(48, 128, 928, 784);

  const headerColor =
    fefoTier === 'EXPIRED' || cat === 'EXPIRED'
      ? '#e11d48'
      : fefoTier === 'CRITICAL_30D'
      ? '#ea580c'
      : fefoTier === 'WARNING_90D'
      ? '#d97706'
      : cat === 'ORDER_PICK'
      ? '#0284c7'
      : cat === 'RETURNED'
      ? '#9333ea'
      : colorHex;

  ctx.fillStyle = headerColor;
  ctx.fillRect(48, 128, 928, 128);

  const catLabel = extraMeta?.fefoDaysText
    ? `FEFO RADAR • ${extraMeta.fefoDaysText}`
    : cat === 'EXPIRED'
    ? 'EXPIRED • منتهي الصلاحية'
    : cat === 'ORDER_PICK'
    ? 'ORDER PICK • طلبية جارية'
    : cat === 'RETURNED'
    ? 'RETURN • مرتجع دوائي'
    : 'DAWA PHARMA 4K • معتمد';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(catLabel, 80, 212);

  // Cell Code
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 104px monospace';
  ctx.fillText(labelCode.slice(0, 10), 80, 376);

  // Product Name
  if (productName) {
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText(productName.slice(0, 24), 80, 464);
  }

  // Batch & Expiry
  ctx.fillStyle = fefoTier === 'EXPIRED' || cat === 'EXPIRED' ? '#be123c' : '#334155';
  ctx.font = 'bold 40px monospace';
  ctx.fillText(
    `LOT:${(extraMeta?.batchNumber || 'BCH-2026').slice(0, 12)} EXP:${extraMeta?.expiryDate || '2027-12'}`,
    80,
    544,
  );

  // Barcode bars + numeric GTIN/EAN (4K ultra-sharp bars)
  ctx.fillStyle = '#0f172a';
  let bx = 80;
  for (let i = 0; i < bcode.length * 3; i++) {
    const c = bcode.charCodeAt(i % bcode.length) + i;
    const w = (c % 3) * 6 + 6;
    ctx.fillRect(bx, 596, w, 164);
    bx += w + ((c % 2) * 6 + 6);
    if (bx > 730) break;
  }
  ctx.font = 'bold 44px monospace';
  ctx.fillText(bcode, 104, 824);

  // QR matrix
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(776, 596, 164, 164);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(796, 616, 48, 48);
  ctx.fillRect(872, 692, 48, 48);
  ctx.fillStyle = headerColor;
  ctx.fillRect(808, 628, 24, 24);

  if (isSelected || fefoTier === 'EXPIRED' || fefoTier === 'CRITICAL_30D') {
    ctx.strokeStyle = isSelected ? '#06b6d4' : headerColor;
    ctx.lineWidth = 28;
    ctx.strokeRect(16, 16, 992, 992);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  textureCache.set(key, tex);
  return tex;
}

export const getCartonTexture = getCartonBoxTexture;

export function createHazardStripeTexture(): THREE.CanvasTexture {
  const key = 'hazard_stripes_v2';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#0f172a';
  for (let i = -256; i < 512; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 24, 0);
    ctx.lineTo(i + 280, 256);
    ctx.lineTo(i + 256, 256);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}

export class WarehouseMaterials {
  public floorMat: THREE.MeshPhysicalMaterial;
  public asphaltMat: THREE.MeshStandardMaterial;
  public wallMat: THREE.MeshStandardMaterial;
  public pillarMat: THREE.MeshStandardMaterial;
  public glassMat: THREE.MeshPhysicalMaterial;
  public postMat: THREE.MeshStandardMaterial;
  public beamMat: THREE.MeshStandardMaterial;
  public coldPostMat: THREE.MeshStandardMaterial;
  public coldBeamMat: THREE.MeshStandardMaterial;
  public palletMat: THREE.MeshStandardMaterial;
  public woodCabinetMat: THREE.MeshStandardMaterial;
  public woodDividerMat: THREE.MeshStandardMaterial;
  public forkliftYellowMat: THREE.MeshStandardMaterial;
  public steelMastMat: THREE.MeshStandardMaterial;
  public tireMat: THREE.MeshStandardMaterial;
  public trussMat: THREE.MeshStandardMaterial;
  public lampHousingMat: THREE.MeshStandardMaterial;
  public lampBulbMat: THREE.MeshBasicMaterial;
  public laneMarkingMat: THREE.MeshBasicMaterial;
  public hazardMat: THREE.MeshStandardMaterial;
  public selectHaloMat: THREE.MeshBasicMaterial;
  public workerSuitMat: THREE.MeshStandardMaterial;
  public workerVestMat: THREE.MeshStandardMaterial;
  public workerHelmetMat: THREE.MeshStandardMaterial;
  public workerSkinMat: THREE.MeshStandardMaterial;
  public laserBeamMat: THREE.MeshBasicMaterial;
  private currentReflectivity = 0.85;

  constructor(isDark = false) {
    this.floorMat = new THREE.MeshPhysicalMaterial({
      map: getFloorTexture(isDark, 'POLISHED_CONCRETE'),
      roughness: 0.2,
      metalness: 0.12,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      reflectivity: 0.85,
      envMapIntensity: 1.35,
    });

    this.asphaltMat = new THREE.MeshStandardMaterial({
      map: getFloorTexture(true, 'DARK_ASPHALT'),
      roughness: 0.85,
      metalness: 0.05,
    });

    this.wallMat = new THREE.MeshStandardMaterial({
      map: getWallTexture(isDark, 'INSULATED_PANELS'),
      roughness: 0.48,
      metalness: 0.18,
      envMapIntensity: 1.1,
    });

    this.pillarMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x334155 : 0x94a3b8,
      roughness: 0.45,
      metalness: 0.28,
    });

    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.38,
      roughness: 0.05,
      metalness: 0.15,
      transmission: 0.45,
      clearcoat: 1.0,
    });

    this.postMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.28,
      metalness: 0.72,
    });

    this.beamMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.3,
      metalness: 0.62,
    });

    this.coldPostMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.25,
      metalness: 0.76,
    });

    this.coldBeamMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.28,
      metalness: 0.68,
    });

    this.palletMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.8,
      metalness: 0.05,
    });

    this.woodCabinetMat = new THREE.MeshStandardMaterial({
      map: getWoodGrainTexture('OAK'),
      color: 0xd4a373,
      roughness: 0.42,
      metalness: 0.08,
    });

    this.woodDividerMat = new THREE.MeshStandardMaterial({
      map: getWoodGrainTexture('WALNUT'),
      color: 0x8b5a2b,
      roughness: 0.48,
      metalness: 0.06,
    });

    this.forkliftYellowMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.28,
      metalness: 0.5,
    });

    this.steelMastMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.3,
      metalness: 0.8,
    });

    this.tireMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1,
    });

    this.trussMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x334155 : 0x64748b,
      roughness: 0.4,
      metalness: 0.75,
    });

    this.lampHousingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.7,
    });

    this.lampBulbMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });

    this.laneMarkingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
    });

    this.hazardMat = new THREE.MeshStandardMaterial({
      map: createHazardStripeTexture(),
      roughness: 0.45,
      metalness: 0.25,
    });

    this.selectHaloMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });

    this.workerSuitMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
    });

    this.workerVestMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      roughness: 0.45,
    });

    this.workerHelmetMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.25,
      metalness: 0.15,
    });

    this.workerSkinMat = new THREE.MeshStandardMaterial({
      color: 0xe0ac69,
      roughness: 0.6,
    });

    this.laserBeamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.8,
    });
  }

  public updateTheme(isDark: boolean) {
    this.floorMat.map = getFloorTexture(isDark, 'POLISHED_CONCRETE');
    this.floorMat.needsUpdate = true;
    this.wallMat.map = getWallTexture(isDark, 'INSULATED_PANELS');
    this.wallMat.needsUpdate = true;
    this.pillarMat.color.setHex(isDark ? 0x334155 : 0x94a3b8);
    this.trussMat.color.setHex(isDark ? 0x334155 : 0x64748b);
  }

  public applyGraphicsQuality(floorReflectivity: number, anisotropy: number) {
    this.currentReflectivity = Math.max(0, Math.min(1, floorReflectivity));
    this.floorMat.clearcoat = this.currentReflectivity;
    this.floorMat.reflectivity = this.currentReflectivity;
    this.floorMat.roughness = Math.max(0.08, 0.48 - this.currentReflectivity * 0.36);
    this.floorMat.envMapIntensity = 0.6 + this.currentReflectivity * 1.1;
    if (this.floorMat.map) {
      this.floorMat.map.anisotropy = anisotropy;
      this.floorMat.map.needsUpdate = true;
    }
    this.floorMat.needsUpdate = true;
  }

  public applyEnvironmentPresets(
    floorPreset: FloorTexturePreset,
    wallPreset: WallTexturePreset,
    isDark: boolean,
    wallColor?: string,
    floorColor?: string,
  ) {
    this.floorMat.map = getFloorTexture(isDark, floorPreset);
    this.floorMat.color.set(floorColor || '#ffffff');
    const baseRough = floorPreset === 'EPOXY_PHARMA' || floorPreset === 'MARBLE_TILES' ? 0.12 : 0.24;
    this.floorMat.roughness = Math.max(0.06, baseRough * (1.2 - this.currentReflectivity * 0.6));
    this.floorMat.clearcoat = this.currentReflectivity;
    this.floorMat.needsUpdate = true;

    this.wallMat.map = getWallTexture(isDark, wallPreset);
    this.wallMat.color.set(wallColor || '#ffffff');
    this.wallMat.needsUpdate = true;
  }

  public getRackMaterialByFinish(
    finish: RackMaterialFinish,
    customColor?: string,
  ): THREE.MeshStandardMaterial {
    if (finish === 'WALNUT_WOOD') {
      return new THREE.MeshStandardMaterial({
        map: getWoodGrainTexture('WALNUT'),
        color: customColor || 0x8b5a2b,
        roughness: 0.48,
        metalness: 0.08,
      });
    }
    if (finish === 'OAK_WOOD') {
      return new THREE.MeshStandardMaterial({
        map: getWoodGrainTexture('OAK'),
        color: customColor || 0xd4a373,
        roughness: 0.5,
        metalness: 0.06,
      });
    }
    if (finish === 'BRUSHED_STAINLESS') {
      return new THREE.MeshStandardMaterial({
        color: customColor || 0xe2e8f0,
        roughness: 0.22,
        metalness: 0.85,
      });
    }
    if (finish === 'GALVANIZED') {
      return new THREE.MeshStandardMaterial({
        color: customColor || 0x94a3b8,
        roughness: 0.35,
        metalness: 0.72,
      });
    }
    if (finish === 'PHARMA_WHITE') {
      return new THREE.MeshStandardMaterial({
        color: customColor || 0xf8fafc,
        roughness: 0.24,
        metalness: 0.15,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: customColor || 0x1d4ed8,
      roughness: 0.32,
      metalness: 0.68,
    });
  }
}
