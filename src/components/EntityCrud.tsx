/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'lagerorte'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.lagerorte.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.lagerorte.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.lagerorte.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.lagerorte              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   lagerorte: bezeichnung, bereich, regal, fach, bemerkung  ·  ← inventar (list + contextual +)
 *   lieferanten: firmenname, ansprechpartner_vorname, ansprechpartner_nachname, email, telefon, strasse, hausnummer, postleitzahl, …  ·  ← inventar (list + contextual +)
 *   inventar: bezeichnung, inventarnummer, kategorie, hersteller, modell, seriennummer, foto, anschaffungsdatum, …  ·  → lagerorte · → lieferanten · ← ausgaben (list + contextual +)
 *   ausgaben: gegenstand, person_vorname, person_nachname, menge, ausgabedatum, geplantes_rueckgabedatum, tatsaechliches_rueckgabedatum, status, …  ·  → inventar
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Lagerorte, Lieferanten, Inventar, Ausgaben } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichInventar, enrichAusgaben } from '@/lib/enrich';
import type { EnrichedInventar, EnrichedAusgaben } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { LagerorteDialog, type LagerorteDialogDefaults } from '@/components/dialogs/LagerorteDialog';
import { LagerorteDetails } from '@/components/details/LagerorteDetails';
import { LieferantenDialog, type LieferantenDialogDefaults } from '@/components/dialogs/LieferantenDialog';
import { LieferantenDetails } from '@/components/details/LieferantenDetails';
import { InventarDialog, type InventarDialogDefaults } from '@/components/dialogs/InventarDialog';
import { InventarDetails } from '@/components/details/InventarDetails';
import { AusgabenDialog, type AusgabenDialogDefaults } from '@/components/dialogs/AusgabenDialog';
import { AusgabenDetails } from '@/components/details/AusgabenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'lagerorte'; record: Lagerorte }
  | { type: 'lieferanten'; record: Lieferanten }
  | { type: 'inventar'; record: EnrichedInventar }
  | { type: 'ausgaben'; record: EnrichedAusgaben };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  lagerorte: EntityCrudApi<Lagerorte, LagerorteDialogDefaults>;
  lieferanten: EntityCrudApi<Lieferanten, LieferantenDialogDefaults>;
  inventar: EntityCrudApi<Inventar, InventarDialogDefaults>;
  ausgaben: EntityCrudApi<Ausgaben, AusgabenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { lagerorte: Lagerorte[]; lieferanten: Lieferanten[]; inventar: EnrichedInventar[]; ausgaben: EnrichedAusgaben[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [lagerorteDialog, setLagerorteDialog] = useState<{ defaults?: LagerorteDialogDefaults; editing?: Lagerorte } | null>(null);
  const [lieferantenDialog, setLieferantenDialog] = useState<{ defaults?: LieferantenDialogDefaults; editing?: Lieferanten } | null>(null);
  const [inventarDialog, setInventarDialog] = useState<{ defaults?: InventarDialogDefaults; editing?: Inventar } | null>(null);
  const [ausgabenDialog, setAusgabenDialog] = useState<{ defaults?: AusgabenDialogDefaults; editing?: Ausgaben } | null>(null);
  const enrichedInventar = useMemo(() => enrichInventar(data.inventar, { lagerorteMap: data.lagerorteMap, lieferantenMap: data.lieferantenMap }), [data.inventar, data.lagerorteMap, data.lieferantenMap]);
  const enrichedAusgaben = useMemo(() => enrichAusgaben(data.ausgaben, { inventarMap: data.inventarMap }), [data.ausgaben, data.inventarMap]);

  function detailLagerorte(record: Lagerorte, push = false) {
    const item: OverlayItem = { type: 'lagerorte', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitLagerorte(fields: Lagerorte['fields']) {
    const editing = lagerorteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setLagerorte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateLagerorteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('lagerorte')} — ${t('crud_updated')}`, async () => {
        data.setLagerorte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateLagerorteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createLagerorteEntry(fields);
      undoToast(`${appLabel('lagerorte')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailLieferanten(record: Lieferanten, push = false) {
    const item: OverlayItem = { type: 'lieferanten', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitLieferanten(fields: Lieferanten['fields']) {
    const editing = lieferantenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setLieferanten(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateLieferantenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('lieferanten')} — ${t('crud_updated')}`, async () => {
        data.setLieferanten(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateLieferantenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createLieferantenEntry(fields);
      undoToast(`${appLabel('lieferanten')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailInventar(record: Inventar, push = false) {
    const rec = enrichedInventar.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'inventar', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitInventar(fields: Inventar['fields']) {
    const editing = inventarDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setInventar(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateInventarEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('inventar')} — ${t('crud_updated')}`, async () => {
        data.setInventar(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateInventarEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createInventarEntry(fields);
      undoToast(`${appLabel('inventar')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAusgaben(record: Ausgaben, push = false) {
    const rec = enrichedAusgaben.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'ausgaben', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAusgaben(fields: Ausgaben['fields']) {
    const editing = ausgabenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAusgaben(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAusgabenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('ausgaben')} — ${t('crud_updated')}`, async () => {
        data.setAusgaben(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAusgabenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAusgabenEntry(fields);
      undoToast(`${appLabel('ausgaben')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <LagerorteDialog
        open={lagerorteDialog !== null}
        onClose={() => setLagerorteDialog(null)}
        onSubmit={submitLagerorte}
        defaultValues={lagerorteDialog?.defaults}
        recordId={lagerorteDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Lagerorte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Lagerorte']}
      />
      <LieferantenDialog
        open={lieferantenDialog !== null}
        onClose={() => setLieferantenDialog(null)}
        onSubmit={submitLieferanten}
        defaultValues={lieferantenDialog?.defaults}
        recordId={lieferantenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Lieferanten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Lieferanten']}
      />
      <InventarDialog
        open={inventarDialog !== null}
        onClose={() => setInventarDialog(null)}
        onSubmit={submitInventar}
        defaultValues={inventarDialog?.defaults}
        recordId={inventarDialog?.editing?.record_id}
        lagerorteList={data.lagerorte}
        lieferantenList={data.lieferanten}
        enablePhotoScan={AI_PHOTO_SCAN['Inventar']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Inventar']}
      />
      <AusgabenDialog
        open={ausgabenDialog !== null}
        onClose={() => setAusgabenDialog(null)}
        onSubmit={submitAusgaben}
        defaultValues={ausgabenDialog?.defaults}
        recordId={ausgabenDialog?.editing?.record_id}
        inventarList={data.inventar}
        enablePhotoScan={AI_PHOTO_SCAN['Ausgaben']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Ausgaben']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'lagerorte') {
            return (
              <>
                <RecordHeader title={top.record.fields.bezeichnung ?? appLabel('lagerorte')} subtitle={undefined} />
                <LagerorteDetails
                  record={top.record}
                  inventarList={data.inventar}
                  onOpenInventar={(r) => detailInventar(r, true)}
                  onAddInventar={perms.canWrite('inventar') ? () => setInventarDialog({ defaults: { lagerort: createRecordUrl(APP_IDS.LAGERORTE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'lieferanten') {
            return (
              <>
                <RecordHeader title={top.record.fields.firmenname ?? appLabel('lieferanten')} subtitle={undefined} />
                <LieferantenDetails
                  record={top.record}
                  inventarList={data.inventar}
                  onOpenInventar={(r) => detailInventar(r, true)}
                  onAddInventar={perms.canWrite('inventar') ? () => setInventarDialog({ defaults: { lieferant: createRecordUrl(APP_IDS.LIEFERANTEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'inventar') {
            return (
              <>
                <RecordHeader title={top.record.fields.bezeichnung ?? appLabel('inventar')} subtitle={top.record.fields.anschaffungsdatum ? formatDate(top.record.fields.anschaffungsdatum) : undefined} />
                <InventarDetails
                  record={top.record}
                  lagerorteList={data.lagerorte}
                  onOpenLagerorte={(r) => detailLagerorte(r, true)}
                  lieferantenList={data.lieferanten}
                  onOpenLieferanten={(r) => detailLieferanten(r, true)}
                  ausgabenList={data.ausgaben}
                  onOpenAusgaben={(r) => detailAusgaben(r, true)}
                  onAddAusgaben={perms.canWrite('ausgaben') ? () => setAusgabenDialog({ defaults: { gegenstand: createRecordUrl(APP_IDS.INVENTAR, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'ausgaben') {
            return (
              <>
                <RecordHeader title={top.record.fields.person_vorname ?? appLabel('ausgaben')} subtitle={top.record.fields.ausgabedatum ? formatDate(top.record.fields.ausgabedatum) : undefined} />
                <AusgabenDetails
                  record={top.record}
                  inventarList={data.inventar}
                  onOpenInventar={(r) => detailInventar(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'lagerorte') return perms.canWrite('lagerorte');
          if (top.type === 'lieferanten') return perms.canWrite('lieferanten');
          if (top.type === 'inventar') return perms.canWrite('inventar');
          if (top.type === 'ausgaben') return perms.canWrite('ausgaben');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'lagerorte') setLagerorteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'lieferanten') setLieferantenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'inventar') setInventarDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'ausgaben') setAusgabenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    lagerorte: {
      openCreate: (defaults?: LagerorteDialogDefaults) => (perms.canWrite('lagerorte') ? setLagerorteDialog({ defaults }) : refuse()),
      openEdit: (record: Lagerorte) => (perms.canWrite('lagerorte') ? setLagerorteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Lagerorte) => detailLagerorte(record, false),
      canWrite: perms.canWrite('lagerorte'),
    },
    lieferanten: {
      openCreate: (defaults?: LieferantenDialogDefaults) => (perms.canWrite('lieferanten') ? setLieferantenDialog({ defaults }) : refuse()),
      openEdit: (record: Lieferanten) => (perms.canWrite('lieferanten') ? setLieferantenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Lieferanten) => detailLieferanten(record, false),
      canWrite: perms.canWrite('lieferanten'),
    },
    inventar: {
      openCreate: (defaults?: InventarDialogDefaults) => (perms.canWrite('inventar') ? setInventarDialog({ defaults }) : refuse()),
      openEdit: (record: Inventar) => (perms.canWrite('inventar') ? setInventarDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Inventar) => detailInventar(record, false),
      canWrite: perms.canWrite('inventar'),
    },
    ausgaben: {
      openCreate: (defaults?: AusgabenDialogDefaults) => (perms.canWrite('ausgaben') ? setAusgabenDialog({ defaults }) : refuse()),
      openEdit: (record: Ausgaben) => (perms.canWrite('ausgaben') ? setAusgabenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Ausgaben) => detailAusgaben(record, false),
      canWrite: perms.canWrite('ausgaben'),
    },
    enriched: { lagerorte: data.lagerorte, lieferanten: data.lieferanten, inventar: enrichedInventar, ausgaben: enrichedAusgaben },
  };
}
