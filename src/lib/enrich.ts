import type { EnrichedAusgaben, EnrichedInventar } from '@/types/enriched';
import type { Ausgaben, Inventar, Lagerorte, Lieferanten } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface InventarMaps {
  lagerorteMap: Map<string, Lagerorte>;
  lieferantenMap: Map<string, Lieferanten>;
}

export function enrichInventar(
  inventar: Inventar[],
  maps: InventarMaps
): EnrichedInventar[] {
  return inventar.map(r => ({
    ...r,
    lagerortName: resolveDisplay(r.fields.lagerort, maps.lagerorteMap, 'bezeichnung'),
    lieferantName: resolveDisplay(r.fields.lieferant, maps.lieferantenMap, 'firmenname'),
  }));
}

interface AusgabenMaps {
  inventarMap: Map<string, Inventar>;
}

export function enrichAusgaben(
  ausgaben: Ausgaben[],
  maps: AusgabenMaps
): EnrichedAusgaben[] {
  return ausgaben.map(r => ({
    ...r,
    gegenstandName: resolveDisplay(r.fields.gegenstand, maps.inventarMap, 'bezeichnung'),
  }));
}
