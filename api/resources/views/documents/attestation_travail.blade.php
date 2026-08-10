<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size:10pt; color:#1a1a2e; background:#fff; }

  .header {
    background: linear-gradient(135deg, #002f59 0%, #004080 100%);
    color:#fff; padding:22px 32px 18px; margin-bottom:30px;
  }
  .header-top { display:flex; justify-content:space-between; align-items:flex-start; }
  .company-name { font-size:16pt; font-weight:700; }
  .company-sub  { font-size:8pt; opacity:.8; margin-top:3px; }
  .ref-badge {
    background:rgba(255,255,255,.2); border:1px solid rgba(255,255,255,.4);
    border-radius:5px; padding:4px 10px; font-size:8pt; font-weight:700;
  }
  .ref-date { font-size:7.5pt; opacity:.7; margin-top:4px; text-align:right; }
  .header-title {
    margin-top:14px; padding-top:14px;
    border-top:1px solid rgba(255,255,255,.25);
    font-size:13pt; font-weight:700; text-align:center; letter-spacing:.5px;
  }

  .body { padding:0 32px; }

  .intro { font-size:10.5pt; line-height:1.8; margin-bottom:24px; }
  .intro strong { color:#002f59; }

  .info-box {
    border:1px solid #dde3ed; border-left:4px solid #002f59;
    border-radius:6px; padding:16px 20px; margin-bottom:24px;
    background:#f8fafc;
  }
  .info-box h3 {
    font-size:8pt; font-weight:700; color:#64748b;
    text-transform:uppercase; letter-spacing:.6px; margin-bottom:12px;
  }
  table.info { width:100%; border-collapse:collapse; }
  table.info tr+tr td { border-top:1px solid #e2e8f0; }
  table.info td { padding:8px 0; font-size:9.5pt; vertical-align:top; }
  table.info td:first-child { font-weight:700; color:#002f59; width:160px; padding-right:10px; }

  .mention {
    font-size:9pt; line-height:1.7; color:#374151;
    margin-bottom:20px; text-align:justify;
  }
  .mention em { font-style:italic; color:#64748b; }

  .usage-box {
    background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px;
    padding:12px 16px; margin-bottom:28px; font-size:9pt; color:#1e3a5f;
  }

  .signature { margin-top:40px; display:flex; justify-content:flex-end; }
  .sig-block { text-align:center; width:220px; }
  .sig-block .sig-title { font-size:9pt; font-weight:700; color:#002f59; }
  .sig-block .sig-name  { font-size:8.5pt; color:#374151; margin-top:4px; }
  .sig-line { border-top:1px solid #cbd5e1; margin:40px 10px 6px; }

  .footer {
    position:fixed; bottom:0; left:0; right:0;
    border-top:1px solid #e2e8f0; padding:8px 32px;
    font-size:7.5pt; color:#94a3b8; display:flex; justify-content:space-between;
  }
  .accent { color:#ff7631; }
</style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <div>
      <div class="company-name">{{ $company->name }}</div>
      @if($company->legal_name && $company->legal_name !== $company->name)
        <div class="company-sub">{{ $company->legal_name }}</div>
      @endif
      @if($company->address)
        <div class="company-sub">{{ $company->address }}@if($company->city), {{ $company->city }}@endif</div>
      @endif
    </div>
    <div style="text-align:right">
      <div class="ref-badge">Réf : {{ $ref }}</div>
      <div class="ref-date">Dakar, le {{ $date }}</div>
    </div>
  </div>
  <div class="header-title">ATTESTATION DE TRAVAIL</div>
</div>

<div class="body">

  <p class="intro">
    Nous soussignés, <strong>{{ $company->name }}</strong>
    @if($company->address), sis à {{ $company->address }}@endif,
    attestons par la présente que :
  </p>

  <div class="info-box">
    <h3>Informations sur l'agent</h3>
    <table class="info">
      <tr>
        <td>Matricule</td>
        <td><strong style="font-family:monospace;font-size:11pt;color:#002f59;">{{ $employee->employee_number }}</strong></td>
      </tr>
      <tr>
        <td>Nom &amp; prénom</td>
        <td>{{ strtoupper($employee->last_name) }} {{ $employee->first_name }}</td>
      </tr>
      @if($employee->fonction)
      <tr>
        <td>Fonction</td>
        <td>{{ $employee->fonction }}</td>
      </tr>
      @endif
      @if($employee->categorie_emploi)
      <tr>
        <td>Catégorie</td>
        <td>{{ $employee->categorie_emploi }}</td>
      </tr>
      @endif
      @if($employee->hire_date)
      <tr>
        <td>Date de prise de service</td>
        <td>{{ \Carbon\Carbon::parse($employee->hire_date)->translatedFormat('d F Y') }}</td>
      </tr>
      @endif
      @if($employee->organisationUnit)
      <tr>
        <td>Direction / Service</td>
        <td>{{ $employee->organisationUnit->libelle }}</td>
      </tr>
      @endif
    </table>
  </div>

  <p class="mention">
    est bien agent de notre structure depuis le
    <strong>{{ \Carbon\Carbon::parse($employee->hire_date)->translatedFormat('d F Y') }}</strong>
    et occupe actuellement le poste de <strong>{{ $employee->fonction ?? 'N/A' }}</strong>.
    <br><br>
    La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
  </p>

  <div class="usage-box">
    📋 Cette attestation est établie à la demande de l'agent et lui est remise pour faire valoir ses droits auprès de tout organisme qui le requiert.
  </div>

  <div class="signature">
    <div class="sig-block">
      <div class="sig-title">Le Directeur des Ressources Humaines</div>
      <div class="sig-line"></div>
      <div class="sig-name">{{ $company->name }}</div>
    </div>
  </div>

</div>

<div class="footer">
  <span>{{ $company->name }} <span class="accent">—</span> Plateforme RH NiidPro</span>
  <span>Document généré le {{ $date }} <span class="accent">·</span> Réf : {{ $ref }}</span>
</div>

</body>
</html>
