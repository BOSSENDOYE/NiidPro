<?php

namespace Tests\Feature\Eval;

use App\Enums\EvalStatutFiche;
use App\Models\EvalCampagne;
use App\Models\EvalCritere;
use App\Models\EvalFiche;
use App\Models\EvalGratification;
use App\Models\EvalNotation;
use App\Models\EvalReferentiel;
use App\Models\EvalSynthese;
use App\Models\User;
use App\Notifications\EvalValideeDgNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * SP5 — Étudier les rapports, notifier et transmettre (§7.5).
 */
class EvalSp5Test extends TestCase
{
    use RefreshDatabase;

    // ── Fixture ──────────────────────────────────────────────────────────

    private function creerContexteSP5(): array
    {
        $dg  = User::factory()->create();
        $sg  = User::factory()->create();
        $daf = User::factory()->create();

        $ref = EvalReferentiel::create([
            'code'     => 'SP5REF',
            'version'  => 1,
            'libelle'  => 'Référentiel SP5',
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

        // Agent 1 — fiche en TableauTransmisDg (état post-SP4)
        $agentUser1 = User::factory()->create();
        $employee1  = \App\Models\Employee::factory()->create(['user_id' => $agentUser1->id]);

        $fiche = EvalFiche::create([
            'campagne_id'          => $campagne->id,
            'employee_id'          => $employee1->id,
            'evaluateur_id'        => $daf->id,
            'statut'               => EvalStatutFiche::TableauTransmisDg->value,
            'categorie_agent'      => 'contractuel',
            'snapshot_nom_complet' => 'Agent Test SP5',
            'moyenne'              => 4.2,
            'appreciation'         => 'excellent',
        ]);

        EvalNotation::create(['fiche_id' => $fiche->id, 'critere_id' => $critere->id, 'note' => 4]);

        // Agent 2 — seconde fiche pour tests multi-agents
        $agentUser2 = User::factory()->create();
        $employee2  = \App\Models\Employee::factory()->create(['user_id' => $agentUser2->id]);

        $fiche2 = EvalFiche::create([
            'campagne_id'          => $campagne->id,
            'employee_id'          => $employee2->id,
            'evaluateur_id'        => $daf->id,
            'statut'               => EvalStatutFiche::TableauTransmisDg->value,
            'categorie_agent'      => 'contractuel',
            'snapshot_nom_complet' => 'Agent Deux SP5',
            'moyenne'              => 3.0,
            'appreciation'         => 'satisfaisant',
        ]);

        // Synthèse dans l'état 'transmis' (post-SP4 — DAF a transmis au DG)
        $synthese = EvalSynthese::create([
            'campagne_id'          => $campagne->id,
            'version'              => 1,
            'statut'               => 'transmis',
            'donnees'              => [
                'genere_at' => now()->toIso8601String(),
                'campagne'  => ['id' => $campagne->id, 'exercice' => 2026, 'titre' => null],
                'global'    => ['nb_fiches_integrees' => 2, 'moyenne_globale' => 3.6, 'appreciation_distribution' => []],
                'par_structure' => [],
                'par_critere'   => [],
                'besoins_formation' => [],
            ],
            'completude_confirmee' => true,
            'transmis_dg_par'      => $daf->id,
            'transmis_dg_at'       => now(),
            'genere_par'           => $daf->id,
        ]);

        return compact('dg', 'sg', 'daf', 'campagne', 'fiche', 'fiche2', 'synthese', 'critere', 'ref');
    }

    // ── 1 — Ouverture pour étude DG ──────────────────────────────────────

    public function test_dg_peut_ouvrir_etude_du_rapport(): void
    {
        ['dg' => $dg, 'synthese' => $synthese] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $response = $this->postJson("/api/eval/decisions-dg/{$synthese->id}/ouvrir-etude");

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => "Rapport de synthèse ouvert pour étude. Les fiches passent en statut « Étudiée par le DG/SG »."]);

        $synthese->refresh();
        $this->assertNotNull($synthese->etudie_dg_at);
        $this->assertEquals($dg->id, $synthese->etudie_dg_par);
    }

    public function test_ouverture_etude_passe_fiches_en_etudiee_dg(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche, 'fiche2' => $fiche2] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/ouvrir-etude")->assertStatus(200);

        $fiche->refresh();
        $fiche2->refresh();
        $this->assertEquals(EvalStatutFiche::EtudieeeDg, $fiche->statut);
        $this->assertEquals(EvalStatutFiche::EtudieeeDg, $fiche2->statut);
    }

    public function test_ouverture_etude_impossible_si_pas_transmis(): void
    {
        ['dg' => $dg, 'synthese' => $synthese] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        // Synthèse encore en brouillon
        $synthese->update(['statut' => 'brouillon']);

        $response = $this->postJson("/api/eval/decisions-dg/{$synthese->id}/ouvrir-etude");
        $response->assertStatus(422);
    }

    // ── 2 — Annotation individuelle des fiches ────────────────────────────

    public function test_dg_peut_annoter_une_fiche(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $response = $this->putJson("/api/eval/decisions-dg/{$synthese->id}/fiches/{$fiche->id}/annoter", [
            'annotation' => 'Agent exemplaire, à considérer pour promotion.',
        ]);

        $response->assertStatus(200);
        $fiche->refresh();
        $this->assertEquals('Agent exemplaire, à considérer pour promotion.', $fiche->observations_dg);
    }

    public function test_annotation_fiche_passe_fiche_en_annotee_dg(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $this->putJson("/api/eval/decisions-dg/{$synthese->id}/fiches/{$fiche->id}/annoter", [
            'annotation' => 'Observation DG.',
        ])->assertStatus(200);

        $fiche->refresh();
        $this->assertEquals(EvalStatutFiche::AnoteeDg, $fiche->statut);
    }

    public function test_sg_peut_annoter_une_fiche(): void
    {
        ['sg' => $sg, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP5();
        Sanctum::actingAs($sg, ['*']);

        $response = $this->putJson("/api/eval/decisions-dg/{$synthese->id}/fiches/{$fiche->id}/annoter", [
            'annotation' => 'Co-annotation SG.',
        ]);

        $response->assertStatus(200);
        $fiche->refresh();
        $this->assertEquals('Co-annotation SG.', $fiche->observations_dg);
    }

    public function test_annotation_impossible_apres_validation_dg(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        // Valider d'abord
        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/valider");

        $response = $this->putJson("/api/eval/decisions-dg/{$synthese->id}/fiches/{$fiche->id}/annoter", [
            'annotation' => 'Tentative tardive.',
        ]);

        $response->assertStatus(422);
    }

    // ── 3 — Décisions de gratification ───────────────────────────────────

    public function test_dg_peut_enregistrer_decision_gratification(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $response = $this->postJson("/api/eval/decisions-dg/{$synthese->id}/fiches/{$fiche->id}/gratification", [
            'type_decision' => 'prime',
            'commentaire'   => 'Excellent résultat sur toute la campagne.',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Décision de gratification enregistrée : Prime']);

        $this->assertDatabaseHas('eval_gratifications', [
            'synthese_id'   => $synthese->id,
            'fiche_id'      => $fiche->id,
            'type_decision' => 'prime',
        ]);
    }

    public function test_gratification_passe_fiche_en_annotee_dg(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/fiches/{$fiche->id}/gratification", [
            'type_decision' => 'lettre_felicitation',
        ])->assertStatus(200);

        $fiche->refresh();
        $this->assertEquals(EvalStatutFiche::AnoteeDg, $fiche->statut);
    }

    public function test_type_decision_invalide_retourne_422(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $response = $this->postJson("/api/eval/decisions-dg/{$synthese->id}/fiches/{$fiche->id}/gratification", [
            'type_decision' => 'valeur_invalide',
        ]);

        $response->assertStatus(422);
    }

    public function test_gratification_mise_a_jour_si_deja_existante(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/fiches/{$fiche->id}/gratification", [
            'type_decision' => 'prime',
        ]);

        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/fiches/{$fiche->id}/gratification", [
            'type_decision' => 'promotion',
        ]);

        // Doit rester à 1 enregistrement par agent par synthèse
        $this->assertEquals(1, EvalGratification::where('synthese_id', $synthese->id)->where('fiche_id', $fiche->id)->count());
        $this->assertDatabaseHas('eval_gratifications', ['fiche_id' => $fiche->id, 'type_decision' => 'promotion']);
    }

    public function test_liste_gratifications(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/fiches/{$fiche->id}/gratification", [
            'type_decision' => 'aucune',
        ]);

        $response = $this->getJson("/api/eval/decisions-dg/{$synthese->id}/gratifications");

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('total'));
    }

    // ── 4 — Annotation globale de la synthèse ────────────────────────────

    public function test_dg_peut_annoter_la_synthese_globalement(): void
    {
        ['dg' => $dg, 'synthese' => $synthese] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $response = $this->putJson("/api/eval/decisions-dg/{$synthese->id}/annoter-synthese", [
            'annotation_dg' => 'Résultats globalement satisfaisants. Effort particulier attendu sur la ponctualité.',
        ]);

        $response->assertStatus(200);
        $synthese->refresh();
        $this->assertEquals('Résultats globalement satisfaisants. Effort particulier attendu sur la ponctualité.', $synthese->annotation_dg);
    }

    public function test_annotation_synthese_marque_etude_dg(): void
    {
        ['dg' => $dg, 'synthese' => $synthese] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $this->assertNull($synthese->etudie_dg_at);

        $this->putJson("/api/eval/decisions-dg/{$synthese->id}/annoter-synthese", [
            'annotation_dg' => 'Annotation globale test.',
        ])->assertStatus(200);

        $synthese->refresh();
        $this->assertNotNull($synthese->etudie_dg_at);
    }

    // ── 5 — Validation et transmission au DAF ────────────────────────────

    public function test_dg_peut_valider_et_transmettre_au_daf(): void
    {
        ['dg' => $dg, 'synthese' => $synthese] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $response = $this->postJson("/api/eval/decisions-dg/{$synthese->id}/valider");

        $response->assertStatus(200);
        $synthese->refresh();
        $this->assertEquals('valide_dg', $synthese->statut);
        $this->assertNotNull($synthese->valide_dg_at);
        $this->assertEquals($dg->id, $synthese->valide_dg_par);
    }

    public function test_validation_passe_toutes_fiches_en_validee_notification(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche, 'fiche2' => $fiche2] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/valider")->assertStatus(200);

        $fiche->refresh();
        $fiche2->refresh();
        $this->assertEquals(EvalStatutFiche::ValideeNotification, $fiche->statut);
        $this->assertEquals(EvalStatutFiche::ValideeNotification, $fiche2->statut);
    }

    public function test_validation_passe_fiches_etudiees_en_validee_notification(): void
    {
        ['dg' => $dg, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        // Ouvrir l'étude d'abord (fiche → EtudieeeDg)
        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/ouvrir-etude");
        $fiche->refresh();
        $this->assertEquals(EvalStatutFiche::EtudieeeDg, $fiche->statut);

        // Valider sans annoter explicitement la fiche
        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/valider")->assertStatus(200);

        $fiche->refresh();
        $this->assertEquals(EvalStatutFiche::ValideeNotification, $fiche->statut);
    }

    public function test_validation_notifie_le_daf(): void
    {
        ['dg' => $dg, 'synthese' => $synthese] = $this->creerContexteSP5();
        Notification::fake();
        Sanctum::actingAs($dg, ['*']);

        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/valider")->assertStatus(200);

        Notification::assertSentTo(
            User::find($synthese->transmis_dg_par),
            EvalValideeDgNotification::class
        );
    }

    public function test_double_validation_retourne_422(): void
    {
        ['dg' => $dg, 'synthese' => $synthese] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/valider");
        $response = $this->postJson("/api/eval/decisions-dg/{$synthese->id}/valider");

        $response->assertStatus(422);
    }

    public function test_impossible_valider_synthese_non_transmise(): void
    {
        ['dg' => $dg, 'synthese' => $synthese] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $synthese->update(['statut' => 'brouillon']);

        $response = $this->postJson("/api/eval/decisions-dg/{$synthese->id}/valider");
        $response->assertStatus(422);
    }

    // ── 6 — Export PDF ───────────────────────────────────────────────────

    public function test_export_pdf_annote_retourne_fichier_pdf(): void
    {
        ['dg' => $dg, 'synthese' => $synthese] = $this->creerContexteSP5();
        Sanctum::actingAs($dg, ['*']);

        $this->postJson("/api/eval/decisions-dg/{$synthese->id}/valider");

        $response = $this->get("/api/eval/decisions-dg/{$synthese->id}/export-pdf");

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
    }
}
