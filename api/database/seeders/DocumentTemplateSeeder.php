<?php

namespace Database\Seeders;

use App\Models\DocumentTemplate;
use Illuminate\Database\Seeder;

class DocumentTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $defaultSettings = [
            'ministry'         => 'Ministère des Infrastructures, des Transports terrestres et Aériens (MITTA)',
            'signataire_name'  => 'ATOUMANE SY',
            'signataire_title' => 'Le Directeur Général',
            'ampliations'      => ['DG', 'SG', 'DAF/RH', 'Intéressé(e)'],
        ];

        // ─── Attestation de congé ───────────────────────────────────────
        DocumentTemplate::firstOrCreate(
            ['name' => 'Attestation de congé annuel'],
            [
                'type'        => 'attestation',
                'description' => 'Attestation officielle de jouissance de congé annuel',
                'status'      => 'active',
                'settings'    => array_merge($defaultSettings, [
                    'ampliations' => ['DG', 'SG', 'DDC', 'DAF/RH', 'Intéressé(e)'],
                ]),
                'content'     => <<<HTML
<p>Je soussigné, <strong>{NOM_SIGNATAIRE}</strong>, {TITRE_SIGNATAIRE}, atteste que <strong>{CIVILITE} {NOM_COMPLET}</strong>, {FONCTION}, bénéficiaire d'un congé annuel de <strong>{NB_JOURS_CONGE} jours ouvrables</strong>, cesse service le <strong>{DATE_DEPART_CONGE}</strong>.</p>

<p>L'intéressé(e) reprendra service le <strong>{DATE_REPRISE_CONGE}</strong>.</p>

<p>En foi de quoi la présente attestation est délivrée pour servir et valoir ce que de droit.</p>
HTML,
            ]
        );

        // ─── Note de service – Horaires de travail ──────────────────────
        DocumentTemplate::firstOrCreate(
            ['name' => 'Note de service – Horaires de travail'],
            [
                'type'        => 'note_service',
                'description' => 'Note rappelant les horaires officiels de travail',
                'status'      => 'active',
                'settings'    => array_merge($defaultSettings, [
                    'ampliations' => ['SG', 'DAF/RH', 'CCl.'],
                ]),
                'content'     => <<<HTML
<p>Il est rappelé au Personnel que les horaires de travail sont fixés comme suit :</p>

<ul>
  <li><strong>du Lundi au Jeudi : 08h 00 mn – 17h 00 mn</strong><br>avec une pause d'<strong>une (1) heure</strong> de 13h à 14h.</li>
  <li><strong>le vendredi : 08h 00 mn – 13h 30 mn</strong><br>14h 30 mn – 17h 00 mn</li>
</ul>

<p>J'attache du prix à l'exécution de la présente note de service.</p>
HTML,
            ]
        );

        // ─── Attestation de travail ────────────────────────────────────
        DocumentTemplate::firstOrCreate(
            ['name' => 'Attestation de travail'],
            [
                'type'        => 'attestation',
                'description' => "Certifie qu'un agent travaille au sein de l'organisation",
                'status'      => 'active',
                'settings'    => array_merge($defaultSettings, [
                    'ampliations' => ['DG', 'SG', 'DAF/RH', 'Intéressé(e)'],
                ]),
                'content'     => <<<HTML
<p>Je soussigné, <strong>{NOM_SIGNATAIRE}</strong>, {TITRE_SIGNATAIRE}, certifie que <strong>{CIVILITE} {NOM_COMPLET}</strong>, titulaire du matricule <strong>{MATRICULE}</strong>, est employé(e) en qualité de <strong>{FONCTION}</strong> au sein de la <strong>{DIRECTION}</strong> depuis le <strong>{DATE_ENTREE_SERVICE}</strong>.</p>

<p>En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.</p>
HTML,
            ]
        );
    }
}
