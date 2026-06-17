<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 10pt; color: #1a1a2e; background: #fff; }

  /* ─── Header ──────────────────────────────────────────────── */
  .header {
    background: linear-gradient(135deg, #1B4B8A 0%, #2563EB 100%);
    color: #fff;
    padding: 22px 32px 18px;
    border-radius: 0 0 8px 8px;
    margin-bottom: 28px;
  }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .company-name { font-size: 18pt; font-weight: 700; letter-spacing: 0.5px; }
  .company-sub  { font-size: 8pt; opacity: .8; margin-top: 2px; }
  .doc-ref { text-align: right; }
  .doc-ref .ref-badge {
    background: rgba(255,255,255,.2);
    border: 1px solid rgba(255,255,255,.4);
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .doc-ref .ref-date { font-size: 7.5pt; opacity: .7; margin-top: 4px; }
  .header-title {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,.25);
    font-size: 13pt;
    font-weight: 700;
    letter-spacing: 0.3px;
    text-align: center;
  }

  /* ─── Body ────────────────────────────────────────────────── */
  .body { padding: 0 32px; }

  /* ─── Sections ────────────────────────────────────────────── */
  .section { margin-bottom: 20px; }
  .section-title {
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #2563EB;
    border-bottom: 1.5px solid #DBEAFE;
    padding-bottom: 4px;
    margin-bottom: 12px;
  }

  /* ─── Grid ─────────────────────────────────────────────────── */
  .grid-2 { display: table; width: 100%; border-collapse: collapse; }
  .grid-2 .col { display: table-cell; width: 50%; vertical-align: top; padding-right: 16px; }
  .grid-2 .col:last-child { padding-right: 0; padding-left: 16px; }
  .grid-3 { display: table; width: 100%; border-collapse: collapse; }
  .grid-3 .col { display: table-cell; width: 33.33%; vertical-align: top; padding-right: 12px; }
  .grid-3 .col:last-child { padding-right: 0; }

  /* ─── Field ─────────────────────────────────────────────────── */
  .field { margin-bottom: 10px; }
  .field-label { font-size: 7.5pt; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .field-value { font-size: 10pt; color: #0F172A; font-weight: 500; }
  .field-value.large { font-size: 11.5pt; font-weight: 700; }
  .field-value.accent { color: #2563EB; font-weight: 700; }

  /* ─── Highlighted box ─────────────────────────────────────── */
  .highlight-box {
    background: #F0F9FF;
    border: 1.5px solid #BAE6FD;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 18px;
  }
  .highlight-box .hb-label { font-size: 7.5pt; color: #0369A1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; }
  .highlight-box .hb-value { font-size: 14pt; font-weight: 800; color: #0F172A; margin-top: 2px; }
  .highlight-box .hb-sub   { font-size: 8pt; color: #475569; margin-top: 2px; }

  /* ─── Type badge ────────────────────────────────────────────── */
  .type-badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 10pt;
    font-weight: 800;
    letter-spacing: 0.5px;
  }
  .type-CDI         { background: #ECFDF5; color: #059669; border: 1.5px solid #059669; }
  .type-CDD         { background: #FFFBEB; color: #D97706; border: 1.5px solid #D97706; }
  .type-DECRET      { background: #EFF6FF; color: #1B4B8A; border: 1.5px solid #1B4B8A; }
  .type-DETACHEMENT { background: #F5F3FF; color: #7C3AED; border: 1.5px solid #7C3AED; }
  .type-Stage       { background: #FDF2F8; color: #EC4899; border: 1.5px solid #EC4899; }
  .type-Alternance  { background: #F0FDFA; color: #0D9488; border: 1.5px solid #0D9488; }
  .type-Prestation  { background: #F0F9FF; color: #0284C7; border: 1.5px solid #0284C7; }
  .type-Autre       { background: #F1F5F9; color: #64748B; border: 1.5px solid #94A3B8; }

  /* ─── Status ─────────────────────────────────────────────── */
  .status-active   { background: #ECFDF5; color: #059669; border: 1.5px solid #059669; border-radius: 20px; display: inline-block; padding: 2px 12px; font-size: 9pt; font-weight: 700; }
  .status-inactive { background: #F8FAFC; color: #64748B; border: 1.5px solid #CBD5E1; border-radius: 20px; display: inline-block; padding: 2px 12px; font-size: 9pt; font-weight: 700; }

  /* ─── Notes ──────────────────────────────────────────────── */
  .notes-box {
    background: #FFFBEB;
    border-left: 3px solid #F59E0B;
    border-radius: 0 6px 6px 0;
    padding: 10px 14px;
    font-size: 9.5pt;
    color: #334155;
    line-height: 1.5;
  }

  /* ─── Signatures ─────────────────────────────────────────── */
  .signatures {
    margin-top: 30px;
    padding-top: 18px;
    border-top: 1px dashed #CBD5E1;
  }
  .sig-grid { display: table; width: 100%; }
  .sig-col { display: table-cell; width: 50%; text-align: center; padding: 0 20px; }
  .sig-label { font-size: 9pt; font-weight: 700; color: #334155; margin-bottom: 6px; }
  .sig-line {
    border-bottom: 1.5px solid #334155;
    height: 50px;
    margin: 0 auto;
    width: 80%;
  }
  .sig-sub { font-size: 8pt; color: #94A3B8; margin-top: 6px; }

  /* ─── Footer ─────────────────────────────────────────────── */
  .footer {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1px solid #E2E8F0;
    text-align: center;
    font-size: 7.5pt;
    color: #94A3B8;
  }

  /* ─── Divider ─────────────────────────────────────────────── */
  .divider { border: none; border-top: 1px solid #E2E8F0; margin: 18px 0; }

  /* ─── Progress bar ───────────────────────────────────────── */
  .progress-wrap { background: #F1F5F9; border-radius: 4px; height: 7px; margin-top: 6px; overflow: hidden; }
  .progress-bar  { height: 7px; border-radius: 4px; }

  /* ─── Watermark ──────────────────────────────────────────── */
  @if (!$contract->is_active)
  .watermark {
    position: fixed;
    top: 42%;
    left: 15%;
    font-size: 64pt;
    font-weight: 900;
    color: rgba(220, 38, 38, 0.08);
    transform: rotate(-35deg);
    letter-spacing: 4px;
    z-index: 0;
    pointer-events: none;
  }
  @endif
</style>
</head>
<body>

@if(!$contract->is_active)
<div class="watermark">CLÔTURÉ</div>
@endif

{{-- ─── Header ─────────────────────────────────────────────────── --}}
<div class="header">
  <div class="header-top">
    <div>
      <div class="company-name">{{ strtoupper($companyName) }}</div>
      <div class="company-sub">Direction des Ressources Humaines</div>
    </div>
    <div class="doc-ref">
      <div class="ref-badge">N° {{ $contract->employee?->employee_number ?? '—' }}-{{ sprintf('%04d', $contract->id) }}</div>
      <div class="ref-date">Édité le {{ now()->locale('fr')->isoFormat('D MMMM YYYY') }}</div>
    </div>
  </div>
  <div class="header-title">
    CONTRAT DE TRAVAIL &nbsp;—&nbsp;
    @php
      $labels = [
        'CDI' => 'DURÉE INDÉTERMINÉE',
        'CDD' => 'DURÉE DÉTERMINÉE',
        'DECRET' => 'NOMINATION PAR DÉCRET',
        'DETACHEMENT' => 'DÉTACHEMENT',
        'Stage' => 'STAGE',
        'Alternance' => 'ALTERNANCE',
        'Prestation' => 'PRESTATION DE SERVICE',
        'Autre' => 'AUTRE',
      ];
      echo $labels[$contract->type] ?? strtoupper($contract->type);
    @endphp
  </div>
</div>

<div class="body">

  {{-- ─── Type + statut ─────────────────────────────────────── --}}
  <div style="text-align:center; margin-bottom: 22px;">
    <span class="type-badge type-{{ $contract->type }}">{{ $contract->type }}</span>
    &nbsp;&nbsp;
    <span class="{{ $contract->is_active ? 'status-active' : 'status-inactive' }}">
      {{ $contract->is_active ? 'Actif' : 'Clôturé' }}
    </span>
  </div>

  {{-- ─── Parties au contrat ─────────────────────────────────── --}}
  <div class="section">
    <div class="section-title">Parties au contrat</div>
    <div class="grid-2">
      <div class="col">
        <div class="field">
          <div class="field-label">Employeur</div>
          <div class="field-value large">{{ $companyName }}</div>
        </div>
        <div class="field">
          <div class="field-label">Représenté par</div>
          <div class="field-value">Direction des Ressources Humaines</div>
        </div>
      </div>
      <div class="col">
        <div class="field">
          <div class="field-label">Nom complet</div>
          <div class="field-value large">{{ $employee->last_name }} {{ $employee->first_name }}</div>
        </div>
        <div class="field">
          <div class="field-label">Matricule</div>
          <div class="field-value accent">{{ $employee->employee_number ?? '—' }}</div>
        </div>
        @if($employee->national_id)
        <div class="field">
          <div class="field-label">Pièce d'identité</div>
          <div class="field-value">{{ $employee->national_id }}</div>
        </div>
        @endif
      </div>
    </div>
  </div>

  {{-- ─── Informations sur le poste ──────────────────────────── --}}
  <div class="section">
    <div class="section-title">Poste et affectation</div>
    <div class="grid-3">
      <div class="col">
        <div class="field">
          <div class="field-label">Poste occupé</div>
          <div class="field-value">{{ $employee->position?->name ?? '—' }}</div>
        </div>
      </div>
      <div class="col">
        <div class="field">
          <div class="field-label">Direction / Service</div>
          <div class="field-value">{{ $employee->department?->name ?? '—' }}</div>
        </div>
      </div>
      <div class="col">
        <div class="field">
          <div class="field-label">Date d'embauche</div>
          <div class="field-value">
            {{ $employee->hire_date ? \Carbon\Carbon::parse($employee->hire_date)->locale('fr')->isoFormat('D MMM YYYY') : '—' }}
          </div>
        </div>
      </div>
    </div>
  </div>

  {{-- ─── Conditions du contrat ──────────────────────────────── --}}
  <div class="section">
    <div class="section-title">Conditions du contrat</div>
    <div class="grid-2">
      <div class="col">
        <div class="highlight-box">
          <div class="hb-label">Rémunération mensuelle brute</div>
          <div class="hb-value">
            {{ $contract->salary ? number_format($contract->salary, 0, ',', ' ') . ' FCFA' : 'À définir' }}
          </div>
          <div class="hb-sub">Salaire de base · hors primes et avantages</div>
        </div>
      </div>
      <div class="col">
        <div class="highlight-box">
          <div class="hb-label">Durée hebdomadaire de travail</div>
          <div class="hb-value">{{ $contract->working_hours_per_week ?? 40 }} heures</div>
          <div class="hb-sub">Répartition selon le règlement intérieur</div>
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="col">
        <div class="field">
          <div class="field-label">Date de début</div>
          <div class="field-value accent">
            {{ \Carbon\Carbon::parse($contract->start_date)->locale('fr')->isoFormat('D MMMM YYYY') }}
          </div>
        </div>
        @if($contract->end_date)
        <div class="field">
          <div class="field-label">Date de fin</div>
          <div class="field-value" style="color:#D97706; font-weight:700;">
            {{ \Carbon\Carbon::parse($contract->end_date)->locale('fr')->isoFormat('D MMMM YYYY') }}
          </div>
        </div>
        @else
        <div class="field">
          <div class="field-label">Date de fin</div>
          <div class="field-value" style="color:#64748B;">Indéterminée (CDI)</div>
        </div>
        @endif
      </div>
      <div class="col">
        @if($contract->trial_period_end)
        <div class="field">
          <div class="field-label">Fin de période d'essai</div>
          <div class="field-value">
            {{ \Carbon\Carbon::parse($contract->trial_period_end)->locale('fr')->isoFormat('D MMMM YYYY') }}
          </div>
        </div>
        @endif
        @if($contract->end_date)
        @php
          $start   = \Carbon\Carbon::parse($contract->start_date);
          $end     = \Carbon\Carbon::parse($contract->end_date);
          $elapsed = max(0, min(100, round(now()->diffInDays($start, false) / max(1, $end->diffInDays($start)) * -100)));
          $barColor = $elapsed >= 80 ? '#DC2626' : ($elapsed >= 60 ? '#D97706' : '#059669');
        @endphp
        <div class="field">
          <div class="field-label">Avancement ({{ $elapsed }}% écoulé)</div>
          <div class="progress-wrap">
            <div class="progress-bar" style="width:{{ $elapsed }}%; background:{{ $barColor }};"></div>
          </div>
        </div>
        @endif
      </div>
    </div>
  </div>

  {{-- ─── Notes / Clauses ─────────────────────────────────────── --}}
  @if($contract->notes)
  <div class="section">
    <div class="section-title">Observations et clauses particulières</div>
    <div class="notes-box">{{ $contract->notes }}</div>
  </div>
  @endif

  {{-- ─── Signatures ──────────────────────────────────────────── --}}
  <div class="signatures">
    <div class="sig-grid">
      <div class="sig-col">
        <div class="sig-label">Pour l'Employeur</div>
        <div class="sig-line"></div>
        <div class="sig-sub">{{ $companyName }}<br>Le Directeur des Ressources Humaines</div>
      </div>
      <div class="sig-col">
        <div class="sig-label">L'Agent</div>
        <div class="sig-line"></div>
        <div class="sig-sub">{{ $employee->last_name }} {{ $employee->first_name }}<br>Lu et approuvé</div>
      </div>
    </div>
  </div>

  {{-- ─── Footer ──────────────────────────────────────────────── --}}
  <div class="footer">
    Document généré automatiquement par {{ $companyName }} · Système RH &amp; Paie ·
    {{ now()->locale('fr')->isoFormat('D MMMM YYYY [à] HH:mm') }}
    <br>Ce document est confidentiel. Toute reproduction est interdite sans autorisation préalable.
  </div>

</div>
</body>
</html>
