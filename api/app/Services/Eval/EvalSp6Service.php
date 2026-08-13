<?php

namespace App\Services\Eval;

use App\Enums\EvalStatutFiche;
use App\Models\EvalAudit;
use App\Models\EvalCourrier;
use App\Models\EvalFiche;
use App\Models\EvalGratification;
use App\Models\EvalModeleNotification;
use App\Models\EvalSynthese;
use App\Models\User;
use App\Notifications\EvalCourrierPublieNotification;
use App\Observers\EvalFicheObserver;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EvalSp6Service
{
    // ── Modèles de lettre ─────────────────────────────────────────────────

    public function modeles(): Collection
    {
        return EvalModeleNotification::where('actif', true)->orderBy('nom')->get();
    }

    public function creerModele(User $auteur, array $data): EvalModeleNotification
    {
        $modele = EvalModeleNotification::create(array_merge($data, ['cree_par' => $auteur->id]));

        EvalAudit::create([
            'user_id'     => $auteur->id,
            'action'      => 'modele_notification.creer',
            'entite_type' => 'EvalModeleNotification',
            'entite_id'   => $modele->id,
        ]);

        return $modele;
    }

    public function mettreAJourModele(EvalModeleNotification $modele, User $auteur, array $data): EvalModeleNotification
    {
        $modele->update($data);

        EvalAudit::create([
            'user_id'     => $auteur->id,
            'action'      => 'modele_notification.modifier',
            'entite_type' => 'EvalModeleNotification',
            'entite_id'   => $modele->id,
        ]);

        return $modele->fresh();
    }

    // ── Génération des courriers ──────────────────────────────────────────

    /**
     * Génère les courriers individuels pour toutes les fiches ValideeNotification.
     * Transition ValideeNotification → CourrierEtabli.
     * Si un courrier existe déjà pour une fiche, il est régénéré (updateOrCreate).
     *
     * @throws \DomainException si aucune fiche en ValideeNotification
     */
    public function genererCourriers(EvalSynthese $synthese, EvalModeleNotification $modele, User $auteur): Collection
    {
        $fiches = EvalFiche::where('campagne_id', $synthese->campagne_id)
            ->where('statut', EvalStatutFiche::ValideeNotification->value)
            ->get();

        if ($fiches->isEmpty()) {
            throw new \DomainException(
                "Aucune fiche en état « Validée pour notification » pour cette synthèse."
            );
        }

        $courriers = collect();

        EvalFicheObserver::$suppresser = true;

        try {
            DB::transaction(function () use ($fiches, $synthese, $modele, $auteur, &$courriers) {
            foreach ($fiches as $fiche) {
                $fiche->load('campagne');

                $gratification = EvalGratification::where('synthese_id', $synthese->id)
                    ->where('fiche_id', $fiche->id)
                    ->first();

                $corpsGenere = $modele->interpoler($fiche, $gratification);

                $courrier = EvalCourrier::updateOrCreate(
                    ['synthese_id' => $synthese->id, 'fiche_id' => $fiche->id],
                    [
                        'employee_id'  => $fiche->employee_id,
                        'modele_id'    => $modele->id,
                        'corps_genere' => $corpsGenere,
                        'signe_par'    => null,
                        'signe_at'     => null,
                        'mode_envoi'   => null,
                        'envoye_par'   => null,
                        'envoye_at'    => null,
                        'accuse_at'    => null,
                        'accuse_par'   => null,
                    ]
                );

                $fiche->transitionnerVers(
                    EvalStatutFiche::CourrierEtabli,
                    $auteur,
                    'Courrier de notification établi par le DAF'
                );

                $fiche->update(['courrier_etabli_at' => now()]);

                EvalAudit::create([
                    'user_id'     => $auteur->id,
                    'action'      => 'courrier.generer',
                    'entite_type' => 'EvalFiche',
                    'entite_id'   => $fiche->id,
                    'meta'        => ['courrier_id' => $courrier->id, 'modele_id' => $modele->id],
                ]);

                $courriers->push($courrier->fresh());
            }
            });
        } finally {
            EvalFicheObserver::$suppresser = false;
        }

        return $courriers;
    }

    // ── Signature DAF ─────────────────────────────────────────────────────

    /**
     * DAF signe le courrier avant envoi.
     *
     * @throws \DomainException si déjà envoyé
     */
    public function signerCourrier(EvalCourrier $courrier, User $daf): EvalCourrier
    {
        if ($courrier->estEnvoye()) {
            throw new \DomainException("Ce courrier a déjà été envoyé à l'agent.");
        }

        $courrier->update(['signe_par' => $daf->id, 'signe_at' => now()]);

        EvalAudit::create([
            'user_id'     => $daf->id,
            'action'      => 'courrier.signer',
            'entite_type' => 'EvalCourrier',
            'entite_id'   => $courrier->id,
        ]);

        return $courrier->fresh();
    }

    // ── Envoi à l'agent ───────────────────────────────────────────────────

    /**
     * Transmet le courrier à l'agent (portail / email / main propre).
     * Transition CourrierEtabli → Notifiee.
     * Envoie une notification in-app + email si mode portail ou email.
     *
     * @throws \DomainException si la fiche n'est pas en CourrierEtabli
     */
    public function envoyerCourrier(EvalCourrier $courrier, User $daf, string $mode): EvalCourrier
    {
        $fiche = $courrier->fiche;

        if ($fiche->statut !== EvalStatutFiche::CourrierEtabli) {
            throw new \DomainException(
                "Le courrier ne peut être envoyé que depuis l'état « Courrier établi » "
                . "(statut actuel : {$fiche->statut->libelle()})."
            );
        }

        return DB::transaction(function () use ($courrier, $fiche, $daf, $mode) {
            $courrier->update([
                'mode_envoi' => $mode,
                'envoye_par' => $daf->id,
                'envoye_at'  => now(),
            ]);

            $fiche->transitionnerVers(
                EvalStatutFiche::Notifiee,
                $daf,
                "Courrier transmis à l'agent — mode : {$mode}"
            );

            // Notification in-app + email si l'agent a un compte portail
            $agentUser = $fiche->employee?->user ?? null;
            if ($agentUser && in_array($mode, ['portail', 'email'])) {
                $agentUser->notify(new EvalCourrierPublieNotification($courrier));
            }

            EvalAudit::create([
                'user_id'     => $daf->id,
                'action'      => 'courrier.envoyer',
                'entite_type' => 'EvalCourrier',
                'entite_id'   => $courrier->id,
                'meta'        => ['mode' => $mode],
            ]);

            return $courrier->fresh();
        });
    }

    // ── Accusé de consultation ────────────────────────────────────────────

    /**
     * L'agent accuse réception depuis le portail NiidPro.
     * Enregistre accuse_at — opération idempotente — sans changer le statut de la fiche.
     *
     * @throws \DomainException si le courrier n'a pas encore été envoyé
     */
    public function accuserConsultation(EvalCourrier $courrier, User $agent): EvalCourrier
    {
        if (! $courrier->estEnvoye()) {
            throw new \DomainException("Ce courrier n'a pas encore été transmis à l'agent.");
        }

        if ($courrier->estAccuse()) {
            return $courrier; // idempotent
        }

        $courrier->update(['accuse_at' => now(), 'accuse_par' => $agent->id]);

        EvalAudit::create([
            'user_id'     => $agent->id,
            'action'      => 'courrier.accuser_consultation',
            'entite_type' => 'EvalCourrier',
            'entite_id'   => $courrier->id,
        ]);

        return $courrier->fresh();
    }

    // ── Archivage ─────────────────────────────────────────────────────────

    /**
     * Archive une fiche individuelle (Notifiee → Archivee).
     *
     * @throws \DomainException
     */
    public function archiverFiche(EvalFiche $fiche, User $auteur): EvalFiche
    {
        if ($fiche->statut !== EvalStatutFiche::Notifiee) {
            throw new \DomainException(
                "La fiche doit être dans l'état « Notifiée » pour être archivée "
                . "(statut actuel : {$fiche->statut->libelle()})."
            );
        }

        $fiche->transitionnerVers(EvalStatutFiche::Archivee, $auteur, 'Archivage définitif');

        return $fiche->fresh();
    }

    /**
     * Archive en lot toutes les fiches Notifiee d'une synthèse.
     *
     * @return int nombre de fiches archivées
     */
    public function archiverLot(EvalSynthese $synthese, User $auteur): int
    {
        $fiches = EvalFiche::where('campagne_id', $synthese->campagne_id)
            ->where('statut', EvalStatutFiche::Notifiee->value)
            ->get();

        $count = 0;

        EvalFicheObserver::$suppresser = true;

        try {
            DB::transaction(function () use ($fiches, $auteur, &$count) {
                foreach ($fiches as $fiche) {
                    $fiche->transitionnerVers(EvalStatutFiche::Archivee, $auteur, 'Archivage définitif en lot');
                    $count++;
                }
            });
        } finally {
            EvalFicheObserver::$suppresser = false;
        }

        EvalAudit::create([
            'user_id'     => $auteur->id,
            'action'      => 'courrier.archiver_lot',
            'entite_type' => 'EvalSynthese',
            'entite_id'   => $synthese->id,
            'meta'        => ['nb_archivees' => $count],
        ]);

        return $count;
    }

    // ── Consultation ──────────────────────────────────────────────────────

    public function courriers(EvalSynthese $synthese): Collection
    {
        return EvalCourrier::where('synthese_id', $synthese->id)
            ->with([
                'fiche.employee.department',
                'signataire:id,name',
                'envoyeur:id,name',
                'accusePar:id,name',
            ])
            ->orderBy('created_at')
            ->get();
    }
}
