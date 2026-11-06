import { describe, expect, it } from 'vitest';
import { createWarehouseRackOverrides, hydrateWarehouseLayoutPlacements } from './warehouse-layout-rack-overrides';

describe('warehouse layout rack overrides', () => {
  it('restores saved coordinates and dimensions by id or code', () => {
    const placements = hydrateWarehouseLayoutPlacements([
      { id: 'loc-1', code: 'RACK-1', name: 'Rack 1', zone: 'C', shelf: '2', levelVal: '04' },
      { id: 'loc-2', code: 'RACK-2', name: 'Rack 2', zone: 'A', shelf: '1', levelVal: '01' },
    ], {
      rackOverrides: {
        'loc-1': { px: 13.4, pz: 6.2, rot: true, w: 3.1, levels: 5 },
        'RACK-2': { px: 3.7, pz: 2.4 },
      },
    });

    expect(placements[0]).toMatchObject({ id: 'loc-1', px: 13.4, pz: 6.2, rot: true, w: 3.1, levels: 5 });
    expect(placements[1]).toMatchObject({ id: 'loc-2', px: 3.7, pz: 2.4 });
  });

  it('gives legacy assigned locations the editor grid position and leaves unassigned rows unplaced', () => {
    const placements = hydrateWarehouseLayoutPlacements([
      { id: 'loc-1', code: 'RACK-C2', name: 'Rack', zone: 'C', shelf: '2' },
      { id: 'loc-2', code: 'RACK-X', name: 'Unplaced', zone: '', shelf: '' },
    ]);

    expect(placements[0]).toMatchObject({ px: 12.6, pz: 5 });
    expect(placements[1]).not.toHaveProperty('px');
    expect(placements[1]).not.toHaveProperty('pz');
  });

  it('serializes saved positions and rack properties by id and code', () => {
    const overrides = createWarehouseRackOverrides([
      {
        id: 'loc-1', code: 'RACK-1', name: 'Rack', zone: 'A', shelf: '1', levelVal: '01',
        px: 4.25, pz: 3.75, rot: true, w: 2.8, d: 1.1, levels: 5,
      },
      { id: 'loc-2', code: 'RACK-2', name: 'Unplaced', zone: '', shelf: '', levelVal: '', px: 1, pz: 1 },
    ]);

    expect(overrides['loc-1']).toMatchObject({ px: 4.25, pz: 3.75, rot: true, w: 2.8, d: 1.1, levels: 5 });
    expect(overrides['RACK-1']).toEqual(overrides['loc-1']);
    expect(overrides).not.toHaveProperty('loc-2');
  });
});
