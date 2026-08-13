<?php

namespace App\Observers;

use App\Enums\EvalStatutFiche;
use App\Models\EvalFiche;
use App\Models\User;
use App\Notifications\EvalStatutChangedNotification;

/**
 * Observateur sur EvalFiche — déclenche les notifications événementielles
 * sur chaque changement de statut (§10.1).
 *
 * Utiliser EvalFicheObserver::$suppresser = true autour des opérations de masse
 * (ex: SP5 validerEtTransmettre, SP6 genererCourriers) pour éviter le spam.
 *
 * Transitions couvertes :
 *   TransmiseResponsable → évaluateur (nouvelle fiche à traiter)
 *   AttenteSignatureAgent → agent (signature requise)
 *   TransmiseDaf → aucune notification individuelle (volume trop élevé)
 */
class EvalFicheObserver
{
    /**
     * Positionner à true pendant les opérations de masse pour inhiber les notifications.
     * Remis à false dans un bloc finally pour garantir la cohérence.
     */
    public static bool $suppresser = false;

    public function updated(EvalFiche $fiche): void
    {
        if (static::$suppresser || ! $fiche->wasChanged('statut')) {
            return;
        }

        match ($fiche->statut) {
            EvalStatutFiche::TransmiseResponsable  => $this->notifierEvaluateur($fiche),
            EvalStatutFiche::AttenteSignatureAgent => $this->notifierAgentSignature($fiche),
            default                                => null,
        };
    }

    // ── Handlers privés ────────────────────────────────────────────────────

    /** Notifie l'évaluateur qu'une fiche vient de lui être transmise (SP1). */
    private function notifierEvaluateur(EvalFiche $fiche): void
    {
        $evaluateur = User::find($fiche->evaluateur_id);

        $evaluateur?->notify(new EvalStatutChangedNotification(
            fiche          : $fiche,
            message        : "Une fiche d'évaluation vous a été transmise pour traitement : {$fiche->snapshot_nom_complet}. Veuillez planifier l'entretien.",
            typeEvenement  : 'eval_fiche_transmise_responsable',
        ));
    }

    /** Notifie l'agent que sa fiche est prête pour sa signature (SP3). */
    private function notifierAgentSignature(EvalFiche $fiche): void
    {
        $agentUser = $fiche->employee?->user;

        $agentUser?->notify(new EvalStatutChangedNotification(
            fiche         : $fiche,
            message       : "Votre fiche d'évaluation a été complétée par votre responsable hiérarchique. Veuillez la consulter et apporter votre accord (ou refus motivé) dans les délais impartis.",
            typeEvenement : 'eval_fiche_attente_signature_agent',
        ));
    }
}
