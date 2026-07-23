<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Demande d'enrôlement — Corrections requises</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #EEF2F7; color: #1E293B; }
  .outer { padding: 36px 16px; }
  .card  { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.10); }

  /* ── Header ── */
  .hdr { background: linear-gradient(135deg, #002f59 0%, #004080 100%); padding: 32px 40px; text-align: center; }
  .hdr img  { height: 64px; max-width: 200px; object-fit: contain; display: block; margin: 0 auto 14px; }
  .hdr-logo-text { display: inline-block; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -.5px; }
  .hdr-sub  { color: rgba(255,255,255,.65); font-size: 13px; margin-top: 6px; }

  /* ── Status banner ── */
  .banner { background: #FFF7ED; border-bottom: 3px solid #ff7631; padding: 20px 40px; display: flex; align-items: center; gap: 14px; }
  .banner-icon { width: 44px; height: 44px; background: #ff7631; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 22px; line-height: 1; }
  .banner-text strong { display: block; font-size: 17px; color: #9A3412; font-weight: 800; }
  .banner-text span   { font-size: 13px; color: #C2410C; }

  /* ── Body ── */
  .body { padding: 36px 40px; }
  .greeting { font-size: 16px; color: #1E293B; margin-bottom: 16px; line-height: 1.6; }
  .greeting strong { color: #002f59; }
  .intro { font-size: 14.5px; color: #475569; line-height: 1.7; margin-bottom: 24px; }

  /* Motif */
  .reason-box { background: #FEF2F2; border: 1px solid #FECACA; border-left: 4px solid #DC2626; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; }
  .reason-box h3 { font-size: 12px; font-weight: 700; color: #991B1B; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 10px; }
  .reason-box p  { font-size: 14.5px; color: #7F1D1D; line-height: 1.7; }

  /* Steps */
  .steps-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; }
  .steps-box h3 { font-size: 13px; font-weight: 700; color: #002f59; margin-bottom: 12px; }
  .steps-ol { padding-left: 20px; }
  .steps-ol li { font-size: 14px; color: #374151; line-height: 1.9; }
  .steps-ol li strong { color: #002f59; }

  /* Info agent */
  .info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #64748B; border-radius: 8px; padding: 16px 24px; margin-bottom: 24px; }
  .info-box h3 { font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 10px; }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table tr + tr td { border-top: 1px solid #E2E8F0; }
  .info-table td { padding: 8px 0; font-size: 13.5px; color: #374151; }
  .info-table td:first-child { font-weight: 700; color: #475569; width: 160px; }

  .note { font-size: 13px; color: #94A3B8; line-height: 1.6; }

  /* ── Footer ── */
  .ftr { background: #F1F5F9; border-top: 1px solid #E2E8F0; padding: 20px 40px; text-align: center; }
  .ftr p { font-size: 12px; color: #94A3B8; line-height: 1.6; }
  .ftr strong { color: #64748B; }
  .accent { color: #ff7631; }
</style>
</head>
<body>
<div class="outer">
<div class="card">

  {{-- ── Header ── --}}
  <div class="hdr">
    @if($logoUrl)
      <img src="{{ $logoUrl }}" alt="{{ $companyName }}">
    @else
      <span class="hdr-logo-text">{{ $companyName }}</span>
    @endif
    <div class="hdr-sub">Plateforme de Gestion des Ressources Humaines</div>
  </div>

  {{-- ── Status banner ── --}}
  <div class="banner">
    <div class="banner-icon">⚠</div>
    <div class="banner-text">
      <strong>Corrections requises</strong>
      <span>Votre demande d'enrôlement nécessite des modifications</span>
    </div>
  </div>

  {{-- ── Body ── --}}
  <div class="body">

    <p class="greeting">
      Bonjour <strong>{{ $enrollment->first_name }} {{ $enrollment->last_name }}</strong>,
    </p>

    <p class="intro">
      Le service des Ressources Humaines de <strong>{{ $companyName }}</strong> a examiné
      votre demande d'enrôlement (réf. <strong style="font-family:monospace">{{ $enrollment->matricule }}</strong>).
      <br><br>
      Après étude de votre dossier, des <strong style="color:#DC2626">corrections sont nécessaires</strong>
      avant de pouvoir finaliser votre enrôlement.
    </p>

    {{-- Motif de rejet ── --}}
    <div class="reason-box">
      <h3>🔴 Motif communiqué par le service RH</h3>
      <p>{{ $enrollment->rejection_reason }}</p>
    </div>

    {{-- Comment procéder ── --}}
    <div class="steps-box">
      <h3>📋 Comment corriger votre dossier ?</h3>
      <ol class="steps-ol">
        <li>Prenez note du motif indiqué ci-dessus</li>
        <li>Scannez à nouveau le <strong>QR code d'enrôlement</strong> fourni par votre responsable</li>
        <li>Remplissez le formulaire en corrigeant les informations concernées</li>
        <li>Soumettez votre nouvelle demande — elle sera traitée dans les meilleurs délais</li>
      </ol>
    </div>

    {{-- Rappel dossier ── --}}
    <div class="info-box">
      <h3>Référence de votre demande</h3>
      <table class="info-table">
        <tr>
          <td>Matricule</td>
          <td><span style="font-family:monospace; font-weight:700">{{ $enrollment->matricule }}</span></td>
        </tr>
        <tr>
          <td>Nom complet</td>
          <td>{{ $enrollment->first_name }} {{ $enrollment->last_name }}</td>
        </tr>
        <tr>
          <td>Email soumis</td>
          <td>{{ $enrollment->email }}</td>
        </tr>
      </table>
    </div>

    <p class="note">
      Si vous pensez qu'il s'agit d'une erreur ou si vous avez besoin d'aide,
      contactez directement le service RH de {{ $companyName }}.
    </p>

  </div>

  {{-- ── Footer ── --}}
  <div class="ftr">
    <p>
      <strong>{{ $companyName }}</strong>
      <span class="accent"> — </span>
      Plateforme RH · Message généré automatiquement
    </p>
    <p style="margin-top:6px;">Merci de ne pas répondre directement à cet email.</p>
  </div>

</div>
</div>
</body>
</html>
