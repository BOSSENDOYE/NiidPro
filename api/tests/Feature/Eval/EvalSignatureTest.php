<?php

namespace Tests\Feature\Eval;

use App\Enums\EvalStatutFiche;
use App\Models\EvalCampagne;
use App\Models\EvalCritere;
use App\Models\EvalFiche;
use App\Models\EvalNotation;
use App\Models\EvalReferentiel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * 4c — Double signature électronique séquentielle (§7.3).
 * Vérifie : flux normal, cas d'exception refus, transmission auto DAF (4d), PDF.
 */
class EvalSignatureTest extends TestCase
{
    use RefreshDatabase;

    // ── Fixture partagée ──────────────────────────────────────────────────

    private function creerFicheEnCoursNotation(): array
    {
        $evaluateur = User::factory()->create();
        $agentUser  = User::factory()->create();

        $ref = EvalReferentiel::create([
            'code'     => 'SIG',
            'version'  => 1,
            'libelle'  => 'Référentiel Signature',
            'note_min' => 1,
            'note_max' => 5,
            'cree_par' => $evaluateur->id,
        ]);

        $critere = EvalCritere::create([
            'referentiel_id' => $ref->id,
            'code'  => 'C01',
            'libelle' => 'Assiduité',
            'type'   => 'socle',
            'ordre'  => 1,
            'actif'  => true,
        ]);

        $campagne = EvalCampagne::create([
            'exercice'       => 2026,
            'statut'         => 'lancee',
            'referentiel_id' => $ref->id,
            'cree_par'       => $evaluateur->id,
        ]);

        $employee = \App\Models\Employee::factory()->create([
            'user_id' => $agentUser->id,
        ]);

        $fiche = EvalFiche::create([
            'campagne_id'          => $campagne->id,
            'employee_id'          => $employee->id,
            'evaluateur_id'        => $evaluateur->id,
            'statut'               => EvalStatutFiche::EnCoursNotation->value,
            'categorie_agent'      => 'contractuel',
            'snapshot_nom_complet' => 'Test Agent',
        ]);

        // Note le seul critère (prérequis pour signer)
        EvalNotation::create([
            'fiche_id'   => $fiche->id,
            'critere_id' => $critere->id,
            'note'       => 4,
        ]);
        $fiche->recalculerMoyenne();

        return compact('evaluateur', 'agentUser', 'fiche', 'critere', 'campagne');
    }

    // ── 4c.1 — Signature évaluateur ──────────────────────────────────────

    public function test_signer_evaluateur_depuis_en_cours_notation(): void
    {
        ['evaluateur' => $evaluateur, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();
        Sanctum::actingAs($evaluateur, ['*']);

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/signer-evaluateur", [
            'observations_evaluateur' => 'Très bon travail.',
        ]);

        $response->assertStatus(200);
        $fiche->refresh();
        $this->assertEquals(EvalStatutFiche::AttenteSignatureAgent, $fiche->statut);
        $this->assertNotNull($fiche->signe_evaluateur_at);
    }

    public function test_signer_evaluateur_echoue_si_criteres_non_notes(): void
    {
        ['evaluateur' => $evaluateur, 'fiche' => $fiche, 'critere' => $critere] = $this->creerFicheEnCoursNotation();
        Sanctum::actingAs($evaluateur, ['*']);

        // Supprimer la notation existante
        EvalNotation::where('fiche_id', $fiche->id)->delete();
        $fiche->update(['moyenne' => null, 'appreciation' => null]);

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/signer-evaluateur");

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Tous les critères obligatoires doivent être notés avant signature.']);
    }

    public function test_signer_evaluateur_echoue_si_mauvais_statut(): void
    {
        ['evaluateur' => $evaluateur, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();
        Sanctum::actingAs($evaluateur, ['*']);

        $fiche->update(['statut' => EvalStatutFiche::AgentConvoque->value]);

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/signer-evaluateur");

        $response->assertStatus(422);
    }

    // ── 4c.2 — Signature agent (flux normal) ─────────────────────────────

    public function test_flux_complet_double_signature_et_transmission_auto_daf(): void
    {
        ['evaluateur' => $evaluateur, 'agentUser' => $agentUser, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();

        // Étape 1 : évaluateur signe
        Sanctum::actingAs($evaluateur, ['*']);
        $this->putJson("/api/eval/fiches/{$fiche->id}/signer-evaluateur")
            ->assertStatus(200);

        $fiche->refresh();
        $this->assertEquals(EvalStatutFiche::AttenteSignatureAgent, $fiche->statut);

        // Étape 2 : agent signe
        Sanctum::actingAs($agentUser, ['*']);
        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/signer-agent", [
            'observations_agent' => 'Je valide la fiche.',
            'refus_signature'    => false,
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => "Fiche signée et transmise automatiquement au DAF."]);

        $fiche->refresh();

        // 4d — Transmission automatique au DAF vérifiée
        $this->assertEquals(EvalStatutFiche::TransmiseDaf, $fiche->statut);
        $this->assertNotNull($fiche->signe_agent_at);
    }

    // ── 4c.3 — Cas d'exception : refus de signature (§6) ─────────────────

    public function test_refus_signature_agent_passe_en_signature_refusee(): void
    {
        ['evaluateur' => $evaluateur, 'agentUser' => $agentUser, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();

        // Évaluateur signe d'abord
        Sanctum::actingAs($evaluateur, ['*']);
        $this->putJson("/api/eval/fiches/{$fiche->id}/signer-evaluateur")->assertStatus(200);

        // Agent refuse
        Sanctum::actingAs($agentUser, ['*']);
        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/signer-agent", [
            'refus_signature'       => true,
            'motif_refus_signature' => 'Notes incorrectes.',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => "Refus de signature enregistré. La fiche repasse en attente de traitement."]);

        $fiche->refresh();
        $this->assertEquals(EvalStatutFiche::SignatureRefusee, $fiche->statut);
        $this->assertTrue((bool) $fiche->refus_signature_agent);
        $this->assertEquals('Notes incorrectes.', $fiche->motif_refus_signature);
    }

    public function test_refus_signature_sans_motif_retourne_422(): void
    {
        ['evaluateur' => $evaluateur, 'agentUser' => $agentUser, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();

        Sanctum::actingAs($evaluateur, ['*']);
        $this->putJson("/api/eval/fiches/{$fiche->id}/signer-evaluateur")->assertStatus(200);

        Sanctum::actingAs($agentUser, ['*']);
        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/signer-agent", [
            'refus_signature' => true,
            // motif absent
        ]);

        $response->assertStatus(422);
    }

    // ── 4c.4 — Après refus : retour en attente_signature_agent ───────────

    public function test_signature_refusee_peut_retourner_en_attente_signature(): void
    {
        ['evaluateur' => $evaluateur, 'agentUser' => $agentUser, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();

        // Mettre directement en signature_refusee pour ce test
        $fiche->update(['statut' => EvalStatutFiche::SignatureRefusee->value]);

        Sanctum::actingAs($evaluateur, ['*']);

        // La transition SignatureRefusee → AttenteSignatureAgent doit être possible
        $this->assertTrue(
            EvalStatutFiche::SignatureRefusee->peutTransitionnerVers(EvalStatutFiche::AttenteSignatureAgent)
        );
    }

    // ── 4c.5 — PDF (4c) ───────────────────────────────────────────────────

    public function test_pdf_accessible_depuis_attente_signature_agent(): void
    {
        ['evaluateur' => $evaluateur, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();
        Sanctum::actingAs($evaluateur, ['*']);

        // Signer pour atteindre AttenteSignatureAgent
        $this->putJson("/api/eval/fiches/{$fiche->id}/signer-evaluateur")->assertStatus(200);

        $response = $this->getJson("/api/eval/fiches/{$fiche->id}/pdf");

        // dompdf renvoie du contenu binaire PDF — statut 200 attendu
        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_pdf_refuse_si_statut_trop_tot(): void
    {
        ['evaluateur' => $evaluateur, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();
        Sanctum::actingAs($evaluateur, ['*']);

        // La fiche est encore en en_cours_notation → PDF interdit
        $response = $this->get("/api/eval/fiches/{$fiche->id}/pdf");

        $response->assertStatus(403);
    }

    // ── 4d — is_readonly dans show() ─────────────────────────────────────

    public function test_show_fiche_signee_marquee_is_readonly(): void
    {
        ['evaluateur' => $evaluateur, 'agentUser' => $agentUser, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();

        // Flux complet jusqu'à transmise_daf
        Sanctum::actingAs($evaluateur, ['*']);
        $this->putJson("/api/eval/fiches/{$fiche->id}/signer-evaluateur")->assertStatus(200);

        Sanctum::actingAs($agentUser, ['*']);
        $this->putJson("/api/eval/fiches/{$fiche->id}/signer-agent", ['refus_signature' => false]);

        Sanctum::actingAs($evaluateur, ['*']);
        $response = $this->getJson("/api/eval/fiches/{$fiche->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['is_readonly' => true]);
    }

    public function test_show_fiche_en_cours_non_readonly(): void
    {
        ['evaluateur' => $evaluateur, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();
        Sanctum::actingAs($evaluateur, ['*']);

        $response = $this->getJson("/api/eval/fiches/{$fiche->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['is_readonly' => false]);
    }

    // ── 4b — Blocs bilan ──────────────────────────────────────────────────

    public function test_sauvegarde_bilan_en_cours_notation(): void
    {
        ['evaluateur' => $evaluateur, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();
        Sanctum::actingAs($evaluateur, ['*']);

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/bilan", [
            'bilan_plan_action'      => 'Les objectifs de l\'an passé ont été atteints à 80%.',
            'realisations'           => 'Participation au projet X.',
            'perspectives_evolution' => 'Promotion envisagée en 2027.',
        ]);

        $response->assertStatus(200);

        $fiche->refresh();
        $this->assertEquals('Les objectifs de l\'an passé ont été atteints à 80%.', $fiche->bilan_plan_action);
        $this->assertEquals('Promotion envisagée en 2027.', $fiche->perspectives_evolution);
    }

    public function test_bilan_refuse_apres_transmission_daf(): void
    {
        ['evaluateur' => $evaluateur, 'fiche' => $fiche] = $this->creerFicheEnCoursNotation();
        Sanctum::actingAs($evaluateur, ['*']);

        $fiche->update(['statut' => EvalStatutFiche::TransmiseDaf->value]);

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/bilan", [
            'bilan_plan_action' => 'Tentative de modification.',
        ]);

        $response->assertStatus(422);
    }
}
