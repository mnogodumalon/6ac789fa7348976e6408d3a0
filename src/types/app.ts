import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Lagerorte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    bereich?: string;
    regal?: string;
    fach?: string;
    bemerkung?: string;
  };
}

export interface Lieferanten {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    firmenname?: string;
    ansprechpartner_vorname?: string;
    ansprechpartner_nachname?: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
    postleitzahl?: string;
    ort?: string;
    webseite?: string;
  };
}

export interface Inventar {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    inventarnummer?: string;
    kategorie?: LookupValue;
    hersteller?: string;
    modell?: string;
    seriennummer?: string;
    foto?: string;
    anschaffungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    anschaffungspreis?: number;
    bestand?: number;
    mindestbestand?: number;
    zustand?: LookupValue;
    lagerort?: RecordUrl; // applookup -> URL zu 'Lagerorte' Record
    lieferant?: RecordUrl; // applookup -> URL zu 'Lieferanten' Record
    naechste_pruefung?: string; // Format: YYYY-MM-DD oder ISO String
    bemerkung?: string;
  };
}

export interface Ausgaben {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    gegenstand?: RecordUrl; // applookup -> URL zu 'Inventar' Record
    person_vorname?: string;
    person_nachname?: string;
    menge?: number;
    ausgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    geplantes_rueckgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    tatsaechliches_rueckgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    bemerkung?: string;
  };
}

export const APP_IDS = {
  LAGERORTE: '6ac789dc18dfd1c7058f600d',
  LIEFERANTEN: '6ac789e0fde48653ee9b7aa8',
  INVENTAR: '6ac789e0e48dd941e4fe8305',
  AUSGABEN: '6ac789e2e93eef30ca2b68c7',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'inventar': {
    kategorie: [{ key: "werkzeug", get label() { return lookupLabel('inventar', 'kategorie', "werkzeug") ?? "Werkzeug"; } }, { key: "maschine", get label() { return lookupLabel('inventar', 'kategorie', "maschine") ?? "Maschine"; } }, { key: "messmittel", get label() { return lookupLabel('inventar', 'kategorie', "messmittel") ?? "Messmittel"; } }, { key: "verbrauchsmaterial", get label() { return lookupLabel('inventar', 'kategorie', "verbrauchsmaterial") ?? "Verbrauchsmaterial"; } }, { key: "schutzausruestung", get label() { return lookupLabel('inventar', 'kategorie', "schutzausruestung") ?? "Schutzausrüstung"; } }, { key: "sonstiges", get label() { return lookupLabel('inventar', 'kategorie', "sonstiges") ?? "Sonstiges"; } }],
    zustand: [{ key: "neu", get label() { return lookupLabel('inventar', 'zustand', "neu") ?? "Neu"; } }, { key: "gut", get label() { return lookupLabel('inventar', 'zustand', "gut") ?? "Gut"; } }, { key: "gebraucht", get label() { return lookupLabel('inventar', 'zustand', "gebraucht") ?? "Gebraucht"; } }, { key: "reparaturbeduerftig", get label() { return lookupLabel('inventar', 'zustand', "reparaturbeduerftig") ?? "Reparaturbedürftig"; } }, { key: "defekt", get label() { return lookupLabel('inventar', 'zustand', "defekt") ?? "Defekt"; } }],
  },
  'ausgaben': {
    status: [{ key: "ausgegeben", get label() { return lookupLabel('ausgaben', 'status', "ausgegeben") ?? "Ausgegeben"; } }, { key: "zurueckgegeben", get label() { return lookupLabel('ausgaben', 'status', "zurueckgegeben") ?? "Zurückgegeben"; } }, { key: "ueberfaellig", get label() { return lookupLabel('ausgaben', 'status', "ueberfaellig") ?? "Überfällig"; } }, { key: "verbraucht", get label() { return lookupLabel('ausgaben', 'status', "verbraucht") ?? "Verbraucht"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'lagerorte': {
    'bezeichnung': 'string/text',
    'bereich': 'string/text',
    'regal': 'string/text',
    'fach': 'string/text',
    'bemerkung': 'string/textarea',
  },
  'lieferanten': {
    'firmenname': 'string/text',
    'ansprechpartner_vorname': 'string/text',
    'ansprechpartner_nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'postleitzahl': 'string/text',
    'ort': 'string/text',
    'webseite': 'string/url',
  },
  'inventar': {
    'bezeichnung': 'string/text',
    'inventarnummer': 'string/text',
    'kategorie': 'lookup/select',
    'hersteller': 'string/text',
    'modell': 'string/text',
    'seriennummer': 'string/text',
    'foto': 'file',
    'anschaffungsdatum': 'date/date',
    'anschaffungspreis': 'number',
    'bestand': 'number',
    'mindestbestand': 'number',
    'zustand': 'lookup/radio',
    'lagerort': 'applookup/select',
    'lieferant': 'applookup/select',
    'naechste_pruefung': 'date/date',
    'bemerkung': 'string/textarea',
  },
  'ausgaben': {
    'gegenstand': 'applookup/select',
    'person_vorname': 'string/text',
    'person_nachname': 'string/text',
    'menge': 'number',
    'ausgabedatum': 'date/date',
    'geplantes_rueckgabedatum': 'date/date',
    'tatsaechliches_rueckgabedatum': 'date/date',
    'status': 'lookup/radio',
    'bemerkung': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateLagerorte = StripLookup<Lagerorte['fields']>;
export type CreateLieferanten = StripLookup<Lieferanten['fields']>;
export type CreateInventar = StripLookup<Inventar['fields']>;
export type CreateAusgaben = StripLookup<Ausgaben['fields']>;