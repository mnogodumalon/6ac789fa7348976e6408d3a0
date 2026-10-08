import type { Inventar, Lagerorte, Lieferanten, Ausgaben } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface InventarDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Inventar;
  /** N:1-Ziel „Lagerorte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  lagerorteList: Lagerorte[];
  /** Klick auf die Lagerorte-Relation → overlay.push auf dessen Detail. */
  onOpenLagerorte?: (record: Lagerorte) => void;
  /** N:1-Ziel „Lieferanten": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  lieferantenList: Lieferanten[];
  /** Klick auf die Lieferanten-Relation → overlay.push auf dessen Detail. */
  onOpenLieferanten?: (record: Lieferanten) => void;
  /** 1:N „Ausgaben" (gegenstand): VOLLE Liste — der Block filtert auf diesen Record. */
  ausgabenList: Ausgaben[];
  /** Zeilen-Klick → overlay.push auf das Ausgaben-Detail (nie der Edit-Dialog). */
  onOpenAusgaben: (record: Ausgaben) => void;
  /** Kontextuelles „+": öffnet den Ausgaben-Dialog mit diesem Record vorgesetzt. */
  onAddAusgaben?: () => void;
}

export function InventarDetails({
  record,
  lagerorteList,
  onOpenLagerorte,
  lieferantenList,
  onOpenLieferanten,
  ausgabenList,
  onOpenAusgaben,
  onAddAusgaben,
}: InventarDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const lagerortTarget = lagerorteList.find(r => r.record_id === extractRecordId(record.fields.lagerort));
  const lieferantTarget = lieferantenList.find(r => r.record_id === extractRecordId(record.fields.lieferant));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('inventar', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('inventar', 'inventarnummer')} value={record.fields.inventarnummer} format="text" />
        <RecordField label={fieldLabel('inventar', 'kategorie')} value={record.fields.kategorie} format="pill" />
        <RecordField label={fieldLabel('inventar', 'hersteller')} value={record.fields.hersteller} format="text" />
        <RecordField label={fieldLabel('inventar', 'modell')} value={record.fields.modell} format="text" />
        <RecordField label={fieldLabel('inventar', 'seriennummer')} value={record.fields.seriennummer} format="text" />
        <RecordField label={fieldLabel('inventar', 'foto')} className="md:col-span-2">
          {record.fields.foto ? (
            <MediaThumbnail src={record.fields.foto as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('inventar', 'anschaffungsdatum')} value={record.fields.anschaffungsdatum} format="date" />
        <RecordField label={fieldLabel('inventar', 'anschaffungspreis')} value={record.fields.anschaffungspreis} format="text" />
        <RecordField label={fieldLabel('inventar', 'bestand')} value={record.fields.bestand} format="text" />
        <RecordField label={fieldLabel('inventar', 'mindestbestand')} value={record.fields.mindestbestand} format="text" />
        <RecordField label={fieldLabel('inventar', 'zustand')} value={record.fields.zustand} format="pill" />
        <RecordField label={fieldLabel('inventar', 'naechste_pruefung')} value={record.fields.naechste_pruefung} format="date" />
        <RecordField label={fieldLabel('inventar', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('inventar', 'lagerort')}
          name={lagerortTarget?.fields.bezeichnung ?? '—'}
          meta={[lagerortTarget?.fields.bereich, lagerortTarget?.fields.regal].filter(Boolean).join(' · ') || undefined}
          onClick={lagerortTarget && onOpenLagerorte ? () => onOpenLagerorte!(lagerortTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('inventar', 'lieferant')}
          name={lieferantTarget?.fields.firmenname ?? '—'}
          meta={[lieferantTarget?.fields.email, lieferantTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={lieferantTarget && onOpenLieferanten ? () => onOpenLieferanten!(lieferantTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('ausgaben')}
        items={ausgabenList.filter(r => extractRecordId(r.fields.gegenstand) === record.record_id)}
        map={r => ({ name: r.fields.person_vorname ?? appLabel('ausgaben'), meta: r.fields.ausgabedatum })}
        onOpen={onOpenAusgaben}
        onAdd={onAddAusgaben}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.INVENTAR} recordId={record.record_id} readOnly={!perms.canWrite('inventar')} />
    </>
  );
}
