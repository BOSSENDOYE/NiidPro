<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: DejaVu Sans, sans-serif; font-size: 10.5pt; color: #1a1a2e; background: #fff; }

/* ── En-tête officiel République du Sénégal / ANASER ─────────────── */
.header {
    display: table;
    width: 100%;
    border-bottom: 3px solid #002f59;
    padding-bottom: 14px;
    margin-bottom: 24px;
}
.header-left, .header-right { display: table-cell; vertical-align: top; width: 50%; }
.header-right { text-align: right; }

.republique { font-size: 8pt; font-weight: 700; color: #002f59; text-transform: uppercase; letter-spacing: 0.5px; }
.devise { font-size: 7.5pt; color: #555; font-style: italic; margin-top: 2px; }
.ministere { font-size: 8pt; color: #333; margin-top: 4px; }

.logo-anaser { margin-bottom: 4px; }
.anaser-name { font-size: 13pt; font-weight: 700; color: #002f59; }
.anaser-sub  { font-size: 7.5pt; color: #666; }

.badge-direction {
    display: inline-block;
    background: #ff7631;
    color: #fff;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 3px;
    margin-top: 6px;
    letter-spacing: 0.4px;
}

/* ── Titre note de service ─────────────────────────────────────────── */
.titre-bloc {
    text-align: center;
    margin: 28px 0 20px;
    border-top: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
    padding: 14px 0;
}
.titre-ns { font-size: 14pt; font-weight: 700; color: #002f59; text-transform: uppercase; letter-spacing: 1px; }
.ref-ns { font-size: 9pt; color: #555; margin-top: 5px; }
.objet-ns { font-size: 10pt; font-weight: 600; color: #333; margin-top: 6px; }

/* ── Métadonnées ────────────────────────────────────────────────────── */
.meta-bloc {
    display: table;
    width: 100%;
    margin-bottom: 24px;
    font-size: 9pt;
    color: #444;
}
.meta-left, .meta-right { display: table-cell; }
.meta-right { text-align: right; font-style: italic; }

.signataire-label { font-size: 9pt; color: #666; }
.signataire-name  { font-size: 10pt; font-weight: 700; color: #002f59; }

/* ── Corps du document ────────────────────────────────────────────── */
.corps { line-height: 1.7; color: #2a2a2a; }
.intro-formule { font-size: 10pt; margin-bottom: 16px; }
.intro-formule strong { color: #002f59; }

.article {
    margin-bottom: 18px;
}
.article-titre {
    font-size: 10pt;
    font-weight: 700;
    color: #002f59;
    text-transform: uppercase;
    border-left: 4px solid #ff7631;
    padding-left: 8px;
    margin-bottom: 7px;
}
.article-contenu {
    font-size: 10pt;
    padding-left: 12px;
    line-height: 1.65;
}

/* ── Calendrier ─────────────────────────────────────────────────────── */
.calendrier-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 9pt;
}
.calendrier-table th {
    background: #002f59;
    color: #fff;
    padding: 6px 10px;
    text-align: left;
    font-weight: 600;
}
.calendrier-table td {
    padding: 5px 10px;
    border-bottom: 1px solid #e8e8e8;
}
.calendrier-table tr:nth-child(even) td { background: #f8f9fc; }
.sp-badge {
    display: inline-block;
    background: #ff7631;
    color: #fff;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 2px;
}
.nd { color: #aaa; font-style: italic; }

/* ── Principe non-disciplinaire (bandeau réglementaire) ────────────── */
.principe-bloc {
    background: #fff8e7;
    border: 1.5px solid #ff7631;
    border-radius: 4px;
    padding: 10px 14px;
    margin: 18px 0;
    font-size: 9pt;
    color: #7a4400;
}
.principe-bloc strong { color: #ff7631; }

/* ── Signature ──────────────────────────────────────────────────────── */
.signature-bloc {
    margin-top: 40px;
    text-align: right;
}
.signature-lieu-date { font-size: 9.5pt; color: #555; margin-bottom: 6px; }
.signature-titre { font-size: 10pt; font-weight: 700; color: #002f59; }
.signature-nom   { font-size: 9.5pt; color: #555; margin-top: 3px; }
.signature-zone  {
    border-top: 1px dashed #ccc;
    width: 200px;
    height: 60px;
    display: inline-block;
    margin-top: 30px;
}

@if($campagne->note_service_signee)
.horodatage {
    font-size: 7.5pt;
    color: #888;
    margin-top: 5px;
}
@endif

/* ── Pied de page ───────────────────────────────────────────────────── */
.footer {
    margin-top: 50px;
    border-top: 2px solid #002f59;
    padding-top: 8px;
    font-size: 7.5pt;
    color: #888;
    display: table;
    width: 100%;
}
.footer-left, .footer-right { display: table-cell; }
.footer-right { text-align: right; }
.footer-accent { color: #ff7631; font-weight: 700; }
</style>
</head>
<body>

{{-- ── En-tête ───────────────────────────────────────────── --}}
<div class="header">
    <div class="header-left">
        <div class="republique">République du Sénégal</div>
        <div class="devise">Un Peuple — Un But — Une Foi</div>
        <div class="ministere">Ministère des Transports Terrestres</div>
    </div>
    <div class="header-right">
        <div class="anaser-name">ANASER</div>
        <div class="anaser-sub">Agence Nationale de la Sécurité Routière</div>
        <div class="badge-direction">Direction Générale</div>
    </div>
</div>

{{-- ── Titre ────────────────────────────────────────────────── --}}
<div class="titre-bloc">
    <div class="titre-ns">Note de Service</div>
    <div class="ref-ns">N° ___/DG/ANASER/{{ $campagne->exercice }}</div>
    <div class="objet-ns">
        Objet : Lancement de la campagne d'évaluation annuelle du personnel<br>
        Exercice {{ $campagne->exercice }}
    </div>
</div>

{{-- ── Métadonnées ─────────────────────────────────────────── --}}
<div class="meta-bloc">
    <div class="meta-left">
        <span class="signataire-label">Le Directeur Général de l'ANASER</span>
    </div>
    <div class="meta-right">
        Dakar, le {{ now()->locale('fr')->isoFormat('D MMMM YYYY') }}
    </div>
</div>

{{-- ── Visas réglementaires ────────────────────────────────── --}}
<div class="corps">
    <div class="intro-formule">
        <strong>Vu</strong> le Manuel de procédures ANASER (Version 01 — août 2023), Chapitre IV, Sections B et 11 ;<br>
        <strong>Vu</strong> la Note de cadrage — Campagne d'évaluation annuelle du personnel, Exercice {{ $campagne->exercice }} ;
    </div>

    {{-- ── Bandeau principe de dignité (§2 CDC) ────────────── --}}
    <div class="principe-bloc">
        <strong>Rappel réglementaire :</strong> Conformément au Manuel de procédures ANASER, l'évaluation ne revêt
        <strong>aucun caractère disciplinaire</strong> et doit être conduite dans le respect de la dignité de chaque agent.
    </div>

    {{-- ── Art. 1 — Objet ──────────────────────────────────── --}}
    <div class="article">
        <div class="article-titre">Article 1 — Objet</div>
        <div class="article-contenu">
            La présente note de service a pour objet d'annoncer le lancement de la campagne d'évaluation
            annuelle du personnel de l'ANASER pour l'exercice <strong>{{ $campagne->exercice }}</strong>,
            @if($campagne->periode_debut && $campagne->periode_fin)
                couvrant la période du <strong>{{ $campagne->periode_debut->locale('fr')->isoFormat('D MMMM YYYY') }}</strong>
                au <strong>{{ $campagne->periode_fin->locale('fr')->isoFormat('D MMMM YYYY') }}</strong>.
            @else
                conformément aux dispositions en vigueur.
            @endif
        </div>
    </div>

    {{-- ── Art. 2 — Personnel concerné ────────────────────── --}}
    <div class="article">
        <div class="article-titre">Article 2 — Personnel concerné</div>
        <div class="article-contenu">
            L'évaluation concerne l'ensemble des agents de l'ANASER, notamment :
            les agents recrutés directement par l'Agence (contractuels) ;
            les fonctionnaires et agents non fonctionnaires mis à la disposition de l'ANASER par l'État ;
            ainsi que les agents décisionnaires.
        </div>
    </div>

    {{-- ── Art. 3 — Calendrier ─────────────────────────────── --}}
    <div class="article">
        <div class="article-titre">Article 3 — Calendrier indicatif</div>
        <div class="article-contenu">
            <table class="calendrier-table">
                <thead>
                    <tr>
                        <th>Sous-procédure</th>
                        <th>Acteur(s)</th>
                        <th>Échéance</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span class="sp-badge">SP1</span> Lancement de la campagne</td>
                        <td>DG / SG</td>
                        <td>{{ $campagne->date_lancement?->locale('fr')->isoFormat('MMMM YYYY') ?? '<span class="nd">À définir</span>' }}</td>
                    </tr>
                    <tr>
                        <td><span class="sp-badge">SP2</span> Planification des entretiens</td>
                        <td>Responsables hiérarchiques</td>
                        <td>
                            @if($campagne->date_limite_planification)
                                avant le {{ $campagne->date_limite_planification->locale('fr')->isoFormat('D MMMM YYYY') }}
                            @else
                                <span class="nd">À définir</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td><span class="sp-badge">SP3</span> Conduite des entretiens &amp; notation</td>
                        <td>Responsables hiérarchiques</td>
                        <td>
                            @if($campagne->date_limite_entretiens)
                                avant le {{ $campagne->date_limite_entretiens->locale('fr')->isoFormat('D MMMM YYYY') }}
                            @else
                                <span class="nd">À définir</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td><span class="sp-badge">SP4</span> Tableau de synthèse</td>
                        <td>DAF / Division RH</td>
                        <td>
                            @if($campagne->date_limite_transmission)
                                avant le {{ $campagne->date_limite_transmission->locale('fr')->isoFormat('D MMMM YYYY') }}
                            @else
                                <span class="nd">À définir</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td><span class="sp-badge">SP5</span> Étude et décision DG</td>
                        <td>DG / SG</td>
                        <td>
                            @if($campagne->date_limite_synthese)
                                avant le {{ $campagne->date_limite_synthese->locale('fr')->isoFormat('D MMMM YYYY') }}
                            @else
                                <span class="nd">À définir</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td><span class="sp-badge">SP6</span> Notification aux agents</td>
                        <td>DAF</td>
                        <td>
                            @if($campagne->date_cloture)
                                avant le {{ $campagne->date_cloture->locale('fr')->isoFormat('D MMMM YYYY') }}
                            @else
                                <span class="nd">À définir</span>
                            @endif
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    {{-- ── Art. 4 — Dispositions pratiques ─────────────────── --}}
    <div class="article">
        <div class="article-titre">Article 4 — Dispositions pratiques</div>
        <div class="article-contenu">
            Chaque responsable hiérarchique recevra, par l'intermédiaire du système d'information NiidPro,
            la liste de ses collaborateurs à évaluer ainsi que les fiches d'évaluation correspondantes.
            Les entretiens doivent être planifiés, conduits et les fiches transmises dans les délais impartis.<br><br>
            Pour toute question relative à la procédure, s'adresser à la Division des Ressources Humaines.
        </div>
    </div>
</div>

{{-- ── Signature ────────────────────────────────────────────── --}}
<div class="signature-bloc">
    <div class="signature-lieu-date">Dakar, le {{ now()->locale('fr')->isoFormat('D MMMM YYYY') }}</div>
    <div class="signature-titre">Le Directeur Général</div>
    @if($campagne->lanceur)
        <div class="signature-nom">{{ $campagne->lanceur->name }}</div>
    @endif
    @if($campagne->note_service_signee)
        <br>
        <span style="background:#002f59;color:#fff;font-size:8pt;padding:3px 8px;border-radius:3px;">
            ✓ Signé électroniquement — {{ optional($campagne->note_service_signee_at)->locale('fr')->isoFormat('D MMMM YYYY à HH:mm') }}
        </span>
    @else
        <div class="signature-zone"></div>
    @endif
</div>

{{-- ── Pied de page ─────────────────────────────────────────── --}}
<div class="footer">
    <div class="footer-left">
        <span class="footer-accent">ANASER</span> — Plateforme NiidPro — Module Évaluation
    </div>
    <div class="footer-right">
        Campagne {{ $campagne->exercice }} — Généré le {{ now()->locale('fr')->isoFormat('D MMMM YYYY') }}
    </div>
</div>

</body>
</html>
