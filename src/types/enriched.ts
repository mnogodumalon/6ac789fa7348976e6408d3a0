import type { Ausgaben, Inventar } from './app';

export type EnrichedInventar = Inventar & {
  lagerortName: string;
  lieferantName: string;
};

export type EnrichedAusgaben = Ausgaben & {
  gegenstandName: string;
};
