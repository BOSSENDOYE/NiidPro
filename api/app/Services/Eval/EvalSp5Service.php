<?php

namespace App\Services\Eval;

use App\Enums\EvalStatutFiche;
use App\Models\EvalAudit;
use App\Models\EvalFiche;
use App\Models\EvalGratification;
use App\Models\EvalSynthese;
use App\Models\User;
use App\Notifications\EvalValideeDgNotification;
use App\Observers\EvalFicheObserver;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EvalSp5Service
{
    // ── Ouverture pour étude DG ───────────────────────────────────────────

    /**
     * DG (ou SG en co-consultation) ouvre le tableau pour étude.
     * Passe toutes les fiches TableauTransmisDg → EtudieeeDg.
     * Horodate l'ouverture sur la synthèse.
     *
     * @throws \DomainException si la synthèse n'est pas dans l'état 'transmis'
     */
    public function ouvrirEtude(EvalSynthese $synthese, User $auteur): EvalSynthese
    {
        if (! $synthese->estTransmis()) {
            throw new \DomainException("Le tableau doit être dans l'état 'transmis' pour être étudié.");
        }

        return DB::transaction(function () use ($synthese, $auteur) {
            EvalFiche::where('campagne_id', $synthese->campagne_id)
                ->where('statut', EvalStatutFiche::TableauTransmisDg->value)
                ->get()
                ->each(fn($fiche) => $fiche->transitionnerVers(
                    EvalStatutFiche::EtudieeeDg,
                    $auteur,
                    'Ouverture du rapport de synthèse pour étude DG'
                ));

            if (! $synthese->etudie_dg_at) {
                $synthese->update([
                    'etudie_dg_par' => $auteur->id,
                    'etudie_dg_at'  => now(),
                ]);
            }

            return $synthese->fresh();
        });
    }

    // ── Annotation d'une fiche individuelle (DG ou SG) ───────────────────

    /**
     * Annote une fiche individuelle.
     * Auto-transite la fiche vers EtudieeeDg puis AnoteeDg si besoin.
     *
     * @throws \DomainException si la synthèse est déjà validée par le DG
     */
    public function annoterFiche(EvalFiche $fiche, EvalSynthese $synthese, User $auteur, string $annotation): EvalFiche
    {
        if ($synthese->estValideDg()) {
            throw new \DomainException("Le tableau validé par le DG ne peut plus être modifié.");
        }

        if ($fiche->statut === EvalStatutFiche::TableauTransmisDg) {
            $fiche->transitionnerVers(EvalStatutFiche::EtudieeeDg, $auteur, 'Ouverture implicite pour étude DG');
            $this->marquetEtudie($synthese, $auteur);
        }

        if ($fiche->statut === EvalStatutFiche::EtudieeeDg) {
            $fiche->transitionnerVers(EvalStatutFiche::AnoteeDg, $auteur, 'Annotation DG');
        }

        $fiche->update(['observations_dg' => $annotation, 'dg_user_id' => $auteur->id]);

        EvalAudit::create([
            'user_id'     => $auteur->id,
            'action'      => 'fiche.annoter_dg',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
        ]);

        return $fiche->fresh();
    }

    // ── Décision de gratification par agent ───────────────────────────────

    /**
     * Enregistre (ou met à jour) la décision de gratification pour un agent.
     * Types : prime, lettre_felicitation, promotion, aucune, avertissement.
     * Auto-transite la fiche si besoin.
     *
     * @throws \DomainException si la synthèse est déjà validée par le DG
     */
    public function enregistrerGratification(
        EvalSynthese $synthese,
        EvalFiche    $fiche,
        User         $dg,
        string       $typeDecision,
        ?string      $commentaire = null,
    ): EvalGratification {
        if ($synthese->estValideDg()) {
            throw new \DomainException("Le tableau validé par le DG ne peut plus être modifié.");
        }

        if (! array_key_exists($typeDecision, EvalGratification::TYPES_DECISION)) {
            throw new \DomainException("Type de décision invalide : {$typeDecision}.");
        }

        if ($fiche->statut === EvalStatutFiche::TableauTransmisDg) {
            $fiche->transitionnerVers(EvalStatutFiche::EtudieeeDg, $dg, 'Ouverture implicite pour étude DG');
            $this->marquetEtudie($synthese, $dg);
        }

        if ($fiche->statut === EvalStatutFiche::EtudieeeDg) {
            $fiche->transitionnerVers(EvalStatutFiche::AnoteeDg, $dg, 'Décision de gratification DG');
        }

        $gratification = EvalGratification::updateOrCreate(
            ['synthese_id' => $synthese->id, 'fiche_id' => $fiche->id],
            [
                'employee_id'   => $fiche->employee_id,
                'type_decision' => $typeDecision,
                'commentaire'   => $commentaire,
                'decide_par'    => $dg->id,
                'decided_at'    => now(),
            ]
        );

        EvalAudit::create([
            'user_id'     => $dg->id,
            'action'      => 'fiche.gratification.enregistrer',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
            'meta'        => ['type_decision' => $typeDecision],
        ]);

        return $gratification;
    }

    // ── Annotation globale de la synthèse (DG ou SG) ─────────────────────

    /**
     * Ajoute ou met à jour l'annotation globale du DG sur le tableau.
     *
     * @throws \DomainException si la synthèse est déjà validée par le DG
     */
    public function annoterSynthese(EvalSynthese $synthese, User $auteur, string $annotation): EvalSynthese
    {
        if ($synthese->estValideDg()) {
            throw new \DomainException("Le tableau validé par le DG ne peut plus être modifié.");
        }

        $this->marquetEtudie($synthese, $auteur);

        $synthese->update(['annotation_dg' => $annotation]);

        EvalAudit::create([
            'user_id'     => $auteur->id,
            'action'      => 'synthese.annoter_dg',
            'entite_type' => 'EvalSynthese',
            'entite_id'   => $synthese->id,
        ]);

        return $synthese->fresh();
    }

    // ── Liste des gratifications ──────────────────────────────────────────

    public function gratifications(EvalSynthese $synthese): Collection
    {
        return $synthese->gratifications()
            ->with(['fiche.employee.department', 'decidePar'])
            ->get();
    }

    // ── Validation et transmission au DAF ────────────────────────────────

    /**
     * DG valide le tableau annoté et le transmet au DAF pour notification (SP6).
     * Fige toutes les fiches SP5 (TableauTransmisDg/EtudieeeDg/AnoteeDg → ValideeNotification).
     * Notifie le DAF.
     *
     * @throws \DomainException si le tableau n'est pas dans l'état 'transmis'
     */
    public function validerEtTransmettre(EvalSynthese $synthese, User $dg): EvalSynthese
    {
        if (! $synthese->estTransmis()) {
            throw new \DomainException(
                $synthese->estValideDg()
                    ? "Le tableau a déjà été validé et transmis au DAF par le DG."
                    : "Le tableau doit d'abord être transmis au DG par le DAF avant validation."
            );
        }

        EvalFicheObserver::$suppresser = true;

        try {
            return $this->_validerTransaction($synthese, $dg);
        } finally {
            EvalFicheObserver::$suppresser = false;
        }
    }

    private function _validerTransaction(EvalSynthese $synthese, User $dg): EvalSynthese
    {
        return DB::transaction(function () use ($synthese, $dg) {
            $campagneId = $synthese->campagne_id;

            // TableauTransmisDg → EtudieeeDg → AnoteeDg → ValideeNotification
            EvalFiche::where('campagne_id', $campagneId)
                ->where('statut', EvalStatutFiche::TableauTransmisDg->value)
                ->get()
                ->each(function (EvalFiche $fiche) use ($dg) {
                    $fiche->transitionnerVers(EvalStatutFiche::EtudieeeDg, $dg, 'Validation DG globale');
                    $fiche->transitionnerVers(EvalStatutFiche::AnoteeDg, $dg, 'Validation DG globale');
                    $fiche->transitionnerVers(EvalStatutFiche::ValideeNotification, $dg, 'Validée par le Directeur général');
                });

            // EtudieeeDg → AnoteeDg → ValideeNotification
            EvalFiche::where('campagne_id', $campagneId)
                ->where('statut', EvalStatutFiche::EtudieeeDg->value)
                ->get()
                ->each(function (EvalFiche $fiche) use ($dg) {
                    $fiche->transitionnerVers(EvalStatutFiche::AnoteeDg, $dg, 'Validation DG globale');
                    $fiche->transitionnerVers(EvalStatutFiche::ValideeNotification, $dg, 'Validée par le Directeur général');
                });

            // AnoteeDg → ValideeNotification
            EvalFiche::where('campagne_id', $campagneId)
                ->where('statut', EvalStatutFiche::AnoteeDg->value)
                ->get()
                ->each(fn($fiche) => $fiche->transitionnerVers(
                    EvalStatutFiche::ValideeNotification,
                    $dg,
                    'Validée par le Directeur général'
                ));

            // Figer la synthèse
            $synthese->update([
                'statut'        => 'valide_dg',
                'valide_dg_par' => $dg->id,
                'valide_dg_at'  => now(),
                'etudie_dg_at'  => $synthese->etudie_dg_at ?? now(),
                'etudie_dg_par' => $synthese->etudie_dg_par ?? $dg->id,
            ]);

            // Notifier le DAF (celui qui avait transmis au DG)
            if ($synthese->transmis_dg_par) {
                User::find($synthese->transmis_dg_par)
                    ?->notify(new EvalValideeDgNotification($synthese, $dg));
            }

            return $synthese->fresh();
        });
    }

    // ── Helpers privés ────────────────────────────────────────────────────

    private function marquetEtudie(EvalSynthese $synthese, User $auteur): void
    {
        if (! $synthese->etudie_dg_at) {
            $synthese->update([
                'etudie_dg_par' => $auteur->id,
                'etudie_dg_at'  => now(),
            ]);
            $synthese->refresh();
        }
    }
}
