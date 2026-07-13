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
  .badge { display:inline-block; background:#ECFDF5; border:1px solid #A7F3D0; color:#059669; padding:6px 18px; border-radius:20px; font-weight:700; font-size:14px; margin-bottom:20px; }
  .info { background:#F8FAFC; border-left:4px solid #002f59; border-radius:4px; padding:16px 20px; margin:20px 0; }
  .info table { width:100%; border-collapse:collapse; }
  .info td { padding:4px 0; font-size:14px; color:#374151; }
  .info td:first-child { font-weight:700; color:#002f59; width:160px; }
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
    <div class="badge">✓ Enrôlement validé</div>
    <p>Nous avons le plaisir de vous informer que votre demande d'enrôlement a été <strong>validée</strong> par le responsable RH.</p>
    <p>Votre fiche agent est maintenant active dans notre système :</p>
    <div class="info">
      <table>
        <tr><td>Matricule :</td><td>{{ $enrollment->matricule }}</td></tr>
        <tr><td>Nom complet :</td><td>{{ $enrollment->first_name }} {{ $enrollment->last_name }}</td></tr>
        <tr><td>Fonction :</td><td>{{ $enrollment->fonction }}</td></tr>
        <tr><td>Date d'embauche :</td><td>{{ \Carbon\Carbon::parse($enrollment->date_embauche)->format('d/m/Y') }}</td></tr>
      </table>
    </div>
    <p>Vous pouvez désormais accéder à votre espace personnel sur la plateforme.</p>
    <p style="color:#64748B; font-size:13px;">Si vous avez des questions, veuillez contacter le service RH.</p>
  </div>
  <div class="footer">Ce message est généré automatiquement — Plateforme RH ANASER</div>
</div>
</body>
</html>
