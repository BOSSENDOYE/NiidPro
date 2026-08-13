<?php

namespace Tests\Feature\Eval;

use App\Enums\EvalStatutFiche;
use App\Models\EvalAudit;
use App\Models\EvalCampagne;
use App\Models\EvalCritere;
use App\Models\EvalFiche;
use App\Models\EvalGratification;
use App\Models\EvalReferentiel;
use App\Models\EvalSynthese;
use App\Models\Employee;
use App\Models\User;
use App\Notifications\EvalStatutChangedNotification;
use App\Observers\EvalFicheObserver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Étape 8 — Éléments transverses :
 * §10.2 Tableaux de bord par rôle
 * §10.1 Notifications événementielles
 * §8    Cas particuliers (changer évaluateur, avis chef de service, ref FP)
 * §8.5  Historique multi-campagnes
 */
class EvalEtape8Test extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────

    private function assignerRole(User $user, string $role): void
    {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        $user->assignRole($role);
    }

    // ── Fixture ──────────────────────────────────────────────────────────

    private function creerContexte(): array
    {
        $daf = User::factory()->create();
        $dg  = User::factory()->create();

        $ref = EvalReferentiel::create([
            'code'     => 'E8REF',
            'version'  => 1,
            'libelle'  => 'Référentiel Étape 8',
            'note_min' => 1,
            'note_max' => 5,
            'cree_par' => $daf->id,
        ]);

        EvalCritere::create([
            'referentiel_id' => $ref->id,
            'code'           => 'C01',
            'libelle'        => 'Assiduité',
            'type'           => 'socle',
            'ordre'          => 1,
            'actif'          => true,
        ]);

        $campagne = EvalCampagne::create([
            'exercice'       => 2025,
            'statut'         => 'lancee',
            'referentiel_id' => $ref->id,
            'cree_par'       => $daf->id,
        ]);

        $evaluateur = User::factory()->create();
        $agentUser  = User::factory()->create();
        $employee   = Employee::factory()->create(['user_id' => $agentUser->id]);

        $fiche = EvalFiche::create([
            'campagne_id'          => $campagne->id,
            'employee_id'          => $employee->id,
            'evaluateur_id'        => $evaluateur->id,
            'statut'               => EvalStatutFiche::Cree->value,
            'categorie_agent'      => 'contractuel',
            'snapshot_nom_complet' => 'Agent Test Étape8',
            'snapshot_matricule'   => 'MAT-E8',
            'snapshot_direction'   => 'Direction Études',
            'snapshot_fonction'    => 'Analyste',
        ]);

        $synthese = EvalSynthese::create([
            'campagne_id'     => $campagne->id,
            'version'         => 1,
            'statut'          => 'valide_dg',
            'genere_par'      => $daf->id,
            'transmis_dg_par' => $daf->id,
            'valide_dg_par'   => $dg->id,
            'valide_dg_at'    => now(),
            'donnees'         => ['global' => ['nb_fiches_integrees' => 1, 'moyenne_globale' => 3.5]],
        ]);

        return compact('daf', 'dg', 'evaluateur', 'agentUser', 'employee', 'campagne', 'fiche', 'synthese', 'ref');
    }

    // ── §8 — Changement d'évaluateur ─────────────────────────────────────

    public function test_daf_peut_changer_evaluateur_en_statut_cree(): void
    {
        ['daf' => $daf, 'fiche' => $fiche] = $this->creerContexte();
        $nouvelEval = User::factory()->create();
        Sanctum::actingAs($daf);

        $r = $this->putJson("/api/eval/fiches/{$fiche->id}/changer-evaluateur", [
            'evaluateur_id' => $nouvelEval->id,
            'motif'         => 'Chef de service évalué par DG',
        ]);

        $r->assertOk()
            ->assertJsonPath('message', 'Évaluateur mis à jour.')
            ->assertJsonPath('fiche.evaluateur_id', $nouvelEval->id);

        $this->assertDatabaseHas('eval_audit', [
            'action'      => 'fiche.changer_evaluateur',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
        ]);
    }

    public function test_changer_evaluateur_impossible_apres_notation(): void
    {
        ['daf' => $daf, 'fiche' => $fiche] = $this->creerContexte();
        $fiche->update(['statut' => EvalStatutFiche::ReceptioneeDaf->value]);
        $nouvelEval = User::factory()->create();
        Sanctum::actingAs($daf);

        $r = $this->putJson("/api/eval/fiches/{$fiche->id}/changer-evaluateur", [
            'evaluateur_id' => $nouvelEval->id,
        ]);

        $r->assertStatus(422)
            ->assertJsonPath('message', fn($msg) => str_contains($msg, 'avant le début de la notation'));
    }

    public function test_changer_evaluateur_valide_en_entretien_planifie(): void
    {
        ['daf' => $daf, 'fiche' => $fiche] = $this->creerContexte();
        $fiche->update(['statut' => EvalStatutFiche::EntretienPlanifie->value]);
        $nouvelEval = User::factory()->create();
        Sanctum::actingAs($daf);

        $r = $this->putJson("/api/eval/fiches/{$fiche->id}/changer-evaluateur", [
            'evaluateur_id' => $nouvelEval->id,
        ]);

        $r->assertOk();
        $this->assertDatabaseHas('eval_fiches', ['id' => $fiche->id, 'evaluateur_id' => $nouvelEval->id]);
    }

    // ── §8 — Avis du chef de service ─────────────────────────────────────

    public function test_chef_service_peut_enregistrer_avis(): void
    {
        ['fiche' => $fiche, 'evaluateur' => $evaluateur] = $this->creerContexte();
        Sanctum::actingAs($evaluateur);

        $r = $this->putJson("/api/eval/fiches/{$fiche->id}/avis-chef-service", [
            'avis_chef_service' => 'Agent rigoureux et impliqué, mérite une promotion.',
        ]);

        $r->assertOk()
            ->assertJsonPath('message', 'Avis du chef de service enregistré.');

        $this->assertDatabaseHas('eval_fiches', [
            'id'               => $fiche->id,
            'avis_chef_service' => 'Agent rigoureux et impliqué, mérite une promotion.',
            'chef_service_id'  => $evaluateur->id,
        ]);

        $this->assertDatabaseHas('eval_audit', [
            'action'      => 'fiche.avis_chef_service',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
        ]);
    }

    public function test_avis_chef_service_peut_etre_mis_a_jour(): void
    {
        ['fiche' => $fiche, 'daf' => $daf] = $this->creerContexte();
        $fiche->update(['avis_chef_service' => 'Premier avis']);
        Sanctum::actingAs($daf);

        $r = $this->putJson("/api/eval/fiches/{$fiche->id}/avis-chef-service", [
            'avis_chef_service' => 'Avis mis à jour après entretien.',
        ]);

        $r->assertOk();
        $this->assertDatabaseHas('eval_fiches', [
            'id'               => $fiche->id,
            'avis_chef_service' => 'Avis mis à jour après entretien.',
        ]);
    }

    // ── §8 — Justificatif de notation FP ─────────────────────────────────

    public function test_daf_peut_rattacher_ref_fp_apres_reception(): void
    {
        ['daf' => $daf, 'fiche' => $fiche] = $this->creerContexte();
        $fiche->update(['statut' => EvalStatutFiche::ReceptioneeDaf->value]);
        Sanctum::actingAs($daf);

        $r = $this->putJson("/api/eval/fiches/{$fiche->id}/ref-fp", [
            'ref_notation_fp' => 'FP-2025-001',
        ]);

        $r->assertOk()
            ->assertJsonPath('ref_notation_fp', 'FP-2025-001');

        $this->assertDatabaseHas('eval_audit', [
            'action'      => 'fiche.ref_fp',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
        ]);
    }

    public function test_ref_fp_impossible_avant_reception_daf(): void
    {
        ['daf' => $daf, 'fiche' => $fiche] = $this->creerContexte();
        // fiche est en statut Cree — pas encore réceptionnée
        Sanctum::actingAs($daf);

        $r = $this->putJson("/api/eval/fiches/{$fiche->id}/ref-fp", [
            'ref_notation_fp' => 'FP-2025-001',
        ]);

        $r->assertStatus(422)
            ->assertJsonPath('message', fn($msg) => str_contains($msg, 'après réception par le DAF'));
    }

    public function test_ref_fp_acceptee_sur_fiche_validee_notification(): void
    {
        ['daf' => $daf, 'fiche' => $fiche] = $this->creerContexte();
        $fiche->update(['statut' => EvalStatutFiche::ValideeNotification->value]);
        Sanctum::actingAs($daf);

        $r = $this->putJson("/api/eval/fiches/{$fiche->id}/ref-fp", [
            'ref_notation_fp' => 'FP-2025-777',
        ]);

        $r->assertOk();
        $this->assertDatabaseHas('eval_fiches', ['id' => $fiche->id, 'ref_notation_fp' => 'FP-2025-777']);
    }

    // ── §10.1 — Notifications événementielles ─────────────────────────────

    public function test_observer_envoie_notification_transmise_responsable(): void
    {
        Notification::fake();
        ['evaluateur' => $evaluateur, 'fiche' => $fiche, 'daf' => $daf] = $this->creerContexte();

        // Simuler la transition vers TransmiseResponsable (déclenche observer)
        EvalFicheObserver::$suppresser = false;
        $fiche->update(['statut' => EvalStatutFiche::TransmiseResponsable->value]);

        Notification::assertSentTo($evaluateur, EvalStatutChangedNotification::class);
    }

    public function test_observer_envoie_notification_attente_signature_agent(): void
    {
        Notification::fake();
        ['agentUser' => $agentUser, 'fiche' => $fiche, 'employee' => $employee] = $this->creerContexte();

        // Associer l'employee à la fiche
        $fiche->update([
            'employee_id' => $employee->id,
            'statut'      => EvalStatutFiche::AttenteSignatureAgent->value,
        ]);

        Notification::assertSentTo($agentUser, EvalStatutChangedNotification::class);
    }

    public function test_observer_ne_notifie_pas_si_suppresser_actif(): void
    {
        Notification::fake();
        ['fiche' => $fiche] = $this->creerContexte();

        EvalFicheObserver::$suppresser = true;
        try {
            $fiche->update(['statut' => EvalStatutFiche::TransmiseResponsable->value]);
        } finally {
            EvalFicheObserver::$suppresser = false;
        }

        Notification::assertNothingSent();
    }

    public function test_observer_ne_notifie_pas_si_statut_non_cible(): void
    {
        Notification::fake();
        ['fiche' => $fiche] = $this->creerContexte();

        // Transition vers un statut sans handler (ex: IntegreeeSynthese)
        $fiche->update(['statut' => EvalStatutFiche::IntegreeeSynthese->value]);

        Notification::assertNothingSent();
    }

    // ── §10.2 — Tableau de bord DAF ──────────────────────────────────────

    public function test_dashboard_retourne_vue_daf_pour_role_daf(): void
    {
        ['daf' => $daf, 'campagne' => $campagne, 'fiche' => $fiche] = $this->creerContexte();

        $this->assignerRole($daf, 'daf');
        Sanctum::actingAs($daf);

        $r = $this->getJson('/api/eval/dashboard');

        $r->assertOk()
            ->assertJsonPath('role_dashboard', 'daf')
            ->assertJsonStructure([
                'role_dashboard',
                'campagne_courante',
                'nb_fiches_total',
                'taux_completion',
                'en_retard',
                'bloquees',
                'syntheses_recentes',
            ]);
    }

    public function test_dashboard_daf_contient_par_statut(): void
    {
        ['daf' => $daf, 'fiche' => $fiche] = $this->creerContexte();
        $this->assignerRole($daf, 'daf');
        Sanctum::actingAs($daf);

        $r = $this->getJson('/api/eval/dashboard');

        $r->assertOk()
            ->assertJsonStructure(['par_statut']);

        // La fiche est en statut Cree → doit apparaître dans par_statut
        $parStatut = collect($r->json('par_statut'));
        $statutCree = $parStatut->firstWhere('libelle', EvalStatutFiche::Cree->libelle());
        $this->assertNotNull($statutCree);
        $this->assertSame(1, $statutCree['nb']);
    }

    public function test_dashboard_daf_sans_campagne_active(): void
    {
        $daf = User::factory()->create();
        $this->assignerRole($daf, 'daf');
        Sanctum::actingAs($daf);

        $r = $this->getJson('/api/eval/dashboard');

        $r->assertOk()
            ->assertJsonPath('role_dashboard', 'daf')
            ->assertJsonPath('nb_campagnes', 0);
    }

    // ── §10.2 — Tableau de bord Direction ────────────────────────────────

    public function test_dashboard_retourne_vue_direction_pour_dg(): void
    {
        ['dg' => $dg, 'synthese' => $synthese] = $this->creerContexte();
        $this->assignerRole($dg, 'directeur_general');
        Sanctum::actingAs($dg);

        $r = $this->getJson('/api/eval/dashboard');

        $r->assertOk()
            ->assertJsonPath('role_dashboard', 'direction')
            ->assertJsonStructure([
                'role_dashboard',
                'syntheses_a_etudier',
                'nb_en_attente_notif',
                'nb_en_attente_archiv',
                'gratifications',
                'syntheses_cloturees',
            ]);
    }

    public function test_dashboard_direction_compte_fiches_en_attente_notif(): void
    {
        ['dg' => $dg, 'fiche' => $fiche] = $this->creerContexte();
        $fiche->update(['statut' => EvalStatutFiche::ValideeNotification->value]);
        $this->assignerRole($dg, 'directeur_general');
        Sanctum::actingAs($dg);

        $r = $this->getJson('/api/eval/dashboard');

        $r->assertOk()
            ->assertJsonPath('nb_en_attente_notif', 1);
    }

    // ── §10.2 — Tableau de bord Agent ────────────────────────────────────

    public function test_dashboard_agent_retourne_ses_fiches(): void
    {
        ['agentUser' => $agentUser, 'employee' => $employee, 'fiche' => $fiche] = $this->creerContexte();
        // linkedEmployee uses user.employee_id FK
        $agentUser->update(['employee_id' => $employee->id]);
        Sanctum::actingAs($agentUser);

        $r = $this->getJson('/api/eval/dashboard');

        $r->assertOk()
            ->assertJsonPath('role_dashboard', 'agent')
            ->assertJsonStructure([
                'role_dashboard',
                'employee',
                'fiches',
                'fiche_active',
                'courrier_disponible',
                'action_requise',
            ]);

        $this->assertCount(1, $r->json('fiches'));
        $this->assertSame($fiche->id, $r->json('fiche_active.id'));
    }

    public function test_dashboard_agent_sans_dossier(): void
    {
        $user = User::factory()->create(); // employee_id non défini → pas de dossier lié
        Sanctum::actingAs($user);

        $r = $this->getJson('/api/eval/dashboard');

        $r->assertOk()
            ->assertJsonPath('role_dashboard', 'agent')
            ->assertJsonPath('employee', null);
    }

    public function test_dashboard_agent_action_requise_convocation(): void
    {
        ['agentUser' => $agentUser, 'employee' => $employee, 'fiche' => $fiche] = $this->creerContexte();
        $agentUser->update(['employee_id' => $employee->id]);
        $fiche->update(['statut' => EvalStatutFiche::AgentConvoque->value]);
        Sanctum::actingAs($agentUser);

        $r = $this->getJson('/api/eval/dashboard');

        $r->assertOk()
            ->assertJsonPath('action_requise', fn($val) => str_contains((string) $val, 'convocation'));
    }

    public function test_dashboard_agent_action_requise_signature(): void
    {
        ['agentUser' => $agentUser, 'employee' => $employee, 'fiche' => $fiche] = $this->creerContexte();
        $agentUser->update(['employee_id' => $employee->id]);
        $fiche->update(['statut' => EvalStatutFiche::AttenteSignatureAgent->value]);
        Sanctum::actingAs($agentUser);

        $r = $this->getJson('/api/eval/dashboard');

        $r->assertOk()
            ->assertJsonPath('action_requise', fn($val) => str_contains((string) $val, 'signer'));
    }

    // ── §8.5 — Historique multi-campagnes ────────────────────────────────

    public function test_historique_agent_retourne_toutes_ses_fiches(): void
    {
        ['daf' => $daf, 'employee' => $employee, 'fiche' => $fiche, 'ref' => $ref] = $this->creerContexte();
        Sanctum::actingAs($daf);

        // Deuxième campagne avec une deuxième fiche pour le même agent
        $campagne2 = EvalCampagne::create([
            'exercice'       => 2024,
            'statut'         => 'cloturee',
            'referentiel_id' => $ref->id,
            'cree_par'       => $daf->id,
        ]);

        EvalFiche::create([
            'campagne_id'          => $campagne2->id,
            'employee_id'          => $employee->id,
            'evaluateur_id'        => $daf->id,
            'statut'               => EvalStatutFiche::Archivee->value,
            'categorie_agent'      => 'contractuel',
            'snapshot_nom_complet' => 'Agent Test Étape8',
            'snapshot_matricule'   => 'MAT-E8',
            'snapshot_direction'   => 'Direction Études',
            'snapshot_fonction'    => 'Analyste',
            'moyenne'              => 3.8,
            'appreciation'         => 'satisfaisant',
        ]);

        $r = $this->getJson("/api/eval/agents/{$employee->id}/historique");

        $r->assertOk()
            ->assertJsonStructure([
                'employee' => ['id', 'matricule', 'nom_complet', 'department'],
                'historique',
                'nb_campagnes',
                'nb_fiches',
            ]);

        $this->assertSame(2, $r->json('nb_fiches'));
        $this->assertSame(2, $r->json('nb_campagnes'));
    }

    public function test_historique_agent_inclut_champs_lecture_seule(): void
    {
        ['daf' => $daf, 'employee' => $employee, 'fiche' => $fiche] = $this->creerContexte();

        $fiche->update([
            'statut'            => EvalStatutFiche::Archivee->value,
            'moyenne'           => 4.2,
            'appreciation'      => 'tres_satisfaisant',
            'avis_chef_service' => 'Excellent agent.',
            'ref_notation_fp'   => 'FP-2025-099',
        ]);

        Sanctum::actingAs($daf);

        $r = $this->getJson("/api/eval/agents/{$employee->id}/historique");

        $r->assertOk();
        $historique = $r->json('historique.0');
        $this->assertSame('Excellent agent.', $historique['avis_chef_service']);
        $this->assertSame('FP-2025-099', $historique['ref_notation_fp']);
        $this->assertSame(4.2, $historique['moyenne']);
        $this->assertTrue($historique['est_terminal']);
    }

    public function test_historique_agent_inexistant_retourne_404(): void
    {
        ['daf' => $daf] = $this->creerContexte();
        Sanctum::actingAs($daf);

        $r = $this->getJson('/api/eval/agents/99999/historique');

        $r->assertNotFound();
    }

    // ── §10.1 — Notification statut changé — structure ───────────────────

    public function test_notification_statut_changed_via_database(): void
    {
        Notification::fake();
        ['evaluateur' => $evaluateur, 'fiche' => $fiche] = $this->creerContexte();

        EvalFicheObserver::$suppresser = false;
        $fiche->update(['statut' => EvalStatutFiche::TransmiseResponsable->value]);

        Notification::assertSentTo(
            $evaluateur,
            EvalStatutChangedNotification::class,
            fn($notif) => $notif->fiche->id === $fiche->id
                && $notif->typeEvenement === 'eval_fiche_transmise_responsable'
        );
    }
}
