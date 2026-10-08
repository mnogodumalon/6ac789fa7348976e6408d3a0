// Auto-generated. Per-entity form-enhancements config for "Inventar".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["bezeichnung", "inventarnummer"], "cols": "2fr 1fr"}, {"row": ["kategorie", "zustand"], "cols": "1fr 1fr"}, {"row": ["hersteller", "modell"], "cols": "1fr 1fr"}, "seriennummer", {"row": ["anschaffungsdatum", "anschaffungspreis"], "cols": "1fr 1fr"}, {"row": ["bestand", "mindestbestand"], "cols": "1fr 1fr"}, {"row": ["lagerort", "lieferant"], "cols": "1fr 1fr"}, "naechste_pruefung", "bemerkung"],
  defaults: {
    'anschaffungsdatum': { kind: 'today' },
    'zustand': { kind: 'lookup', key: 'neu', label: 'Neu' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
