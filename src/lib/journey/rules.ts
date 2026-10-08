/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'lagerorte' | 'lieferanten' | 'inventar' | 'ausgaben';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "lagerorte": "bezeichnung" | "bereich" | "regal" | "fach" | "bemerkung";
  "lieferanten": "firmenname" | "ansprechpartner_vorname" | "ansprechpartner_nachname" | "email" | "telefon" | "strasse" | "hausnummer" | "postleitzahl" | "ort" | "webseite";
  "inventar": "bezeichnung" | "inventarnummer" | "hersteller" | "modell" | "seriennummer" | "bemerkung";
  "ausgaben": "person_vorname" | "person_nachname" | "bemerkung";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "lagerorte": never;
  "lieferanten": never;
  "inventar": "lagerort" | "lieferant";
  "ausgaben": "gegenstand";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it (`file` is upload-only, never via a journey). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "lagerorte": {
    "key": "lagerorte",
    "appId": "6ac789dc18dfd1c7058f600d",
    "label": "Lagerorte",
    "pascal": "Lagerorte",
    "single": "LagerorteEntry"
  },
  "lieferanten": {
    "key": "lieferanten",
    "appId": "6ac789e0fde48653ee9b7aa8",
    "label": "Lieferanten",
    "pascal": "Lieferanten",
    "single": "LieferantenEntry"
  },
  "inventar": {
    "key": "inventar",
    "appId": "6ac789e0e48dd941e4fe8305",
    "label": "Inventar",
    "pascal": "Inventar",
    "single": "InventarEntry"
  },
  "ausgaben": {
    "key": "ausgaben",
    "appId": "6ac789e2e93eef30ca2b68c7",
    "label": "Ausgaben",
    "pascal": "Ausgaben",
    "single": "AusgabenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "lagerorte": {
    "bezeichnung": {
      "key": "bezeichnung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Bezeichnung",
      "writable": true,
      "maxLength": 4000
    },
    "bereich": {
      "key": "bereich",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Bereich / Halle",
      "writable": true,
      "maxLength": 4000
    },
    "regal": {
      "key": "regal",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Regal",
      "writable": true,
      "maxLength": 4000
    },
    "fach": {
      "key": "fach",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Fach",
      "writable": true,
      "maxLength": 4000
    },
    "bemerkung": {
      "key": "bemerkung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bemerkung",
      "writable": true
    }
  },
  "lieferanten": {
    "firmenname": {
      "key": "firmenname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Firmenname",
      "writable": true,
      "maxLength": 4000
    },
    "ansprechpartner_vorname": {
      "key": "ansprechpartner_vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Vorname Ansprechpartner",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "ansprechpartner_nachname": {
      "key": "ansprechpartner_nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Nachname Ansprechpartner",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "strasse": {
      "key": "strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Straße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "hausnummer": {
      "key": "hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "postleitzahl": {
      "key": "postleitzahl",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "webseite": {
      "key": "webseite",
      "fulltype": "string/url",
      "kind": "url",
      "required": false,
      "label": "Webseite",
      "writable": true,
      "autoComplete": "url"
    }
  },
  "inventar": {
    "bezeichnung": {
      "key": "bezeichnung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Bezeichnung",
      "writable": true,
      "maxLength": 4000
    },
    "inventarnummer": {
      "key": "inventarnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Inventarnummer",
      "writable": true,
      "maxLength": 4000
    },
    "kategorie": {
      "key": "kategorie",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Kategorie",
      "writable": true,
      "options": [
        "werkzeug",
        "maschine",
        "messmittel",
        "verbrauchsmaterial",
        "schutzausruestung",
        "sonstiges"
      ]
    },
    "hersteller": {
      "key": "hersteller",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Hersteller",
      "writable": true,
      "maxLength": 4000
    },
    "modell": {
      "key": "modell",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Modell",
      "writable": true,
      "maxLength": 4000
    },
    "seriennummer": {
      "key": "seriennummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Seriennummer",
      "writable": true,
      "maxLength": 4000
    },
    "foto": {
      "key": "foto",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Foto",
      "writable": false
    },
    "anschaffungsdatum": {
      "key": "anschaffungsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Anschaffungsdatum",
      "writable": true
    },
    "anschaffungspreis": {
      "key": "anschaffungspreis",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Anschaffungspreis in Euro",
      "writable": true,
      "format": "currency"
    },
    "bestand": {
      "key": "bestand",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Bestand",
      "writable": true
    },
    "mindestbestand": {
      "key": "mindestbestand",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Mindestbestand",
      "writable": true
    },
    "zustand": {
      "key": "zustand",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": false,
      "label": "Zustand",
      "writable": true,
      "options": [
        "neu",
        "gut",
        "gebraucht",
        "reparaturbeduerftig",
        "defekt"
      ]
    },
    "lagerort": {
      "key": "lagerort",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Lagerort",
      "writable": true,
      "targetAppId": "6ac789dc18dfd1c7058f600d",
      "targetEntity": "lagerorte"
    },
    "lieferant": {
      "key": "lieferant",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Lieferant",
      "writable": true,
      "targetAppId": "6ac789e0fde48653ee9b7aa8",
      "targetEntity": "lieferanten"
    },
    "naechste_pruefung": {
      "key": "naechste_pruefung",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Nächste Prüfung",
      "writable": true
    },
    "bemerkung": {
      "key": "bemerkung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bemerkung",
      "writable": true
    }
  },
  "ausgaben": {
    "gegenstand": {
      "key": "gegenstand",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Gegenstand",
      "writable": true,
      "targetAppId": "6ac789e0e48dd941e4fe8305",
      "targetEntity": "inventar"
    },
    "person_vorname": {
      "key": "person_vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname der entnehmenden Person",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "person_nachname": {
      "key": "person_nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname der entnehmenden Person",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "menge": {
      "key": "menge",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Menge",
      "writable": true
    },
    "ausgabedatum": {
      "key": "ausgabedatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Ausgabedatum",
      "writable": true
    },
    "geplantes_rueckgabedatum": {
      "key": "geplantes_rueckgabedatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Geplantes Rückgabedatum",
      "writable": true
    },
    "tatsaechliches_rueckgabedatum": {
      "key": "tatsaechliches_rueckgabedatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Tatsächliches Rückgabedatum",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": false,
      "label": "Status",
      "writable": true,
      "options": [
        "ausgegeben",
        "zurueckgegeben",
        "ueberfaellig",
        "verbraucht"
      ]
    },
    "bemerkung": {
      "key": "bemerkung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bemerkung",
      "writable": true
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "lagerorte": [],
  "lieferanten": [],
  "inventar": [
    {
      "kind": "choice",
      "field": "kategorie",
      "count": 6
    },
    {
      "kind": "choice",
      "field": "zustand",
      "count": 5
    },
    {
      "kind": "record",
      "field": "lagerort",
      "targetEntity": "lagerorte"
    },
    {
      "kind": "record",
      "field": "lieferant",
      "targetEntity": "lieferanten"
    },
    {
      "kind": "stock",
      "field": "bestand"
    }
  ],
  "ausgaben": [
    {
      "kind": "choice",
      "field": "status",
      "count": 4
    },
    {
      "kind": "record",
      "field": "gegenstand",
      "targetEntity": "inventar"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "lagerorte": [
    "bezeichnung"
  ],
  "lieferanten": [
    "firmenname"
  ],
  "inventar": [
    "bezeichnung"
  ],
  "ausgaben": [
    "person_vorname"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
function displayPart(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
