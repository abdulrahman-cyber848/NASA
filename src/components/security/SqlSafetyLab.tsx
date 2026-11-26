'use client';

import { useState, type FormEvent } from 'react';
import { useApp } from '@/state/app';

const ACCOUNTS = [
  { id: 'TR-104', handle: 'apollo', role: 'Observer' },
  { id: 'TR-217', handle: 'artemis', role: 'Researcher' },
  { id: 'TR-308', handle: 'luna', role: 'Instructor' },
];

const SAFE_STATEMENT = 'SELECT id, handle, role FROM training_accounts WHERE handle = $1';

export default function SqlSafetyLab() {
  const { lang } = useApp();
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const copy = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const results = submitted === null
    ? []
    : ACCOUNTS.filter(account => account.handle === submitted.toLowerCase());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(input.trim());
  }

  return (
    <div className="container-x py-8 space-y-6">
      <header className="rise space-y-3">
        <p className="eyebrow">{copy('Developer training · local only', 'تدريب المطورين · محلي فقط')}</p>
        <h1 className="h-display text-3xl sm:text-4xl font-bold">{copy('SQL Safety Lab', 'مختبر أمان SQL')}</h1>
        <p className="max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--color-dim)' }}>
          {copy(
            'A non-executable demonstration of safe SQL parameter binding. Searches run only against a tiny in-memory sample; this page has no database connection, API endpoint, or persistence.',
            'عرض توضيحي غير تنفيذي لربط معاملات SQL بأمان. يعمل البحث على عينة صغيرة في الذاكرة فقط؛ لا تتصل هذه الصفحة بقاعدة بيانات أو نقطة API ولا تحفظ البيانات.',
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="chip chip-ok">{copy('No SQL is executed', 'لا يتم تنفيذ SQL')}</span>
          <span className="chip chip-cy">{copy('In-memory sample only', 'عينة في الذاكرة فقط')}</span>
          <span className="chip">{copy('Hidden outside development', 'مخفٍ خارج وضع التطوير')}</span>
        </div>
      </header>

      <section className="glass p-5 sm:p-6 space-y-4" aria-labelledby="safe-query-title">
        <div>
          <p className="eyebrow">{copy('Safe simulation', 'محاكاة آمنة')}</p>
          <h2 id="safe-query-title" className="h-display mt-1 text-xl font-bold">
            {copy('Search the mock account list', 'ابحث في قائمة الحسابات التجريبية')}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="lbl" htmlFor="training-handle">{copy('Account handle', 'اسم الحساب')}</label>
            <input
              id="training-handle"
              className="input"
              type="search"
              value={input}
              maxLength={40}
              autoComplete="off"
              placeholder={copy('Try apollo, artemis, or luna', 'جرّب apollo أو artemis أو luna')}
              onChange={event => setInput(event.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit">{copy('Run simulation', 'شغّل المحاكاة')}</button>
        </form>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
          <div className="glass-deep p-4 space-y-2">
            <p className="lbl !mb-0">{copy('Fixed query shape', 'بنية الاستعلام الثابتة')}</p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border p-3 text-xs leading-relaxed text-[#9EE8F2]" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.72)' }}>
              <code>{SAFE_STATEMENT}</code>
            </pre>
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
              {copy('Bound value (kept separate from SQL syntax):', 'القيمة المرتبطة (منفصلة عن صياغة SQL):')}{' '}
              <code className="font-mono text-[#F5B85C]">{submitted === null ? '—' : JSON.stringify([submitted])}</code>
            </p>
          </div>

          <div className="glass-deep p-4 space-y-2" aria-live="polite" role="status">
            <p className="lbl !mb-0">{copy('Mock result', 'النتيجة التجريبية')}</p>
            {submitted === null ? (
              <p className="text-sm" style={{ color: 'var(--color-dim)' }}>{copy('Submit a handle to filter the in-memory sample.', 'أرسل اسم حساب لتصفية العينة الموجودة في الذاكرة.')}</p>
            ) : results.length ? (
              <ul className="space-y-2">
                {results.map(account => (
                  <li key={account.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }}>
                    <span className="font-mono text-xs text-[#9EE8F2]">{account.id}</span>
                    <span className="font-semibold">{account.handle}</span>
                    <span style={{ color: 'var(--color-dim)' }}>{account.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-dim)' }}>{copy('No matching mock account.', 'لا يوجد حساب تجريبي مطابق.')}</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label={copy('Security learning points', 'نقاط تعلم الأمان')}>
        <article className="glass p-5 space-y-2">
          <span className="chip chip-cy">01 · {copy('Source', 'المصدر')}</span>
          <h2 className="h-display text-lg font-bold">{copy('Untrusted input', 'مدخل غير موثوق')}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-dim)' }}>{copy('The form value is treated as plain data and matched in a fixed JavaScript array.', 'تُعامل قيمة النموذج كبيانات عادية وتُطابق ضمن مصفوفة JavaScript ثابتة.')}</p>
        </article>
        <article className="glass p-5 space-y-2">
          <span className="chip chip-cy">02 · {copy('Query structure', 'بنية الاستعلام')}</span>
          <h2 className="h-display text-lg font-bold">{copy('Constant statement', 'تعليمة ثابتة')}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-dim)' }}>{copy('The statement shape is fixed; the value is supplied separately as a bound parameter.', 'شكل التعليمة ثابت؛ وتُمرر القيمة منفصلة كمعامل مرتبط.')}</p>
        </article>
        <article className="glass p-5 space-y-2">
          <span className="chip chip-ok">03 · {copy('Sink', 'المصب')}</span>
          <h2 className="h-display text-lg font-bold">{copy('No database sink', 'لا يوجد اتصال بقاعدة بيانات')}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-dim)' }}>{copy('This route deliberately has no SQL driver, database, request handler, or persistence layer.', 'لا تحتوي هذه الصفحة عمدًا على مشغل SQL أو قاعدة بيانات أو معالج طلبات أو طبقة حفظ.')}</p>
        </article>
      </section>

      <aside className="rounded-xl border p-4 text-sm leading-relaxed" style={{ borderColor: 'rgba(245,184,92,0.35)', background: 'rgba(245,184,92,0.05)', color: 'var(--color-dim)' }}>
        <strong className="text-[#F5B85C]">{copy('Training boundary: ', 'حدود التدريب: ')}</strong>
        {copy('No vulnerable SQL endpoint or injection payload is included. This development-only page is a safe parameterization demo, not an exploitable lab.', 'لا تتضمن الصفحة نقطة SQL ضعيفة أو حمولة حقن. هذه الصفحة محصورة في التطوير وهي عرض آمن لربط المعاملات وليست مختبرًا قابلًا للاستغلال.')}
      </aside>
    </div>
  );
}
