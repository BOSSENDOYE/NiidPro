<?php

namespace Tests\Unit;

use App\Enums\EvalStatutFiche;
use PHPUnit\Framework\TestCase;

/**
 * Tests unitaires sur la machine à états de la fiche d'évaluation.
 * Vérifie que les 18 statuts §6 + 3 exceptions respectent les transitions
 * autorisées et qu'aucun saut d'étape n'est possible.
 * Pas de base de données requise — tests purement sur l'Enum.
 */
class EvalStatutFicheTransitionTest extends TestCase
{
    // ── Transitions normales du cycle de vie (§6 statuts 1→18) ───────────

    public function test_cree_peut_transitionner_vers_transmise_responsable(): void
    {
        $this->assertTrue(
            EvalStatutFiche::Cree->peutTransitionnerVers(EvalStatutFiche::TransmiseResponsable)
        );
    }

    public function test_transmise_responsable_peut_transitionner_vers_entretien_planifie(): void
    {
        $this->assertTrue(
            EvalStatutFiche::TransmiseResponsable->peutTransitionnerVers(EvalStatutFiche::EntretienPlanifie)
        );
    }

    public function test_entretien_planifie_peut_transitionner_vers_agent_convoque(): void
    {
        $this->assertTrue(
            EvalStatutFiche::EntretienPlanifie->peutTransitionnerVers(EvalStatutFiche::AgentConvoque)
        );
    }

    public function test_agent_convoque_peut_transitionner_vers_en_cours_notation(): void
    {
        $this->assertTrue(
            EvalStatutFiche::AgentConvoque->peutTransitionnerVers(EvalStatutFiche::EnCoursNotation)
        );
    }

    public function test_en_cours_notation_peut_transitionner_vers_notee_discussion(): void
    {
        $this->assertTrue(
            EvalStatutFiche::EnCoursNotation->peutTransitionnerVers(EvalStatutFiche::NoteeDiscussion)
        );
    }

    public function test_notee_discussion_peut_transitionner_vers_attente_signature(): void
    {
        $this->assertTrue(
            EvalStatutFiche::NoteeDiscussion->peutTransitionnerVers(EvalStatutFiche::AttenteSignatureAgent)
        );
    }

    public function test_attente_signature_peut_transitionner_vers_signee(): void
    {
        $this->assertTrue(
            EvalStatutFiche::AttenteSignatureAgent->peutTransitionnerVers(EvalStatutFiche::Signee)
        );
    }

    public function test_signee_peut_transitionner_vers_transmise_daf(): void
    {
        $this->assertTrue(
            EvalStatutFiche::Signee->peutTransitionnerVers(EvalStatutFiche::TransmiseDaf)
        );
    }

    public function test_transmise_daf_peut_transitionner_vers_receptionee_daf(): void
    {
        $this->assertTrue(
            EvalStatutFiche::TransmiseDaf->peutTransitionnerVers(EvalStatutFiche::ReceptioneeDaf)
        );
    }

    public function test_receptionee_daf_peut_transitionner_vers_integree_synthese(): void
    {
        $this->assertTrue(
            EvalStatutFiche::ReceptioneeDaf->peutTransitionnerVers(EvalStatutFiche::IntegreeeSynthese)
        );
    }

    public function test_integree_synthese_peut_transitionner_vers_tableau_transmis_dg(): void
    {
        $this->assertTrue(
            EvalStatutFiche::IntegreeeSynthese->peutTransitionnerVers(EvalStatutFiche::TableauTransmisDg)
        );
    }

    public function test_tableau_transmis_dg_peut_transitionner_vers_etudiee_dg(): void
    {
        $this->assertTrue(
            EvalStatutFiche::TableauTransmisDg->peutTransitionnerVers(EvalStatutFiche::EtudieeeDg)
        );
    }

    public function test_etudiee_dg_peut_transitionner_vers_annotee_dg(): void
    {
        $this->assertTrue(
            EvalStatutFiche::EtudieeeDg->peutTransitionnerVers(EvalStatutFiche::AnoteeDg)
        );
    }

    public function test_annotee_dg_peut_transitionner_vers_validee_notification(): void
    {
        $this->assertTrue(
            EvalStatutFiche::AnoteeDg->peutTransitionnerVers(EvalStatutFiche::ValideeNotification)
        );
    }

    public function test_validee_notification_peut_transitionner_vers_courrier_etabli(): void
    {
        $this->assertTrue(
            EvalStatutFiche::ValideeNotification->peutTransitionnerVers(EvalStatutFiche::CourrierEtabli)
        );
    }

    public function test_courrier_etabli_peut_transitionner_vers_notifiee(): void
    {
        $this->assertTrue(
            EvalStatutFiche::CourrierEtabli->peutTransitionnerVers(EvalStatutFiche::Notifiee)
        );
    }

    public function test_notifiee_peut_transitionner_vers_archivee(): void
    {
        $this->assertTrue(
            EvalStatutFiche::Notifiee->peutTransitionnerVers(EvalStatutFiche::Archivee)
        );
    }

    // ── Statuts terminaux — aucune transition possible ────────────────────

    public function test_archivee_est_terminal(): void
    {
        $this->assertTrue(EvalStatutFiche::Archivee->estTerminal());
        $this->assertEmpty(EvalStatutFiche::Archivee->transitionsAutorisees());
    }

    public function test_cloturee_sortie_est_terminal(): void
    {
        $this->assertTrue(EvalStatutFiche::ClotureeeSortie->estTerminal());
        $this->assertEmpty(EvalStatutFiche::ClotureeeSortie->transitionsAutorisees());
    }

    // ── Sauts d'étape interdits ───────────────────────────────────────────

    public function test_cree_ne_peut_pas_sauter_vers_signee(): void
    {
        $this->assertFalse(
            EvalStatutFiche::Cree->peutTransitionnerVers(EvalStatutFiche::Signee)
        );
    }

    public function test_cree_ne_peut_pas_sauter_vers_archivee(): void
    {
        $this->assertFalse(
            EvalStatutFiche::Cree->peutTransitionnerVers(EvalStatutFiche::Archivee)
        );
    }

    public function test_transmise_responsable_ne_peut_pas_sauter_vers_signee(): void
    {
        $this->assertFalse(
            EvalStatutFiche::TransmiseResponsable->peutTransitionnerVers(EvalStatutFiche::Signee)
        );
    }

    public function test_notee_discussion_ne_peut_pas_aller_vers_signee_directement(): void
    {
        // Il faut passer par attente_signature_agent
        $this->assertFalse(
            EvalStatutFiche::NoteeDiscussion->peutTransitionnerVers(EvalStatutFiche::Signee)
        );
    }

    public function test_signee_ne_peut_pas_revenir_en_arriere(): void
    {
        $this->assertFalse(
            EvalStatutFiche::Signee->peutTransitionnerVers(EvalStatutFiche::Cree)
        );
        $this->assertFalse(
            EvalStatutFiche::Signee->peutTransitionnerVers(EvalStatutFiche::EntretienPlanifie)
        );
    }

    public function test_archivee_ne_peut_aller_nulle_part(): void
    {
        foreach (EvalStatutFiche::cases() as $cible) {
            $this->assertFalse(
                EvalStatutFiche::Archivee->peutTransitionnerVers($cible),
                "Archivée ne devrait pas pouvoir transitionner vers {$cible->value}"
            );
        }
    }

    // ── Cas d'exception §6 ────────────────────────────────────────────────

    public function test_attente_signature_peut_transitionner_vers_signature_refusee(): void
    {
        $this->assertTrue(
            EvalStatutFiche::AttenteSignatureAgent->peutTransitionnerVers(EvalStatutFiche::SignatureRefusee)
        );
    }

    public function test_signature_refusee_peut_reprendre_vers_attente_signature(): void
    {
        // L'évaluateur peut relancer une demande de signature
        $this->assertTrue(
            EvalStatutFiche::SignatureRefusee->peutTransitionnerVers(EvalStatutFiche::AttenteSignatureAgent)
        );
    }

    public function test_signature_refusee_peut_aller_vers_entretien_reporte(): void
    {
        // Le responsable peut décider de replanifier l'entretien
        $this->assertTrue(
            EvalStatutFiche::SignatureRefusee->peutTransitionnerVers(EvalStatutFiche::EntretienReporte)
        );
    }

    public function test_entretien_planifie_peut_aller_vers_entretien_reporte(): void
    {
        $this->assertTrue(
            EvalStatutFiche::EntretienPlanifie->peutTransitionnerVers(EvalStatutFiche::EntretienReporte)
        );
    }

    public function test_entretien_reporte_reprend_vers_entretien_planifie(): void
    {
        $this->assertTrue(
            EvalStatutFiche::EntretienReporte->peutTransitionnerVers(EvalStatutFiche::EntretienPlanifie)
        );
    }

    public function test_cloturee_sortie_accessible_depuis_cree(): void
    {
        $this->assertTrue(
            EvalStatutFiche::Cree->peutTransitionnerVers(EvalStatutFiche::ClotureeeSortie)
        );
    }

    public function test_cloturee_sortie_accessible_depuis_signee(): void
    {
        // Agent quittant après signature mais avant notification
        $this->assertTrue(
            EvalStatutFiche::Signee->peutTransitionnerVers(EvalStatutFiche::ClotureeeSortie)
        );
    }

    public function test_cloturee_sortie_non_accessible_depuis_transmise_daf(): void
    {
        // Une fois la fiche chez le DAF, le circuit administratif continue
        $this->assertFalse(
            EvalStatutFiche::TransmiseDaf->peutTransitionnerVers(EvalStatutFiche::ClotureeeSortie)
        );
    }

    // ── Libellés et métadonnées ───────────────────────────────────────────

    public function test_tous_les_statuts_ont_un_libelle_non_vide(): void
    {
        foreach (EvalStatutFiche::cases() as $statut) {
            $this->assertNotEmpty(
                $statut->libelle(),
                "Le statut {$statut->value} n'a pas de libellé"
            );
        }
    }

    public function test_tous_les_statuts_ont_une_sous_procedure(): void
    {
        foreach (EvalStatutFiche::cases() as $statut) {
            $this->assertNotEmpty(
                $statut->sousProcedure(),
                "Le statut {$statut->value} n'a pas de sous-procédure"
            );
        }
    }

    public function test_ordre_cycle_vie_contient_18_statuts(): void
    {
        $this->assertCount(18, EvalStatutFiche::ordreCycleVie());
    }

    public function test_ordre_cycle_vie_commence_par_cree_et_finit_par_archivee(): void
    {
        $ordre = EvalStatutFiche::ordreCycleVie();

        $this->assertSame(EvalStatutFiche::Cree, $ordre[0]);
        $this->assertSame(EvalStatutFiche::Archivee, $ordre[17]);
    }

    public function test_chaque_statut_du_cycle_permet_la_transition_suivante(): void
    {
        $ordre = EvalStatutFiche::ordreCycleVie();

        for ($i = 0; $i < count($ordre) - 1; $i++) {
            $this->assertTrue(
                $ordre[$i]->peutTransitionnerVers($ordre[$i + 1]),
                "Transition manquante : {$ordre[$i]->value} → {$ordre[$i+1]->value}"
            );
        }
    }

    public function test_enum_contient_21_cases(): void
    {
        // 18 statuts officiels + 3 exceptions = 21
        $this->assertCount(21, EvalStatutFiche::cases());
    }
}
