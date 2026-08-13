<?php

namespace Tests\Feature\Eval;

use App\Enums\EvalStatutFiche;
use App\Models\EvalCampagne;
use App\Models\EvalCritere;
use App\Models\EvalFiche;
use App\Models\EvalReferentiel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * 4a — Formulaire de notation par critère.
 * Vérifie : barème dynamique, critères conditionnels (§4.1), calculs moyenne/appréciation.
 */
class EvalNotationTest extends TestCase
{
    use RefreshDatabase;

    // ── Fixtures partagées ────────────────────────────────────────────────

    private function creerContexteNotation(string $categorieAgent = 'contractuel'): array
    {
        $evaluateur = User::factory()->create();
        Sanctum::actingAs($evaluateur, ['*']);

        $ref = EvalReferentiel::create([
            'code'     => 'TEST',
            'version'  => 1,
            'libelle'  => 'Référentiel Test',
            'note_min' => 1,
            'note_max' => 5,
            'cree_par' => $evaluateur->id,
        ]);

        // 3 critères socles
        $socles = collect();
        for ($i = 1; $i <= 3; $i++) {
            $socles->push(EvalCritere::create([
                'referentiel_id' => $ref->id,
                'code'           => "S0{$i}",
                'libelle'        => "Critère socle {$i}",
                'type'           => 'socle',
                'ordre'          => $i,
                'actif'          => true,
            ]));
        }

        // 2 critères complémentaires
        $comps = collect();
        for ($i = 1; $i <= 2; $i++) {
            $comps->push(EvalCritere::create([
                'referentiel_id' => $ref->id,
                'code'           => "C0{$i}",
                'libelle'        => "Critère complémentaire {$i}",
                'type'           => 'complementaire',
                'ordre'          => 3 + $i,
                'actif'          => true,
            ]));
        }

        $campagne = EvalCampagne::create([
            'exercice'       => 2026,
            'titre'          => 'Campagne Test',
            'statut'         => 'lancee',
            'referentiel_id' => $ref->id,
            'cree_par'       => $evaluateur->id,
        ]);

        $employee = \App\Models\Employee::factory()->create([
            'user_id'          => User::factory()->create()->id,
            'categorie_emploi' => $categorieAgent === 'mis_a_disposition' ? 'fonctionnaire' : 'contractuel',
        ]);

        $fiche = EvalFiche::create([
            'campagne_id'   => $campagne->id,
            'employee_id'   => $employee->id,
            'evaluateur_id' => $evaluateur->id,
            'statut'        => EvalStatutFiche::AgentConvoque->value,
            'categorie_agent' => $categorieAgent,
            'snapshot_nom_complet' => $employee->first_name . ' ' . $employee->last_name,
        ]);

        return compact('evaluateur', 'ref', 'campagne', 'fiche', 'socles', 'comps', 'employee');
    }

    // ── 4a.1 — Barème dynamique (note_min/note_max du référentiel) ────────

    public function test_note_dans_le_bareme_acceptee(): void
    {
        ['fiche' => $fiche, 'socles' => $socles] = $this->creerContexteNotation();

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/noter", [
            'notations' => [
                ['critere_id' => $socles[0]->id, 'note' => 4],
                ['critere_id' => $socles[1]->id, 'note' => 5],
                ['critere_id' => $socles[2]->id, 'note' => 3],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('eval_notations', [
            'fiche_id'   => $fiche->id,
            'critere_id' => $socles[0]->id,
            'note'       => 4,
        ]);
    }

    public function test_note_superieure_a_note_max_rejetee(): void
    {
        ['fiche' => $fiche, 'socles' => $socles] = $this->creerContexteNotation();

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/noter", [
            'notations' => [
                ['critere_id' => $socles[0]->id, 'note' => 6], // > note_max=5
            ],
        ]);

        $response->assertStatus(422);
    }

    public function test_note_inferieure_a_note_min_rejetee(): void
    {
        ['fiche' => $fiche, 'socles' => $socles] = $this->creerContexteNotation();

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/noter", [
            'notations' => [
                ['critere_id' => $socles[0]->id, 'note' => 0], // < note_min=1
            ],
        ]);

        $response->assertStatus(422);
    }

    // ── 4a.2 — Critères conditionnels (§4.1 complémentaires) ─────────────

    public function test_critere_complementaire_rejete_pour_agent_contractuel(): void
    {
        ['fiche' => $fiche, 'comps' => $comps] = $this->creerContexteNotation('contractuel');

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/noter", [
            'notations' => [
                ['critere_id' => $comps[0]->id, 'note' => 3], // comp non applicable
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => "Le critère #{$comps[0]->id} n'est pas applicable à cet agent."]);
    }

    public function test_critere_complementaire_accepte_pour_agent_mis_a_disposition(): void
    {
        ['fiche' => $fiche, 'socles' => $socles, 'comps' => $comps] = $this->creerContexteNotation('mis_a_disposition');

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/noter", [
            'notations' => [
                ['critere_id' => $socles[0]->id, 'note' => 4],
                ['critere_id' => $comps[0]->id, 'note' => 3], // comp applicable
            ],
        ]);

        $response->assertStatus(200);
    }

    public function test_endpoint_criteres_retourne_criteres_applicable_seulement(): void
    {
        ['fiche' => $fiche] = $this->creerContexteNotation('contractuel');

        $response = $this->getJson("/api/eval/fiches/{$fiche->id}/criteres");

        $response->assertStatus(200)
            ->assertJsonStructure(['criteres', 'note_min', 'note_max', 'nb_socles', 'nb_complementaires']);

        // Un agent contractuel ne doit pas avoir de critères complémentaires
        $this->assertEquals(0, $response->json('nb_complementaires'));
        $this->assertEquals(3, $response->json('nb_socles'));
    }

    public function test_endpoint_criteres_inclut_complementaires_pour_mis_a_disposition(): void
    {
        ['fiche' => $fiche] = $this->creerContexteNotation('mis_a_disposition');

        $response = $this->getJson("/api/eval/fiches/{$fiche->id}/criteres");

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('nb_complementaires'));
        $this->assertEquals(3, $response->json('nb_socles'));
    }

    // ── 4a.3 — Calcul de la moyenne et appréciation ───────────────────────

    public function test_moyenne_calculee_correctement(): void
    {
        ['fiche' => $fiche, 'socles' => $socles] = $this->creerContexteNotation();

        $this->putJson("/api/eval/fiches/{$fiche->id}/noter", [
            'notations' => [
                ['critere_id' => $socles[0]->id, 'note' => 4],
                ['critere_id' => $socles[1]->id, 'note' => 2],
                ['critere_id' => $socles[2]->id, 'note' => 3],
            ],
        ])->assertStatus(200);

        $fiche->refresh();
        $this->assertEquals(3.00, $fiche->moyenne); // (4+2+3)/3 = 3.00
    }

    public function test_appreciation_excellent_pour_score_superieur_90_pourcent(): void
    {
        ['fiche' => $fiche, 'socles' => $socles] = $this->creerContexteNotation();

        // note_max=5, note=5 → ratio=100% → excellent
        $this->putJson("/api/eval/fiches/{$fiche->id}/noter", [
            'notations' => [
                ['critere_id' => $socles[0]->id, 'note' => 5],
                ['critere_id' => $socles[1]->id, 'note' => 5],
                ['critere_id' => $socles[2]->id, 'note' => 5],
            ],
        ]);

        $fiche->refresh();
        $this->assertEquals('excellent', $fiche->appreciation);
    }

    public function test_appreciation_insuffisant_pour_score_inferieur_30_pourcent(): void
    {
        ['fiche' => $fiche, 'socles' => $socles] = $this->creerContexteNotation();

        // note_max=5, note=1 → ratio=20% → insuffisant
        $this->putJson("/api/eval/fiches/{$fiche->id}/noter", [
            'notations' => [
                ['critere_id' => $socles[0]->id, 'note' => 1],
                ['critere_id' => $socles[1]->id, 'note' => 1],
                ['critere_id' => $socles[2]->id, 'note' => 1],
            ],
        ]);

        $fiche->refresh();
        $this->assertEquals('insuffisant', $fiche->appreciation);
    }

    // ── 4a.4 — Transition automatique agent_convoque → en_cours_notation ──

    public function test_notation_depuis_agent_convoque_declenche_transition(): void
    {
        ['fiche' => $fiche, 'socles' => $socles] = $this->creerContexteNotation();

        $this->assertEquals(EvalStatutFiche::AgentConvoque, $fiche->statut);

        $this->putJson("/api/eval/fiches/{$fiche->id}/noter", [
            'notations' => [['critere_id' => $socles[0]->id, 'note' => 3]],
        ]);

        $fiche->refresh();
        $this->assertEquals(EvalStatutFiche::EnCoursNotation, $fiche->statut);
    }

    public function test_notation_refusee_si_fiche_transmise_daf(): void
    {
        ['fiche' => $fiche, 'socles' => $socles] = $this->creerContexteNotation();

        // Forcer le statut transmise_daf (hors SP3)
        $fiche->update(['statut' => EvalStatutFiche::TransmiseDaf->value]);

        $response = $this->putJson("/api/eval/fiches/{$fiche->id}/noter", [
            'notations' => [['critere_id' => $socles[0]->id, 'note' => 3]],
        ]);

        $response->assertStatus(422);
    }

    // ── 4a.5 — tousLesCriteresNotas() ────────────────────────────────────

    public function test_tous_criteres_notas_retourne_false_si_critere_manquant(): void
    {
        ['fiche' => $fiche, 'socles' => $socles] = $this->creerContexteNotation();

        // Seul 1 critère sur 3 est noté
        \App\Models\EvalNotation::create([
            'fiche_id'   => $fiche->id,
            'critere_id' => $socles[0]->id,
            'note'       => 3,
        ]);

        $this->assertFalse($fiche->tousLesCriteresNotas());
    }

    public function test_tous_criteres_notas_retourne_true_quand_tout_est_note(): void
    {
        ['fiche' => $fiche, 'socles' => $socles] = $this->creerContexteNotation();

        foreach ($socles as $critere) {
            \App\Models\EvalNotation::create([
                'fiche_id'   => $fiche->id,
                'critere_id' => $critere->id,
                'note'       => 4,
            ]);
        }

        $this->assertTrue($fiche->tousLesCriteresNotas());
    }
}
