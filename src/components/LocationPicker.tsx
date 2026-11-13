'use client';
import { useState } from 'react';
import { useApp } from '@/state/app';
import { CITIES } from '@/data/cities';
import { IPin, ICrosshair, ISpinner } from './icons';
import { fmtNum } from '@/services/format';

const TZS = ['UTC', 'Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'Europe/London', 'Europe/Oslo', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney', 'Africa/Johannesburg', 'Asia/Karachi', 'Asia/Kolkata', 'Europe/Berlin', 'Europe/Paris'];

export default function LocationPicker({ compact }: { compact?: boolean }) {
  const { t, lang, prefs, setPrefs, pushToast } = useApp();
  const [locating, setLocating] = useState(false);

  const useGeo = () => {
    if (!('geolocation' in navigator)) { pushToast('err', t('guide.geoUnavailable')); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        setPrefs({ locationId: 'custom', customLat: +pos.coords.latitude.toFixed(4), customLon: +pos.coords.longitude.toFixed(4), customTz: tz });
        pushToast('ok', t('guide.geoOk', { lat: fmtNum(pos.coords.latitude, lang, 2), lon: fmtNum(pos.coords.longitude, lang, 2) }));
        setLocating(false);
      },
      () => { pushToast('err', t('guide.geoDenied')); setLocating(false); },
      { timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <div className="relative grow">
          <IPin size={14} className="absolute top-1/2 -translate-y-1/2 start-3 opacity-60 pointer-events-none" />
          <select
            className="input ps-9"
            value={prefs.locationId}
            aria-label={t('guide.location')}
            onChange={e => setPrefs({ locationId: e.target.value })}
          >
            {CITIES.map(c => <option key={c.id} value={c.id}>{lang === 'ar' ? c.nameAr : c.name}</option>)}
            <option value="custom">{t('guide.custom')}</option>
          </select>
        </div>
        <button className="btn btn-ghost shrink-0" onClick={useGeo} disabled={locating} title={t('guide.useMyLocation')}>
          {locating ? <ISpinner size={15} /> : <ICrosshair size={15} />}
          {!compact && <span className="hidden sm:inline">{t('guide.useMyLocation')}</span>}
        </button>
      </div>
      {prefs.locationId === 'custom' && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="lbl" htmlFor="lat-in">{t('guide.lat')}</label>
            <input id="lat-in" type="number" className="input" min={-90} max={90} step={0.01} value={prefs.customLat}
              onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setPrefs({ customLat: Math.max(-90, Math.min(90, v)) }); }} />
          </div>
          <div>
            <label className="lbl" htmlFor="lon-in">{t('guide.lon')}</label>
            <input id="lon-in" type="number" className="input" min={-180} max={180} step={0.01} value={prefs.customLon}
              onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setPrefs({ customLon: Math.max(-180, Math.min(180, v)) }); }} />
          </div>
          <div>
            <label className="lbl" htmlFor="tz-in">{t('guide.timezone')}</label>
            <select id="tz-in" className="input" value={prefs.customTz} onChange={e => setPrefs({ customTz: e.target.value })}>
              {[...new Set([prefs.customTz, ...TZS])].filter(Boolean).map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}