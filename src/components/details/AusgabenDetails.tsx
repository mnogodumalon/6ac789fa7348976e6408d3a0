import type { Ausgaben, Inventar } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface AusgabenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Ausgaben;
  /** N:1-Ziel „Inventar": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  inventarList: Inventar[];
  /** Klick auf die Inventar-Relation → overlay.push auf dessen Detail. */
  onOpenInventar?: (record: Inventar) => void;
}

export function AusgabenDetails({
  record,
  inventarList,
  onOpenInventar,
}: AusgabenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const gegenstandTarget = inventarList.find(r => r.record_id === extractRecordId(record.fields.gegenstand));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('ausgaben', 'person_vorname')} value={record.fields.person_vorname} format="text" />
        <RecordField label={fieldLabel('ausgaben', 'person_nachname')} value={record.fields.person_nachname} format="text" />
        <RecordField label={fieldLabel('ausgaben', 'menge')} value={record.fields.menge} format="text" />
        <RecordField label={fieldLabel('ausgaben', 'ausgabedatum')} value={record.fields.ausgabedatum} format="date" />
        <RecordField label={fieldLabel('ausgaben', 'geplantes_rueckgabedatum')} value={record.fields.geplantes_rueckgabedatum} format="date" />
        <RecordField label={fieldLabel('ausgaben', 'tatsaechliches_rueckgabedatum')} value={record.fields.tatsaechliches_rueckgabedatum} format="date" />
        <RecordField label={fieldLabel('ausgaben', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('ausgaben', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('ausgaben', 'gegenstand')}
          name={gegenstandTarget?.fields.bezeichnung ?? '—'}
          meta={[gegenstandTarget?.fields.inventarnummer, gegenstandTarget?.fields.hersteller].filter(Boolean).join(' · ') || undefined}
          onClick={gegenstandTarget && onOpenInventar ? () => onOpenInventar!(gegenstandTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.AUSGABEN} recordId={record.record_id} readOnly={!perms.canWrite('ausgaben')} />
    </>
  );
}
