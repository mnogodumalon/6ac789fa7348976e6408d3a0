// Auto-generated. Per-entity form-enhancements config for "Ausgaben".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["gegenstand", {"row": ["person_vorname", "person_nachname"]}, "menge", {"row": ["ausgabedatum", "geplantes_rueckgabedatum"], "cols": "1fr 1fr"}, "tatsaechliches_rueckgabedatum", "status", "bemerkung"],
  defaults: {
    'menge': { kind: 'literal', value: 1 },
    'ausgabedatum': { kind: 'today' },
    'geplantes_rueckgabedatum': { kind: 'todayOffset', days: 14 },
    'status': { kind: 'lookup', key: 'ausgegeben', label: 'Ausgegeben' },
  },
  computed: {
    '_ausgabe_wert': { op: 'mul', left: { kind: 'field', key: 'menge' }, right: { kind: 'applookup', ownKey: 'gegenstand', lookupKey: 'anschaffungspreis' } },
    '_ausgabe_dauer_tage': { kind: 'dateDiff', from: 'ausgabedatum', to: 'geplantes_rueckgabedatum', unit: 'days' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
