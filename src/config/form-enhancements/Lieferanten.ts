// Auto-generated. Per-entity form-enhancements config for "Lieferanten".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["firmenname", {"row": ["ansprechpartner_vorname", "ansprechpartner_nachname"], "cols": "1fr 1fr"}, {"row": ["email", "telefon"], "cols": "1fr 1fr"}, {"row": ["strasse", "hausnummer"], "cols": "3fr 1fr"}, {"row": ["postleitzahl", "ort"], "cols": "1fr 2fr"}, "webseite"],
  defaults: {},
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
