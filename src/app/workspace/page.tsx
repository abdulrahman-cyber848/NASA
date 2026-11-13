'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/state/app';
import { landmarkById, LANDMARKS } from '@/data/landmarks';
import { fmtDate, fmtDateTime, fromLocalInput, dateStrInTZ } from '@/services/time';
import { Modal, EmptyState, Seg } from '@/components/ui';
import LocationPicker from '@/components/LocationPicker';
import { IStar, ITrash, IEdit, IPlus, ISpinner, ICube, IClock, IUser } from '@/components/icons';

interface SavedDateRow { id: string; date: string; note: string; createdAt: string }
interface JournalRow { id: string; date: string; equipment: string; location: string; notes: string }

type Tab = 'favorites' | 'dates' | 'journal' | 'prefs';

export default function WorkspacePage() {
  const { t, user, authLoading } = useApp();
  const [tab, setTab] = useState<Tab>('favorites');

  if (authLoading) {
    return (
      <div className="container-x py-16 space-y-4 max-w-3xl">
        {[0, 1, 2].map(i => <div key={i} className="glass h-24 animate-pulse" />)}
      </div>
    );
  }
  if (!user) {
    return (
      <div className="container-x flex justify-center py-20">
        <div className="glass max-w-md p-8 text-center rise">
          <IUser size={38} className="mx-auto opacity-70" />
          <h1 className="h-display text-xl font-bold mt-3">{t('ws.blocked')}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-dim)' }}>{t('ws.blockedHint')}</p>
          <div className="flex gap-2 justify-center mt-5">
            <Link href="/login?from=/workspace" className="btn btn-primary">{t('auth.login')}</Link>
            <Link href="/login?from=/workspace" className="btn btn-ghost">{t('auth.signup')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8 space-y-6">
      <header className="rise">
        <p className="eyebrow">{t('brand.tag')}</p>
        <h1 className="h-display mt-1 text-3xl font-bold">{t('ws.title')}</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-dim)' }}>{t('ws.subtitle')} · {user.email}</p>
      </header>
      <div className="flex flex-wrap gap-2 rise">
        <Seg<Tab> label={t('ws.title')} value={tab} onChange={setTab} options={[
          { value: 'favorites', label: t('ws.favorites') },
          { value: 'dates', label: t('ws.savedDates') },
          { value: 'journal', label: t('ws.journal') },
          { value: 'prefs', label: t('ws.preferences') },
        ]} />
      </div>
      {tab === 'favorites' && <FavoritesTab />}
      {tab === 'dates' && <DatesTab />}
      {tab === 'journal' && <JournalTab />}
      {tab === 'prefs' && <PrefsTab />}
    </div>
  );
}

function FavoritesTab() {
  const { t, lang, favorites, toggleFavorite, date } = useApp();
  const favs = LANDMARKS.filter(l => favorites.has(l.id));
  return (
    <div className="glass p-5 rise">
      {favs.length === 0 ? <EmptyState icon="⭐" title={t('ws.noFavorites')} /> : (
        <ul className="space-y-2">
          {favs.map(l => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.45)' }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: l.type === 'crater' ? 'var(--color-amber)' : 'var(--color-cy)' }} />
              <span className="font-semibold text-sm">{lang === 'ar' ? l.nameAr : l.name}</span>
              <span className="chip">{t(`lm.${l.type}`)}</span>
              <div className="ms-auto flex gap-1.5">
                <Link className="btn btn-ghost btn-sm" href={`/?d=${encodeURIComponent(date.toISOString())}`}>{t('common.openGuide')}</Link>
                <Link className="btn btn-ghost btn-sm" href={`/explorer?focus=${l.id}`}><ICube size={14} /> 3D</Link>
                <button className="btn btn-ghost btn-icon text-[#F5B85C]" onClick={() => toggleFavorite(l.id)} aria-label={t('toast.favRemoved')}>
                  <IStar size={15} filled />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DatesTab() {
  const { t, lang, location, setDate, pushToast } = useApp();
  const router = useRouter();
  const [rows, setRows] = useState<SavedDateRow[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch('/api/saved-dates');
      if (!res.ok) throw new Error();
      setRows((await res.json()).savedDates);
    } catch { setError(true); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (row: SavedDateRow) => {
    setRows(rs => rs?.filter(r => r.id !== row.id) ?? null);
    try {
      await fetch(`/api/saved-dates/${row.id}`, { method: 'DELETE' });
      pushToast('info', t('ws.entryDeleted'), t('common.undo'), async () => {
        await fetch('/api/saved-dates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: row.date, note: row.note }) });
        load();
      });
    } catch { pushToast('err', t('common.error')); load(); }
  };

  if (error) return <div className="glass p-6 text-center"><p className="text-sm">{t('common.error')}</p><button className="btn btn-ghost btn-sm mt-3" onClick={load}>{t('common.retry')}</button></div>;
  if (!rows) return <div className="glass p-10 text-center"><ISpinner size={24} className="inline-block" /></div>;

  return (
    <div className="glass p-5 rise">
      {rows.length === 0 ? <EmptyState icon="🗓️" title={t('ws.noSaved')} /> : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.45)' }}>
              <IClock size={16} className="opacity-60 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">{fmtDateTime(new Date(r.date), location.tz, lang)}</p>
                {r.note && <p className="text-[12.5px] truncate" style={{ color: 'var(--color-dim)' }}>{r.note}</p>}
              </div>
              <div className="ms-auto flex gap-1.5">
                <button className="btn btn-primary btn-sm" onClick={() => { setDate(new Date(r.date)); router.push(`/?d=${encodeURIComponent(r.date)}`); }}>{t('ws.open')}</button>
                <button className="btn btn-danger btn-icon" onClick={() => remove(r)} aria-label={t('common.delete')}><ITrash size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function JournalTab() {
  const { t, lang, location, pushToast } = useApp();
  const [rows, setRows] = useState<JournalRow[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<JournalRow | 'new' | null>(null);
  const [form, setForm] = useState({ date: '', equipment: 'binoculars', location: '', notes: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch('/api/journal');
      if (!res.ok) throw new Error();
      setRows((await res.json()).entries);
    } catch { setError(true); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openEditor = (row: JournalRow | 'new') => {
    setEditing(row);
    if (row === 'new') setForm({ date: dateStrInTZ(new Date(), location.tz), equipment: 'binoculars', location: location.label, notes: '' });
    else setForm({ date: dateStrInTZ(new Date(row.date), location.tz), equipment: row.equipment, location: row.location, notes: row.notes });
  };

  const save = async () => {
    setBusy(true);
    try {
      const iso = fromLocalInput(`${form.date}T21:00`, location.tz)?.toISOString() ?? new Date(form.date).toISOString();
      const payload = { date: iso, equipment: form.equipment, location: form.location, notes: form.notes };
      const res = editing !== 'new' && editing
        ? await fetch(`/api/journal/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      pushToast('ok', t('ws.entrySaved'));
      setEditing(null);
      load();
    } catch { pushToast('err', t('common.error')); }
    finally { setBusy(false); }
  };

  const remove = async (row: JournalRow) => {
    setRows(rs => rs?.filter(r => r.id !== row.id) ?? null);
    try {
      const res = await fetch(`/api/journal/${row.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      pushToast('info', t('ws.entryDeleted'), t('common.undo'), async () => {
        await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: row.date, equipment: row.equipment, location: row.location, notes: row.notes }) });
        pushToast('ok', t('toast.restored'));
        load();
      });
    } catch { pushToast('err', t('common.error')); load(); }
  };

  if (error) return <div className="glass p-6 text-center"><p className="text-sm">{t('common.error')}</p><button className="btn btn-ghost btn-sm mt-3" onClick={load}>{t('common.retry')}</button></div>;
  if (!rows) return <div className="glass p-10 text-center"><ISpinner size={24} className="inline-block" /></div>;

  return (
    <div className="glass p-5 rise">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="h-display text-lg font-bold">{t('ws.journal')}</h2>
        <button className="btn btn-primary btn-sm" onClick={() => openEditor('new')}><IPlus size={15} /> {t('ws.newEntry')}</button>
      </div>
      {rows.length === 0 ? <EmptyState icon="📓" title={t('ws.noJournal')} /> : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.45)' }}>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="font-semibold text-sm">{fmtDate(new Date(r.date), location.tz, lang, 'long')}</p>
                <span className="chip chip-cy">{t(`equip.${r.equipment}`)}</span>
                {r.location && <span className="chip">{r.location}</span>}
                <div className="ms-auto flex gap-1.5">
                  <button className="btn btn-ghost btn-icon" onClick={() => openEditor(r)} aria-label={t('common.edit')}><IEdit size={15} /></button>
                  <button className="btn btn-danger btn-icon" onClick={() => remove(r)} aria-label={t('common.delete')}><ITrash size={15} /></button>
                </div>
              </div>
              {r.notes && <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-dim)' }}>{r.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={t(editing === 'new' ? 'ws.newEntry' : 'ws.editEntry')}>
        <div className="space-y-4">
          <div>
            <label className="lbl" htmlFor="j-date">{t('common.date')}</label>
            <input id="j-date" type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <p className="lbl">{t('ws.equipment')}</p>
            <Seg label={t('ws.equipment')} value={form.equipment} onChange={v => setForm(f => ({ ...f, equipment: v }))}
              options={['eye', 'binoculars', 'telescope'].map(eq => ({ value: eq, label: t(`equip.${eq}`) }))} />
          </div>
          <div>
            <label className="lbl" htmlFor="j-loc">{t('ws.location')}</label>
            <input id="j-loc" className="input" value={form.location} maxLength={120} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <label className="lbl" htmlFor="j-notes">{t('ws.notes')}</label>
            <textarea id="j-notes" className="input min-h-[120px]" value={form.notes} maxLength={4000} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={save} disabled={busy || !form.date}>
              {busy && <ISpinner size={15} />} {t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PrefsTab() {
  const { t, profile, prefs, setPrefs, pushToast, refreshAuth } = useApp();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: name, language: prefs.lang, units: prefs.units, hemisphere: prefs.hemisphere,
          locationId: prefs.locationId, customLat: prefs.customLat, customLon: prefs.customLon, customTz: prefs.customTz,
        }),
      });
      if (!res.ok) throw new Error();
      await refreshAuth();
      pushToast('ok', t('ws.prefsSaved'));
    } catch { pushToast('err', t('common.error')); }
    finally { setBusy(false); }
  };

  return (
    <div className="glass p-5 max-w-2xl space-y-5 rise">
      <div>
        <label className="lbl" htmlFor="p-name">{t('ws.displayName')}</label>
        <input id="p-name" className="input" value={name} maxLength={60} onChange={e => setName(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <div>
          <p className="lbl">{t('ws.language')}</p>
          <Seg label={t('ws.language')} value={prefs.lang} onChange={v => setPrefs({ lang: v })}
            options={[{ value: 'en' as const, label: 'English' }, { value: 'ar' as const, label: 'العربية' }]} />
        </div>
        <div>
          <p className="lbl">{t('ws.units')}</p>
          <Seg label={t('ws.units')} value={prefs.units} onChange={v => setPrefs({ units: v })}
            options={[{ value: 'km' as const, label: t('common.km') }, { value: 'mi' as const, label: t('common.mi') }]} />
        </div>
        <div>
          <p className="lbl">{t('ws.hemisphere')}</p>
          <Seg label={t('ws.hemisphere')} value={prefs.hemisphere} onChange={v => setPrefs({ hemisphere: v })}
            options={[{ value: 'north' as const, label: t('hemi.north') }, { value: 'south' as const, label: t('hemi.south') }]} />
        </div>
      </div>
      <div>
        <p className="lbl">{t('ws.defaultLocation')}</p>
        <LocationPicker />
      </div>
      <button className="btn btn-primary" onClick={save} disabled={busy}>
        {busy && <ISpinner size={15} />} {t('common.save')}
      </button>
    </div>
  );
}
