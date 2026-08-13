<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: DejaVu Sans, sans-serif; font-size: 9.5pt; color: #1a1a2e; background: #fff; }

/* ── En-tête ─────────────────────────────────────────────────────── */
.header {
    display: table; width: 100%;
    border-bottom: 3px solid #002f59;
    padding-bottom: 10px; margin-bottom: 16px;
}
.header-left, .header-right { display: table-cell; vertical-align: top; width: 50%; }
.header-right { text-align: right; }
.republique { font-size: 7.5pt; font-weight: 700; color: #002f59; text-transform: uppercase; }
.devise { font-size: 7pt; color: #555; font-style: italic; margin-top: 2px; }
.ministere { font-size: 7.5pt; color: #333; margin-top: 3px; }
.anaser-name { font-size: 12pt; font-weight: 700; color: #002f59; }
.anaser-sub  { font-size: 7pt; color: #666; }
.badge-direction {
    display: inline-block; background: #ff7631; color: #fff;
    font-size: 7pt; font-weight: 700; padding: 2px 8px;
    border-radius: 3px; margin-top: 5px;
}

/* ── Titre ───────────────────────────────────────────────────────── */
.titre-bloc {
    text-align: center; margin: 16px 0 12px;
    border-top: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0;
    padding: 10px 0;
}
.titre-doc { font-size: 13pt; font-weight: 700; color: #002f59; text-transform: uppercase; letter-spacing: 1px; }
.titre-campagne { font-size: 9pt; color: #555; margin-top: 4px; }

/* ── Badge statut ────────────────────────────────────────────────── */
.badge-statut {
    text-align: center; margin-bottom: 14px;
}
.badge-signe {
    display: inline-block; background: #002f59; color: #fff;
    font-size: 8pt; font-weight: 700; padding: 4px 14px;
    border-radius: 3px; letter-spacing: 0.5px;
}
.badge-brouillon {
    display: inline-block; background: #ff7631; color: #fff;
    font-size: 8pt; font-weight: 700; padding: 4px 14px;
    border-radius: 3px; letter-spacing: 0.5px;
}

/* ── Sections ────────────────────────────────────────────────────── */
.section { margin-bottom: 14px; }
.section-titre {
    font-size: 9pt; font-weight: 700; color: #fff;
    background: #002f59; padding: 4px 10px;
    text-transform: uppercase; letter-spacing: 0.4px;
    margin-bottom: 8px;
}

/* ── Grille identité agent ───────────────────────────────────────── */
.identite-table { width: 100%; border-collapse: collapse; }
.identite-table td { padding: 4px 8px; font-size: 9pt; border: 1px solid #ddd; }
.identite-table td.label { font-weight: 700; color: #002f59; background: #f4f7fc; width: 30%; }

/* ── Table critères ──────────────────────────────────────────────── */
.criteres-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
.criteres-table th {
    background: #002f59; color: #fff; font-size: 8.5pt;
    padding: 5px 8px; text-align: left;
}
.criteres-table td { padding: 5px 8px; font-size: 8.5pt; border-bottom: 1px solid #eee; }
.criteres-table tr:nth-child(even) td { background: #f8f9fc; }
.note-cell {
    text-align: center; font-weight: 700; font-size: 9.5pt;
    color: #002f59; white-space: nowrap;
}
.note-vide { color: #bbb; font-style: italic; font-weight: normal; }
.type-badge {
    display: inline-block; font-size: 6.5pt; font-weight: 700;
    padding: 1px 5px; border-radius: 2px; margin-right: 4px;
}
.badge-socle { background: #002f59; color: #fff; }
.badge-comp  { background: #ff7631; color: #fff; }

.sous-section-titre {
    font-size: 8pt; font-weight: 700; color: #002f59;
    border-left: 3px solid #ff7631; padding-left: 6px;
    margin: 8px 0 5px;
}

/* ── Appréciation synthèse ───────────────────────────────────────── */
.appreciation-bloc {
    display: table; width: 100%;
    background: #f4f7fc; border: 1px solid #ddd;
    padding: 8px 12px; border-radius: 3px; margin-bottom: 12px;
}
.appreciation-left, .appreciation-right {
    display: table-cell; vertical-align: middle;
}
.appreciation-right { text-align: right; }
.moyenne-val { font-size: 18pt; font-weight: 700; color: #002f59; }
.moyenne-label { font-size: 8pt; color: #666; }
.appr-badge {
    display: inline-block; font-size: 10pt; font-weight: 700;
    padding: 4px 14px; border-radius: 3px; color: #fff;
}
.appr-excellent        { background: #002f59; }
.appr-tres_satisfaisant{ background: #1a6b3c; }
.appr-satisfaisant     { background: #2d7a4e; }
.appr-a_ameliorer      { background: #ff7631; }
.appr-insuffisant      { background: #c0392b; }

/* ── Bloc narratif ───────────────────────────────────────────────── */
.bloc-narratif { margin-bottom: 8px; }
.bloc-label { font-size: 8pt; font-weight: 700; color: #555; margin-bottom: 3px; }
.bloc-contenu {
    font-size: 9pt; color: #333; padding: 6px 10px;
    border: 1px solid #e0e0e0; border-radius: 2px;
    min-height: 28px; line-height: 1.5;
    background: #fafbfd;
}
.bloc-vide { color: #bbb; font-style: italic; }

/* ── Tableau besoins / objectifs ─────────────────────────────────── */
.liste-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
.liste-table th { background: #f0f3f8; color: #002f59; font-weight: 700; padding: 4px 8px; text-align: left; border: 1px solid #ddd; }
.liste-table td { padding: 4px 8px; border: 1px solid #eee; }
.prio-haute   { color: #c0392b; font-weight: 700; }
.prio-moyenne { color: #ff7631; font-weight: 700; }
.prio-faible  { color: #666; }

/* ── Signatures ──────────────────────────────────────────────────── */
.signatures-bloc { display: table; width: 100%; margin-top: 20px; }
.signature-col { display: table-cell; width: 50%; padding: 0 10px; }
.signature-col:first-child { padding-left: 0; border-right: 1px solid #eee; }
.signature-col:last-child  { padding-left: 20px; }
.sig-titre { font-size: 9pt; font-weight: 700; color: #002f59; margin-bottom: 4px; }
.sig-nom { font-size: 9pt; color: #333; margin-bottom: 4px; }
.sig-date {
    font-size: 7.5pt; color: #666; font-style: italic;
}
.sig-zone {
    border-top: 1px dashed #ccc; width: 160px; height: 50px;
    display: inline-block; margin-top: 20px;
}
.sig-electronique {
    display: inline-block; background: #002f59; color: #fff;
    font-size: 7.5pt; font-weight: 700; padding: 3px 8px;
    border-radius: 3px; margin-top: 10px;
}
.sig-refuse {
    display: inline-block; background: #c0392b; color: #fff;
    font-size: 7.5pt; font-weight: 700; padding: 3px 8px;
    border-radius: 3px; margin-top: 10px;
}

/* ── Pied de page ────────────────────────────────────────────────── */
.footer {
    margin-top: 30px; border-top: 2px solid #002f59;
    padding-top: 6px; font-size: 7pt; color: #888;
    display: table; width: 100%;
}
.footer-left, .footer-right { display: table-cell; }
.footer-right { text-align: right; }
.footer-accent { color: #ff7631; font-weight: 700; }
</style>
</head>
<body>

{{-- ── En-tête ────────────────────────────────────────────────────── --}}
<div class="header">
    <div class="header-left">
        <div class="republique">République du Sénégal</div>
        <div class="devise">Un Peuple — Un But — Une Foi</div>
        <div class="ministere">Ministère des Transports Terrestres</div>
    </div>
    <div class="header-right">
        <div class="anaser-name">ANASER</div>
        <div class="anaser-sub">Agence Nationale de la Sécurité Routière</div>
        <div class="badge-direction">Direction des Ressources Humaines</div>
    </div>
</div>

{{-- ── Titre ──────────────────────────────────────────────────────── --}}
<div class="titre-bloc">
    <div class="titre-doc">Fiche d'Évaluation Annuelle du Personnel</div>
    <div class="titre-campagne">
        Campagne {{ $fiche->campagne?->exercice }}
        @if($fiche->campagne?->titre) — {{ $fiche->campagne->titre }} @endif
        @if($fiche->campagne?->periode_debut && $fiche->campagne?->periode_fin)
            | Période : {{ $fiche->campagne->periode_debut->locale('fr')->isoFormat('MMMM YYYY') }}
            → {{ $fiche->campagne->periode_fin->locale('fr')->isoFormat('MMMM YYYY') }}
        @endif
    </div>
</div>

{{-- ── Badge statut document ──────────────────────────────────────── --}}
<div class="badge-statut">
    @if($est_signe)
        <span class="badge-signe">✓ Document signé électroniquement — Non modifiable</span>
    @else
        <span class="badge-brouillon">⚠ Document en cours — Non signé</span>
    @endif
</div>

{{-- ── Section 1 : Identité de l'agent ───────────────────────────── --}}
<div class="section">
    <div class="section-titre">1. Identité de l'agent</div>
    <table class="identite-table">
        <tr>
            <td class="label">Nom et Prénom</td>
            <td>{{ $fiche->snapshot_nom_complet ?? '—' }}</td>
            <td class="label">Matricule</td>
            <td>{{ $fiche->snapshot_matricule ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Direction</td>
            <td>{{ $fiche->snapshot_direction ?? '—' }}</td>
            <td class="label">Service</td>
            <td>{{ $fiche->snapshot_service ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Fonction</td>
            <td>{{ $fiche->snapshot_fonction ?? '—' }}</td>
            <td class="label">Ancienneté</td>
            <td>
                @if($fiche->snapshot_anciennete_mois !== null)
                    {{ intdiv($fiche->snapshot_anciennete_mois, 12) }} an(s)
                    {{ $fiche->snapshot_anciennete_mois % 12 }} mois
                @else
                    —
                @endif
            </td>
        </tr>
        <tr>
            <td class="label">Responsable hiérarchique</td>
            <td>{{ $fiche->snapshot_superieur ?? $fiche->evaluateur?->name ?? '—' }}</td>
            <td class="label">Catégorie</td>
            <td>{{ str_replace('_', ' ', ucfirst($fiche->categorie_agent)) }}</td>
        </tr>
        <tr>
            <td class="label">Entretien</td>
            <td>
                @if($fiche->date_entretien)
                    {{ $fiche->date_entretien->locale('fr')->isoFormat('D MMMM YYYY') }}
                    @if($fiche->heure_entretien) à {{ $fiche->heure_entretien }} @endif
                @else
                    —
                @endif
            </td>
            <td class="label">Lieu</td>
            <td>{{ $fiche->lieu_entretien ?? '—' }}</td>
        </tr>
    </table>
</div>

{{-- ── Section 2 : Critères d'évaluation et notes ────────────────── --}}
<div class="section">
    <div class="section-titre">2. Grille de notation</div>

    @if($criteres && $criteres->isNotEmpty())
        {{-- Critères socles --}}
        @php $socles = $criteres->where('type', 'socle') @endphp
        @if($socles->isNotEmpty())
            <div class="sous-section-titre">Critères socles — applicables à tout le personnel</div>
            <table class="criteres-table">
                <thead>
                    <tr>
                        <th style="width:8%">Code</th>
                        <th style="width:45%">Critère d'évaluation</th>
                        <th style="width:15%; text-align:center">Note /{{ $referentiel?->note_max ?? 5 }}</th>
                        <th style="width:32%">Observation</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($socles as $critere)
                    @php $notation = $notations->get($critere->id) @endphp
                    <tr>
                        <td><strong>{{ $critere->code }}</strong></td>
                        <td>{{ $critere->libelle }}</td>
                        <td class="note-cell">
                            @if($notation?->note !== null)
                                {{ $notation->note }} / {{ $referentiel?->note_max ?? 5 }}
                            @else
                                <span class="note-vide">—</span>
                            @endif
                        </td>
                        <td style="font-size:8pt; color:#555;">{{ $notation?->observation ?? '' }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        {{-- Critères complémentaires (agents mis à disposition) --}}
        @php $complementaires = $criteres->where('type', 'complementaire') @endphp
        @if($complementaires->isNotEmpty())
            <div class="sous-section-titre" style="margin-top:10px;">
                Critères complémentaires — agents fonctionnaires mis à disposition
            </div>
            <table class="criteres-table">
                <thead>
                    <tr>
                        <th style="width:8%">Code</th>
                        <th style="width:45%">Critère d'évaluation</th>
                        <th style="width:15%; text-align:center">Note /{{ $referentiel?->note_max ?? 5 }}</th>
                        <th style="width:32%">Observation</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($complementaires as $critere)
                    @php $notation = $notations->get($critere->id) @endphp
                    <tr>
                        <td><strong>{{ $critere->code }}</strong></td>
                        <td>{{ $critere->libelle }}</td>
                        <td class="note-cell">
                            @if($notation?->note !== null)
                                {{ $notation->note }} / {{ $referentiel?->note_max ?? 5 }}
                            @else
                                <span class="note-vide">—</span>
                            @endif
                        </td>
                        <td style="font-size:8pt; color:#555;">{{ $notation?->observation ?? '' }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @else
        <p style="color:#bbb; font-style:italic; padding:8px;">Aucun critère associé.</p>
    @endif
</div>

{{-- ── Section 3 : Appréciation synthèse ─────────────────────────── --}}
@if($fiche->moyenne !== null)
<div class="section">
    <div class="section-titre">3. Appréciation synthèse</div>
    <div class="appreciation-bloc">
        <div class="appreciation-left">
            <div class="moyenne-label">Moyenne générale</div>
            <div class="moyenne-val">{{ number_format($fiche->moyenne, 2) }}
                <span style="font-size:10pt; color:#666;">/ {{ $referentiel?->note_max ?? 5 }}</span>
            </div>
        </div>
        <div class="appreciation-right">
            @if($fiche->appreciation)
            @php
                $appLabels = [
                    'excellent'         => 'Excellent',
                    'tres_satisfaisant' => 'Très satisfaisant',
                    'satisfaisant'      => 'Satisfaisant',
                    'a_ameliorer'       => 'À améliorer',
                    'insuffisant'       => 'Insuffisant',
                ];
            @endphp
            <span class="appr-badge appr-{{ $fiche->appreciation }}">
                {{ $appLabels[$fiche->appreciation] ?? $fiche->appreciation }}
            </span>
            @endif
        </div>
    </div>
</div>
@endif

{{-- ── Section 4 : Compte-rendu de l'entretien ───────────────────── --}}
<div class="section">
    <div class="section-titre">4. Compte-rendu de l'entretien</div>

    <div class="bloc-narratif">
        <div class="bloc-label">Bilan du plan d'action précédent</div>
        <div class="bloc-contenu">
            @if($fiche->bilan_plan_action)
                {!! nl2br(e($fiche->bilan_plan_action)) !!}
            @else
                <span class="bloc-vide">Non renseigné</span>
            @endif
        </div>
    </div>

    <div class="bloc-narratif">
        <div class="bloc-label">Réalisations et faits marquants de la période</div>
        <div class="bloc-contenu">
            @if($fiche->realisations)
                {!! nl2br(e($fiche->realisations)) !!}
            @else
                <span class="bloc-vide">Non renseigné</span>
            @endif
        </div>
    </div>

    <div class="bloc-narratif">
        <div class="bloc-label">Difficultés rencontrées</div>
        <div class="bloc-contenu">
            @if($fiche->difficultes)
                {!! nl2br(e($fiche->difficultes)) !!}
            @else
                <span class="bloc-vide">Non renseigné</span>
            @endif
        </div>
    </div>

    <div class="bloc-narratif">
        <div class="bloc-label">Compétences démontrées</div>
        <div class="bloc-contenu">
            @if($fiche->competences_demontrees)
                {!! nl2br(e($fiche->competences_demontrees)) !!}
            @else
                <span class="bloc-vide">Non renseigné</span>
            @endif
        </div>
    </div>
</div>

{{-- ── Section 5 : Besoins de formation ──────────────────────────── --}}
@if($fiche->besoinsFormation->isNotEmpty())
<div class="section">
    <div class="section-titre">5. Besoins de formation identifiés</div>
    <table class="liste-table">
        <thead>
            <tr>
                <th style="width:70%">Intitulé de la formation</th>
                <th style="width:30%">Priorité</th>
            </tr>
        </thead>
        <tbody>
            @foreach($fiche->besoinsFormation as $b)
            <tr>
                <td>{{ $b->intitule }}</td>
                <td class="prio-{{ $b->priorite }}">{{ ucfirst($b->priorite) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

{{-- ── Section 6 : Objectifs à venir ─────────────────────────────── --}}
@if($fiche->objectifs->isNotEmpty())
<div class="section">
    <div class="section-titre">6. Objectifs pour la prochaine période</div>
    <table class="liste-table">
        <thead>
            <tr>
                <th style="width:45%">Objectif</th>
                <th style="width:35%">Indicateur de suivi</th>
                <th style="width:20%">Échéance</th>
            </tr>
        </thead>
        <tbody>
            @foreach($fiche->objectifs as $o)
            <tr>
                <td>{{ $o->objectif }}</td>
                <td>{{ $o->indicateur ?? '—' }}</td>
                <td>{{ $o->echeance ? $o->echeance->locale('fr')->isoFormat('D MMM YYYY') : '—' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

{{-- ── Section 7 : Perspectives d'évolution ───────────────────────── --}}
@if($fiche->perspectives_evolution || $fiche->observations_evaluateur)
<div class="section">
    <div class="section-titre">7. Perspectives et observations</div>

    @if($fiche->perspectives_evolution)
    <div class="bloc-narratif">
        <div class="bloc-label">Perspectives d'évolution proposées</div>
        <div class="bloc-contenu">{!! nl2br(e($fiche->perspectives_evolution)) !!}</div>
    </div>
    @endif

    @if($fiche->observations_evaluateur)
    <div class="bloc-narratif">
        <div class="bloc-label">Observations de l'évaluateur</div>
        <div class="bloc-contenu">{!! nl2br(e($fiche->observations_evaluateur)) !!}</div>
    </div>
    @endif

    @if($fiche->observations_agent)
    <div class="bloc-narratif">
        <div class="bloc-label">Observations de l'agent</div>
        <div class="bloc-contenu">{!! nl2br(e($fiche->observations_agent)) !!}</div>
    </div>
    @endif
</div>
@endif

{{-- ── Section 8 : Signatures ──────────────────────────────────────── --}}
<div class="section">
    <div class="section-titre">8. Signatures</div>
    <div class="signatures-bloc">

        {{-- Signature évaluateur --}}
        <div class="signature-col">
            <div class="sig-titre">Le Responsable hiérarchique</div>
            @if($fiche->evaluateur)
                <div class="sig-nom">{{ $fiche->evaluateur->name }}</div>
            @endif
            @if($fiche->signe_evaluateur_at)
                <div class="sig-date">
                    Lu et approuvé le {{ $fiche->signe_evaluateur_at->locale('fr')->isoFormat('D MMMM YYYY à HH:mm') }}
                </div>
                <div>
                    <span class="sig-electronique">✓ Signé électroniquement</span>
                </div>
            @else
                <div class="sig-zone"></div>
                <div class="sig-date">Signature + cachet</div>
            @endif
        </div>

        {{-- Signature agent --}}
        <div class="signature-col">
            <div class="sig-titre">L'Agent évalué</div>
            <div class="sig-nom">{{ $fiche->snapshot_nom_complet }}</div>
            @if($fiche->refus_signature_agent)
                <div>
                    <span class="sig-refuse">✗ Signature refusée</span>
                </div>
                @if($fiche->motif_refus_signature)
                <div class="sig-date" style="margin-top:4px;">
                    Motif : {{ $fiche->motif_refus_signature }}
                </div>
                @endif
            @elseif($fiche->signe_agent_at)
                <div class="sig-date">
                    Lu et approuvé le {{ $fiche->signe_agent_at->locale('fr')->isoFormat('D MMMM YYYY à HH:mm') }}
                </div>
                <div>
                    <span class="sig-electronique">✓ Signé électroniquement</span>
                </div>
            @else
                <div class="sig-zone"></div>
                <div class="sig-date">Signature + date</div>
            @endif
        </div>

    </div>
</div>

{{-- ── Pied de page ─────────────────────────────────────────────────── --}}
<div class="footer">
    <div class="footer-left">
        <span class="footer-accent">ANASER</span> — Plateforme NiidPro — Module Évaluation
        | Statut : {{ $fiche->statut->libelle() }}
    </div>
    <div class="footer-right">
        Campagne {{ $fiche->campagne?->exercice }}
        — Généré le {{ now()->locale('fr')->isoFormat('D MMMM YYYY à HH:mm') }}
    </div>
</div>

</body>
</html>
