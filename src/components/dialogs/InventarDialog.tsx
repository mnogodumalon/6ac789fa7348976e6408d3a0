/**
 * InventarDialog — pre-generated create/edit dialog for Inventar.
 *
 * Props: open, onClose, onSubmit(fields) => Promise<void>, defaultValues?,
 * recordId? (pass when EDITING — enables the attachments section),
 * lagerorteList (full hook array — resolves the Lagerorte applookup),
 * lieferantenList (full hook array — resolves the Lieferanten applookup),
 * enablePhotoScan?, enablePhotoLocation?.
 *
 * defaultValues is SHAPE-TOLERANT and its prop type is the EXPORTED
 * InventarDialogDefaults — NOT the entity field type: lookup fields accept
 * the bare KEY string (or LookupValue), applookup fields the bare record id
 * (or record URL); the dialog normalizes. Type prefill STATE with the export:
 *  ❌ useState<Partial<Inventar['fields']>>({ … })   // LookupValue fields reject string prefills (TS2322)
 *  ✓ useState<InventarDialogDefaults | undefined>(undefined)
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Inventar, Lagerorte, Lieferanten, LookupValue } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, uploadFile, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Inventar';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { requiredMessage } from '@/lib/journey/messages';
import { t, appLabel, fieldLabel, lookupLabel, localeTag, CURRENCY } from '@/i18n';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/Combobox';
import { LagerorteDialog } from '@/components/dialogs/LagerorteDialog';
import { LieferantenDialog } from '@/components/dialogs/LieferantenDialog';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircle, IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

/** Widened prefill type for InventarDialog.defaultValues — see file header. */
export type InventarDialogDefaults = Omit<Inventar['fields'], 'kategorie' | 'zustand'> & {
    kategorie?: LookupValue | string;
    zustand?: LookupValue | string;
  };

interface InventarDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Inventar['fields']) => Promise<void>;
  /** SHAPE-TOLERANT: lookup fields accept the bare key (string) or the
   *  LookupValue object; applookup fields the bare record id or the full
   *  record URL — the dialog normalizes both. */
  defaultValues?: InventarDialogDefaults;
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  lagerorteList: Lagerorte[];
  lieferantenList: Lieferanten[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

// defaultValues are SHAPE-TOLERANT: the dialog resolves bare lookup keys via
// its own options and bare record ids via the field's target app — consumers
// never carry the LookupValue/record-URL shape in their head.
const NORMALIZE_LOOKUPS: Record<string, readonly { key: string; label: string }[]> = {
  kategorie: LOOKUP_OPTIONS['inventar']?.['kategorie'] ?? [],
  zustand: LOOKUP_OPTIONS['inventar']?.['zustand'] ?? [],
};
const NORMALIZE_APPLOOKUPS: Record<string, string> = {
  lagerort: APP_IDS.LAGERORTE,
  lieferant: APP_IDS.LIEFERANTEN,
};
function normalizeDefaults(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [k, opts] of Object.entries(NORMALIZE_LOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string') out[k] = opts.find(o => o.key === v) ?? { key: v, label: v };
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' ? opts.find(o => o.key === x) ?? { key: x, label: x } : x));
  }
  for (const [k, appId] of Object.entries(NORMALIZE_APPLOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string' && v !== '' && !v.startsWith('http')) out[k] = createRecordUrl(appId, v);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' && x !== '' && !x.startsWith('http') ? createRecordUrl(appId, x) : x));
  }
  return out;
}

export function InventarDialog({ open, onClose, onSubmit, defaultValues, recordId, lagerorteList, lieferantenList, enablePhotoScan = true, enablePhotoLocation = true }: InventarDialogProps) {
  const [fields, setFields] = useState<Partial<Inventar['fields']>>({});
  const [saving, setSaving] = useState(false);
  const normalizedDefaults = useMemo<Record<string, unknown> | undefined>(
    () => (defaultValues ? normalizeDefaults(defaultValues as Record<string, unknown>) : undefined),
    [defaultValues],
  );
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!normalizedDefaults) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(normalizedDefaults);
    } catch {
      return true;
    }
  }, [fields, normalizedDefaults]);
  // Inline-Create state for "Lagerorte" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraLagerorte` list, and select it in
  // the originating Combobox via the captured `createLagerorteField`.
  const [createLagerorteOpen, setCreateLagerorteOpen] = useState(false);
  const [createLagerorteInitial, setCreateLagerorteInitial] = useState('');
  const [createLagerorteField, setCreateLagerorteField] = useState<string>('');
  const [extraLagerorte, setExtraLagerorte] = useState< Lagerorte[]>([]);
  const lagerorteListAll = useMemo(
    () => [...lagerorteList, ...extraLagerorte],
    [lagerorteList, extraLagerorte],
  );
  function openCreateLagerorte(fieldKey: string, q: string) {
    setCreateLagerorteField(fieldKey);
    setCreateLagerorteInitial(q);
    setCreateLagerorteOpen(true);
  }
  // Inline-Create state for "Lieferanten" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraLieferanten` list, and select it in
  // the originating Combobox via the captured `createLieferantenField`.
  const [createLieferantenOpen, setCreateLieferantenOpen] = useState(false);
  const [createLieferantenInitial, setCreateLieferantenInitial] = useState('');
  const [createLieferantenField, setCreateLieferantenField] = useState<string>('');
  const [extraLieferanten, setExtraLieferanten] = useState< Lieferanten[]>([]);
  const lieferantenListAll = useMemo(
    () => [...lieferantenList, ...extraLieferanten],
    [lieferantenList, extraLieferanten],
  );
  function openCreateLieferanten(fieldKey: string, q: string) {
    setCreateLieferantenField(fieldKey);
    setCreateLieferantenInitial(q);
    setCreateLieferantenOpen(true);
  }
  // Fields the plan assigns to a tool (empty without a plan).
  const SYSTEM_ASSIGNED: string[] = [];
  const [showErrors, setShowErrors] = useState(false);
  const REQUIRED_FIELDS = ['bezeichnung'] as const;
  const missingRequired = REQUIRED_FIELDS.filter(k => {
    const v = (fields as Record<string, unknown>)[k];
    return v == null || v === '' || (Array.isArray(v) && v.length === 0);
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      'lagerort': lagerorteList,
      'lieferant': lieferantenList,
    },
  }), [lagerorteList, lieferantenList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults(normalizedDefaults ?? {}, formEnhancements.defaults) as Partial<Inventar['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
      setSubmitError(null);
    }
  }, [open, normalizedDefaults]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  // Submit errors surface IN the dialog (it is modal — a banner in the page
  // body would be hidden behind it). A consumer onSubmit that THROWS (the
  // documented "throw to prevent closing" validation pattern) lands here:
  // the dialog stays open, nothing is saved, the message is visible.
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missingRequired.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'inventar');
      await onSubmit(clean as Inventar['fields']);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : t('submit_error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="lagerort" entity="Lagerorte">\n${JSON.stringify(lagerorteList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="lieferant" entity="Lieferanten">\n${JSON.stringify(lieferantenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "bezeichnung": string | null, // Bezeichnung\n  "inventarnummer": string | null, // Inventarnummer\n  "kategorie": LookupValue | null, // Kategorie (select one key: "werkzeug" | "maschine" | "messmittel" | "verbrauchsmaterial" | "schutzausruestung" | "sonstiges") mapping: werkzeug=Werkzeug, maschine=Maschine, messmittel=Messmittel, verbrauchsmaterial=Verbrauchsmaterial, schutzausruestung=Schutzausrüstung, sonstiges=Sonstiges\n  "hersteller": string | null, // Hersteller\n  "modell": string | null, // Modell\n  "seriennummer": string | null, // Seriennummer\n  "anschaffungsdatum": string | null, // YYYY-MM-DD\n  "anschaffungspreis": number | null, // Anschaffungspreis in Euro\n  "bestand": number | null, // Bestand\n  "mindestbestand": number | null, // Mindestbestand\n  "zustand": LookupValue | null, // Zustand (select one key: "neu" | "gut" | "gebraucht" | "reparaturbeduerftig" | "defekt") mapping: neu=Neu, gut=Gut, gebraucht=Gebraucht, reparaturbeduerftig=Reparaturbedürftig, defekt=Defekt\n  "lagerort": string | null, // Display name from Lagerorte (see <available-records>)\n  "lieferant": string | null, // Display name from Lieferanten (see <available-records>)\n  "naechste_pruefung": string | null, // YYYY-MM-DD\n  "bemerkung": string | null, // Bemerkung\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["lagerort", "lieferant"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const lagerortName = raw['lagerort'] as string | null;
        if (lagerortName) {
          const lagerortMatch = lagerorteList.find(r => matchName(lagerortName!, [String(r.fields.bezeichnung ?? '')]));
          if (lagerortMatch) merged['lagerort'] = createRecordUrl(APP_IDS.LAGERORTE, lagerortMatch.record_id);
        }
        const lieferantName = raw['lieferant'] as string | null;
        if (lieferantName) {
          const lieferantMatch = lieferantenList.find(r => matchName(lieferantName!, [String(r.fields.firmenname ?? '')]));
          if (lieferantMatch) merged['lieferant'] = createRecordUrl(APP_IDS.LIEFERANTEN, lieferantMatch.record_id);
        }
        return merged as Partial<Inventar['fields']>;
      });
      // Upload scanned file to file fields
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        try {
          const blob = dataUriToBlob(uri!);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, foto: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error(`${t('scan_error')}:`, err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues
    ? t('edit_entity', { entity: appLabel('inventar') })
    : t('new_entity', { entity: appLabel('inventar') });

  const fieldBlocks: Record<string, React.ReactNode> = {
    'bezeichnung': (
      <div key="bezeichnung" className="space-y-1.5">
        <Label htmlFor="bezeichnung">{fieldLabel('inventar', 'bezeichnung')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="bezeichnung"
          placeholder="z. B. Akkuschrauber"
          value={fields.bezeichnung ?? ''}
          onChange={e => setFields(f => ({ ...f, bezeichnung: e.target.value }))}
          required
        />
        {showErrors && !fields.bezeichnung && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('inventar', 'bezeichnung')}</p>
        )}
      </div>
    ),
    'inventarnummer': (
      <div key="inventarnummer" className="space-y-1.5">
        <Label htmlFor="inventarnummer">{fieldLabel('inventar', 'inventarnummer')}</Label>
        <Input
          id="inventarnummer"
          placeholder="z. B. INV-2026-001"
          value={fields.inventarnummer ?? ''}
          onChange={e => setFields(f => ({ ...f, inventarnummer: e.target.value }))}
        />
      </div>
    ),
    'kategorie': (
      <div key="kategorie" className="space-y-1.5">
        <Label htmlFor="kategorie">{fieldLabel('inventar', 'kategorie')}</Label>
        <Select
          value={lookupKey(fields.kategorie) ?? ''}
          onValueChange={v => setFields(f => ({ ...f, kategorie: v === 'none' ? undefined : v as any }))}
        >
          <SelectTrigger id="kategorie" className="max-sm:h-11"><SelectValue placeholder="z. B. Werkzeug, Maschine" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            <SelectItem value="werkzeug">{lookupLabel('inventar', 'kategorie', 'werkzeug') ?? 'Werkzeug'}</SelectItem>
            <SelectItem value="maschine">{lookupLabel('inventar', 'kategorie', 'maschine') ?? 'Maschine'}</SelectItem>
            <SelectItem value="messmittel">{lookupLabel('inventar', 'kategorie', 'messmittel') ?? 'Messmittel'}</SelectItem>
            <SelectItem value="verbrauchsmaterial">{lookupLabel('inventar', 'kategorie', 'verbrauchsmaterial') ?? 'Verbrauchsmaterial'}</SelectItem>
            <SelectItem value="schutzausruestung">{lookupLabel('inventar', 'kategorie', 'schutzausruestung') ?? 'Schutzausrüstung'}</SelectItem>
            <SelectItem value="sonstiges">{lookupLabel('inventar', 'kategorie', 'sonstiges') ?? 'Sonstiges'}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    ),
    'hersteller': (
      <div key="hersteller" className="space-y-1.5">
        <Label htmlFor="hersteller">{fieldLabel('inventar', 'hersteller')}</Label>
        <Input
          id="hersteller"
          placeholder="z. B. Bosch"
          value={fields.hersteller ?? ''}
          onChange={e => setFields(f => ({ ...f, hersteller: e.target.value }))}
        />
      </div>
    ),
    'modell': (
      <div key="modell" className="space-y-1.5">
        <Label htmlFor="modell">{fieldLabel('inventar', 'modell')}</Label>
        <Input
          id="modell"
          placeholder="z. B. GSR 18V-55"
          value={fields.modell ?? ''}
          onChange={e => setFields(f => ({ ...f, modell: e.target.value }))}
        />
      </div>
    ),
    'seriennummer': (
      <div key="seriennummer" className="space-y-1.5">
        <Label htmlFor="seriennummer">{fieldLabel('inventar', 'seriennummer')}</Label>
        <Input
          id="seriennummer"
          placeholder="z. B. SN-123456"
          value={fields.seriennummer ?? ''}
          onChange={e => setFields(f => ({ ...f, seriennummer: e.target.value }))}
        />
      </div>
    ),
    'foto': (
      <div key="foto" className="space-y-1.5">
        <Label htmlFor="foto">{fieldLabel('inventar', 'foto')}</Label>
        {fields.foto ? (
          <div className="flex items-center gap-3 rounded-lg border p-2">
            <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <IconFileText size={20} className="text-muted-foreground" />
              </div>
              <img
                src={fields.foto}
                alt=""
                className="relative h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate text-foreground">{fields.foto.split("/").pop()}</p>
              <div className="flex gap-2 mt-1">
                <label
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {t('fr_change')}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const fileUrl = await uploadFile(file, file.name);
                        setFields(f => ({ ...f, foto: fileUrl }));
                      } catch (err) { console.error('Upload failed:', err); }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setFields(f => ({ ...f, foto: undefined }))}
                >
                  {t('fr_remove')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label
            className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <IconUpload size={20} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('fr_upload_file')}</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const fileUrl = await uploadFile(file, file.name);
                  setFields(f => ({ ...f, foto: fileUrl }));
                } catch (err) { console.error('Upload failed:', err); }
              }}
            />
          </label>
        )}
      </div>
    ),
    'anschaffungsdatum': (
      <div key="anschaffungsdatum" className="space-y-1.5">
        <Label htmlFor="anschaffungsdatum">{fieldLabel('inventar', 'anschaffungsdatum')}</Label>
        <DatePicker
          id="anschaffungsdatum"
          placeholder="Wann wurde es angeschafft?"
          mode="date"
          value={fields.anschaffungsdatum ?? null}
          onChange={v => setFields(f => ({ ...f, anschaffungsdatum: v ?? undefined }))}
        />
      </div>
    ),
    'anschaffungspreis': (
      <div key="anschaffungspreis" className="space-y-1.5">
        <Label htmlFor="anschaffungspreis">{fieldLabel('inventar', 'anschaffungspreis')}</Label>
        <Input
          id="anschaffungspreis"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'anschaffungspreis')}
          placeholder="z. B. 249,90"
          value={fields.anschaffungspreis !== undefined ? fields.anschaffungspreis : (computedValues['anschaffungspreis'] ?? '')}
          onChange={e => setFields(f => ({ ...f, anschaffungspreis: clampNumberValue(formEnhancements, 'anschaffungspreis', e.target.value) }))}
        />
      </div>
    ),
    'bestand': (
      <div key="bestand" className="space-y-1.5">
        <Label htmlFor="bestand">{fieldLabel('inventar', 'bestand')}</Label>
        <Input
          id="bestand"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'bestand')}
          placeholder="z. B. 5"
          value={fields.bestand !== undefined ? fields.bestand : (computedValues['bestand'] ?? '')}
          onChange={e => setFields(f => ({ ...f, bestand: clampNumberValue(formEnhancements, 'bestand', e.target.value) }))}
        />
      </div>
    ),
    'mindestbestand': (
      <div key="mindestbestand" className="space-y-1.5">
        <Label htmlFor="mindestbestand">{fieldLabel('inventar', 'mindestbestand')}</Label>
        <Input
          id="mindestbestand"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'mindestbestand')}
          placeholder="z. B. 2"
          value={fields.mindestbestand !== undefined ? fields.mindestbestand : (computedValues['mindestbestand'] ?? '')}
          onChange={e => setFields(f => ({ ...f, mindestbestand: clampNumberValue(formEnhancements, 'mindestbestand', e.target.value) }))}
        />
      </div>
    ),
    'zustand': (
      <div key="zustand" className="space-y-1.5">
        <Label htmlFor="zustand">{fieldLabel('inventar', 'zustand')}</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.zustand) === 'neu'}
            onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'neu' ? undefined : 'neu') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.zustand) === 'neu'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('inventar', 'zustand', 'neu') ?? 'Neu'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.zustand) === 'gut'}
            onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'gut' ? undefined : 'gut') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.zustand) === 'gut'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('inventar', 'zustand', 'gut') ?? 'Gut'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.zustand) === 'gebraucht'}
            onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'gebraucht' ? undefined : 'gebraucht') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.zustand) === 'gebraucht'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('inventar', 'zustand', 'gebraucht') ?? 'Gebraucht'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.zustand) === 'reparaturbeduerftig'}
            onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'reparaturbeduerftig' ? undefined : 'reparaturbeduerftig') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.zustand) === 'reparaturbeduerftig'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('inventar', 'zustand', 'reparaturbeduerftig') ?? 'Reparaturbedürftig'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.zustand) === 'defekt'}
            onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'defekt' ? undefined : 'defekt') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.zustand) === 'defekt'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('inventar', 'zustand', 'defekt') ?? 'Defekt'}
          </button>
        </div>
      </div>
    ),
    'lagerort': (
      <div key="lagerort" className="space-y-1.5">
        <Label htmlFor="lagerort">{fieldLabel('inventar', 'lagerort')}</Label>
        <Combobox
          id="lagerort"
          placeholder="Welcher Lagerort?"
          items={lagerorteListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.bezeichnung ?? r.record_id),
          }))}
          value={extractRecordId(fields.lagerort)}
          onChange={id => setFields(f => ({ ...f, lagerort: id ? createRecordUrl(APP_IDS.LAGERORTE, id) : undefined }))}
          onCreateNew={(q) => openCreateLagerorte("lagerort", q)}
          createLabel={t('create_in', { entity: appLabel('lagerorte') })}
        />
      </div>
    ),
    'lieferant': (
      <div key="lieferant" className="space-y-1.5">
        <Label htmlFor="lieferant">{fieldLabel('inventar', 'lieferant')}</Label>
        <Combobox
          id="lieferant"
          placeholder="Welcher Lieferant?"
          items={lieferantenListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.firmenname ?? r.record_id),
          }))}
          value={extractRecordId(fields.lieferant)}
          onChange={id => setFields(f => ({ ...f, lieferant: id ? createRecordUrl(APP_IDS.LIEFERANTEN, id) : undefined }))}
          onCreateNew={(q) => openCreateLieferanten("lieferant", q)}
          createLabel={t('create_in', { entity: appLabel('lieferanten') })}
        />
      </div>
    ),
    'naechste_pruefung': (
      <div key="naechste_pruefung" className="space-y-1.5">
        <Label htmlFor="naechste_pruefung">{fieldLabel('inventar', 'naechste_pruefung')}</Label>
        <DatePicker
          id="naechste_pruefung"
          placeholder="Wann ist die nächste Prüfung?"
          mode="date"
          value={fields.naechste_pruefung ?? null}
          onChange={v => setFields(f => ({ ...f, naechste_pruefung: v ?? undefined }))}
        />
      </div>
    ),
    'bemerkung': (
      <div key="bemerkung" className="space-y-1.5">
        <Label htmlFor="bemerkung">{fieldLabel('inventar', 'bemerkung')}</Label>
        <Textarea
          id="bemerkung"
          placeholder="Notizen zum Gegenstand"
          value={fields.bemerkung ?? ''}
          onChange={e => setFields(f => ({ ...f, bemerkung: e.target.value }))}
          rows={3}
        />
      </div>
    ),
  };
  const orderedFields = applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"bezeichnung": "Bezeichnung", "inventarnummer": "Inventarnummer", "kategorie": "Kategorie", "hersteller": "Hersteller", "modell": "Modell", "seriennummer": "Seriennummer", "foto": "Foto", "anschaffungsdatum": "Anschaffungsdatum", "anschaffungspreis": "Anschaffungspreis in Euro", "bestand": "Bestand", "mindestbestand": "Mindestbestand", "zustand": "Zustand", "lagerort": "Lagerort", "lieferant": "Lieferant", "naechste_pruefung": "Nächste Prüfung", "bemerkung": "Bemerkung"};
  const CURRENCY_KEYS = new Set<string>(["anschaffungspreis"]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"lagerort": {"bezeichnung": "Bezeichnung", "bereich": "Bereich / Halle", "regal": "Regal", "fach": "Fach", "bemerkung": "Bemerkung"}, "lieferant": {"firmenname": "Firmenname", "ansprechpartner_vorname": "Vorname Ansprechpartner", "ansprechpartner_nachname": "Nachname Ansprechpartner", "email": "E-Mail", "telefon": "Telefon", "strasse": "Straße", "hausnummer": "Hausnummer", "postleitzahl": "Postleitzahl", "ort": "Ort", "webseite": "Webseite"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0 max-sm:[&>button]:size-10 max-sm:[&>button]:grid max-sm:[&>button]:place-items-center max-sm:[&>button]:rounded-full max-sm:[&>button]:border max-sm:[&>button]:border-input max-sm:[&>button]:bg-background max-sm:[&>button]:opacity-100 max-sm:[&>button>svg]:size-5">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 max-sm:py-2.5 max-sm:px-4 text-xs font-semibold transition-all mr-7 max-sm:mr-12 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">{t('smart_fill')}</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">{t('scan_header_sub')}</p>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  {t('useinfo_label')}
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? t('useinfo_loading') : `(${t('useinfo_more')})`}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">{t('profile_preamble')}</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">{t('useinfo_error')}</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_analyzing')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_analyzing_sub')}</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('scan_success')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_success_sub')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_upload')}</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />{t('scan_camera_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />{t('scan_file_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />{t('scan_doc_btn')}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder={t('scan_text_placeholder')}
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title={t('paste')}
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />{t('scan_text_analyze')}
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0 max-sm:[&_input]:h-11">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                // A field the plan gives to a TOOL. On CREATE it is not shown
                // at all — the value does not exist yet and typing one only
                // gets overwritten. On EDIT it stays a normal input with a
                // note: when a tool could not compose its value (a missing
                // ingredient), this is the only place to repair the record.
                if (SYSTEM_ASSIGNED.includes(k) && !recordId) {
                  return (
                    <div key={k} className="space-y-1.5 min-w-0">
                      <Label>{fieldLabel('inventar', k)}</Label>
                      <p className="text-sm text-muted-foreground">{t('assigned_by_system')}</p>
                    </div>
                  );
                }
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {SYSTEM_ASSIGNED.includes(k) && (
                      <p className="text-xs text-muted-foreground">{t('assigned_by_system')}</p>
                    )}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {showErrors && missingRequired.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1.5" role="alert">
                <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                {t('missing_required')}
              </p>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS.INVENTAR} recordId={recordId} />
              </div>
            )}
          </div>
          {submitError && (
            <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/10 px-6 py-2.5 text-sm text-destructive" role="alert">
              <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{submitError}</span>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2 max-sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="max-sm:h-12 max-sm:flex-1 max-sm:text-base">{t('cancel')}</Button>
            <Button
              type="submit"
              className="max-sm:h-12 max-sm:flex-1 max-sm:text-base"
              disabled={saving || !isDirty || (showErrors && missingRequired.length > 0)}
            >
              {saving ? t('saving') : defaultValues ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createLagerorteOpen && (
      <LagerorteDialog
        open={createLagerorteOpen}
        onClose={() => setCreateLagerorteOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createLagerorteEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Lagerorte;
            setExtraLagerorte(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.LAGERORTE, result.id);
            setFields(prev => ({ ...prev, [createLagerorteField]: url } as any));
          }
          setCreateLagerorteOpen(false);
        }}
        defaultValues={createLagerorteInitial
          ? ({ bezeichnung: createLagerorteInitial } as any)
          : undefined}
      />
    )}
    {createLieferantenOpen && (
      <LieferantenDialog
        open={createLieferantenOpen}
        onClose={() => setCreateLieferantenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createLieferantenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Lieferanten;
            setExtraLieferanten(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.LIEFERANTEN, result.id);
            setFields(prev => ({ ...prev, [createLieferantenField]: url } as any));
          }
          setCreateLieferantenOpen(false);
        }}
        defaultValues={createLieferantenInitial
          ? ({ firmenname: createLieferantenInitial } as any)
          : undefined}
      />
    )}
    </>
  );
}