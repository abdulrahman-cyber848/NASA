'use client';
import type { Confidence } from '../data/axemu';

/** Confidence chips are shared by the lab tree, the page header and the dossier. */
export const CONF_STYLE: Record<Confidence, { c: string; en: string; ar: string }> = {
  official: { c: 'chip-ok', en: 'Officially documented', ar: 'موثق رسميًا' },
  reconstruction: { c: 'chip-cy', en: 'Public-reference reconstruction', ar: 'إعادة بناء من مراجع عامة' },
  generic: { c: 'chip-bl', en: 'Generic EVA reference', ar: 'مرجع EVA عام' },
  undisclosed: { c: 'chip-amber', en: 'Not publicly disclosed', ar: 'غير معلن' },
};
