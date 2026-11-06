import type { WarehouseLayoutPlacement } from './layout-types';

type LocationRow = {
  id: string;
  code: string;
  name: string;
  zone?: string | null;
  shelf?: string | null;
  levelVal?: string | null;
  status?: string;
  storageType?: string;
};

type RackOverrideSource = {
  rackOverrides?: Record<string, Partial<WarehouseLayoutPlacement>>;
} | null | undefined;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Restore persisted rack positions, using the editor's aisle grid for legacy locations. */
export function hydrateWarehouseLayoutPlacements(
  rows: LocationRow[],
  blueprint?: RackOverrideSource,
): WarehouseLayoutPlacement[] {
  return rows.map((row) => {
    const zone = String(row.zone ?? '').trim();
    const shelf = String(row.shelf ?? '').trim();
    const levelVal = String(row.levelVal ?? '').trim() || (zone && shelf ? '01' : '');
    const override = blueprint?.rackOverrides?.[row.id] ?? blueprint?.rackOverrides?.[row.code];
    if (!zone || !shelf) {
      return { ...row, zone, shelf, levelVal };
    }

    const zoneNumber = positiveIndex(zone);
    const shelfNumber = positiveIndex(shelf);
    const px = isFiniteNumber(override?.px)
      ? override.px
      : 2.5 + (zoneNumber - 1) * 4.6 + (shelfNumber % 2 === 0 ? 0.9 : 0);
    const pz = isFiniteNumber(override?.pz)
      ? override.pz
      : 2.2 + (shelfNumber - 1) * 2.8;

    return {
      ...row,
      zone,
      shelf,
      levelVal,
      px,
      pz,
      ...(typeof override?.rot === 'boolean' ? { rot: override.rot } : {}),
      ...copyNumber(override, 'w'),
      ...copyNumber(override, 'd'),
      ...copyNumber(override, 'h'),
      ...copyNumber(override, 'levels'),
      ...copyNumber(override, 'cellsPerLevel'),
      ...(Array.isArray(override?.customCells) ? { customCells: override.customCells } : {}),
    };
  });
}

/** Serialize every placed shelf so geometry survives save, reload, and publication. */
export function createWarehouseRackOverrides(
  placements: WarehouseLayoutPlacement[],
): Record<string, Partial<WarehouseLayoutPlacement>> {
  const entries: Array<[string, Partial<WarehouseLayoutPlacement>]> = [];
  for (const placement of placements) {
    if (!placement.zone || !placement.shelf || !isFiniteNumber(placement.px) || !isFiniteNumber(placement.pz)) continue;
    const override: Partial<WarehouseLayoutPlacement> = {
      px: placement.px,
      pz: placement.pz,
      rot: Boolean(placement.rot),
      ...(isFiniteNumber(placement.w) ? { w: placement.w } : {}),
      ...(isFiniteNumber(placement.d) ? { d: placement.d } : {}),
      ...(isFiniteNumber(placement.h) ? { h: placement.h } : {}),
      ...(isFiniteNumber(placement.levels) ? { levels: placement.levels } : {}),
      ...(isFiniteNumber(placement.cellsPerLevel) ? { cellsPerLevel: placement.cellsPerLevel } : {}),
      ...(Array.isArray(placement.customCells) ? { customCells: placement.customCells } : {}),
    };
    entries.push([placement.id, override], [placement.code, override]);
  }
  return Object.fromEntries(entries);
}

function positiveIndex(value: string): number {
  const numeric = Number.parseInt(value, 10);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const code = value.trim().toUpperCase().charCodeAt(0);
  return code >= 65 && code <= 90 ? code - 64 : 1;
}

function copyNumber(
  override: Partial<WarehouseLayoutPlacement> | undefined,
  key: 'w' | 'd' | 'h' | 'levels' | 'cellsPerLevel',
): Partial<WarehouseLayoutPlacement> {
  const value = override?.[key];
  return isFiniteNumber(value) ? { [key]: value } : {};
}
