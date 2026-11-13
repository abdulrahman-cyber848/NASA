'use client';
import { useMemo, useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, type TooltipContentProps } from 'recharts';
import { getSeries, type SeriesRange } from '@/services/astro';
import { useApp } from '@/state/app';
import { distanceValue, fmtNum } from '@/services/format';
import { Seg } from './ui';

type Metric = 'illum' | 'dist' | 'size';

export default function ChartsPanel({ date }: { date: Date }) {
  const { t, lang, prefs, location } = useApp();
  const [range, setRange] = useState<SeriesRange>('30d');
  const [metric, setMetric] = useState<Metric>('illum');
  // recompute around whole days so the chart is stable within a day
  const centerKey = Math.floor(date.getTime() / 3600000);
  const data = useMemo(() => {
    const center = new Date(centerKey * 3600000);
    return getSeries(center, range).map(p => ({
      t: p.t,
      illum: p.illumPct,
      dist: distanceValue(p.distanceKm, prefs.units),
      size: p.angularDiameterArcsec,
    }));
  }, [centerKey, range, prefs.units]);

  const fmtX = (v: number) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', timeZone: location.tz }).format(new Date(v));
  const unit = metric === 'illum' ? '%' : metric === 'dist' ? (prefs.units === 'km' ? t('common.km') : t('common.mi')) : '″';
  const color = metric === 'illum' ? '#53D8E8' : metric === 'dist' ? '#6B8DFF' : '#929AFF';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltip = ({ active, payload, label }: TooltipContentProps<any, any>) => {
    if (!active || !payload?.length) return null;
    const raw = payload[0]?.value;
    const v = Number(Array.isArray(raw) ? raw[0] : raw ?? 0);
    return (
      <div className="glass-deep px-3 py-2 text-xs" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <p style={{ color: 'var(--color-dim)' }}>{fmtX(Number(label))}</p>
        <p className="font-bold text-sm" style={{ color }}>{fmtNum(v, lang, metric === 'illum' ? 1 : 0)} {unit}</p>
      </div>
    );
  };

  const common = {
    data,
    margin: { top: 8, right: 12, bottom: 0, left: 0 },
  };
  const axes = (
    <>
      <CartesianGrid stroke="rgba(107,141,255,0.1)" strokeDasharray="3 6" />
      <XAxis dataKey="t" tickFormatter={fmtX} stroke="#5f6f8d" fontSize={10.5} tickLine={false} minTickGap={42} />
      <YAxis stroke="#5f6f8d" fontSize={10.5} tickLine={false} width={52} domain={metric === 'illum' ? [0, 100] : ['auto', 'auto']} tickFormatter={(v: number) => fmtNum(v, lang, 0)} />
      <Tooltip content={tooltip} />
      <ReferenceLine x={data.reduce((best, p) => Math.abs(p.t - date.getTime()) < Math.abs(best - date.getTime()) ? p.t : best, data[0]?.t ?? 0)} stroke="#53D8E8" strokeDasharray="4 4" strokeOpacity={0.7} />
    </>
  );

  return (
    <section className="glass p-5" aria-label={t('guide.charts')}>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="h-display text-lg font-bold">{t('guide.charts')}</h2>
        <div className="flex flex-wrap gap-2">
          <Seg label={t('guide.charts')} value={metric} onChange={setMetric} options={[
            { value: 'illum', label: t('chart.illum') },
            { value: 'dist', label: t('chart.dist') },
            { value: 'size', label: t('chart.size') },
          ]} />
          <Seg label={t('guide.charts')} value={range} onChange={setRange} options={[
            { value: '7d', label: t('chart.r7') },
            { value: '30d', label: t('chart.r30') },
            { value: '1y', label: t('chart.r365') },
          ]} />
        </div>
      </div>
      <div className="mt-4 h-[240px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {metric === 'illum' ? (
            <AreaChart {...common}>
              <defs>
                <linearGradient id="g-illum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#53D8E8" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#53D8E8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {axes}
              <Area type="monotone" dataKey="illum" stroke="#53D8E8" strokeWidth={2} fill="url(#g-illum)" isAnimationActive={false} />
            </AreaChart>
          ) : (
            <LineChart {...common}>
              {axes}
              <Line type="monotone" dataKey={metric} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px]" style={{ color: '#5f6f8d' }}>
        {metric === 'illum' ? t('chart.illum') : metric === 'dist' ? t('chart.dist') : t('chart.size')} · {range === '7d' ? t('chart.r7') : range === '30d' ? t('chart.r30') : t('chart.r365')} · astronomy-engine
      </p>
    </section>
  );
}