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

    .badge-transmis {
        display: inline-block;
        background: #002f59;
        color: #fff;
        padding: 3px 10px;
        border-radius: 3px;
        font-size: 9px;
        letter-spacing: .5px;
        text-transform: uppercase;
        margin-bottom: 12px;
    }
    .badge-brouillon {
        display: inline-block;
        background: #ff7631;
        color: #fff;
        padding: 3px 10px;
        border-radius: 3px;
        font-size: 9px;
        letter-spacing: .5px;
        text-transform: uppercase;
        margin-bottom: 12px;
    }

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

    table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 10px; }
    th {
        background: #002f59;
        color: #fff;
        padding: 5px 8px;
        text-align: left;
        font-weight: bold;
    }
    td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
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

    .apprec-excellent    { color: #15803d; font-weight: bold; }
    .apprec-tres_satisfaisant { color: #2563eb; font-weight: bold; }
    .apprec-satisfaisant { color: #4b5563; }
    .apprec-insuffisant  { color: #dc2626; font-weight: bold; }

    .footer {
        border-top: 2px solid #002f59;
        padding-top: 8px;
        margin-top: 20px;
        font-size: 8px;
        color: #6b7280;
        display: flex;
        justify-content: space-between;
    }
    .sig-zone {
        border: 1px solid #d1d5db;
        padding: 10px 16px;
        min-height: 50px;
        margin-top: 6px;
        font-size: 9px;
        color: #374151;
    }
</style>
</head>
<body>

<div class="page-header">
    <div>
        <div class="org">ANASER — NiidPro SIRH</div>
        <div class="doc-title">Tableau de synthèse des évaluations</div>
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

{{-- Statut du tableau --}}
@if($synthese->statut === 'transmis')
    <div class="badge-transmis">
        ✓ Transmis au Directeur général le {{ $synthese->transmis_dg_at?->format('d/m/Y H:i') }}
    </div>
@else
    <div class="badge-brouillon">⚠ Brouillon — Non transmis au DG</div>
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
    @foreach($global['appreciation_distribution'] ?? [] as $apprec => $nb)
    <div class="kpi-card">
        <div class="label">{{ ucfirst(str_replace('_', ' ', $apprec)) }}</div>
        <div class="value apprec-{{ $apprec }}">{{ $nb }}</div>
    </div>
    @endforeach
</div>

{{-- ── Par structure ── --}}
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

{{-- ── Par critère ── --}}
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

{{-- ── Besoins de formation ── --}}
@if(!empty($donnees['besoins_formation']))
<div class="section">
    <div class="section-title">Besoins de formation exprimés</div>
    <table>
        <thead>
            <tr>
                <th>Formation</th>
                <th>Nb demandes</th>
            </tr>
        </thead>
        <tbody>
        @foreach($donnees['besoins_formation'] as $formation => $nb)
            <tr>
                <td>{{ $formation }}</td>
                <td>{{ $nb }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
</div>
@endif

{{-- ── Annotations Division RH ── --}}
@if($synthese->notes_division_rh)
<div class="section">
    <div class="section-title">Annotations Division RH</div>
    <div class="sig-zone">{{ $synthese->notes_division_rh }}</div>
</div>
@endif

{{-- ── Zone de signature DAF ── --}}
<div class="section">
    <div class="section-title">Transmission officielle</div>
    @if($synthese->statut === 'transmis')
        <div class="sig-zone">
            <strong>Transmis au Directeur général</strong><br>
            Date : {{ $synthese->transmis_dg_at?->format('d/m/Y à H:i') }}<br>
            Document figé — version {{ $synthese->version }} — Non modifiable après transmission.
        </div>
    @else
        <div class="sig-zone" style="color:#9ca3af;">
            [Non encore transmis au DG]
        </div>
    @endif
</div>

<div class="footer">
    <span>ANASER — Document généré par NiidPro SIRH</span>
    <span>Tableau de synthèse v{{ $synthese->version }} — Exercice {{ $donnees['campagne']['exercice'] ?? '' }}</span>
</div>

</body>
</html>
