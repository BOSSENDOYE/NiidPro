<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reconstruction complète du module Gestion des Évaluations (CDC NiidPro — Août 2026).
 * Remplace les migrations 2026_07_14_100001 → 100008.
 *
 * Ordre DROP (inverse des FK) puis CREATE (ordre des FK).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // ── 1. Suppression des anciennes tables ───────────────────────────
        Schema::dropIfExists('eval_audit');
        Schema::dropIfExists('eval_decisions_rh');
        Schema::dropIfExists('eval_objectifs');
        Schema::dropIfExists('eval_besoins_formation');
        Schema::dropIfExists('eval_notations');
        Schema::dropIfExists('eval_historique_statuts');
        Schema::dropIfExists('eval_fiches');
        Schema::dropIfExists('eval_campagnes');
        Schema::dropIfExists('eval_criteres');
        Schema::dropIfExists('eval_referentiels');

        Schema::enableForeignKeyConstraints();

        // ── 2. eval_referentiels ─ ReferentielCritere versionné (§4.1) ───
        Schema::create('eval_referentiels', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40);                  // ex: "ANASER"
            $table->unsignedSmallInteger('version')->default(1);
            $table->string('libelle');
            $table->unsignedTinyInteger('note_min')->default(1);
            $table->unsignedTinyInteger('note_max')->default(5);
            $table->boolean('verrouille')->default(false);
            $table->timestamp('verrouille_at')->nullable();
            $table->foreignId('verrouille_par')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cree_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Un seul référentiel actif par code+version
            $table->unique(['code', 'version']);
        });

        // ── 3. eval_criteres ─ Critère rattaché à un référentiel (§4.1) ──
        Schema::create('eval_criteres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referentiel_id')->constrained('eval_referentiels')->cascadeOnDelete();
            $table->string('code', 20);
            $table->string('libelle');
            // 'socle' = tout le personnel ; 'complementaire' = agents mis à disposition §4.1.2
            $table->enum('type', ['socle', 'complementaire'])->default('socle');
            $table->integer('ordre')->default(0);
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(['referentiel_id', 'code']);
        });

        // ── 4. eval_campagnes ─ Campagne annuelle (§4.3, §7.1) ───────────
        Schema::create('eval_campagnes', function (Blueprint $table) {
            $table->id();
            $table->year('exercice')->unique();
            $table->string('titre')->nullable();
            $table->enum('statut', [
                'brouillon', 'lancee', 'en_cours', 'synthese',
                'decision', 'notification', 'cloturee',
            ])->default('brouillon');

            $table->foreignId('referentiel_id')->nullable()->constrained('eval_referentiels')->nullOnDelete();

            // Calendrier indicatif par sous-procédure (§4.3)
            $table->date('date_lancement')->nullable();
            $table->date('date_limite_planification')->nullable();
            $table->date('date_limite_entretiens')->nullable();
            $table->date('date_limite_transmission')->nullable();
            $table->date('date_limite_synthese')->nullable();
            $table->date('date_cloture')->nullable();

            // Période d'évaluation couverte
            $table->date('periode_debut')->nullable();
            $table->date('periode_fin')->nullable();

            // Texte de la note de service générée (§7.1)
            $table->text('note_service')->nullable();
            $table->boolean('note_service_signee')->default(false);
            $table->timestamp('note_service_signee_at')->nullable();

            // Snapshot agents au moment du lancement (§7.1 règle de gestion)
            $table->json('snapshot_agents')->nullable();

            $table->foreignId('cree_par')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('lance_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('lance_at')->nullable();

            $table->timestamps();
        });

        // ── 5. eval_fiches ─ Fiche individuelle avec 18 + 3 statuts (§6) ─
        Schema::create('eval_fiches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campagne_id')->constrained('eval_campagnes')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('evaluateur_id')->nullable()->constrained('users')->nullOnDelete();

            // Statut (18 officiels + 3 exceptions §6)
            $table->enum('statut', [
                'cree', 'transmise_responsable', 'entretien_planifie', 'agent_convoque',
                'en_cours_notation', 'notee_attente_discussion', 'attente_signature_agent',
                'signee', 'transmise_daf', 'receptionee_daf', 'integree_synthese',
                'tableau_transmis_dg', 'etudiee_dg', 'annotee_dg', 'validee_notification',
                'courrier_etabli', 'notifiee', 'archivee',
                // cas d'exception
                'signature_refusee', 'entretien_reporte', 'cloturee_sortie',
            ])->default('cree');

            // Catégorie de l'agent — détermine les critères applicables (§4.1)
            $table->enum('categorie_agent', [
                'contractuel',       // recruté directement ANASER
                'mis_a_disposition', // fonctionnaire État → critères complémentaires
                'decisionnaire',
            ])->default('contractuel');

            // ── Snapshot identité (figée au lancement §7.1) ──────────────
            $table->string('snapshot_matricule')->nullable();
            $table->string('snapshot_nom_complet')->nullable();
            $table->string('snapshot_direction')->nullable();
            $table->string('snapshot_service')->nullable();
            $table->string('snapshot_fonction')->nullable();
            $table->string('snapshot_superieur')->nullable();
            $table->integer('snapshot_anciennete_mois')->nullable();

            // ── Entretien SP2 ─────────────────────────────────────────────
            $table->date('date_entretien')->nullable();
            $table->time('heure_entretien')->nullable();
            $table->string('lieu_entretien')->nullable();
            $table->enum('type_entretien', ['presentiel', 'visioconference'])->default('presentiel');
            $table->string('motif_report')->nullable();       // entretien_reporte
            $table->date('nouvelle_date_entretien')->nullable();
            $table->boolean('entretien_tenu')->default(false);
            $table->timestamp('entretien_tenu_at')->nullable();

            // ── Notation SP3 ──────────────────────────────────────────────
            $table->decimal('moyenne', 4, 2)->nullable();
            $table->enum('appreciation', [
                'excellent', 'tres_satisfaisant', 'satisfaisant',
                'a_ameliorer', 'insuffisant',
            ])->nullable();

            // Blocs narratifs de la fiche
            $table->text('realisations')->nullable();
            $table->text('difficultes')->nullable();
            $table->text('competences_demontrees')->nullable();

            // ── Signatures SP3 ────────────────────────────────────────────
            $table->text('observations_evaluateur')->nullable();
            $table->text('observations_agent')->nullable();
            $table->boolean('refus_signature_agent')->default(false);
            $table->text('motif_refus_signature')->nullable();

            // ── Horodatages des étapes clés ───────────────────────────────
            $table->timestamp('signe_evaluateur_at')->nullable();
            $table->timestamp('signe_agent_at')->nullable();
            $table->timestamp('transmise_daf_at')->nullable();
            $table->timestamp('receptionee_daf_at')->nullable();
            $table->timestamp('notifiee_at')->nullable();
            $table->timestamp('archivee_at')->nullable();

            // ── Avis intermédiaires (§8.2) ────────────────────────────────
            $table->text('avis_chef_service')->nullable();
            $table->foreignId('chef_service_id')->nullable()->constrained('users')->nullOnDelete();
            // Observations DG (§8.2, uniquement si agent cadre)
            $table->text('observations_dg')->nullable();
            $table->foreignId('dg_user_id')->nullable()->constrained('users')->nullOnDelete();

            // Référence notation statutaire Fonction publique (§8.3)
            $table->string('ref_notation_fp')->nullable();

            $table->foreignId('daf_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->unique(['campagne_id', 'employee_id']);
            $table->timestamps();
        });

        // ── 6. eval_historique_statuts ─ Journal des transitions (§6, §9) ─
        Schema::create('eval_historique_statuts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('eval_fiches')->cascadeOnDelete();
            $table->string('statut_de', 50)->nullable();   // null = création initiale
            $table->string('statut_vers', 50);
            $table->foreignId('motive_par')->nullable()->constrained('users')->nullOnDelete();
            $table->text('motif')->nullable();
            $table->json('meta')->nullable();              // données contextuelles optionnelles
            $table->timestamp('created_at')->useCurrent();

            $table->index('fiche_id');
        });

        // ── 7. eval_notations ─ Note par critère (§7.3) ──────────────────
        Schema::create('eval_notations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('eval_fiches')->cascadeOnDelete();
            $table->foreignId('critere_id')->constrained('eval_criteres')->cascadeOnDelete();
            // Note sur l'échelle note_min→note_max du référentiel (1–5 par défaut)
            $table->unsignedTinyInteger('note')->nullable();
            // Commentaire obligatoire si note ≤ seuil paramétrable (§7.3)
            $table->text('observation')->nullable();
            $table->timestamps();

            $table->unique(['fiche_id', 'critere_id']);
        });

        // ── 8. eval_besoins_formation ─ SP3 bloc « Besoins formation » ───
        Schema::create('eval_besoins_formation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('eval_fiches')->cascadeOnDelete();
            $table->string('intitule');
            $table->enum('priorite', ['haute', 'moyenne', 'faible'])->default('moyenne');
            $table->integer('ordre')->default(0);
            $table->timestamps();
        });

        // ── 9. eval_objectifs ─ SP3 bloc « Objectifs période à venir » ───
        Schema::create('eval_objectifs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('eval_fiches')->cascadeOnDelete();
            $table->text('objectif');
            $table->string('indicateur')->nullable();     // indicateur de suivi SMART
            $table->date('echeance')->nullable();
            $table->integer('ordre')->default(0);
            $table->timestamps();
        });

        // ── 10. eval_decisions_rh ─ SP5 décisions DG par agent ───────────
        Schema::create('eval_decisions_rh', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('eval_fiches')->cascadeOnDelete();
            // Type de décision parmi liste paramétrable (§7.5)
            $table->string('type_decision')->nullable(); // prime | felicitation | promotion | aucune | avertissement | ...
            $table->boolean('gratification')->default(false);
            $table->string('montant_gratification')->nullable();
            $table->text('commentaire')->nullable();
            $table->foreignId('decideur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decide_at')->nullable();
            $table->timestamps();

            $table->unique('fiche_id'); // une seule décision par fiche
        });

        // ── 11. eval_audit ─ Piste d'audit générique (§9) ─────────────────
        Schema::create('eval_audit', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            // Action journalisée, ex: fiche.noter, fiche.signer_evaluateur, campagne.lancer
            $table->string('action');
            $table->string('entite_type');               // EvalFiche | EvalCampagne | ...
            $table->unsignedBigInteger('entite_id');
            $table->json('meta')->nullable();            // diff avant/après ou données contextuelles
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['entite_type', 'entite_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('eval_audit');
        Schema::dropIfExists('eval_decisions_rh');
        Schema::dropIfExists('eval_objectifs');
        Schema::dropIfExists('eval_besoins_formation');
        Schema::dropIfExists('eval_notations');
        Schema::dropIfExists('eval_historique_statuts');
        Schema::dropIfExists('eval_fiches');
        Schema::dropIfExists('eval_campagnes');
        Schema::dropIfExists('eval_criteres');
        Schema::dropIfExists('eval_referentiels');

        Schema::enableForeignKeyConstraints();
    }
};
