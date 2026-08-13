<?php

namespace App\Services\Eval;

use App\Enums\EvalStatutFiche;
use App\Models\EvalCampagne;
use App\Models\EvalFiche;
use App\Models\EvalSynthese;
use App\Models\User;
use App\Notifications\RelanceEvaluationNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EvalSyntheseService
{
    // ── Génération ────────────────────────────────────────────────────────

    /**
     * Génère (ou régénère) le tableau de synthèse pour une campagne.
     * Crée une nouvelle version si une version transmise existe déjà.
     * Passe toutes les fiches ReceptioneeDaf → IntegreeeSynthese.
     */
    public function generer(EvalCampagne $campagne, User $daf): EvalSynthese
    {
        return DB::transaction(function () use ($campagne, $daf) {
            // Fiches éligibles : au minimum réceptionnées par le DAF
            $fiches = EvalFiche::where('campagne_id', $campagne->id)
                ->whereIn('statut', [
                    EvalStatutFiche::ReceptioneeDaf->value,
                    EvalStatutFiche::IntegreeeSynthese->value,
                ])
                ->with(['employee.department', 'notations.critere', 'besoinsFormation'])
                ->get();

            $donnees = $this->aggreger($campagne, $fiches);

            // Transition ReceptioneeDaf → IntegreeeSynthese
            foreach ($fiches as $fiche) {
                if ($fiche->statut === EvalStatutFiche::ReceptioneeDaf) {
                    $fiche->transitionnerVers(
                        EvalStatutFiche::IntegreeeSynthese,
                        $daf,
                        'Intégrée au tableau de synthèse'
                    );
                }
            }

            // Version courante si déjà un brouillon, sinon nouvelle version
            $existante = EvalSynthese::where('campagne_id', $campagne->id)
                ->where('statut', 'brouillon')
                ->latest()
                ->first();

            if ($existante) {
                $existante->update([
                    'donnees'    => $donnees,
                    'genere_par' => $daf->id,
                ]);
                return $existante->fresh();
            }

            $derniereVersion = EvalSynthese::where('campagne_id', $campagne->id)->max('version') ?? 0;

            return EvalSynthese::create([
                'campagne_id' => $campagne->id,
                'version'     => $derniereVersion + 1,
                'statut'      => 'brouillon',
                'donnees'     => $donnees,
                'genere_par'  => $daf->id,
            ]);
        });
    }

    // ── Contrôle de complétude ────────────────────────────────────────────

    /**
     * Retourne les agents du périmètre de campagne sans fiche réceptionnée.
     * "Réceptionnée" = statut >= ReceptioneeDaf dans le cycle de vie.
     */
    public function agentsManquants(EvalCampagne $campagne): Collection
    {
        $statutsReceptionnes = [
            EvalStatutFiche::ReceptioneeDaf->value,
            EvalStatutFiche::IntegreeeSynthese->value,
            EvalStatutFiche::TableauTransmisDg->value,
            EvalStatutFiche::EtudieeeDg->value,
            EvalStatutFiche::AnoteeDg->value,
            EvalStatutFiche::ValideeNotification->value,
            EvalStatutFiche::CourrierEtabli->value,
            EvalStatutFiche::Notifiee->value,
            EvalStatutFiche::Archivee->value,
        ];

        // IDs des employees qui ont une fiche réceptionnée dans cette campagne
        $employeeAvecFiche = EvalFiche::where('campagne_id', $campagne->id)
            ->whereIn('statut', $statutsReceptionnes)
            ->pluck('employee_id');

        // Employees qui ont une fiche dans cette campagne mais pas réceptionnée
        $employeesSansFicheRecue = EvalFiche::where('campagne_id', $campagne->id)
            ->whereNotIn('employee_id', $employeeAvecFiche)
            ->with(['employee.department', 'evaluateur'])
            ->get()
            ->map(fn($fiche) => [
                'fiche_id'           => $fiche->id,
                'employee_id'        => $fiche->employee_id,
                'nom_complet'        => $fiche->snapshot_nom_complet,
                'department'         => $fiche->employee?->department?->name,
                'statut_fiche'       => $fiche->statut->value,
                'statut_libelle'     => $fiche->statut->libelle(),
                'evaluateur_id'      => $fiche->evaluateur_id,
                'evaluateur_email'   => $fiche->evaluateur?->email,
            ]);

        return $employeesSansFicheRecue;
    }

    /**
     * Envoie une relance au responsable hiérarchique pour une fiche manquante.
     */
    public function relancerResponsable(EvalFiche $fiche, User $daf): void
    {
        $evaluateur = $fiche->evaluateur;
        if (! $evaluateur) {
            return;
        }

        $evaluateur->notify(
            new RelanceEvaluationNotification($fiche->campagne, $fiche->employee)
        );
    }

    // ── Confirmation de complétude ────────────────────────────────────────

    public function confirmerCompletude(EvalSynthese $synthese, User $daf): EvalSynthese
    {
        if ($synthese->estTransmis()) {
            throw new \DomainException("Le tableau a déjà été transmis au DG.");
        }

        $synthese->update([
            'completude_confirmee'      => true,
            'completude_confirmee_par'  => $daf->id,
            'completude_confirmee_at'   => now(),
        ]);

        return $synthese->fresh();
    }

    // ── Contribution Division RH ──────────────────────────────────────────

    public function annoter(EvalSynthese $synthese, User $rh, string $notes): EvalSynthese
    {
        if ($synthese->estTransmis()) {
            throw new \DomainException("Le tableau transmis au DG ne peut plus être annoté.");
        }

        $synthese->update([
            'notes_division_rh' => $notes,
            'notes_par'         => $rh->id,
            'notes_at'          => now(),
        ]);

        return $synthese->fresh();
    }

    // ── Transmission au DG ────────────────────────────────────────────────

    /**
     * DAF transmet officiellement le tableau au DG.
     * Conditions : complétude confirmée, statut brouillon.
     * Effets : statut → transmis, toutes fiches IntegreeeSynthese → TableauTransmisDg.
     */
    public function transmettreAuDg(EvalSynthese $synthese, User $daf): EvalSynthese
    {
        if ($synthese->estTransmis()) {
            throw new \DomainException("Le tableau a déjà été transmis au DG.");
        }

        if (! $synthese->completude_confirmee) {
            throw new \DomainException(
                "La complétude doit être confirmée par le DAF avant de transmettre au DG."
            );
        }

        return DB::transaction(function () use ($synthese, $daf) {
            // Figer le snapshot final avec horodatage
            $donneesFigees = $synthese->donnees ?? [];
            $donneesFigees['transmis_dg_at'] = now()->toIso8601String();
            $donneesFigees['transmis_dg_par'] = $daf->name ?? $daf->email;

            $synthese->update([
                'statut'          => 'transmis',
                'donnees'         => $donneesFigees,
                'transmis_dg_par' => $daf->id,
                'transmis_dg_at'  => now(),
            ]);

            // Transition des fiches IntegreeeSynthese → TableauTransmisDg
            EvalFiche::where('campagne_id', $synthese->campagne_id)
                ->where('statut', EvalStatutFiche::IntegreeeSynthese->value)
                ->get()
                ->each(fn($fiche) => $fiche->transitionnerVers(
                    EvalStatutFiche::TableauTransmisDg,
                    $daf,
                    'Tableau de synthèse transmis au DG'
                ));

            return $synthese->fresh();
        });
    }

    // ── Agrégation ────────────────────────────────────────────────────────

    private function aggreger(EvalCampagne $campagne, Collection $fiches): array
    {
        $nbFiches    = $fiches->count();
        $avecMoyenne = $fiches->filter(fn($f) => $f->moyenne !== null);
        $moyGlobale  = $avecMoyenne->count() > 0
            ? round($avecMoyenne->avg('moyenne'), 2)
            : null;

        // Répartition des appréciations
        $appréciations = $fiches->whereNotNull('appreciation')
            ->groupBy('appreciation')
            ->map->count()
            ->toArray();

        // Agréger par structure (department)
        $parStructure = $fiches
            ->groupBy(fn($f) => $f->employee?->department_id ?? 0)
            ->map(function ($groupFiches, $deptId) {
                $dept    = $groupFiches->first()->employee?->department;
                $avecMoy = $groupFiches->filter(fn($f) => $f->moyenne !== null);

                $besoins = $groupFiches->flatMap(
                    fn($f) => $f->besoinsFormation->pluck('intitule')
                )->countBy()->sortDesc()->take(10)->toArray();

                return [
                    'department_id'   => $deptId,
                    'department_nom'  => $dept?->name ?? 'Non classé',
                    'nb_evalues'      => $groupFiches->count(),
                    'moyenne'         => $avecMoy->count() > 0 ? round($avecMoy->avg('moyenne'), 2) : null,
                    'appreciations'   => $groupFiches->whereNotNull('appreciation')
                        ->groupBy('appreciation')->map->count()->toArray(),
                    'besoins_formation' => $besoins,
                ];
            })
            ->values()
            ->toArray();

        // Agréger par critère
        $parCritere = [];
        foreach ($fiches as $fiche) {
            foreach ($fiche->notations as $notation) {
                $cId = $notation->critere_id;
                if (! isset($parCritere[$cId])) {
                    $parCritere[$cId] = [
                        'critere_id'   => $cId,
                        'critere_code' => $notation->critere?->code ?? '',
                        'critere_nom'  => $notation->critere?->libelle ?? '',
                        'type'         => $notation->critere?->type ?? '',
                        'notes'        => [],
                    ];
                }
                $parCritere[$cId]['notes'][] = $notation->note;
            }
        }
        $parCritere = array_map(function ($c) {
            $c['moyenne'] = count($c['notes']) > 0 ? round(array_sum($c['notes']) / count($c['notes']), 2) : null;
            unset($c['notes']);
            return $c;
        }, array_values($parCritere));

        // Besoins de formation globaux
        $besoinsFFormation = $fiches->flatMap(
            fn($f) => $f->besoinsFormation->pluck('intitule')
        )->countBy()->sortDesc()->take(20)->toArray();

        return [
            'genere_at'      => now()->toIso8601String(),
            'campagne'       => [
                'id'       => $campagne->id,
                'exercice' => $campagne->exercice,
                'titre'    => $campagne->titre,
            ],
            'global' => [
                'nb_fiches_integrees'     => $nbFiches,
                'moyenne_globale'         => $moyGlobale,
                'appreciation_distribution' => $appréciations,
            ],
            'par_structure'      => $parStructure,
            'par_critere'        => $parCritere,
            'besoins_formation'  => $besoinsFFormation ?? $besoinsFFormation,
        ];
    }
}
