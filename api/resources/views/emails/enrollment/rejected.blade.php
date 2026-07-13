<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background:#f4f6f8; margin:0; padding:0; }
  .wrap { max-width:600px; margin:30px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }
  .header { background:#002f59; padding:28px 32px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:22px; letter-spacing:.5px; }
  .header p  { color:#ff7631; margin:6px 0 0; font-size:13px; }
  .body { padding:32px; }
  .badge { display:inline-block; background:#FEF2F2; border:1px solid #FECACA; color:#DC2626; padding:6px 18px; border-radius:20px; font-weight:700; font-size:14px; margin-bottom:20px; }
  .reason { background:#FFF7ED; border-left:4px solid #ff7631; border-radius:4px; padding:16px 20px; margin:20px 0; font-size:14px; color:#374151; }
  .steps { background:#EFF6FF; border-radius:6px; padding:16px 20px; margin:20px 0; }
  .steps ol { margin:8px 0 0; padding-left:20px; font-size:14px; color:#374151; line-height:1.8; }
  .footer { background:#F8FAFC; padding:18px 32px; text-align:center; font-size:12px; color:#94A3B8; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>ANASER — Plateforme RH</h1>
    <p>Système de Gestion des Ressources Humaines</p>
  </div>
  <div class="body">
    <p>Bonjour <strong>{{ $enrollment->first_name }} {{ $enrollment->last_name }}</strong>,</p>
    <div class="badge">⚠ Modifications requises</div>
    <p>Votre demande d'enrôlement a été examinée par le responsable RH. Des <strong>corrections sont nécessaires</strong> avant de pouvoir valider votre dossier.</p>
    <div class="reason">
      <strong style="display:block; margin-bottom:6px; color:#DC2626;">Motif de rejet :</strong>
      {{ $enrollment->rejection_reason }}
    </div>
    <div class="steps">
      <strong style="color:#002f59;">Comment procéder :</strong>
      <ol>
        <li>Scannez à nouveau le QR code d'enrôlement</li>
        <li>Corrigez les informations signalées ci-dessus</li>
        <li>Soumettez à nouveau votre formulaire</li>
      </ol>
    </div>
    <p style="color:#64748B; font-size:13px;">Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le service RH directement.</p>
  </div>
  <div class="footer">Ce message est généré automatiquement — Plateforme RH ANASER</div>
</div>
</body>
</html>
