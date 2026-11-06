/**
 * DAWA Desktop — لوحتا "سجل التعديلات" و"مهام الترتيب" لمصمم تخطيط المستودع.
 *
 * - سجل التعديلات: من عدّل التخطيط ومتى (AuditLog) — تعديل ياسين يظهر فورًا
 *   لأشرف والعكس لأن البيانات مشتركة على الخادم نفسه (تحديث بزر التحديث).
 * - مهام الترتيب: إسناد مهمة لعامل (العوامي/فيصل) بصلاحية التصميم، متابعة
 *   الحالة، وعرض صور الرف التي يوثقها العامل من تطبيق الجوال (محفوظة في DB).
 */
import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, Plus, RefreshCcw } from 'lucide-react';
import { api } from '../../../../lib/api-client';
import type { ArrangementTaskRow, LayoutHistoryRow } from '../../../../lib/api-client';
import type { ApiUserSummary } from '../../../../lib/api-types';
import { extractArabicError } from '../../../../lib/api-helpers';

const cardStyle = {
  border: '1px solid var(--dtk-border)',
  borderRadius: 12,
  background: 'var(--dtk-surface, #fff)',
  padding: 12,
} as const;

const inputStyle = {
  border: '1px solid var(--dtk-border)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  background: 'var(--dtk-surface, #fff)',
  color: 'var(--dtk-ink, #0f172a)',
} as const;

const btnStyle = {
  border: '1px solid var(--dtk-border)',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  background: 'var(--dtk-surface, #fff)',
  color: 'var(--dtk-ink, #0f172a)',
} as const;

const STATUS_TONE: Record<string, { text: string; bg: string; color: string }> = {
  PENDING: { text: 'قيد الانتظار', bg: 'var(--dtk-warning-bg, #fffbeb)', color: 'var(--dtk-warning, #b45309)' },
  IN_PROGRESS: { text: 'جاري التنفيذ', bg: 'var(--dtk-accent-bg, #f0fdfa)', color: 'var(--dtk-accent, #0d9488)' },
  DONE: { text: 'مكتملة', bg: 'var(--dtk-success-bg, #f0fdf4)', color: 'var(--dtk-success, #0d9488)' },
};

function TaskStatusPill({ status }: { status: string }): React.ReactElement {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.PENDING;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: tone.bg, color: tone.color }}>
      {tone.text}
    </span>
  );
}

/** سجل تعديلات التخطيط: من عدّل ومتى — ياسين/أشرف وأي مصمم مفوَّض. */
export function LayoutHistoryPanel({ warehouseId }: { warehouseId: string }): React.ReactElement {
  const [rows, setRows] = useState<LayoutHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    setError(null);
    try {
      setRows((await api.getWarehouseLayoutHistory(warehouseId)) ?? []);
    } catch (e: unknown) {
      setError(extractArabicError(e, 'تعذر تحميل سجل التعديلات'));
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div data-testid="layout-history-panel" style={cardStyle}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--dtk-ink, #0f172a)' }}>
          <History size={15} /> سجل التعديلات — من عدّل ومتى
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1"
          style={{ ...btnStyle, opacity: loading ? 0.5 : 1 }}
        >
          <RefreshCcw size={12} /> تحديث
        </button>
      </div>
      {error ? <p className="text-[11px]" style={{ color: 'var(--dtk-critical, #e11d48)' }}>{error}</p> : null}
      {!error && rows.length === 0 && !loading ? (
        <p className="text-[11px]" style={{ color: 'var(--dtk-ink-muted, #64748b)' }}>
          لا توجد تعديلات محفوظة بعد لهذا المستودع.
        </p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {rows.map((r) => (
            <li
              key={r.id}
              data-testid={`layout-history-row-${r.id}`}
              className="flex items-center justify-between gap-2 rounded px-2 py-1 text-[11px]"
              style={{ background: 'var(--dtk-surface-2, #f8fafc)' }}
            >
              <b style={{ color: 'var(--dtk-ink, #0f172a)' }}>{r.userName}</b>
              <span style={{ color: 'var(--dtk-ink-muted, #64748b)' }}>
                {new Date(r.at).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })}
                {r.placements != null ? ` — ${r.placements} موقعًا` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {loading ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--dtk-ink-muted)' }} /> : null}
    </div>
  );
}

/** لوحة مهام الترتيب: إسناد لعامل + متابعة الحالة + صور الرف من الجوال. */
export function ArrangementTasksPanel({ warehouseId }: { warehouseId: string }): React.ReactElement {
  const [tasks, setTasks] = useState<ArrangementTaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workers, setWorkers] = useState<ApiUserSummary[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [taskZone, setTaskZone] = useState('');
  const [taskShelf, setTaskShelf] = useState('');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [openPhotos, setOpenPhotos] = useState<Record<string, boolean>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    setError(null);
    try {
      setTasks((await api.getArrangementTasks(warehouseId)) ?? []);
    } catch (e: unknown) {
      setError(extractArabicError(e, 'تعذر تحميل مهام الترتيب'));
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => { void load(); }, [load]);

  // قائمة العمال (persona=WAREHOUSE) — تُتجاهل بصمت إن لم تتوفر صلاحية users.read
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getUsers({ persona: 'WAREHOUSE', limit: 100 });
        if (!cancelled) setWorkers(res?.data ?? []);
      } catch {
        if (!cancelled) setWorkers([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const createTask = useCallback(async () => {
    if (!assigneeId || creating) return;
    setCreating(true);
    setError(null);
    try {
      await api.createArrangementTask(warehouseId, {
        assigneeId,
        zone: taskZone || undefined,
        shelf: taskShelf || undefined,
        note: note || undefined,
      });
      setNote('');
      await load();
    } catch (e: unknown) {
      setError(extractArabicError(e, 'تعذر إسناد المهمة — تحقق من صلاحية التصميم'));
    } finally {
      setCreating(false);
    }
  }, [assigneeId, creating, warehouseId, taskZone, taskShelf, note, load]);

  const setStatus = useCallback(async (taskId: string, status: 'IN_PROGRESS' | 'DONE') => {
    try {
      await api.updateArrangementTaskStatus(taskId, status);
      await load();
    } catch (e: unknown) {
      setError(extractArabicError(e, 'تعذر تحديث حالة المهمة'));
    }
  }, [load]);

  const togglePhotos = useCallback(async (taskId: string) => {
    const opening = !openPhotos[taskId];
    setOpenPhotos((prev) => ({ ...prev, [taskId]: opening }));
    if (!opening) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next: Record<string, string> = {};
    for (const p of task.photos) {
      if (photoUrls[p.id]) continue;
      try {
        const photo = await api.getArrangementTaskPhoto(taskId, p.id);
        next[p.id] = photo.dataUrl;
      } catch {
        next[p.id] = '';
      }
    }
    if (Object.keys(next).length > 0) setPhotoUrls((prev) => ({ ...prev, ...next }));
  }, [openPhotos, tasks, photoUrls]);

  return (
    <div data-testid="tasks-panel" style={cardStyle}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold" style={{ color: 'var(--dtk-ink, #0f172a)' }}>مهام الترتيب وصور الرفوف</h3>
        <button type="button" onClick={() => void load()} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.5 : 1 }}>
          تحديث
        </button>
      </div>
      {error ? <p className="mb-2 text-[11px]" style={{ color: 'var(--dtk-critical, #e11d48)' }}>{error}</p> : null}

      {/* إسناد مهمة جديدة — الخادم يرفض fail-closed إن لم تتوفر صلاحية التصميم */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          data-testid="task-assignee-select"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          style={{ ...inputStyle, minWidth: 150 }}
        >
          <option value="">اختر العامل…</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>{w.name || w.username}</option>
          ))}
        </select>
        <input data-testid="task-zone-input" value={taskZone} onChange={(e) => setTaskZone(e.target.value)} placeholder="ممر (اختياري)" style={{ ...inputStyle, width: 92 }} />
        <input data-testid="task-shelf-input" value={taskShelf} onChange={(e) => setTaskShelf(e.target.value)} placeholder="رف (اختياري)" style={{ ...inputStyle, width: 92 }} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة الترتيب…" style={{ ...inputStyle, flex: 1, minWidth: 130 }} />
        <button
          type="button"
          data-testid="task-assign-btn"
          onClick={() => void createTask()}
          disabled={!assigneeId || creating}
          className="flex items-center gap-1"
          style={{
            ...btnStyle,
            background: 'var(--dtk-accent, #0d9488)',
            color: '#fff',
            borderColor: 'var(--dtk-accent, #0d9488)',
            opacity: !assigneeId || creating ? 0.5 : 1,
          }}
        >
          <Plus size={13} /> إسناد مهمة
        </button>
      </div>

      {tasks.length === 0 && !loading ? (
        <p className="text-[11px]" style={{ color: 'var(--dtk-ink-muted, #64748b)' }}>
          لا مهام بعد — أسند مهمة ترتيب لعامل وسيتيح له تطبيق الجوال توثيق الرف بصورة.
        </p>
      ) : null}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {tasks.map((t) => (
          <li key={t.id} data-testid={`arrangement-task-${t.id}`} className="rounded-lg p-2" style={{ border: '1px solid var(--dtk-border)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <b style={{ color: 'var(--dtk-ink, #0f172a)' }}>{t.title}</b>
                <TaskStatusPill status={t.status} />
                <span style={{ color: 'var(--dtk-ink-muted, #64748b)' }}>
                  إلى: {t.assignee.name || t.assignee.username}
                  {t.zone ? ` — ممر ${t.zone}` : ''}{t.shelf ? ` رف ${t.shelf}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {t.status !== 'DONE' ? (
                  <>
                    {t.status === 'PENDING' ? (
                      <button type="button" onClick={() => void setStatus(t.id, 'IN_PROGRESS')} style={btnStyle}>بدء التنفيذ</button>
                    ) : null}
                    <button type="button" onClick={() => void setStatus(t.id, 'DONE')} style={btnStyle}>تم الترتيب</button>
                  </>
                ) : null}
                {t.photos.length > 0 ? (
                  <button type="button" data-testid={`task-photos-toggle-${t.id}`} onClick={() => void togglePhotos(t.id)} style={btnStyle}>
                    الصور ({t.photos.length})
                  </button>
                ) : null}
              </div>
            </div>
            {openPhotos[t.id] ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {t.photos.map((p) => (
                  <figure key={p.id} className="m-0" data-testid={`task-photo-${p.id}`}>
                    {photoUrls[p.id] ? (
                      <img
                        src={photoUrls[p.id]}
                        alt={`صورة رف ${p.id}`}
                        style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--dtk-border)' }}
                      />
                    ) : (
                      <div style={{ width: 96, height: 96, borderRadius: 8, background: 'var(--dtk-surface-2, #f1f5f9)' }} />
                    )}
                    <figcaption className="text-[9px]" style={{ color: 'var(--dtk-ink-muted, #64748b)' }}>
                      {p.takenBy?.name || ''} — {new Date(p.createdAt).toLocaleDateString('ar')}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {loading ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--dtk-ink-muted)' }} /> : null}
    </div>
  );
}
