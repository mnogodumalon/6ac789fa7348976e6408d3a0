import type { Lagerorte, Inventar } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface LagerorteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Lagerorte;
  /** 1:N „Inventar" (lagerort): VOLLE Liste — der Block filtert auf diesen Record. */
  inventarList: Inventar[];
  /** Zeilen-Klick → overlay.push auf das Inventar-Detail (nie der Edit-Dialog). */
  onOpenInventar: (record: Inventar) => void;
  /** Kontextuelles „+": öffnet den Inventar-Dialog mit diesem Record vorgesetzt. */
  onAddInventar?: () => void;
}

export function LagerorteDetails({
  record,
  inventarList,
  onOpenInventar,
  onAddInventar,
}: LagerorteDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('lagerorte', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('lagerorte', 'bereich')} value={record.fields.bereich} format="text" />
        <RecordField label={fieldLabel('lagerorte', 'regal')} value={record.fields.regal} format="text" />
        <RecordField label={fieldLabel('lagerorte', 'fach')} value={record.fields.fach} format="text" />
        <RecordField label={fieldLabel('lagerorte', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('inventar')}
        items={inventarList.filter(r => extractRecordId(r.fields.lagerort) === record.record_id)}
        map={r => ({ name: r.fields.bezeichnung ?? appLabel('inventar'), meta: r.fields.anschaffungsdatum })}
        onOpen={onOpenInventar}
        onAdd={onAddInventar}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.LAGERORTE} recordId={record.record_id} readOnly={!perms.canWrite('lagerorte')} />
    </>
  );
}
