<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Enrôlement validé</title>
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
  .banner { background: #ECFDF5; border-bottom: 3px solid #10B981; padding: 20px 40px; display: flex; align-items: center; gap: 14px; }
  .banner-icon { width: 44px; height: 44px; background: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 22px; line-height: 1; }
  .banner-text strong { display: block; font-size: 17px; color: #065F46; font-weight: 800; }
  .banner-text span   { font-size: 13px; color: #047857; }

  /* ── Body ── */
  .body { padding: 36px 40px; }
  .greeting { font-size: 16px; color: #1E293B; margin-bottom: 16px; line-height: 1.6; }
  .greeting strong { color: #002f59; }
  .intro { font-size: 14.5px; color: #475569; line-height: 1.7; margin-bottom: 24px; }

  /* Info table */
  .info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #002f59; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; }
  .info-box h3 { font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 14px; }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table tr + tr td { border-top: 1px solid #E2E8F0; }
  .info-table td { padding: 9px 0; font-size: 14px; color: #374151; vertical-align: top; }
  .info-table td:first-child { font-weight: 700; color: #002f59; width: 170px; padding-right: 12px; }

  /* Next steps */
  .steps-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; }
  .steps-box h3 { font-size: 13px; font-weight: 700; color: #1D4ED8; margin-bottom: 12px; }
  .steps-box p  { font-size: 14px; color: #1E3A5F; line-height: 1.7; }

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
    <div class="banner-icon">✓</div>
    <div class="banner-text">
      <strong>Enrôlement validé</strong>
      <span>Votre dossier a été approuvé par le service RH</span>
    </div>
  </div>

  {{-- ── Body ── --}}
  <div class="body">

    <p class="greeting">
      Bonjour <strong>{{ $enrollment->first_name }} {{ $enrollment->last_name }}</strong>,
    </p>

    <p class="intro">
      Nous avons le plaisir de vous informer que votre demande d'enrôlement a été
      <strong>validée</strong> avec succès par le responsable des Ressources Humaines
      de <strong>{{ $companyName }}</strong>.<br><br>
      Votre fiche agent est maintenant <strong style="color:#059669">active</strong>
      dans notre système de gestion RH.
    </p>

    {{-- Info agent ── --}}
    <div class="info-box">
      <h3>Récapitulatif de votre dossier</h3>
      <table class="info-table">
        <tr>
          <td>Matricule</td>
          <td><strong style="font-family:monospace; color:#002f59; font-size:15px;">{{ $enrollment->matricule }}</strong></td>
        </tr>
        <tr>
          <td>Nom complet</td>
          <td>{{ $enrollment->first_name }} {{ $enrollment->last_name }}</td>
        </tr>
        <tr>
          <td>Fonction</td>
          <td>{{ $enrollment->fonction }}</td>
        </tr>
        @if($enrollment->date_embauche)
        <tr>
          <td>Date d'embauche</td>
          <td>{{ \Carbon\Carbon::parse($enrollment->date_embauche)->translatedFormat('d F Y') }}</td>
        </tr>
        @endif
        @if($enrollment->categorie_emploi)
        <tr>
          <td>Catégorie</td>
          <td>{{ $enrollment->categorie_emploi }}</td>
        </tr>
        @endif
      </table>
    </div>

    {{-- Prochaines étapes ── --}}
    <div class="steps-box">
      <h3>🎉 Prochaines étapes</h3>
      <p>
        Vous pouvez dès à présent vous rapprocher du service RH pour :
        <br>• Obtenir vos identifiants d'accès à la plateforme
        <br>• Consulter vos bulletins de paie et congés
        <br>• Compléter votre profil si nécessaire
      </p>
    </div>

    <p class="note">
      Pour toute question, veuillez contacter directement le service des Ressources Humaines
      de {{ $companyName }}.
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
