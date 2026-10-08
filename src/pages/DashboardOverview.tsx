import { useMemo } from 'react';
import { format, addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { IconAlertTriangle, IconPlus, IconPackage, IconClipboardCheck, IconTool } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedAusgaben } from '@/types/enriched';
import type { Inventar } from '@/types/app';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate, lookupKey } from '@/lib/formatters';
import { tx } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { WorkList } from '@/components/WorkList';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';

function personOf(a: EnrichedAusgaben): string {
  return [a.fields.person_vorname, a.fields.person_nachname].filter(Boolean).join(' ') || '—';
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { inventar, ausgaben, setAusgaben, fetchAll } = data;
  const crud = useEntityCrud(data, {
    footer: (top) => top.type === 'ausgaben' && lookupKey(top.record.fields.status) !== 'zurueckgegeben' && lookupKey(top.record.fields.status) !== 'verbraucht'
      ? { label: tx('Rückgabe verbuchen'), onClick: () => returnItem(top.record) }
      : undefined,
  });
  const enrichedAusgaben = crud.enriched.ausgaben;
  const clock = useClock();
  const todayKey = format(clock, 'yyyy-MM-dd');
  const in30Key = format(addDays(clock, 30), 'yyyy-MM-dd');

  const columns = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['ausgaben']?.['status'] ?? []).map(o => ({ key: o.key, label: o.label })),
    [],
  );

  const isOpen = (a: EnrichedAusgaben) => {
    const s = lookupKey(a.fields.status);
    return s !== 'zurueckgegeben' && s !== 'verbraucht';
  };
  const isOverdue = (a: EnrichedAusgaben) => {
    if (!isOpen(a)) return false;
    if (lookupKey(a.fields.status) === 'ueberfaellig') return true;
    const due = a.fields.geplantes_rueckgabedatum?.slice(0, 10);
    return !!due && due < todayKey;
  };

  const overdue = enrichedAusgaben.filter(isOverdue)
    .sort((a, b) => (a.fields.geplantes_rueckgabedatum ?? '').localeCompare(b.fields.geplantes_rueckgabedatum ?? ''));
  const openOnes = enrichedAusgaben.filter(isOpen);

  // One shared write path: banner, board drag and overlay footer.
  const setStatus = (a: EnrichedAusgaben, key: string) => {
    const prevStatus = a.fields.status;
    const prevReturn = a.fields.tatsaechliches_rueckgabedatum;
    const returned = key === 'zurueckgegeben';
    const patch = { status: key, ...(returned ? { tatsaechliches_rueckgabedatum: todayKey } : {}) };
    setAusgaben(prev => prev.map(r => r.record_id === a.record_id
      ? { ...r, fields: { ...r.fields, status: lookupOption('ausgaben', 'status', key), ...(returned ? { tatsaechliches_rueckgabedatum: todayKey } : {}) } }
      : r));
    LivingAppsService.updateAusgabenEntry(a.record_id, patch).catch(() => { void fetchAll(); });
    undoToast(tx`${a.gegenstandName} — ${lookupOption('ausgaben', 'status', key).label}`, () => {
      setAusgaben(prev => prev.map(r => r.record_id === a.record_id
        ? { ...r, fields: { ...r.fields, status: prevStatus, tatsaechliches_rueckgabedatum: prevReturn } }
        : r));
      LivingAppsService.updateAusgabenEntry(a.record_id, {
        status: prevStatus ? lookupKey(prevStatus) ?? undefined : undefined,
        tatsaechliches_rueckgabedatum: prevReturn,
      }).catch(() => { void fetchAll(); });
    });
  };
  const returnItem = (a: EnrichedAusgaben) => setStatus(a, 'zurueckgegeben');

  const cards = useMemo<KanbanCard[]>(() => enrichedAusgaben.map(a => {
    const key = isOverdue(a) ? 'ueberfaellig' : (lookupKey(a.fields.status) ?? 'ausgegeben');
    const tone: KanbanTone = key === 'ueberfaellig' ? 'destructive' : key === 'ausgegeben' ? 'primary' : 'default';
    const due = a.fields.geplantes_rueckgabedatum;
    return {
      id: `ausgabe:${a.record_id}`,
      column: key,
      title: `${a.fields.menge && a.fields.menge > 1 ? `${a.fields.menge}× ` : ''}${a.gegenstandName || '—'}`,
      subtitle: `${personOf(a)}${due ? ` · ${formatDate(due)}` : ''}`,
      tone,
    };
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [enrichedAusgaben, todayKey]);

  const moveCard = (cardId: string, newColumn: string) => {
    const rec = enrichedAusgaben.find(a => a.record_id === cardId.split(':')[1]);
    if (!rec) return;
    setStatus(rec, newColumn);
  };

  const inv = crud.enriched.inventar;
  const lowStock = inv
    .filter(i => i.fields.mindestbestand != null && (i.fields.bestand ?? 0) < i.fields.mindestbestand)
    .sort((a, b) => ((a.fields.bestand ?? 0) / (a.fields.mindestbestand || 1)) - ((b.fields.bestand ?? 0) / (b.fields.mindestbestand || 1)));
  const dueChecks = inv
    .filter(i => i.fields.naechste_pruefung && i.fields.naechste_pruefung.slice(0, 10) <= in30Key)
    .sort((a, b) => (a.fields.naechste_pruefung ?? '').localeCompare(b.fields.naechste_pruefung ?? ''));
  const broken = inv.filter(i => ['defekt', 'reparaturbeduerftig'].includes(lookupKey(i.fields.zustand) ?? ''));
  const rawInv = (id: string): Inventar | undefined => inventar.find(i => i.record_id === id);
  const openInv = (id: string) => { const r = rawInv(id); if (r) crud.inventar.openDetail(r); };

  const contextLine = overdue.length > 0
    ? tx`${namen(overdue.map(a => personOf(a)))} ${overdue.length === 1 ? 'hat' : 'haben'} noch Material zurückzugeben.`
    : openOnes.length > 0
      ? tx`Aktuell ausgegeben an ${namen(openOnes.map(a => personOf(a)))} — alles im Zeitplan.`
      : lowStock.length > 0
        ? tx`Nachbestellen: ${namen(lowStock.map(i => i.fields.bezeichnung ?? ''))}.`
        : tx`Alles im Lager, nichts ausgegeben.`;

  const stockSecond = (i: (typeof inv)[number]) => (
    <>
      <span className="font-medium text-destructive">{i.fields.bestand ?? 0} / {i.fields.mindestbestand}</span>
      <span className="text-muted-foreground"> · {i.lagerortName || tx('Kein Lagerort')}</span>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{contextLine}</p>
        </div>
        {crud.ausgaben.canWrite && (
          <Button onClick={() => crud.ausgaben.openCreate({ status: 'ausgegeben', ausgabedatum: todayKey })}>
            <IconPlus size={16} className="mr-1 shrink-0" />{tx('Ausgabe erfassen')}
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="wide"
        hero={overdue.length > 0 && (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{ label: tx('Rückgabe verbuchen'), onClick: () => returnItem(overdue[0]) }}
          >
            <b>{namen(overdue.map(a => personOf(a)))}</b>{' '}
            {tx`— überfällig: ${overdue[0].gegenstandName}, fällig war ${formatDate(overdue[0].fields.geplantes_rueckgabedatum)}${overdue.length > 1 ? ` (+${overdue.length - 1})` : ''}.`}
          </HeroBanner>
        )}
        primary={
          <KanbanWidget
            cards={cards}
            columns={columns}
            defaultCollapsed={['zurueckgegeben', 'verbraucht']}
            onCardClick={card => {
              const rec = ausgaben.find(a => a.record_id === card.id.split(':')[1]);
              if (rec) crud.ausgaben.openDetail(rec);
            }}
            onCardMove={moveCard}
            onAddCard={column => crud.ausgaben.openCreate({ status: column, ausgabedatum: todayKey })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Unter Mindestbestand')}
              icon={<IconPackage size={16} />}
              items={lowStock.map(i => ({
                id: i.record_id,
                title: i.fields.bezeichnung ?? '—',
                secondLine: stockSecond(i),
                action: crud.inventar.canWrite ? { label: tx('Bestand'), onClick: () => { const r = rawInv(i.record_id); if (r) crud.inventar.openEdit(r); } } : undefined,
              }))}
              onItemClick={openInv}
              empty={{ text: tx('Alle Bestände über dem Mindestbestand.') }}
            />
            <WorkList
              title={tx('Prüfungen in den nächsten 30 Tagen')}
              icon={<IconClipboardCheck size={16} />}
              items={dueChecks.map(i => {
                const d = i.fields.naechste_pruefung!.slice(0, 10);
                const days = differenceInCalendarDays(parseISO(d), clock);
                const late = d < todayKey;
                return {
                  id: i.record_id,
                  title: i.fields.bezeichnung ?? '—',
                  secondLine: (
                    <>
                      <span className={late ? 'font-medium text-destructive' : 'font-medium'}>
                        {late ? tx('Überfällig') : days === 0 ? tx('Heute') : tx`in ${days} Tagen`}
                      </span>
                      <span className="text-muted-foreground"> · {formatDate(d)}</span>
                    </>
                  ),
                };
              })}
              onItemClick={openInv}
              empty={{ text: tx('Keine Prüfung in den nächsten 30 Tagen fällig.') }}
            />
            <WorkList
              title={tx('Defekt oder reparaturbedürftig')}
              icon={<IconTool size={16} />}
              items={broken.map(i => ({
                id: i.record_id,
                title: i.fields.bezeichnung ?? '—',
                secondLine: (
                  <>
                    <span className="font-medium text-destructive">{i.fields.zustand?.label}</span>
                    <span className="text-muted-foreground"> · {i.lagerortName || tx('Kein Lagerort')}</span>
                  </>
                ),
              }))}
              onItemClick={openInv}
              empty={{ text: tx('Nichts defekt — alles einsatzbereit.') }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
