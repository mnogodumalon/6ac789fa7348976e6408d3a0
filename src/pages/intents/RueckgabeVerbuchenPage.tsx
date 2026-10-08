/**
 * Rückgabe verbuchen — 3-Schritt-Wizard.
 * Steps: 1) Offene Ausgabe wählen → 2) Zustand prüfen & Bestand sehen → 3) Rückgabe bestätigen.
 * Reads: ausgaben, inventar. Writes: ausgaben (Status, Rückgabedatum), inventar (Zustand, Bestand) — via useRueckgabeVerbuchenFlow.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldDate, fieldLookup, fieldRef, optionsOf } from '@/lib/journey';
import { useRueckgabeVerbuchenFlow } from '@/lib/journey/flows/RueckgabeVerbuchen';
import { tx } from '@/i18n';

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function RueckgabeVerbuchenPage() {
  const [step, setStep] = useState(1);
  const flow = useRueckgabeVerbuchenFlow({
    steps: { ausgaben: 1, inventar: 1, zustand: 2 },
    items: {
      ausgaben: (r, ctx) => {
        const geplant = fieldDate(r, 'geplantes_rueckgabedatum');
        const menge = fieldNumber(r, 'menge');
        const person = `${fieldText(r, 'person_vorname')} ${fieldText(r, 'person_nachname')}`.trim();
        return {
          id: r.id,
          title: ctx.ref('gegenstand') ?? tx('Gegenstand'),
          subtitle: person,
          status: fieldLookup(r, 'status') ?? undefined,
          stats: [
            { label: tx('Menge'), value: menge ?? 1 },
            ...(geplant ? [{ label: tx('Rückgabe geplant'), value: format(new Date(`${geplant}T00:00`), 'dd.MM.yyyy') }] : []),
          ],
        };
      },
    },
    compute: {
      bestand: forms => num(forms.inventar.get('bestand')) + (num(forms.ausgaben.get('menge')) || 1),
    },
  });

  const ausgabePick = flow.pick('ausgaben');
  const inventarPick = flow.pick('inventar');
  const ausgabeId = ausgabePick.selectedId;
  const ausgabe = ausgabeId ? flow.picks.ausgaben.recordOf(ausgabeId) : undefined;

  const menge = num(flow.forms.ausgaben.get('menge')) || 1;
  const bestandJetzt = num(flow.forms.inventar.get('bestand'));
  const bestandNeu = bestandJetzt + menge;
  const gegenstandName = ausgabeId ? flow.picks.ausgaben.labelOf(ausgabeId) ?? '' : '';

  const statusLabel = optionsOf('ausgaben', 'status').find(o => o.key === 'zurueckgegeben')?.label ?? '';
  const heute = format(new Date(), 'dd.MM.yyyy');

  const inventarId = inventarPick.selectedId;

  // The Gegenstand of the Ausgabe is the inventar record to update — adopt it only when it still exists.
  const handleSelect = async (id: string) => {
    ausgabePick.onSelect(id);
    const rec = flow.picks.ausgaben.recordOf(id);
    const gegenstandId = rec ? fieldRef(rec, 'gegenstand') : null;
    if (!gegenstandId) return;
    const found = await flow.port.get('inventar', gegenstandId);
    if (found && found.id === gegenstandId) inventarPick.onSelect(gegenstandId);
  };

  return (
    <IntentWizardShell
      title={tx('Rückgabe verbuchen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine ausgegebene Ausgabe als zurückgegeben markieren und den Bestand erhöhen.'),
        needs: [tx('Die zurückgegebene Ausgabe'), tx('Den Zustand des Gegenstands')],
      }}
    >
      <WizardStep label={tx('Ausgabe')} heading={tx('Offene Ausgabe wählen')} description={tx('Welche Ausgabe kommt zurück?')}>
        <EntitySelectStep
          {...flow.picks.ausgaben.select}
          selectedId={ausgabeId}
          onSelect={handleSelect}
          searchPlaceholder={tx('Name oder Gegenstand …')}
          avatar="initials"
          emptyText={tx('Es gibt keine offene Ausgabe, die zurückgegeben werden müsste.')}
        />
      </WizardStep>

      <WizardStep label={tx('Zustand')} heading={tx('Zustand prüfen')} description={tx('In welchem Zustand ist der Gegenstand zurückgekommen?')}>
        {ausgabeId ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-secondary p-4 overflow-hidden">
              <p className="text-sm text-muted-foreground">{tx('Zurückgegeben wird')}</p>
              <p className="font-medium truncate">{gegenstandName}</p>
              {ausgabe && (
                <p className="text-sm text-muted-foreground truncate">
                  {`${fieldText(ausgabe, 'person_vorname')} ${fieldText(ausgabe, 'person_nachname')}`.trim()}
                </p>
              )}
            </div>
            {!inventarId ? (
              <EntitySelectStep
                {...flow.picks.inventar.select}
                selectedId={inventarId}
                onSelect={inventarPick.onSelect}
                emptyText={tx('Kein Gegenstand gefunden.')}
              />
            ) : (
              <Bound form={flow.forms.inventar} name="zustand" />
            )}
            <div className="rounded-2xl border p-4 overflow-hidden">
              <p className="text-sm text-muted-foreground">{tx('Bestand')}</p>
              <p className="font-medium">
                {tx`${bestandJetzt} jetzt → ${bestandNeu} nach der Rückgabe (+${menge})`}
              </p>
            </div>
            <StepNav
              onBack={() => setStep(1)}
              nextDisabled={!inventarId}
              onNext={() => flow.validateStep(2)}
              nextStepLabel={tx('Prüfen')}
            />
          </div>
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'rueckgabe-status', label: tx('Status der Ausgabe'), value: statusLabel },
              { key: 'rueckgabe-datum', label: tx('Rückgabedatum'), value: heute },
              { key: 'rueckgabe-bestand', label: tx('Neuer Bestand'), value: String(bestandNeu) },
            ]}
            whatHappensNext={tx('Die Ausgabe wird als zurückgegeben markiert und der Bestand steigt um die zurückgegebene Menge.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          facts={[
            { label: tx('Status'), value: statusLabel },
            { label: tx('Bestand'), value: String(bestandNeu) },
          ]}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Weitere Rückgabe'), onClick: () => { flow.reset(); setStep(1); } },
            { label: tx('Gegenstand ausgeben'), href: '#/intents/gegenstand-ausgeben' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
