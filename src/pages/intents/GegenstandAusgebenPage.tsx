/**
 * Gegenstand ausgeben — 4-Schritt-Wizard.
 * Steps: 1) Gegenstand aus dem Inventar wählen → 2) Person und Menge (mit Bestandsprüfung) → 3) Rückgabedatum → 4) Prüfen & speichern.
 * Reads: inventar. Writes: ausgaben (create), inventar (Bestand verringern).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, BudgetTracker, StepNav, SummaryStep, SuccessStep.
 */
import { useRef, useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { BudgetTracker } from '@/components/blocks/BudgetTracker';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldLookup, todayIso } from '@/lib/journey';
import { useGegenstandAusgebenFlow, type GegenstandAusgebenFlow } from '@/lib/journey/flows/GegenstandAusgeben';
import { tx } from '@/i18n';

export default function GegenstandAusgebenPage() {
  const [step, setStep] = useState(1);
  const flowRef = useRef<GegenstandAusgebenFlow | null>(null);

  // current stock of the picked item — read from the record the pick step already holds
  const stockOf = (): number => {
    const flow = flowRef.current;
    const rec = flow?.targets.inventar.record
      ?? (() => { const id = flow?.forms.ausgaben.get('gegenstand'); return typeof id === 'string' ? flow?.picks.gegenstand.recordOf(id) : undefined; })();
    return rec ? fieldNumber(rec, 'bestand') ?? 0 : 0;
  };
  const quantityOf = (f: { get(key: string): unknown }): number => {
    const n = Number(f.get('menge'));
    return Number.isFinite(n) ? n : 0;
  };

  const flow = useGegenstandAusgebenFlow({
    steps: { gegenstand: 1, inventar: 1, person_vorname: 2, person_nachname: 2, menge: 2, geplantes_rueckgabedatum: 3, bemerkung: 3 },
    items: {
      gegenstand: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: fieldText(r, 'inventarnummer') || undefined,
        status: fieldLookup(r, 'zustand') ?? undefined,
        stats: [{ label: tx('Bestand'), value: fieldNumber(r, 'bestand') ?? 0 }],
      }),
    },
    initial: { menge: 1 },
    compute: { bestand: f => Math.max(0, stockOf() - quantityOf(f.ausgaben)) },
  });
  flowRef.current = flow;

  const form = flow.forms.ausgaben;
  const stock = stockOf();
  const menge = quantityOf(form);
  const picked = Boolean(form.get('gegenstand'));

  const pickGegenstand = (id: string) => {
    flow.pick('gegenstand').onSelect(id);
    flow.pick('inventar').onSelect(id);
    setStep(2);
  };

  const checkStep2 = (): boolean | string => {
    if (!flow.validateStep(2)) return false;
    if (menge <= 0) return tx('Die Menge muss größer als 0 sein.');
    if (menge > stock) return tx('Der Bestand reicht für diese Menge nicht aus.');
    return true;
  };
  const checkStep3 = (): boolean | string => {
    if (!flow.validateStep(3)) return false;
    const back = form.get('geplantes_rueckgabedatum');
    if (typeof back === 'string' && back && back < todayIso()) return tx('Das Rückgabedatum liegt in der Vergangenheit.');
    return true;
  };

  return (
    <IntentWizardShell
      title={tx('Gegenstand ausgeben')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Gib einen Gegenstand aus dem Inventar an eine Person aus.'),
        needs: [tx('Name der Person'), tx('Menge'), tx('Geplantes Rückgabedatum')],
      }}
    >
      <WizardStep label={tx('Gegenstand')} description={tx('Welchen Gegenstand aus dem Inventar gibst du aus?')}>
        <EntitySelectStep
          {...flow.picks.gegenstand.select}
          selectedId={form.get('gegenstand') as string | null}
          onSelect={pickGegenstand}
          searchPlaceholder={tx('Bezeichnung oder Inventarnummer …')}
          emptyText={tx('Kein ausgabefähiger Gegenstand gefunden — defekte Gegenstände werden nicht angeboten.')}
        />
      </WizardStep>

      <WizardStep label={tx('Person & Menge')} description={tx('Wer bekommt wie viel?')} needs={['gegenstand']}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Bound form={form} name="person_vorname" />
            <Bound form={form} name="person_nachname" />
          </div>
          <Bound form={form} name="menge" hint={tx`Verfügbar: ${stock} Stück`} />
          {picked && (
            <BudgetTracker format="count" unit={tx('Stück')} budget={stock} booked={menge} label={tx('Bestand')}
              texts={{ booked: tx('Ausgabe'), over: tx('Bestand reicht nicht aus') }} />
          )}
          {menge > stock && (
            <p className="text-xs text-destructive">{tx('Der Bestand reicht für diese Menge nicht aus.')}</p>
          )}
          <StepNav onBack={() => setStep(1)} onNext={checkStep2} nextStepLabel={tx('Rückgabe')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Rückgabe')} description={tx('Bis wann soll der Gegenstand zurückkommen?')} needs={['gegenstand']}>
        <div className="space-y-4">
          <Bound form={form} name="geplantes_rueckgabedatum" />
          <Bound form={form} name="bemerkung" rows={3} />
          <StepNav onBack={() => setStep(2)} onNext={checkStep3} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'neuer-bestand', label: tx('Neuer Bestand'), value: tx`${Math.max(0, stock - menge)} Stück` },
            ]}
            whatHappensNext={tx('Die Ausgabe wird gespeichert und der Bestand des Gegenstands um die Menge verringert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Rückgabe verbuchen'), href: '#/intents/rueckgabe-verbuchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Kommt der Gegenstand zurück, verbuchst du die Rückgabe im passenden Ablauf.')}
        />
      )}
    </IntentWizardShell>
  );
}
