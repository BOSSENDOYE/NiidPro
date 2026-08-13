<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 10px; color: #1a1a1a; background: #fff; }

    .page-header {
        background: #002f59;
        color: #fff;
        padding: 14px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 18px;
    }
    .page-header .org { font-size: 14px; font-weight: bold; letter-spacing: 1px; }
    .page-header .doc-title { font-size: 12px; opacity: .85; margin-top: 3px; }
    .page-header .meta { text-align: right; font-size: 9px; opacity: .8; }

    .badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 3px;
        font-size: 9px;
        letter-spacing: .5px;
        text-transform: uppercase;
        margin-bottom: 12px;
        color: #fff;
    }
    .badge-valide  { background: #15803d; }
    .badge-transmis { background: #002f59; }
    .badge-brouillon { background: #ff7631; }

    .section { margin-bottom: 18px; }
    .section-title {
        background: #002f59;
        color: #fff;
        padding: 5px 10px;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: .5px;
        margin-bottom: 8px;
    }
    .section-title-orange {
        background: #ff7631;
        color: #fff;
        padding: 5px 10px;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: .5px;
        margin-bottom: 8px;
    }

    table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 10px; }
    th { background: #002f59; color: #fff; padding: 5px 8px; text-align: left; font-weight: bold; }
    td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }

    .kpi-grid { display: flex; gap: 14px; margin-bottom: 14px; }
    .kpi-card {
        flex: 1;
        border: 1px solid #e5e7eb;
        border-left: 4px solid #ff7631;
        padding: 8px 12px;
        border-radius: 3px;
    }
    .kpi-card .label { font-size: 8px; text-transform: uppercase; letter-spacing: .4px; color: #6b7280; }
    .kpi-card .value { font-size: 18px; font-weight: bold; color: #002f59; margin-top: 2px; }

    .annotation-box {
        border: 1px solid #d1d5db;
        border-left: 4px solid #ff7631;
        padding: 10px 14px;
        background: #fffbf5;
        font-size: 10px;
        line-height: 1.5;
        margin-bottom: 10px;
    }

    .gratif-prime          { color: #15803d; font-weight: bold; }
    .gratif-lettre_felicitation { color: #2563eb; font-weight: bold; }
    .gratif-promotion      { color: #7c3aed; font-weight: bold; }
    .gratif-aucune         { color: #6b7280; }
    .gratif-avertissement  { color: #dc2626; font-weight: bold; }

    .sig-zone {
        border: 1px solid #d1d5db;
        padding: 10px 16px;
        min-height: 60px;
        margin-top: 6px;
        font-size: 9px;
        color: #374151;
    }
    .footer {
        border-top: 2px solid #002f59;
        padding-top: 8px;
        margin-top: 20px;
        font-size: 8px;
        color: #6b7280;
        display: flex;
        justify-content: space-between;
    }
</style>
</head>
<body>

<div class="page-header">
    <div>
        <div class="org">ANASER — NiidPro SIRH</div>
        <div class="doc-title">Tableau de synthèse annoté — Décision du Directeur général</div>
    </div>
    <div class="meta">
        @if(($donnees['campagne']['titre'] ?? null))
            {{ $donnees['campagne']['titre'] }}<br>
        @endif
        Exercice {{ $donnees['campagne']['exercice'] ?? '' }}<br>
        Version {{ $synthese->version }}<br>
        Généré le {{ \Carbon\Carbon::parse($donnees['genere_at'] ?? now())->format('d/m/Y H:i') }}
    </div>
</div>

{{-- Statut --}}
@if($synthese->estValideDg())
    <div class="badge badge-valide">
        ✓ Validé par le Directeur général le {{ $synthese->valide_dg_at?->format('d/m/Y H:i') }}
    </div>
@elseif($synthese->estTransmis())
    <div class="badge badge-transmis">⏳ En cours d'étude DG</div>
@else
    <div class="badge badge-brouillon">⚠ Brouillon</div>
@endif

{{-- ── KPIs globaux ── --}}
@php $global = $donnees['global'] ?? []; @endphp
<div class="kpi-grid">
    <div class="kpi-card">
        <div class="label">Fiches intégrées</div>
        <div class="value">{{ $global['nb_fiches_integrees'] ?? 0 }}</div>
    </div>
    <div class="kpi-card">
        <div class="label">Moyenne globale</div>
        <div class="value">{{ $global['moyenne_globale'] !== null ? number_format($global['moyenne_globale'], 2) : 'N/A' }}</div>
    </div>
    <div class="kpi-card">
        <div class="label">Décisions gratification</div>
        <div class="value">{{ $gratifications->count() }}</div>
    </div>
</div>

{{-- ── Annotation globale DG ── --}}
@if($synthese->annotation_dg)
<div class="section">
    <div class="section-title-orange">Observations du Directeur général</div>
    <div class="annotation-box">{{ $synthese->annotation_dg }}</div>
</div>
@endif

{{-- ── Résultats par structure ── --}}
<div class="section">
    <div class="section-title">Résultats par structure</div>
    <table>
        <thead>
            <tr>
                <th>Structure / Entité</th>
                <th>Effectif évalué</th>
                <th>Moyenne</th>
                <th>Excellent</th>
                <th>Très satisfaisant</th>
                <th>Satisfaisant</th>
                <th>Insuffisant</th>
            </tr>
        </thead>
        <tbody>
        @foreach($donnees['par_structure'] ?? [] as $struct)
            <tr>
                <td>{{ $struct['department_nom'] }}</td>
                <td>{{ $struct['nb_evalues'] }}</td>
                <td>{{ $struct['moyenne'] !== null ? number_format($struct['moyenne'], 2) : 'N/A' }}</td>
                <td>{{ $struct['appreciations']['excellent'] ?? 0 }}</td>
                <td>{{ $struct['appreciations']['tres_satisfaisant'] ?? 0 }}</td>
                <td>{{ $struct['appreciations']['satisfaisant'] ?? 0 }}</td>
                <td>{{ $struct['appreciations']['insuffisant'] ?? 0 }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
</div>

{{-- ── Décisions de gratification ── --}}
@if($gratifications->count() > 0)
<div class="section">
    <div class="section-title-orange">Décisions de gratification — Directeur général</div>
    <table>
        <thead>
            <tr>
                <th>Agent</th>
                <th>Structure</th>
                <th>Note</th>
                <th>Décision</th>
                <th>Commentaire</th>
            </tr>
        </thead>
        <tbody>
        @foreach($gratifications as $g)
            <tr>
                <td>{{ $g->fiche?->snapshot_nom_complet ?? '—' }}</td>
                <td>{{ $g->fiche?->employee?->department?->name ?? '—' }}</td>
                <td>{{ $g->fiche?->moyenne !== null ? number_format($g->fiche->moyenne, 2) : 'N/A' }}</td>
                <td class="gratif-{{ $g->type_decision }}">{{ $g->libelleDecision() }}</td>
                <td>{{ $g->commentaire ?? '—' }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
</div>
@endif

{{-- ── Moyennes par critère ── --}}
<div class="section">
    <div class="section-title">Moyennes par critère</div>
    <table>
        <thead>
            <tr>
                <th>Critère</th>
                <th>Type</th>
                <th>Moyenne</th>
            </tr>
        </thead>
        <tbody>
        @foreach($donnees['par_critere'] ?? [] as $critere)
            <tr>
                <td>{{ $critere['critere_nom'] }}</td>
                <td>{{ ucfirst($critere['type']) }}</td>
                <td>{{ $critere['moyenne'] !== null ? number_format($critere['moyenne'], 2) : 'N/A' }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
</div>

{{-- ── Validation DG ── --}}
<div class="section">
    <div class="section-title">Décision officielle du Directeur général</div>
    @if($synthese->estValideDg())
        <div class="sig-zone">
            <strong>Tableau de synthèse validé et transmis au DAF</strong><br>
            Date de validation : {{ $synthese->valide_dg_at?->format('d/m/Y à H:i') }}<br>
            Date d'ouverture pour étude : {{ $synthese->etudie_dg_at?->format('d/m/Y à H:i') ?? 'N/A' }}<br>
            Document figé — version {{ $synthese->version }} — Non modifiable après validation.
        </div>
    @else
        <div class="sig-zone" style="color:#9ca3af;">
            [Non encore validé par le Directeur général]
        </div>
    @endif
</div>

<div class="footer">
    <span>ANASER — Document généré par NiidPro SIRH — CONFIDENTIEL</span>
    <span>Tableau annoté DG v{{ $synthese->version }} — Exercice {{ $donnees['campagne']['exercice'] ?? '' }}</span>
</div>

</body>
</html>
