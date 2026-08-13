<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }

    .letterhead {
        border-bottom: 3px solid #002f59;
        padding-bottom: 14px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
    }
    .letterhead .org-block .org-name {
        font-size: 16px;
        font-weight: bold;
        color: #002f59;
        letter-spacing: 1px;
        text-transform: uppercase;
    }
    .letterhead .org-block .org-subtitle {
        font-size: 9px;
        color: #6b7280;
        margin-top: 2px;
        letter-spacing: .3px;
    }
    .letterhead .ref-block {
        text-align: right;
        font-size: 9px;
        color: #374151;
    }
    .letterhead .ref-block .ref-line { font-weight: bold; font-size: 10px; }

    .badge-confidentiel {
        display: inline-block;
        background: #002f59;
        color: #fff;
        font-size: 8px;
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 2px;
        margin-bottom: 14px;
    }

    .destinataire {
        border-left: 4px solid #ff7631;
        padding: 8px 14px;
        margin-bottom: 16px;
        background: #fffbf5;
        font-size: 10.5px;
    }
    .destinataire .label { font-size: 8px; text-transform: uppercase; letter-spacing: .4px; color: #6b7280; margin-bottom: 3px; }
    .destinataire .nom { font-weight: bold; font-size: 12px; color: #002f59; }
    .destinataire .meta { color: #374151; margin-top: 2px; font-size: 9.5px; }

    .objet-block {
        margin-bottom: 16px;
        padding: 8px 12px;
        background: #f0f4f9;
        border-left: 4px solid #002f59;
        font-size: 10.5px;
    }
    .objet-block .label { font-size: 8px; text-transform: uppercase; letter-spacing: .3px; color: #6b7280; }
    .objet-block .objet { font-weight: bold; margin-top: 2px; }

    .corps-lettre {
        font-size: 11px;
        line-height: 1.65;
        text-align: justify;
        margin-bottom: 22px;
    }
    .corps-lettre p { margin-bottom: 10px; }

    .decision-block {
        border: 1px solid #d1d5db;
        border-left: 4px solid #ff7631;
        padding: 10px 14px;
        margin-bottom: 18px;
        background: #fffbf5;
    }
    .decision-block .dtitle {
        font-size: 9px;
        text-transform: uppercase;
        font-weight: bold;
        color: #ff7631;
        letter-spacing: .4px;
        margin-bottom: 6px;
    }
    .decision-block table { width: 100%; font-size: 10px; border-collapse: collapse; }
    .decision-block td { padding: 3px 6px; }
    .decision-block td:first-child { color: #6b7280; width: 40%; }
    .decision-block td:last-child { font-weight: bold; }

    .signature-section {
        margin-top: 24px;
        display: flex;
        justify-content: flex-end;
    }
    .sig-box {
        border: 1px solid #d1d5db;
        padding: 12px 20px;
        min-width: 200px;
        min-height: 70px;
        text-align: center;
        font-size: 9.5px;
        color: #374151;
    }
    .sig-box .sig-title { font-weight: bold; color: #002f59; margin-bottom: 4px; }
    .sig-box .sig-nom { margin-top: 30px; font-weight: bold; }
    .sig-box .sig-date { color: #6b7280; font-size: 8.5px; margin-top: 2px; }

    .accuse-section {
        margin-top: 24px;
        border: 1px dashed #d1d5db;
        padding: 10px 16px;
        font-size: 9.5px;
        color: #374151;
    }
    .accuse-section .atitle { font-weight: bold; margin-bottom: 6px; text-transform: uppercase; font-size: 8.5px; letter-spacing: .3px; color: #6b7280; }

    .footer-doc {
        border-top: 2px solid #002f59;
        padding-top: 8px;
        margin-top: 24px;
        font-size: 7.5px;
        color: #9ca3af;
        display: flex;
        justify-content: space-between;
    }
</style>
</head>
<body>

{{-- En-tête ─────────────────────────────────────────────────────── --}}
<div class="letterhead">
    <div class="org-block">
        <div class="org-name">ANASER</div>
        <div class="org-subtitle">Agence Nationale des Statistiques et de la Démographie</div>
    </div>
    <div class="ref-block">
        <div class="ref-line">LETTRE DE NOTIFICATION D'ÉVALUATION</div>
        <div>Exercice {{ $fiche->campagne?->exercice ?? '' }}</div>
        <div>Le {{ \Carbon\Carbon::now()->format('d/m/Y') }}</div>
        @if($courrier->estSigne())
            <div style="color:#15803d; margin-top:2px;">✓ Signé DAF — {{ $courrier->signe_at?->format('d/m/Y') }}</div>
        @endif
    </div>
</div>

<div class="badge-confidentiel">CONFIDENTIEL — Usage personnel</div>

{{-- Destinataire ──────────────────────────────────────────────────── --}}
<div class="destinataire">
    <div class="label">À l'attention de</div>
    <div class="nom">{{ $fiche->snapshot_nom_complet ?? '—' }}</div>
    <div class="meta">
        {{ $fiche->snapshot_matricule ? 'Mat. ' . $fiche->snapshot_matricule . ' — ' : '' }}
        {{ $fiche->snapshot_fonction ?? '' }}
        @if($fiche->snapshot_direction)
            — {{ $fiche->snapshot_direction }}
        @endif
        @if($fiche->snapshot_service)
            / {{ $fiche->snapshot_service }}
        @endif
    </div>
</div>

{{-- Objet ─────────────────────────────────────────────────────────── --}}
<div class="objet-block">
    <div class="label">Objet</div>
    <div class="objet">
        {{ $courrier->modele?->objet_lettre ?? "Notification des résultats de l'évaluation annuelle — Exercice " . ($fiche->campagne?->exercice ?? '') }}
    </div>
</div>

{{-- Corps de la lettre ─────────────────────────────────────────────── --}}
<div class="corps-lettre">
    {!! nl2br(e($courrier->corps_genere)) !!}
</div>

{{-- Résumé des résultats ──────────────────────────────────────────── --}}
<div class="decision-block">
    <div class="dtitle">Résumé de l'évaluation</div>
    <table>
        <tr>
            <td>Note finale :</td>
            <td>{{ $fiche->moyenne !== null ? number_format($fiche->moyenne, 2) . ' / 5' : 'N/A' }}</td>
        </tr>
        <tr>
            <td>Appréciation :</td>
            <td>{{ match($fiche->appreciation ?? '') {
                'excellent'         => 'Excellent',
                'tres_satisfaisant' => 'Très satisfaisant',
                'satisfaisant'      => 'Satisfaisant',
                'a_ameliorer'       => 'À améliorer',
                'insuffisant'       => 'Insuffisant',
                default             => ucfirst($fiche->appreciation ?? '—'),
            } }}</td>
        </tr>
        @if($courrier->envoye_at)
        <tr>
            <td>Date de transmission :</td>
            <td>{{ $courrier->envoye_at?->format('d/m/Y') }}</td>
        </tr>
        <tr>
            <td>Mode de transmission :</td>
            <td>{{ $courrier->libelleMode() }}</td>
        </tr>
        @endif
    </table>
</div>

{{-- Signature DAF ─────────────────────────────────────────────────── --}}
<div class="signature-section">
    <div class="sig-box">
        <div class="sig-title">Le Directeur Administratif et Financier</div>
        @if($courrier->estSigne())
            <div class="sig-nom">{{ $courrier->signataire?->name ?? '—' }}</div>
            <div class="sig-date">Signé le {{ $courrier->signe_at?->format('d/m/Y') }}</div>
        @else
            <div style="color:#9ca3af; margin-top:24px;">[Non encore signé]</div>
        @endif
    </div>
</div>

{{-- Accusé de réception ────────────────────────────────────────────── --}}
<div class="accuse-section">
    <div class="atitle">Accusé de réception — Agent</div>
    @if($courrier->estAccuse())
        <div style="color:#15803d; font-weight:bold;">
            ✓ Consulté le {{ $courrier->accuse_at?->format('d/m/Y à H:i') }}
            @if($courrier->accusePar)
                par {{ $courrier->accusePar->name }}
            @endif
        </div>
    @else
        <div>
            Je soussigné(e) <strong>{{ $fiche->snapshot_nom_complet ?? '___________________________' }}</strong>,
            reconnais avoir pris connaissance de la présente lettre de notification d'évaluation.<br>
            <br>
            Date : ______________________ &nbsp;&nbsp; Signature : ______________________________
        </div>
    @endif
</div>

{{-- Pied de page ──────────────────────────────────────────────────── --}}
<div class="footer-doc">
    <span>ANASER — NiidPro SIRH — Document CONFIDENTIEL</span>
    <span>Exercice {{ $fiche->campagne?->exercice ?? '' }} — {{ $fiche->snapshot_matricule ?? '' }}</span>
</div>

</body>
</html>
