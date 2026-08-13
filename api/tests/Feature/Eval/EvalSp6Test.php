<?php

namespace Tests\Feature\Eval;

use App\Enums\EvalStatutFiche;
use App\Models\EvalAudit;
use App\Models\EvalCampagne;
use App\Models\EvalCourrier;
use App\Models\EvalCritere;
use App\Models\EvalFiche;
use App\Models\EvalModeleNotification;
use App\Models\EvalNotation;
use App\Models\EvalReferentiel;
use App\Models\EvalSynthese;
use App\Models\User;
use App\Notifications\EvalCourrierPublieNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * SP6 — Informer les agents (§7.6) et §9 Confidentialité / Archivage.
 */
class EvalSp6Test extends TestCase
{
    use RefreshDatabase;

    // ── Fixture ──────────────────────────────────────────────────────────

    private function creerContexteSP6(): array
    {
        $daf = User::factory()->create();
        $dg  = User::factory()->create();

        $ref = EvalReferentiel::create([
            'code'     => 'SP6REF',
            'version'  => 1,
            'libelle'  => 'Référentiel SP6',
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
            'exercice'       => 2026,
            'statut'         => 'lancee',
            'referentiel_id' => $ref->id,
            'cree_par'       => $daf->id,
        ]);

        // Agent avec fiche en ValideeNotification (état post-SP5)
        $agentUser = User::factory()->create();
        $employee  = \App\Models\Employee::factory()->create(['user_id' => $agentUser->id]);

        $fiche = EvalFiche::create([
            'campagne_id'          => $campagne->id,
            'employee_id'          => $employee->id,
            'evaluateur_id'        => $daf->id,
            'statut'               => EvalStatutFiche::ValideeNotification->value,
            'categorie_agent'      => 'contractuel',
            'snapshot_nom_complet' => 'Agent Notif SP6',
            'snapshot_matricule'   => 'MAT-SP6',
            'snapshot_direction'   => 'Direction Technique',
            'snapshot_fonction'    => 'Statisticien',
            'moyenne'              => 4.0,
            'appreciation'         => 'tres_satisfaisant',
        ]);

        $synthese = EvalSynthese::create([
            'campagne_id'      => $campagne->id,
            'version'          => 1,
            'statut'           => 'valide_dg',
            'genere_par'       => $daf->id,
            'transmis_dg_par'  => $daf->id,
            'valide_dg_par'    => $dg->id,
            'valide_dg_at'     => now(),
            'donnees'          => ['global' => ['nb_fiches_integrees' => 1, 'moyenne_globale' => 4.0]],
        ]);

        $modele = EvalModeleNotification::create([
            'nom'          => 'Modèle standard 2026',
            'objet_lettre' => 'Notification résultats évaluation annuelle {EXERCICE}',
            'corps_html'   => "Madame / Monsieur {NOM_COMPLET},\n\nNous vous informons que votre évaluation annuelle pour l'exercice {EXERCICE} a été finalisée.\nNote : {NOTE} — Appréciation : {APPRECIATION}\nDécision DG : {DECISION_DG}",
            'actif'        => true,
            'cree_par'     => $daf->id,
        ]);

        return compact('daf', 'dg', 'agentUser', 'employee', 'campagne', 'fiche', 'synthese', 'modele');
    }

    // ── Modèles de lettre ────────────────────────────────────────────────

    public function test_daf_peut_lister_modeles(): void
    {
        ['daf' => $daf, 'modele' => $modele] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);

        $r = $this->getJson('/api/eval/notifications-daf/modeles');

        $r->assertOk()
            ->assertJsonPath('modeles.0.nom', $modele->nom)
            ->assertJsonStructure(['modeles', 'variables']);
    }

    public function test_daf_peut_creer_modele_notification(): void
    {
        ['daf' => $daf] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);

        $r = $this->postJson('/api/eval/notifications-daf/modeles', [
            'nom'          => 'Nouveau modèle',
            'objet_lettre' => 'Notification exercice {EXERCICE}',
            'corps_html'   => 'Bonjour {NOM_COMPLET},',
        ]);

        $r->assertCreated()
            ->assertJsonPath('modele.nom', 'Nouveau modèle');

        $this->assertDatabaseHas('eval_modeles_notification', ['nom' => 'Nouveau modèle']);
        $this->assertDatabaseHas('eval_audit', ['action' => 'modele_notification.creer']);
    }

    // ── Génération des courriers ──────────────────────────────────────────

    public function test_daf_peut_generer_courriers_lot(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);

        $r = $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", [
            'modele_id' => $modele->id,
        ]);

        $r->assertOk()
            ->assertJsonPath('courriers.0.modele_id', $modele->id);

        $this->assertStringContainsString('Agent Notif SP6', $r->json('courriers.0.corps_genere'));
    }

    public function test_generation_cree_un_courrier_par_fiche(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'fiche' => $fiche] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);

        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $this->assertDatabaseHas('eval_courriers', [
            'synthese_id' => $synthese->id,
            'fiche_id'    => $fiche->id,
        ]);
    }

    public function test_generation_passe_fiche_en_courrier_etabli(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'fiche' => $fiche] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);

        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $this->assertEquals(EvalStatutFiche::CourrierEtabli, $fiche->fresh()->statut);
        $this->assertNotNull($fiche->fresh()->courrier_etabli_at);
    }

    public function test_generation_sans_fiche_valide_retourne_422(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'fiche' => $fiche] = $this->creerContexteSP6();
        // Passer la fiche dans un autre état
        $fiche->update(['statut' => EvalStatutFiche::Archivee->value]);
        Sanctum::actingAs($daf);

        $r = $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $r->assertStatus(422);
    }

    public function test_interpolation_variables_dans_le_corps(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);

        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $this->assertStringContainsString('Agent Notif SP6', $courrier->corps_genere);
        $this->assertStringContainsString('2026', $courrier->corps_genere);
        $this->assertStringNotContainsString('{NOM_COMPLET}', $courrier->corps_genere);
        $this->assertStringNotContainsString('{EXERCICE}', $courrier->corps_genere);
    }

    // ── Signature DAF ─────────────────────────────────────────────────────

    public function test_daf_peut_signer_un_courrier(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $r = $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/signer");

        $r->assertOk();
        $this->assertNotNull($courrier->fresh()->signe_at);
        $this->assertEquals($daf->id, $courrier->fresh()->signe_par);
        $this->assertDatabaseHas('eval_audit', ['action' => 'courrier.signer']);
    }

    public function test_signature_impossible_apres_envoi(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $courrier->update(['envoye_par' => $daf->id, 'envoye_at' => now(), 'mode_envoi' => 'email']);

        $r = $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/signer");

        $r->assertStatus(422);
    }

    // ── Envoi à l'agent ───────────────────────────────────────────────────

    public function test_daf_peut_envoyer_courrier_mode_portail(): void
    {
        Notification::fake();
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $r = $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/envoyer", [
            'mode_envoi' => 'portail',
        ]);

        $r->assertOk();
        $this->assertNotNull($courrier->fresh()->envoye_at);
        $this->assertEquals('portail', $courrier->fresh()->mode_envoi);
        $this->assertDatabaseHas('eval_audit', ['action' => 'courrier.envoyer']);
    }

    public function test_envoi_passe_fiche_en_notifiee(): void
    {
        Notification::fake();
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'fiche' => $fiche] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/envoyer", ['mode_envoi' => 'email']);

        $this->assertEquals(EvalStatutFiche::Notifiee, $fiche->fresh()->statut);
        $this->assertNotNull($fiche->fresh()->notifiee_at);
    }

    public function test_envoi_notifie_agent_via_email(): void
    {
        Notification::fake();
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'agentUser' => $agentUser] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/envoyer", ['mode_envoi' => 'portail']);

        Notification::assertSentTo($agentUser, EvalCourrierPublieNotification::class);
    }

    public function test_envoi_mode_main_propre_sans_notification_email(): void
    {
        Notification::fake();
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'agentUser' => $agentUser] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/envoyer", ['mode_envoi' => 'main_propre']);

        Notification::assertNothingSent();
    }

    public function test_envoi_depuis_mauvais_statut_retourne_422(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'fiche' => $fiche] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        // Forcer la fiche en Archivee pour simuler un mauvais statut
        $fiche->update(['statut' => EvalStatutFiche::Archivee->value]);
        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();

        $r = $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/envoyer", ['mode_envoi' => 'email']);

        $r->assertStatus(422);
    }

    // ── Accusé de consultation ────────────────────────────────────────────

    public function test_agent_peut_accuser_consultation(): void
    {
        Notification::fake();
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'agentUser' => $agentUser] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $courrier->update(['envoye_par' => $daf->id, 'envoye_at' => now(), 'mode_envoi' => 'portail']);

        Sanctum::actingAs($agentUser);
        $r = $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/accuser");

        $r->assertOk();
        $this->assertNotNull($courrier->fresh()->accuse_at);
        $this->assertEquals($agentUser->id, $courrier->fresh()->accuse_par);
        $this->assertDatabaseHas('eval_audit', ['action' => 'courrier.accuser_consultation']);
    }

    public function test_accuse_idempotent_si_deja_accuse(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'agentUser' => $agentUser] = $this->creerContexteSP6();
        $courrier = EvalCourrier::create([
            'synthese_id'  => $synthese->id,
            'fiche_id'     => EvalFiche::where('campagne_id', $synthese->campagne_id)->first()->id,
            'corps_genere' => 'Lettre test',
            'envoye_at'    => now(),
            'envoye_par'   => $daf->id,
            'mode_envoi'   => 'portail',
            'accuse_at'    => now()->subHour(),
            'accuse_par'   => $agentUser->id,
        ]);

        Sanctum::actingAs($agentUser);
        $r = $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/accuser");

        $r->assertOk();
        // accuse_at ne change pas
        $this->assertEqualsWithDelta(
            now()->subHour()->timestamp,
            $courrier->fresh()->accuse_at->timestamp,
            5
        );
    }

    public function test_accuse_courrier_non_envoye_retourne_422(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'agentUser' => $agentUser] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        // Pas encore envoyé

        Sanctum::actingAs($agentUser);
        $r = $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/accuser");

        $r->assertStatus(422);
    }

    // ── PDF ───────────────────────────────────────────────────────────────

    public function test_pdf_courrier_retourne_fichier_pdf(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $r = $this->get("/api/eval/notifications-daf/courriers/{$courrier->id}/pdf");

        $r->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    // ── Liste des courriers ───────────────────────────────────────────────

    public function test_liste_courriers_de_la_synthese(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $r = $this->getJson("/api/eval/notifications-daf/{$synthese->id}/courriers");

        $r->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonStructure(['courriers', 'total']);
    }

    // ── Archivage ─────────────────────────────────────────────────────────

    public function test_daf_peut_archiver_fiche_notifiee(): void
    {
        Notification::fake();
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'fiche' => $fiche] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/envoyer", ['mode_envoi' => 'main_propre']);

        $r = $this->postJson("/api/eval/notifications-daf/fiches/{$fiche->id}/archiver");

        $r->assertOk();
        $this->assertEquals(EvalStatutFiche::Archivee, $fiche->fresh()->statut);
        $this->assertNotNull($fiche->fresh()->archivee_at);
    }

    public function test_archivage_impossible_si_pas_notifiee(): void
    {
        ['daf' => $daf, 'synthese' => $synthese, 'fiche' => $fiche] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        // Fiche est encore en ValideeNotification

        $r = $this->postJson("/api/eval/notifications-daf/fiches/{$fiche->id}/archiver");

        $r->assertStatus(422);
    }

    public function test_archivage_lot_toutes_fiches_notifiees(): void
    {
        Notification::fake();
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'fiche' => $fiche] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);

        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/envoyer", ['mode_envoi' => 'main_propre']);

        $r = $this->postJson("/api/eval/notifications-daf/{$synthese->id}/archiver-lot");

        $r->assertOk()
            ->assertJsonPath('nb_archivees', 1);

        $this->assertEquals(EvalStatutFiche::Archivee, $fiche->fresh()->statut);
        $this->assertDatabaseHas('eval_audit', ['action' => 'courrier.archiver_lot']);
    }

    // ── §9 Audit ──────────────────────────────────────────────────────────

    public function test_audit_alimenté_pour_toutes_actions_sp6(): void
    {
        Notification::fake();
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'agentUser' => $agentUser] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);

        // Génération
        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);
        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();

        // Signature
        $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/signer");

        // Envoi
        $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/envoyer", ['mode_envoi' => 'portail']);

        // Accusé
        Sanctum::actingAs($agentUser);
        $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/accuser");

        $actions = EvalAudit::pluck('action')->all();

        $this->assertContains('courrier.generer', $actions);
        $this->assertContains('courrier.signer', $actions);
        $this->assertContains('courrier.envoyer', $actions);
        $this->assertContains('courrier.accuser_consultation', $actions);
    }

    public function test_transitions_sp6_toutes_enregistrees_historique(): void
    {
        Notification::fake();
        ['daf' => $daf, 'synthese' => $synthese, 'modele' => $modele, 'fiche' => $fiche] = $this->creerContexteSP6();
        Sanctum::actingAs($daf);

        $this->postJson("/api/eval/notifications-daf/{$synthese->id}/generer", ['modele_id' => $modele->id]);
        $courrier = EvalCourrier::where('synthese_id', $synthese->id)->first();
        $this->postJson("/api/eval/notifications-daf/courriers/{$courrier->id}/envoyer", ['mode_envoi' => 'main_propre']);

        $hist = $fiche->fresh()->historiqueStatuts()->pluck('statut_vers')->all();

        $this->assertContains(EvalStatutFiche::CourrierEtabli->value, $hist);
        $this->assertContains(EvalStatutFiche::Notifiee->value, $hist);
    }
}
