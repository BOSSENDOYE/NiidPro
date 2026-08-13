<?php

namespace App\Services\Eval;

use App\Enums\EvalStatutFiche;
use App\Models\EvalAudit;
use App\Models\EvalFiche;
use App\Models\User;
use App\Notifications\ConvocationEntretienNotification;
use App\Notifications\ReplanificationEntretienNotification;
use Illuminate\Support\Facades\DB;

class EvalFicheService
{
    // ── SP2 — Planification des entretiens (§7.2) ─────────────────────────

    /**
     * Planifie l'entretien d'une fiche et convoque l'agent :
     * transmise_responsable → entretien_planifie → agent_convoque + notification.
     *
     * @throws \DomainException si la fiche n'est pas en état transmise_responsable
     */
    public function planifier(EvalFiche $fiche, array $data, User $evaluateur): EvalFiche
    {
        if ($fiche->statut !== EvalStatutFiche::TransmiseResponsable) {
            throw new \DomainException(
                "Cette fiche ne peut pas être planifiée (statut actuel : {$fiche->statut->libelle()})."
            );
        }

        return DB::transaction(function () use ($fiche, $data, $evaluateur) {
            // 1. Enregistrer les coordonnées de l'entretien
            $fiche->update([
                'date_entretien'  => $data['date_entretien'],
                'heure_entretien' => $data['heure_entretien'] ?? null,
                'lieu_entretien'  => $data['lieu_entretien'] ?? null,
                'type_entretien'  => $data['type_entretien'] ?? 'presentiel',
            ]);

            // 2. Transition : TransmiseResponsable → EntretienPlanifie
            $fiche->transitionnerVers(
                EvalStatutFiche::EntretienPlanifie,
                $evaluateur,
                'Entretien planifié par le responsable hiérarchique'
            );

            // 3. Transition : EntretienPlanifie → AgentConvoque + notification
            $this->convoquerAgent($fiche, $evaluateur, 'Convocation automatique après planification');

            return $fiche->fresh();
        });
    }

    /**
     * Planifie les entretiens en lot pour une liste de fiches.
     * Toutes les fiches doivent appartenir à l'évaluateur connecté.
     *
     * @param  array<int> $ficheIds
     * @return array{planifiees: int, erreurs: array}
     */
    public function planifierLot(array $ficheIds, array $data, User $evaluateur): array
    {
        $planifiees = 0;
        $erreurs    = [];

        foreach ($ficheIds as $ficheId) {
            $fiche = EvalFiche::find($ficheId);

            if (! $fiche) {
                $erreurs[] = "Fiche #{$ficheId} introuvable.";
                continue;
            }

            if ($fiche->evaluateur_id !== $evaluateur->id) {
                $erreurs[] = "Fiche #{$ficheId} : vous n'êtes pas l'évaluateur désigné.";
                continue;
            }

            try {
                $this->planifier($fiche, $data, $evaluateur);
                $planifiees++;
            } catch (\DomainException $e) {
                $erreurs[] = "Fiche #{$ficheId} ({$fiche->snapshot_nom_complet}) : {$e->getMessage()}";
            }
        }

        return ['planifiees' => $planifiees, 'erreurs' => $erreurs];
    }

    /**
     * Replanifie l'entretien avec un motif obligatoire.
     * Transitions : [entretien_planifie|agent_convoque] → entretien_reporte → entretien_planifie → agent_convoque.
     * Notifie à nouveau l'agent.
     *
     * @throws \DomainException si la fiche n'est pas dans un statut replanable
     */
    public function replanifier(EvalFiche $fiche, array $data, User $evaluateur): EvalFiche
    {
        $statutsReplanables = [
            EvalStatutFiche::EntretienPlanifie,
            EvalStatutFiche::AgentConvoque,
        ];

        if (! in_array($fiche->statut, $statutsReplanables, true)) {
            throw new \DomainException(
                "Cette fiche ne peut pas être replanifiée (statut actuel : {$fiche->statut->libelle()})."
            );
        }

        return DB::transaction(function () use ($fiche, $data, $evaluateur) {
            $ancienneDate = $fiche->date_entretien?->format('Y-m-d') ?? 'non définie';

            // 1. Enregistrement du motif et de la nouvelle date
            $fiche->update([
                'motif_report'           => $data['motif'],
                'nouvelle_date_entretien'=> $data['nouvelle_date_entretien'],
                'nb_replanifications'    => $fiche->nb_replanifications + 1,
            ]);

            // 2. Transition → EntretienReporte
            $fiche->transitionnerVers(
                EvalStatutFiche::EntretienReporte,
                $evaluateur,
                $data['motif']
            );

            // 3. Appliquer la nouvelle date + coordonnées
            $fiche->update([
                'date_entretien'  => $data['nouvelle_date_entretien'],
                'heure_entretien' => $data['heure_entretien'] ?? $fiche->heure_entretien,
                'lieu_entretien'  => $data['lieu_entretien'] ?? $fiche->lieu_entretien,
                'type_entretien'  => $data['type_entretien'] ?? $fiche->type_entretien,
            ]);

            // 4. Transition : EntretienReporte → EntretienPlanifie
            $fiche->transitionnerVers(
                EvalStatutFiche::EntretienPlanifie,
                $evaluateur,
                'Replanification — nouvelle date fixée'
            );

            // 5. Transition : EntretienPlanifie → AgentConvoque + re-notification
            $this->convoquerAgent(
                $fiche,
                $evaluateur,
                'Replanification — nouvelle convocation',
                ancienneDate: $ancienneDate,
                motifReport: $data['motif']
            );

            return $fiche->fresh();
        });
    }

    /**
     * L'agent accuse réception de sa convocation.
     * Seul l'utilisateur lié à l'employee de la fiche peut appeler cette action.
     *
     * @throws \DomainException si l'utilisateur n'est pas l'agent concerné ou si déjà accusé
     */
    public function accuserConsultation(EvalFiche $fiche, User $agent): EvalFiche
    {
        $employee = $fiche->employee;

        if (! $employee || $employee->user_id !== $agent->id) {
            throw new \DomainException('Seul l\'agent concerné peut accuser réception de sa convocation.');
        }

        if ($fiche->convocation_accusee_at) {
            throw new \DomainException('Vous avez déjà accusé réception de cette convocation.');
        }

        $fiche->update(['convocation_accusee_at' => now()]);

        EvalAudit::create([
            'user_id'     => $agent->id,
            'action'      => 'fiche.accuser_consultation',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
        ]);

        return $fiche->fresh();
    }

    /**
     * Tableau de bord du responsable hiérarchique.
     * Retourne les stats de ses fiches, par campagne.
     */
    public function tableauBordResponsable(User $evaluateur, ?int $campagneId = null): array
    {
        $query = EvalFiche::with(['campagne:id,exercice,titre,statut'])
            ->where('evaluateur_id', $evaluateur->id);

        if ($campagneId) {
            $query->where('campagne_id', $campagneId);
        }

        $fiches = $query->get();

        $parCampagne = $fiches->groupBy('campagne_id')->map(function ($fichesC) {
            $campagne = $fichesC->first()->campagne;

            return [
                'campagne_id'     => $campagne?->id,
                'exercice'        => $campagne?->exercice,
                'titre'           => $campagne?->titre,
                'statut_campagne' => $campagne?->statut,
                'total'           => $fichesC->count(),
                'transmises'      => $fichesC->where('statut', EvalStatutFiche::TransmiseResponsable)->count(),
                'planifiees'      => $fichesC->where('statut', EvalStatutFiche::EntretienPlanifie)->count(),
                'convoquees'      => $fichesC->where('statut', EvalStatutFiche::AgentConvoque)->count(),
                'en_cours'        => $fichesC->where('statut', EvalStatutFiche::EnCoursNotation)->count(),
                'notees'          => $fichesC->where('statut', EvalStatutFiche::NoteeDiscussion)->count(),
                'signees'         => $fichesC->whereIn('statut', [
                    EvalStatutFiche::AttenteSignatureAgent,
                    EvalStatutFiche::Signee,
                ])->count(),
                'reportees'       => $fichesC->where('statut', EvalStatutFiche::EntretienReporte)->count(),
                'a_planifier'     => $fichesC->whereIn('statut', [
                    EvalStatutFiche::TransmiseResponsable,
                    EvalStatutFiche::EntretienReporte,
                ])->count(),
                'accusees'        => $fichesC->whereNotNull('convocation_accusee_at')->count(),
                'non_accusees'    => $fichesC->where('statut', EvalStatutFiche::AgentConvoque)
                    ->whereNull('convocation_accusee_at')->count(),
            ];
        })->values();

        return [
            'evaluateur'  => ['id' => $evaluateur->id, 'name' => $evaluateur->name],
            'par_campagne'=> $parCampagne,
            'total_fiches'=> $fiches->count(),
        ];
    }

    // ── Helpers privés ────────────────────────────────────────────────────

    /**
     * Transition EntretienPlanifie → AgentConvoque, mise à jour horodatage
     * et envoi de notification à l'agent.
     */
    private function convoquerAgent(
        EvalFiche $fiche,
        User      $evaluateur,
        string    $motif,
        ?string   $ancienneDate = null,
        ?string   $motifReport  = null,
    ): void {
        $fiche->transitionnerVers(EvalStatutFiche::AgentConvoque, $evaluateur, $motif);
        $fiche->update(['convocation_envoyee_at' => now()]);

        // Notification à l'agent concerné
        $fiche->refresh();
        $agentUser = $fiche->employee?->user;

        if ($agentUser) {
            $notification = $ancienneDate
                ? new ReplanificationEntretienNotification($fiche, $ancienneDate, $motifReport ?? '')
                : new ConvocationEntretienNotification($fiche);

            $agentUser->notify($notification);
        }

        EvalAudit::create([
            'user_id'     => $evaluateur->id,
            'action'      => $ancienneDate ? 'fiche.replanifier' : 'fiche.convoquer',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
            'meta'        => array_filter([
                'date_entretien'   => $fiche->date_entretien?->format('Y-m-d'),
                'heure_entretien'  => $fiche->heure_entretien,
                'lieu_entretien'   => $fiche->lieu_entretien,
                'ancienne_date'    => $ancienneDate,
                'motif_report'     => $motifReport,
            ]),
        ]);
    }
}
