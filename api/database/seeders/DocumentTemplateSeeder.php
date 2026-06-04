<?php

namespace Database\Seeders;

use App\Models\DocumentTemplate;
use Illuminate\Database\Seeder;

class DocumentTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $defaultSettings = [
            'ministry'         => 'Ministère des Transports terrestres et aériens',
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

        // ─── Note de service – Modèle vierge ────────────────────────────
        DocumentTemplate::firstOrCreate(
            ['name' => 'Note de Service (modèle standard)'],
            [
                'type'        => 'note_service',
                'description' => 'Modèle vierge officiel ANASER – à compléter librement',
                'status'      => 'active',
                'settings'    => array_merge($defaultSettings, [
                    'ampliations' => ['SG', 'DAF/RH', 'CCG'],
                ]),
                'content'     => <<<HTML
<p>À l'ensemble du Personnel de l'ANASER,</p>

<p>&nbsp;</p>

<p>J'attache du prix à l'exécution de la présente note de service.</p>
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
                    'ampliations' => ['SG', 'DAF/RH', 'CCG'],
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

        // ─── Attestation de cessation de travail ──────────────────────────
        DocumentTemplate::firstOrCreate(
            ['name' => 'Attestation de cessation de travail'],
            [
                'type'        => 'attestation',
                'description' => "Atteste la fin de service d'un agent au sein de l'ANASER",
                'status'      => 'active',
                'settings'    => array_merge($defaultSettings, [
                    'ampliations'    => ['SG', 'DAF/RH', 'AC', 'Intéressé'],
                    'document_title' => 'ATTESTATION DE CESSATION DE TRAVAIL',
                    'objet'          => 'Attestation de cessation de travail',
                ]),
                'content'     => <<<HTML
<p>Monsieur,</p>

<p>Vous avez été mis à la disposition de l'Agence Nationale de la Sécurité Routière (ANASER) par voie de détachement, en qualité de <strong>{FONCTION}</strong>, suivant acte de détachement en date du <strong>{DATE_ACTE_DETACHEMENT}</strong>.</p>

<p>Nous vous notifions la cessation de vos fonctions au sein de l'ANASER, à l'issue de votre détachement, à compter du <strong>{DATE_CESSATION}</strong>, et votre réintégration dans votre corps d'origine.</p>

<p>Les correspondances relatives à votre réintégration ont d'ores et déjà été adressées à votre administration d'origine ainsi qu'au ministère de tutelle concerné.</p>

<p>Vous êtes invité(e) à prendre l'attache de la Direction administrative et financière (DAF/RH) pour les formalités de fin de fonctions, notamment la restitution des moyens et documents de service.</p>

<p>Veuillez agréer, Monsieur, l'expression de nos salutations distinguées.</p>
HTML,
            ]
        );

        // ─── Certificat de travail ─────────────────────────────────────────
        DocumentTemplate::firstOrCreate(
            ['name' => 'Certificat de travail'],
            [
                'type'        => 'attestation',
                'description' => "Certifie la période d'emploi d'un agent — délivré à la fin du contrat",
                'status'      => 'active',
                'settings'    => array_merge($defaultSettings, [
                    'ampliations'    => ['DG', 'SG', 'DAF/RH', 'Intéressé(e)'],
                    'document_title' => 'CERTIFICAT DE TRAVAIL',
                ]),
                'content'     => <<<HTML
<p>Je soussigné, <strong>{NOM_SIGNATAIRE}</strong>, {TITRE_SIGNATAIRE} de l'Agence Nationale de la Sécurité Routière (ANASER), certifie que <strong>{CIVILITE} {NOM_COMPLET}</strong> a été employé(e) au sein de l'Agence.</p>

<p>À ce titre, l'intéressé(e) a exercé les fonctions de <strong>{FONCTION}</strong>, du <strong>{DATE_ENTREE_SERVICE}</strong> au <strong>{DATE_DEPART}</strong>, dans le cadre d'un <strong>{TYPE_CONTRAT}</strong>.</p>

<p>Durant toute la durée de sa collaboration, {CIVILITE} {NOM_COMPLET} a accompli ses missions à la satisfaction de l'Agence.</p>

<p>Le présent certificat lui est délivré pour servir et valoir ce que de droit, l'intéressé(e) quittant l'ANASER libre de tout engagement.</p>
HTML,
            ]
        );

        // ─── Notification – Solde de tout compte ──────────────────────────
        DocumentTemplate::firstOrCreate(
            ['name' => 'Notification – Solde de tout compte'],
            [
                'type'        => 'attestation',
                'description' => "Notifie à l'agent la liquidation de ses droits lors de son départ",
                'status'      => 'active',
                'settings'    => array_merge($defaultSettings, [
                    'ampliations' => ['SG', 'DAF/RH', 'AC', 'Intéressé'],
                    'objet'       => 'Notification solde de tout compte',
                ]),
                'content'     => <<<HTML
<p>Monsieur,</p>

<p>Suite à la cessation de votre collaboration avec l'Agence Nationale de Sécurité Routière (ANASER), nous avons procédé à la liquidation de vos droits.</p>

<p>À ce titre, nous vous notifions le paiement de votre solde de tout compte correspondant à l'indemnité compensatrice de congés payés pour une durée de <strong>{NB_JOURS_CONGE} jours</strong>, soit la somme de <strong>{MONTANT_LETTRES} ({MONTANT_CHIFFRES}) francs CFA</strong>.</p>

<p>Ce règlement intervient conformément aux dispositions légales et réglementaires en vigueur et solde l'ensemble de vos droits relatifs à votre période d'activité au sein de l'ANASER.</p>

<p>Nous vous prions de bien vouloir prendre contact avec la Direction Administrative et Financière (DAF/RH) pour les formalités de retrait.</p>

<p>Veuillez agréer, Monsieur, l'expression de nos salutations distinguées.</p>
HTML,
            ]
        );

        // ─── Note d'information ────────────────────────────────────────────
        DocumentTemplate::firstOrCreate(
            ['name' => "Note d'information"],
            [
                'type'        => 'note_service',
                'description' => "Modèle de note d'information destinée au personnel de l'ANASER",
                'status'      => 'active',
                'settings'    => array_merge($defaultSettings, [
                    'ampliations'    => ['SG', 'DAF/RH', 'CCI', 'Intéressé'],
                    'document_title' => "NOTE D'INFORMATION",
                ]),
                'content'     => <<<HTML
<p>J'ai l'honneur de porter à la connaissance du personnel de l'ANASER les informations suivantes :</p>

<p><strong>{OBJET_INFORMATION}</strong></p>

<p>&nbsp;</p>

<p>Je vous prie de prendre connaissance de la présente note et d'en assurer la diffusion auprès de vos collaborateurs.</p>

<p>J'attache du prix à l'exécution de la présente note d'information.</p>
HTML,
            ]
        );
    }
}
