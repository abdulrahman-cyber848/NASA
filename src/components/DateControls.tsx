'use client';
import { useState } from 'react';
import { useApp } from '@/state/app';
import { toLocalInput, fromLocalInput, fmtDateTime, tzLabel, addDays } from '@/services/time';
import { IChevronL, IChevronR, IClock, IStar, ISpinner } from './icons';
import { Modal } from './ui';

export default function DateControls() {
  const { t, lang, date, setDate, location, user, pushToast } = useApp();
  const [saveOpen, setSaveOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const saveDate = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/saved-dates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: date.toISOString(), note }),
      });
      if (!res.ok) throw new Error();
      pushToast('ok', t('ws.dateSaved'));
      setSaveOpen(false); setNote('');
    } catch { pushToast('err', t('common.error')); }
    finally { setSaving(false); }
  };

  const openSave = () => {
    if (!user) {
      pushToast('info', t('toast.loginToSave'), t('nav.login'), () => { window.location.href = '/login?from=/'; });
      return;
    }
    setSaveOpen(true);
  };

  return (
    <div className="glass p-4 flex flex-wrap items-end gap-3">
      <div className="grow min-w-[220px]">
        <label className="lbl" htmlFor="dt-input">{t('guide.dateTime')} · {tzLabel(location.tz)}</label>
        <input
          id="dt-input"
          type="datetime-local"
          className="input"
          value={toLocalInput(date, location.tz)}
          onChange={e => {
            const d = fromLocalInput(e.target.value, location.tz);
            if (d) setDate(d);
          }}
        />
      </div>
      <div className="flex gap-1.5">
        <button className="btn btn-ghost btn-icon" aria-label={t('common.prevDay')} onClick={() => setDate(addDays(date, -1))}>
          <IChevronL size={16} className="rtl:rotate-180" />
        </button>
        <button className="btn btn-ghost" onClick={() => setDate(new Date(Math.floor(Date.now() / 60000) * 60000))}>
          <IClock size={15} /> {t('common.today')}
        </button>
        <button className="btn btn-ghost btn-icon" aria-label={t('common.nextDay')} onClick={() => setDate(addDays(date, 1))}>
          <IChevronR size={16} className="rtl:rotate-180" />
        </button>
      </div>
      <button className="btn btn-ghost" onClick={openSave}>
        <IStar size={15} /> {t('ws.saveDate')}
      </button>
      <p className="w-full text-[11px] -mt-1" style={{ color: '#5f6f8d' }}>
        {fmtDateTime(date, location.tz, lang)} ({tzLabel(location.tz)}) · {fmtDateTime(date, 'UTC', lang)} UTC
      </p>

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title={t('ws.saveDateTitle', { d: fmtDateTime(date, location.tz, lang) })}>
        <label className="lbl" htmlFor="save-note">{t('ws.note')} ({t('common.optional')})</label>
        <textarea id="save-note" className="input min-h-[90px]" value={note} onChange={e => setNote(e.target.value)} maxLength={500} />
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn btn-ghost" onClick={() => setSaveOpen(false)}>{t('common.cancel')}</button>
          <button className="btn btn-primary" onClick={saveDate} disabled={saving}>
            {saving ? <ISpinner size={15} /> : null} {t('common.save')}
          </button>
        </div>
      </Modal>
    </div>
  );
}