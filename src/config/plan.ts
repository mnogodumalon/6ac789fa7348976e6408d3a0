// The orchestrator's plan, as far as the running app needs it
// (docs/orchestrator/SPEC.md). Generated — do not edit; regenerated on every
// build and update from the stored plan. Without a plan every map is empty.
//
//   SYSTEM_ASSIGNED entity → fields a tool fills when a record is CREATED — the
//                   value does not exist before; dialogs hide these on create and
//                   the form-polish sets no default on them. A scheduled or
//                   update-triggered tool owns its field but is NOT in here.
//   PLAN_SENTENCES  slug → the plan in the owner's words (flows' field page)
//
// The runtime write guard (FLOW_WRITES/OWNERSHIP, planGuard.ts) left on
// 23.09.2026: a flow page composes against its generated hook, whose submit
// plan IS the Schreibliste — there is no way to spell a write outside it.

export const SYSTEM_ASSIGNED: Record<string, string[]> = {};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "gegenstand-ausgeben": [
    "Legt an: ausgaben",
    "Ändert: inventar",
    "Automatisch: ausgabedatum (heutiges Datum, automatisch), status (fester Wert „ausgegeben“), bestand (wird um die Menge verringert)"
  ],
  "rueckgabe-verbuchen": [
    "Ändert: ausgaben, inventar",
    "Automatisch: tatsaechliches_rueckgabedatum (heutiges Datum, automatisch), status (fester Wert „zurueckgegeben“), bestand (Bestand plus die zurückgegebene Menge der gewählten Ausgabe)"
  ],
  "gegenstand-erfassen": [
    "Legt an: inventar"
  ]
};

export const PLAN_SUMMARY = "Die Anwendung verwaltet das Inventar der Werkstatt: Werkzeuge, Maschinen, Messmittel und Verbrauchsmaterial mit Lagerort, Lieferant, Bestand und Zustand. Ausgaben halten fest, wer wann was entnommen hat und ob es zurückgegeben wurde.";

/** slug → the lists a flow writes (the plan's Schreibliste). The nav leaves a
 *  flow out for a user who may not write one of them (lib/permissions.ts). */
export const FLOW_ENTITIES: Record<string, string[]> = {
  "gegenstand-ausgeben": [
    "ausgaben",
    "inventar"
  ],
  "rueckgabe-verbuchen": [
    "ausgaben",
    "inventar"
  ],
  "gegenstand-erfassen": [
    "inventar"
  ]
};
