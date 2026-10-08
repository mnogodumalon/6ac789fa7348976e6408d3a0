/**
 * Gegenstand erfassen — 4-Schritt-Wizard.
 * Steps: 1) Bezeichnung und Kategorie → 2) Lagerort und Lieferant wählen → 3) Bestand, Mindestbestand und Zustand → 4) Prüfen & speichern.
 * Reads: lagerorte, lieferanten. Writes: inventar (via useGegenstandErfassenFlow).
 * Composes: IntentWizardShell, Bound, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText } from '@/lib/journey';
import { useGegenstandErfassenFlow } from '@/lib/journey/flows/GegenstandErfassen';
import { tx } from '@/i18n';

export default function GegenstandErfassenPage() {
  const [step, setStep] = useState(1);
  const flow = useGegenstandErfassenFlow({
    steps: {
      bezeichnung: 1, inventarnummer: 1, kategorie: 1, hersteller: 1, modell: 1, seriennummer: 1,
      lagerort: 2, lieferant: 2,
      anschaffungsdatum: 3, anschaffungspreis: 3, bestand: 3, mindestbestand: 3, zustand: 3, naechste_pruefung: 3,
    },
    items: {
      lagerort: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: [fieldText(r, 'bereich'), fieldText(r, 'regal'), fieldText(r, 'fach')].filter(Boolean).join(' · '),
      }),
      lieferant: r => ({ id: r.id, title: fieldText(r, 'firmenname'), subtitle: fieldText(r, 'ort') }),
    },
  });
  const f = flow.forms.inventar;

  const bestandRaw = f.get('bestand');
  const minRaw = f.get('mindestbestand');
  const bestand = bestandRaw === '' || bestandRaw == null ? null : Number(bestandRaw);
  const minBestand = minRaw === '' || minRaw == null ? null : Number(minRaw);
  const belowMin = bestand != null && minBestand != null && bestand < minBestand;

  return (
    <IntentWizardShell
      title={tx('Gegenstand erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Nimm einen neuen Gegenstand mit Lagerort und Lieferant ins Inventar auf.'),
        needs: [tx('Bezeichnung und Kategorie'), tx('Lagerort und Lieferant'), tx('Aktueller Bestand')],
      }}
    >
      <WizardStep label={tx('Gegenstand')} description={tx('Wie heißt der Gegenstand und was für einer ist es?')}>
        <div className="space-y-4">
          <Bound form={f} name="bezeichnung" />
          <Bound form={f} name="kategorie" />
          <Bound form={f} name="inventarnummer" />
          <Bound form={f} name="hersteller" />
          <Bound form={f} name="modell" />
          <Bound form={f} name="seriennummer" />
          <StepNav hideBack onNext={() => flow.validateStep(1)} nextStepLabel={tx('Lagerort und Lieferant')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Lagerort & Lieferant')} description={tx('Wo liegt der Gegenstand und von wem kommt er?')}>
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{tx('Lagerort')}</h3>
            <EntitySelectStep
              {...flow.picks.lagerort.select}
              {...flow.pick('lagerort')}
              searchPlaceholder={tx('Lagerort suchen …')}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{tx('Lieferant')}</h3>
            <EntitySelectStep
              {...flow.picks.lieferant.select}
              {...flow.pick('lieferant')}
              searchPlaceholder={tx('Lieferant suchen …')}
            />
          </div>
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Bestand und Zustand')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Bestand & Zustand')} description={tx('Wie viele sind da, ab wann wird es knapp und in welchem Zustand?')}>
        <div className="space-y-4">
          <Bound form={f} name="bestand" />
          <Bound form={f} name="mindestbestand" />
          {belowMin && (
            <p className="text-xs text-destructive">
              {tx`Der Bestand (${bestand ?? 0}) liegt unter dem Mindestbestand (${minBestand ?? 0}).`}
            </p>
          )}
          <Bound form={f} name="zustand" />
          <Bound form={f} name="anschaffungsdatum" />
          <Bound form={f} name="anschaffungspreis" />
          <Bound form={f} name="naechste_pruefung" />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            confirmLabel={tx('Gegenstand speichern')}
            whatHappensNext={tx('Der Gegenstand erscheint sofort im Inventar und kann ausgegeben werden.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          restartLabel={tx('Weiteren Gegenstand erfassen')}
          next={[
            { label: tx('Gegenstand ausgeben'), href: '#/intents/gegenstand-ausgeben' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
