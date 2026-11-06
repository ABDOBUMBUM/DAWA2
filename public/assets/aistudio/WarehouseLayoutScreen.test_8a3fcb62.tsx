// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { api } from '../../../../lib/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WarehouseLayoutScreen from './WarehouseLayoutScreen';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../../lib/api-client', () => ({
  api: {
    getWarehouses: vi.fn(async () => [{ id: 'wh1', name: 'المستودع الرئيسي', code: 'MAIN', type: 'MAIN', isActive: true }]),
    getWarehouseLocations: vi.fn(async () => [
      { id: 'l1', code: 'MAIN-01-01', name: 'رف أول', zone: '01', shelf: '01', levelVal: '01', status: 'APPROVED', storageType: 'SHELF' },
      { id: 'l2', code: 'MAIN-UNPLACED', name: 'خانة جديدة', zone: '', shelf: '', levelVal: '', status: 'APPROVED', storageType: 'SHELF' },
    ]),
    saveWarehouseLayout: vi.fn((warehouseId: string, placements: Array<{ id: string; zone: string; shelf: string; levelVal: string }>) => Promise.resolve({ updated: 1 })),
    getWarehouseBlueprint: vi.fn(async () => null),
    deleteWarehouseLocation: vi.fn(async () => ({ success: true })),
    getWarehouseLayoutHistory: vi.fn(async () => []),
    getArrangementTasks: vi.fn(async () => []),
    createArrangementTask: vi.fn(async () => ({ id: 'task-1' })),
    updateArrangementTaskStatus: vi.fn(async () => ({ id: 'task-1' })),
    uploadArrangementTaskPhoto: vi.fn(async () => ({ id: 'photo-1' })),
    getArrangementTaskPhoto: vi.fn(async () => ({ id: 'photo-1', dataUrl: '', mimeType: 'image/jpeg', sizeBytes: 0, createdAt: '', takenBy: '' })),
    getUsers: vi.fn(async () => ({ data: [], total: 0, page: 1, pages: 1 })),
  },
}));

vi.mock('../../../../lib/api-helpers', () => ({
  extractArabicError: (_e: unknown, fallback: string) => fallback,
}));

describe('WarehouseLayoutScreen — مصمم التخطيط ثلاثي الأبعاد', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.mocked(api).saveWarehouseLayout.mockClear();
  });

  it('renders the designer and lists unplaced cells in the tray', async () => {
    render(<WarehouseLayoutScreen />);
    expect(screen.getByText('مصمم تخطيط المستودع ثلاثي الأبعاد')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());
    // الموقع المثبت مسبقاً يظهر في خانته على المستوى 01
    await waitFor(() => expect(screen.getByTestId('layout-cell-chip-l1')).toBeTruthy());
  });

  it('assigns an unplaced cell to a grid slot via drag-and-drop', async () => {
    render(<WarehouseLayoutScreen />);
    const chip = await waitFor(() => screen.getByTestId('layout-tray-chip-l2'));
    fireEvent.dragStart(chip, { dataTransfer: { setData: vi.fn() } });
    const cell = screen.getByTestId('layout-cell-1-1');
    fireEvent.drop(cell, { dataTransfer: { getData: () => 'l2' } });
    await waitFor(() => expect(screen.getByTestId('layout-cell-chip-l2')).toBeTruthy());
    // تغيّر واحد بَان في العدّاد وزر الحفظ تفعّل
    expect(screen.getByTestId('layout-save-btn').textContent).toContain('(1)');
  });

  it('saves the changed placement through the layout API', async () => {
    render(<WarehouseLayoutScreen />);
    const chip = await waitFor(() => screen.getByTestId('layout-tray-chip-l2'));
    fireEvent.dragStart(chip, { dataTransfer: { setData: vi.fn() } });
    fireEvent.drop(screen.getByTestId('layout-cell-2-2'), { dataTransfer: { getData: () => 'l2' } });
    fireEvent.click(screen.getByTestId('layout-save-btn'));
    await waitFor(() =>
      expect(vi.mocked(api).saveWarehouseLayout).toHaveBeenCalledWith(
        'wh1',
        [expect.objectContaining({ id: 'l2', zone: '03', shelf: '03', levelVal: '01' })],
        expect.anything(),
      ),
    );
    await waitFor(() => expect(screen.getByTestId('layout-flash').textContent).toContain('تم حفظ ومزامنة التخطيط'));
  });

  it('persists moved rack coordinates in a draft blueprint and enables save after a position-only edit', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-move-x-plus')).toBeTruthy());

    fireEvent.click(screen.getByTestId('layout-move-x-plus'));
    expect((screen.getByTestId('layout-save-btn') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId('layout-save-btn'));

    await waitFor(() => expect(vi.mocked(api).saveWarehouseLayout).toHaveBeenCalled());
    const [, placements, blueprint] = vi.mocked(api).saveWarehouseLayout.mock.calls.at(-1)!;
    expect(placements).toEqual([expect.objectContaining({ id: 'l1', zone: '01', shelf: '01' })]);
    expect(blueprint).toMatchObject({
      status: 'DRAFT',
      rackOverrides: {
        l1: { px: 3, pz: 2.2 },
        'MAIN-01-01': { px: 3, pz: 2.2 },
      },
    });
  });

  it('stamps the selected level onto dropped cells', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => screen.getByTestId('layout-tray-chip-l2'));
    const levelPicker = screen.getByTestId('layout-level-picker');
    fireEvent.click(within(levelPicker).getByText('02'));
    const chip = screen.getByTestId('layout-tray-chip-l2');
    fireEvent.dragStart(chip, { dataTransfer: { setData: vi.fn() } });
    fireEvent.drop(screen.getByTestId('layout-cell-0-1'), { dataTransfer: { getData: () => 'l2' } });
    fireEvent.click(screen.getByTestId('layout-save-btn'));
    await waitFor(() =>
      expect(vi.mocked(api).saveWarehouseLayout).toHaveBeenCalledWith(
        'wh1',
        [expect.objectContaining({ id: 'l2', zone: '01', shelf: '02', levelVal: '02' })],
        expect.anything(),
      ),
    );
  });

  it('adds a new shelf via the Add Shelf modal', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());

    fireEvent.click(screen.getByTestId('layout-add-rack-btn'));
    expect(screen.getByTestId('layout-add-modal')).toBeTruthy();

    const codeInput = screen.getByTestId('add-rack-code');
    fireEvent.change(codeInput, { target: { value: 'MAIN-B1' } });
    const nameInput = screen.getByTestId('add-rack-name');
    fireEvent.change(nameInput, { target: { value: 'رف تجريبي B-1' } });
    const zoneInput = screen.getByTestId('add-rack-zone');
    fireEvent.change(zoneInput, { target: { value: 'B' } });
    const shelfInput = screen.getByTestId('add-rack-shelf');
    fireEvent.change(shelfInput, { target: { value: '1' } });

    fireEvent.click(screen.getByTestId('add-rack-confirm-btn'));

    await waitFor(() => expect(screen.queryByTestId('layout-add-modal')).toBeNull());
    expect(screen.getByTestId('layout-flash').textContent).toContain('تمت إضافة الرف MAIN-B1 بنجاح');
    // الزر الخاص بالحفظ يوضح زيادة عدد التغييرات
    expect(screen.getByTestId('layout-save-btn').textContent).toMatch(/\([1-9]\d*\)/);
  });

  it('edits a shelf via the Edit Shelf modal', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('layout-edit-rack-btn')).toBeTruthy());

    fireEvent.click(screen.getByTestId('layout-edit-rack-btn'));
    expect(screen.getByTestId('layout-edit-modal')).toBeTruthy();

    const codeInput = screen.getByTestId('edit-rack-code');
    fireEvent.change(codeInput, { target: { value: 'MAIN-01-MODIFIED' } });
    const zoneInput = screen.getByTestId('edit-rack-zone');
    fireEvent.change(zoneInput, { target: { value: 'C' } });

    fireEvent.click(screen.getByTestId('edit-rack-confirm-btn'));

    await waitFor(() => expect(screen.queryByTestId('layout-edit-modal')).toBeNull());
    expect(screen.getByTestId('layout-flash').textContent).toContain('تم تحديث بيانات الرف MAIN-01-MODIFIED');
  });

  it('moves a shelf using nudge and aisle/shelf controls', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('layout-move-x-plus')).toBeTruthy());

    // النقر على إزاحة X+ و Z+
    fireEvent.click(screen.getByTestId('layout-move-x-plus'));
    fireEvent.click(screen.getByTestId('layout-move-z-plus'));

    // النقر على الممر التالي
    fireEvent.click(screen.getByTestId('layout-next-zone-btn'));
    // النقر على الرف التالي
    fireEvent.click(screen.getByTestId('layout-next-shelf-btn'));

    // التدوير
    fireEvent.click(screen.getByTestId('layout-rotate-rack-btn'));

    // زر الحفظ يوثق وجود تعديلات
    expect(screen.getByTestId('layout-save-btn').textContent).toMatch(/\([1-9]\d*\)/);
  });

  it('unassigns a shelf to the unplaced tray and allows deleting it', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('layout-unassign-rack-btn')).toBeTruthy());

    // إلغاء التثبيت ينقل الرف إلى صينية الانتظار
    fireEvent.click(screen.getByTestId('layout-unassign-rack-btn'));
    await waitFor(() => expect(screen.getByTestId('layout-flash').textContent).toContain('تم إلغاء تثبيت الرف'));

    // اختيار الخانة غير المثبتة لعرضها وحذفها
    const unplacedChip = screen.getByTestId('layout-tray-chip-l1');
    fireEvent.click(unplacedChip);

    // حذف نهائي من خلال نافذة الحذف
    await waitFor(() => expect(screen.getByTestId('layout-delete-rack-btn')).toBeTruthy());
    fireEvent.click(screen.getByTestId('layout-delete-rack-btn'));
    expect(screen.getByTestId('layout-delete-modal')).toBeTruthy();
    fireEvent.click(screen.getByTestId('delete-rack-permanent-btn'));
    await waitFor(() => expect(screen.queryByTestId('layout-delete-modal')).toBeNull());
    expect(screen.getByTestId('layout-flash').textContent).toContain('تم حذف الرف');
  });

  it('executes auto-numbering and layout validation smoothly', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('layout-autorenumber-btn')).toBeTruthy());

    fireEvent.click(screen.getByTestId('layout-autorenumber-btn'));
    await waitFor(() => expect(screen.getByTestId('layout-flash').textContent).toContain('تم إعادة ترقيم'));

    fireEvent.click(screen.getByTestId('layout-validate-btn'));
    await waitFor(() => expect(screen.getByTestId('layout-flash').textContent).toContain('المخطط سليم'));
  });

  it('adds architectural elements (doors, windows, walls, pillars, zones) via AddElementModal', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());

    fireEvent.click(screen.getByTestId('layout-add-element-btn'));
    expect(screen.getByTestId('layout-add-element-modal')).toBeTruthy();

    const labelInput = screen.getByTestId('add-element-label');
    fireEvent.change(labelInput, { target: { value: 'بوابة شحن طوارئ' } });

    fireEvent.click(screen.getByTestId('add-element-confirm-btn'));
    await waitFor(() => expect(screen.queryByTestId('layout-add-element-modal')).toBeNull());
    expect(screen.getByTestId('layout-flash').textContent).toContain('تمت إضافة العنصر المعماري');
    expect(screen.getByTestId('layout-save-btn').textContent).toMatch(/\([1-9]\d*\)/);
  });

  it('expands warehouse dimensions in meters via ExpandDimensionsModal', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());

    fireEvent.click(screen.getByTestId('layout-expand-btn'));
    expect(screen.getByTestId('layout-expand-dimensions-modal')).toBeTruthy();

    const widthSlider = screen.getByTestId('expand-width-slider');
    fireEvent.change(widthSlider, { target: { value: '32' } });

    const depthSlider = screen.getByTestId('expand-depth-slider');
    fireEvent.change(depthSlider, { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('expand-confirm-btn'));
    await waitFor(() => expect(screen.queryByTestId('layout-expand-dimensions-modal')).toBeNull());
    expect(screen.getByTestId('layout-flash').textContent).toContain('تم تحديث أبعاد المستودع إلى 32م عرض × 20م عمق');
    expect(screen.getByTestId('layout-save-btn').textContent).toMatch(/\([1-9]\d*\)/);
  });

  it('configures multi-tier bins and cell subdivisions via RackCellsModal', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('layout-cells-btn')).toBeTruthy());

    fireEvent.click(screen.getByTestId('layout-cells-btn'));
    expect(screen.getByTestId('layout-rack-cells-modal')).toBeTruthy();

    const levelsInput = screen.getByTestId('rack-levels-input');
    fireEvent.change(levelsInput, { target: { value: '5' } });

    const cellsInput = screen.getByTestId('rack-cells-per-level-input');
    fireEvent.change(cellsInput, { target: { value: '4' } });

    fireEvent.click(screen.getByTestId('rack-cells-confirm-btn'));
    await waitFor(() => expect(screen.queryByTestId('layout-rack-cells-modal')).toBeNull());
    expect(screen.getByTestId('layout-flash').textContent).toContain('تم تحديث مستويات وخانات الرف');
  });

  it('toggles package journey simulation mode', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());

    const simBtn = screen.getByTestId('layout-sim-btn');
    expect(simBtn.textContent).toContain('محاكاة رحلة الطرد');

    fireEvent.click(simBtn);
    expect(simBtn.textContent).toContain('إيقاف');

    fireEvent.click(simBtn);
    expect(simBtn.textContent).toContain('محاكاة رحلة الطرد');
  });

  it('configures and publishes blueprint with staff visibility restrictions via StaffVisibilityPublishModal', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());

    fireEvent.click(screen.getByTestId('layout-publish-btn'));
    expect(screen.getByTestId('layout-publish-modal')).toBeTruthy();

    const allStaffCheck = screen.getByTestId('visibility-all-checkbox');
    // إلغاء الرؤية للجميع لتحديد موظفين معينين
    fireEvent.click(allStaffCheck);

    const notesInput = screen.getByTestId('publish-notes-input');
    fireEvent.change(notesInput, { target: { value: 'اعتماد المخطط المعماري بعد إضافة رصيف الشحن' } });

    fireEvent.click(screen.getByTestId('publish-confirm-btn'));
    await waitFor(() => expect(screen.queryByTestId('layout-publish-modal')).toBeNull());
    expect(screen.getByTestId('layout-flash').textContent).toContain('تم حفظ ومزامنة التخطيط بنجاح');
    const [, , blueprint] = vi.mocked(api).saveWarehouseLayout.mock.calls.at(-1)!;
    expect(blueprint).toMatchObject({
      status: 'PUBLISHED',
      rackOverrides: { l1: { px: 2.5, pz: 2.2 } },
    });
  });

  it('supports bilingual naming (Arabic & English) when adding and editing racks', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-tray-chip-l2')).toBeTruthy());

    // إضافة رف بتسمية ثنائية اللغة
    fireEvent.click(screen.getByTestId('layout-add-rack-btn'));
    fireEvent.change(screen.getByTestId('add-rack-code'), { target: { value: 'WH-MAIN-BIL' } });
    fireEvent.change(screen.getByTestId('add-rack-name-ar'), { target: { value: 'رف المضادات الحيوية' } });
    fireEvent.change(screen.getByTestId('add-rack-name-en'), { target: { value: 'Antibiotics Rack' } });
    fireEvent.click(screen.getByTestId('add-rack-confirm-btn'));

    await waitFor(() => expect(screen.queryByTestId('layout-add-modal')).toBeNull());
    expect(screen.getByTestId('layout-flash').textContent).toContain('تمت إضافة الرف WH-MAIN-BIL');

    // تعديل الرف بتسمية ثنائية اللغة
    fireEvent.click(screen.getByTestId('layout-edit-rack-btn'));
    expect(screen.getByTestId('layout-edit-modal')).toBeTruthy();
    expect(screen.getByTestId('edit-rack-name-ar')).toBeTruthy();
    expect(screen.getByTestId('edit-rack-name-en')).toBeTruthy();

    fireEvent.change(screen.getByTestId('edit-rack-name-ar'), { target: { value: 'رف أدوية التخدير' } });
    fireEvent.change(screen.getByTestId('edit-rack-name-en'), { target: { value: 'Anesthesia Storage' } });
    fireEvent.click(screen.getByTestId('edit-rack-confirm-btn'));

    await waitFor(() => expect(screen.queryByTestId('layout-edit-modal')).toBeNull());
    expect(screen.getByTestId('layout-flash').textContent).toContain('تم تحديث بيانات الرف');
  });

  it('renders HioBuy live overview HUDs, fulfillment journey HUD, and playback speed controls', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('interior-overview-card')).toBeTruthy());

    // التحقق من بطاقة النظرة الشاملة الداخلية والمحطات الست
    expect(screen.getByTestId('interior-overview-card')).toBeTruthy();
    expect(screen.getByTestId('layout-follow-pkg-btn')).toBeTruthy();

    // تشغيل محاكاة رحلة الطرد عبر زر HioBuy
    fireEvent.click(screen.getByTestId('layout-follow-pkg-btn'));
    expect(screen.getByTestId('layout-follow-pkg-btn').textContent).toContain('إيقاف');

    // سرعات التشغيل 1x, 2x, 4x, 8x
    const speedBtns = screen.getAllByTestId('layout-sim-speed-btn');
    expect(speedBtns.length).toBe(4);
    fireEvent.click(speedBtns[1]); // 2x

    // زر إعادة ضبط المنظر
    fireEvent.click(screen.getByTestId('layout-reset-view-btn'));
  });

  it('toggles Ashraf touch mode and activates touch-first workflow', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-touch-mode-btn')).toBeTruthy());

    const touchBtn = screen.getByTestId('layout-touch-mode-btn');
    expect(touchBtn.textContent).toContain('وضع لمس المشرف أشرف');

    fireEvent.click(touchBtn);
    expect(touchBtn.textContent).toContain('نشط');
    expect(screen.getByTestId('layout-flash').textContent).toContain('تم تفعيل وضع لمس المشرف أشرف');

    fireEvent.click(touchBtn);
    expect(screen.getByTestId('layout-flash').textContent).toContain('تم العودة لوضع الفأرة المكتبي');
  });

  it('opens DesktopContextMenu on right-click on the canvas', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('warehouse-3d-canvas')).toBeTruthy());

    const canvas = screen.getByTestId('warehouse-3d-canvas');
    fireEvent.contextMenu(canvas, { clientX: 300, clientY: 200 });

    await waitFor(() => expect(screen.getByTestId('desktop-context-menu')).toBeTruthy());
    expect(screen.getByTestId('ctx-add-rack-here')).toBeTruthy();
  });

  it('toggles canvas theme between DAYLIGHT and DARK CAD', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-theme-toggle-btn')).toBeTruthy());

    const themeBtn = screen.getByTestId('layout-theme-toggle-btn');
    expect(themeBtn.textContent).toContain('نهاري واقعي');

    fireEvent.click(themeBtn);
    expect(themeBtn.textContent).toContain('ليلي CAD');

    fireEvent.click(themeBtn);
    expect(themeBtn.textContent).toContain('نهاري واقعي');
  });

  it('opens and closes KeyboardShortcutsModal via toolbar button and Escape key', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-shortcuts-help-btn')).toBeTruthy());

    // فتح الدليل عبر زر شريط الأدوات
    fireEvent.click(screen.getByTestId('layout-shortcuts-help-btn'));
    await waitFor(() => expect(screen.getByTestId('layout-shortcuts-modal')).toBeTruthy());
    expect(screen.getByText(/دليل التحكم الشامل — لوحة المفاتيح والفأرة/)).toBeTruthy();

    // إغلاق عبر زر الإغلاق
    fireEvent.click(screen.getByTestId('shortcuts-modal-close-btn'));
    expect(screen.queryByTestId('layout-shortcuts-modal')).toBeNull();

    // فتح عبر مفتاح ? في الكيبورد
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByTestId('layout-shortcuts-modal')).toBeTruthy();

    // إغلاق عبر Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('layout-shortcuts-modal')).toBeNull();
  });

  it('controls rack dimensions and cells via mouse steppers and buttons', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-rack-w-plus')).toBeTruthy());

    // تكبير وتصغير العرض W
    fireEvent.click(screen.getByTestId('layout-rack-w-plus'));
    fireEvent.click(screen.getByTestId('layout-rack-w-minus'));

    // تعديل العمق D
    fireEvent.click(screen.getByTestId('layout-rack-d-plus'));
    fireEvent.click(screen.getByTestId('layout-rack-d-minus'));

    // تعديل عدد المستويات Levels
    fireEvent.click(screen.getByTestId('layout-rack-levels-plus'));
    fireEvent.click(screen.getByTestId('layout-rack-levels-minus'));

    // فتح نافذة إدارة الخانات المخصصة
    fireEvent.click(screen.getByTestId('layout-open-cells-btn'));
    await waitFor(() => expect(screen.getByTestId('layout-rack-cells-modal')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
  });

  it('controls rack movement, rotation, and dimensions via keyboard shortcuts', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-rotate-rack-btn')).toBeTruthy());

    // تدوير بالـ R
    fireEvent.keyDown(window, { key: 'r' });

    // تحريك بالأسهم
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });

    // تغيير العرض بالـ [ و ]
    fireEvent.keyDown(window, { key: ']' });
    fireEvent.keyDown(window, { key: '[' });

    // تغيير العمق بالـ { و }
    fireEvent.keyDown(window, { key: '}' });
    fireEvent.keyDown(window, { key: '{' });

    // تغيير المستويات بالـ + و -
    fireEvent.keyDown(window, { key: '+' });
    fireEvent.keyDown(window, { key: '-' });

    // تكرار بالـ Ctrl+D
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });

    // مسطرة المسافة لتشغيل المحاكاة
    fireEvent.keyDown(window, { code: 'Space' });
  });

  it('enforces view-only exploration mode for Mohammed, Marie, Faisal, and Al-Awami', async () => {
    render(<WarehouseLayoutScreen />);
    await waitFor(() => expect(screen.getByTestId('layout-role-switcher-btn')).toBeTruthy());

    // التبديل إلى وضع محمد ومرعي (استكشاف فقط)
    fireEvent.click(screen.getByTestId('layout-role-switcher-btn'));

    // اختفاء أزرار التعديل والتصميم الإنشائي
    expect(screen.queryByTestId('layout-add-rack-btn')).toBeNull();
    expect(screen.queryByTestId('layout-add-element-btn')).toBeNull();
    expect(screen.queryByTestId('layout-expand-btn')).toBeNull();
    expect(screen.queryByTestId('layout-publish-btn')).toBeNull();

    // ظهور شارة المستكشف وشريط البحث السريع عن الأدوية
    expect(screen.getByTestId('picker-view-only-badge')).toBeTruthy();
    const searchInput = screen.getByTestId('layout-medicine-finder-input');
    expect(searchInput).toBeTruthy();

    // البحث عن دواء (بانادول) واستكشاف موقعه
    fireEvent.change(searchInput, { target: { value: 'بانادول' } });
    await waitFor(() => expect(screen.getByTestId('medicine-discovery-banner')).toBeTruthy());
    expect(screen.getByTestId('medicine-discovery-banner').textContent).toContain('بانادول');

    // لوحة الرف تعرض شارة استكشاف فقط وزر رسم مسار السحب
    expect(screen.getByTestId('picker-rack-readonly-tag')).toBeTruthy();
    expect(screen.getByTestId('picker-rack-info-badge')).toBeTruthy();
    expect(screen.getByTestId('layout-route-to-rack-btn')).toBeTruthy();

    // النقر على رسم مسار السحب إلى الرف
    fireEvent.click(screen.getByTestId('layout-route-to-rack-btn'));
    await waitFor(() => expect(screen.getByTestId('layout-flash').textContent).toContain('مسار'));

    // محاولة الحذف بالكي بورد تمنع وتظهر تنبيه الصلاحية
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(screen.getByTestId('layout-flash').textContent).toContain('خاصية تعديل وإعادة تشكيل الرفوف مخصصة لمشرف التخطيط أشرف فقط'));

    // التبديل مجدداً إلى وضع أشرف يعيد كل أدوات التصميم بالكامل
    fireEvent.click(screen.getByTestId('layout-role-switcher-btn'));
    await waitFor(() => expect(screen.getByTestId('layout-add-rack-btn')).toBeTruthy());
    expect(screen.getByTestId('layout-add-element-btn')).toBeTruthy();
  });
});
