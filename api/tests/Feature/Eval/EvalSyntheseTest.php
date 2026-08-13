<?php

namespace Tests\Feature\Eval;

use App\Enums\EvalStatutFiche;
use App\Models\EvalBesoinFormation;
use App\Models\EvalCampagne;
use App\Models\EvalCritere;
use App\Models\EvalFiche;
use App\Models\EvalNotation;
use App\Models\EvalReferentiel;
use App\Models\EvalSynthese;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * SP4 — Élaboration du tableau de synthèse (§7.4).
 */
class EvalSyntheseTest extends TestCase
{
    use RefreshDatabase;

    // ── Fixture ──────────────────────────────────────────────────────────

    private function creerContexteSP4(): array
    {
        $daf  = User::factory()->create();
        $rh   = User::factory()->create();
        $resp = User::factory()->create();

        $ref = EvalReferentiel::create([
            'code'     => 'SP4REF',
            'version'  => 1,
            'libelle'  => 'Référentiel SP4',
            'note_min' => 1,
            'note_max' => 5,
            'cree_par' => $daf->id,
        ]);

        $critere = EvalCritere::create([
            'referentiel_id' => $ref->id,
            'code'           => 'C01',
            'libelle'        => 'Assiduité',
            'type'           => 'socle',
            'ordre'          => 1,
            'actif'          => true,
        ]);

        $campagne = EvalCampagne::create([
            'exercice'       => 2026,
            'statut'         => 'lancee',
            'referentiel_id' => $ref->id,
            'cree_par'       => $daf->id,
        ]);

        // Fiche 1 : déjà réceptionnée (ReceptioneeDaf)
        $agentUser1 = User::factory()->create();
        $employee1  = \App\Models\Employee::factory()->create(['user_id' => $agentUser1->id]);

        $fiche1 = EvalFiche::create([
            'campagne_id'          => $campagne->id,
            'employee_id'          => $employee1->id,
            'evaluateur_id'        => $resp->id,
            'statut'               => EvalStatutFiche::ReceptioneeDaf->value,
            'categorie_agent'      => 'contractuel',
            'snapshot_nom_complet' => 'Agent Un',
            'moyenne'              => 4.0,
            'appreciation'         => 'excellent',
        ]);

        EvalNotation::create(['fiche_id' => $fiche1->id, 'critere_id' => $critere->id, 'note' => 4]);

        // Fiche 2 : transmise mais pas encore réceptionnée (pour test de complétude)
        $agentUser2 = User::factory()->create();
        $employee2  = \App\Models\Employee::factory()->create(['user_id' => $agentUser2->id]);

        $fiche2 = EvalFiche::create([
            'campagne_id'          => $campagne->id,
            'employee_id'          => $employee2->id,
            'evaluateur_id'        => $resp->id,
            'statut'               => EvalStatutFiche::TransmiseDaf->value,
            'categorie_agent'      => 'contractuel',
            'snapshot_nom_complet' => 'Agent Deux',
        ]);

        return compact('daf', 'rh', 'resp', 'campagne', 'fiche1', 'fiche2', 'critere', 'ref');
    }

    // ── 1 — Génération du tableau ─────────────────────────────────────────

    public function test_daf_peut_generer_le_tableau_de_synthese(): void
    {
        ['daf' => $daf, 'campagne' => $campagne, 'fiche1' => $fiche1] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $response = $this->postJson('/api/eval/syntheses', [
            'campagne_id' => $campagne->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Tableau de synthèse v1 généré.']);

        $this->assertDatabaseHas('eval_syntheses', [
            'campagne_id' => $campagne->id,
            'version'     => 1,
            'statut'      => 'brouillon',
        ]);
    }

    public function test_generation_passe_fiches_en_integree_synthese(): void
    {
        ['daf' => $daf, 'campagne' => $campagne, 'fiche1' => $fiche1] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id])
            ->assertStatus(200);

        $fiche1->refresh();
        $this->assertEquals(EvalStatutFiche::IntegreeeSynthese, $fiche1->statut);
    }

    public function test_regeneration_cree_meme_version_si_brouillon_existant(): void
    {
        ['daf' => $daf, 'campagne' => $campagne] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);

        // Doit rester à version 1 (mise à jour du brouillon existant)
        $this->assertEquals(1, EvalSynthese::where('campagne_id', $campagne->id)->count());
    }

    // ── 2 — Contrôle de complétude ────────────────────────────────────────

    public function test_completude_retourne_agents_avec_fiche_non_receptionnee(): void
    {
        ['daf' => $daf, 'campagne' => $campagne, 'fiche2' => $fiche2] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        // Générer une synthèse d'abord
        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        $response = $this->getJson("/api/eval/syntheses/{$synthese->id}/completude");

        $response->assertStatus(200);
        // fiche2 est en TransmiseDaf (pas encore réceptionnée) → doit apparaître
        $this->assertGreaterThan(0, $response->json('nb_manquants'));
    }

    // ── 3 — Confirmation de complétude ────────────────────────────────────

    public function test_daf_peut_confirmer_la_completude(): void
    {
        ['daf' => $daf, 'campagne' => $campagne] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        $response = $this->postJson("/api/eval/syntheses/{$synthese->id}/confirmer-completude");

        $response->assertStatus(200);
        $synthese->refresh();
        $this->assertTrue($synthese->completude_confirmee);
        $this->assertNotNull($synthese->completude_confirmee_at);
    }

    // ── 4 — Relance responsable ───────────────────────────────────────────

    public function test_relance_responsable_pour_fiche_non_receptionnee(): void
    {
        ['daf' => $daf, 'campagne' => $campagne, 'fiche2' => $fiche2] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        $response = $this->postJson("/api/eval/syntheses/{$synthese->id}/relancer/{$fiche2->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Relance envoyée au responsable hiérarchique.']);
    }

    // ── 5 — Annotations Division RH ──────────────────────────────────────

    public function test_division_rh_peut_annoter(): void
    {
        ['daf' => $daf, 'rh' => $rh, 'campagne' => $campagne] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        Sanctum::actingAs($rh, ['*']);
        $response = $this->putJson("/api/eval/syntheses/{$synthese->id}/annoter", [
            'notes_division_rh' => 'Vérification effectuée. Données cohérentes.',
        ]);

        $response->assertStatus(200);
        $synthese->refresh();
        $this->assertEquals('Vérification effectuée. Données cohérentes.', $synthese->notes_division_rh);
    }

    public function test_annotation_impossible_apres_transmission_dg(): void
    {
        ['daf' => $daf, 'rh' => $rh, 'campagne' => $campagne] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        // Confirmer complétude puis transmettre
        $this->postJson("/api/eval/syntheses/{$synthese->id}/confirmer-completude");
        $this->postJson("/api/eval/syntheses/{$synthese->id}/transmettre-dg");

        Sanctum::actingAs($rh, ['*']);
        $response = $this->putJson("/api/eval/syntheses/{$synthese->id}/annoter", [
            'notes_division_rh' => 'Tentative tardive.',
        ]);

        $response->assertStatus(422);
    }

    // ── 6 — Transmission au DG ───────────────────────────────────────────

    public function test_transmission_dg_impossible_sans_confirmation_completude(): void
    {
        ['daf' => $daf, 'campagne' => $campagne] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        // Pas de confirmerCompletude → doit échouer
        $response = $this->postJson("/api/eval/syntheses/{$synthese->id}/transmettre-dg");

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'La complétude doit être confirmée par le DAF avant de transmettre au DG.']);
    }

    public function test_daf_peut_transmettre_au_dg_apres_confirmation_completude(): void
    {
        ['daf' => $daf, 'campagne' => $campagne, 'fiche1' => $fiche1] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        $this->postJson("/api/eval/syntheses/{$synthese->id}/confirmer-completude");

        $response = $this->postJson("/api/eval/syntheses/{$synthese->id}/transmettre-dg");

        $response->assertStatus(200);
        $synthese->refresh();
        $this->assertEquals('transmis', $synthese->statut);
        $this->assertNotNull($synthese->transmis_dg_at);
    }

    public function test_fiches_passent_en_tableau_transmis_dg_apres_transmission(): void
    {
        ['daf' => $daf, 'campagne' => $campagne, 'fiche1' => $fiche1] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        // fiche1 est passée en integree_synthese lors de la génération
        $fiche1->refresh();
        $this->assertEquals(EvalStatutFiche::IntegreeeSynthese, $fiche1->statut);

        $this->postJson("/api/eval/syntheses/{$synthese->id}/confirmer-completude");
        $this->postJson("/api/eval/syntheses/{$synthese->id}/transmettre-dg");

        $fiche1->refresh();
        $this->assertEquals(EvalStatutFiche::TableauTransmisDg, $fiche1->statut);
    }

    public function test_double_transmission_retourne_422(): void
    {
        ['daf' => $daf, 'campagne' => $campagne] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        $this->postJson("/api/eval/syntheses/{$synthese->id}/confirmer-completude");
        $this->postJson("/api/eval/syntheses/{$synthese->id}/transmettre-dg");

        $response = $this->postJson("/api/eval/syntheses/{$synthese->id}/transmettre-dg");
        $response->assertStatus(422);
    }

    // ── 7 — Exports ──────────────────────────────────────────────────────

    public function test_export_pdf_retourne_fichier_pdf(): void
    {
        ['daf' => $daf, 'campagne' => $campagne] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        $response = $this->get("/api/eval/syntheses/{$synthese->id}/export-pdf");

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_export_excel_retourne_fichier_xlsx(): void
    {
        ['daf' => $daf, 'campagne' => $campagne] = $this->creerContexteSP4();
        Sanctum::actingAs($daf, ['*']);

        $this->postJson('/api/eval/syntheses', ['campagne_id' => $campagne->id]);
        $synthese = EvalSynthese::where('campagne_id', $campagne->id)->first();

        $response = $this->get("/api/eval/syntheses/{$synthese->id}/export-excel");

        $response->assertStatus(200);
        $this->assertStringContainsString(
            'openxmlformats-officedocument.spreadsheetml',
            $response->headers->get('Content-Type')
        );
    }
}
