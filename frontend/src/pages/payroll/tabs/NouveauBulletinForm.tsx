import React, { useState, useMemo, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Autocomplete,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  IconButton, Divider, Chip, CircularProgress, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Paper,
  InputAdornment,
} from '@mui/material';
import type { PaperProps } from '@mui/material/Paper';
import {
  Close, Save, Visibility, ReceiptLong, DragIndicator,
  CheckCircle, CalendarMonth, Tune, AccessTime, Search,
} from '@mui/icons-material';
import Draggable from 'react-draggable';
import { employeesApi, type EmployeePayeData, type IrppResult } from '../../../api/employees';
import { recruitmentApi } from '../../../api/recruitment';
import { getPayrollTemplate } from '../../../api/payrollTemplates';
import type { PayrollTemplateLine } from '../../../api/payrollTemplates';
import type { Employee, RecruitmentIndice } from '../../../types';
import BulletinViewer, { type BulletinDePaie, type BulletinLigne } from './BulletinViewer';

// ─── Drag ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DraggableAny = Draggable as React.ComponentType<any>;

function DraggablePaper(props: PaperProps) {
  return (
    <DraggableAny handle="#nouveau-bulletin-title" cancel='[class*="MuiDialogContent-root"],[class*="MuiDialogActions-root"]'>
      <Paper {...props} />
    </DraggableAny>
  );
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const NAV = '#0D2137';
const ACT = '#E85D04';
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const HDR = {
  color: '#fff', fontWeight: 700, fontSize: 10, py: 0.6, px: 0.75,
  border: '1px solid #2D4A6A', whiteSpace: 'nowrap' as const,
} as const;

const DC = { border: '1px solid #E2E8F0', py: 0.25, px: 0.5 } as const;

const KNOWN_SECTIONS: Record<string, { label: string; bg: string }> = {
  base:         { label: 'TRAITEMENT DE BASE',                         bg: '#0D2B4E' },
  augmentation: { label: 'AUGMENTATIONS ET INDEMNITÉS',                bg: '#064E3B' },
  ipress:       { label: 'I.P.R.E.S — RETRAITE',                      bg: '#3B0764' },
  ipm:          { label: 'I.P.M — INSTITUTION DE PRÉVOYANCE MALADIE', bg: '#1B4332' },
  css:          { label: 'C.S.S — CAISSE DE SÉCURITÉ SOCIALE',        bg: '#7C1D1D' },
  ir:           { label: 'I.R — IMPÔT SUR LE REVENU',                 bg: '#1E3A5F' },
  trimf:        { label: 'TRIMF — TAXE SUR REVENU',                   bg: '#78350F' },
  retenue:      { label: 'RETENUES DIVERSES',                          bg: '#4A1942' },
};

const DYNAMIC_PALETTE = [
  '#1A3A4A', '#2D1B4E', '#1A4A2D', '#4A2D1A',
  '#3A1A4A', '#4A3A1A', '#1A4A3A', '#4A1A2D',
];

function getSectionMeta(section: string): { label: string; bg: string } {
  if (KNOWN_SECTIONS[section]) return KNOWN_SECTIONS[section];
  let h = 0;
  for (let i = 0; i < section.length; i++) h = (h * 31 + section.charCodeAt(i)) & 0xffff;
  return { label: section.toUpperCase(), bg: DYNAMIC_PALETTE[h % DYNAMIC_PALETTE.length] };
}

type LigneGroup = { section: string; label: string; bg: string; items: { l: BulletinLigne; idx: number }[] };

function groupLignes(lignes: BulletinLigne[]): LigneGroup[] {
  const groups: LigneGroup[] = [];
  let cur: LigneGroup | null = null;
  lignes.forEach((l, idx) => {
    const sec = l.section ?? 'other';
    if (!cur || cur.section !== sec) {
      const meta = getSectionMeta(sec);
      cur = { section: sec, label: meta.label, bg: meta.bg, items: [] };
      groups.push(cur);
    }
    cur.items.push({ l, idx });
  });
  return groups;
}

// ─── Champ numérique (affichage seul) ─────────────────────────────────────────

function N({ value, green, red }: { value?: number | null; green?: boolean; red?: boolean }) {
  const v = Number(value ?? 0);
  const empty = !v || !isFinite(v);
  return (
    <Typography sx={{
      fontSize: 10.5, fontFamily: 'monospace', textAlign: 'right', pr: 0.5,
      color: !empty ? (green ? '#059669' : red ? '#DC2626' : '#1E293B') : '#CBD5E1',
      fontWeight: !empty ? 600 : 400,
    }}>
      {!empty ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v) : '—'}
    </Typography>
  );
}

// ─── Label de champ ───────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#64748B', mb: 0.4, lineHeight: 1 }}>
      {children}
    </Typography>
  );
}

// ─── Convertit une ligne de template ────────────────────────────────────────

function templateLineToBulletinLigne(l: PayrollTemplateLine): BulletinLigne {
  return {
    rubrique:         l.libelle,
    section:          l.type,
    nombre:           l.nombre     !== 1    ? l.nombre     : null,
    base_calcul:      l.base_calcul !== 0   ? l.base_calcul : null,
    gain:             l.gain       !== 0    ? l.gain       : null,
    taux_salarial:    l.taux_salarial !== 0 ? l.taux_salarial : null,
    montant_salarial: l.retenu_salarial !== 0 ? l.retenu_salarial : null,
    taux_patronal:    l.taux_patronal !== 0 ? l.taux_patronal : null,
    montant_patronal: l.retenu_patronal !== 0 ? l.retenu_patronal : null,
  };
}

// ─── Applique l'indice sur les lignes ────────────────────────────────────────

function applyIndiceToLignes(
  lignes: BulletinLigne[],
  indice: RecruitmentIndice,
  templateLines: PayrollTemplateLine[],
): BulletinLigne[] {
  return lignes.map((l, idx) => {
    const tl = templateLines[idx];
    if (!tl) return l;

    if (tl.type === 'base') {
      const lib   = tl.libelle.toLowerCase();
      const solde = indice.solde_mensuelle ?? 0;

      // Complément spécial de solde & Indemnité de résidence : gain = base_calcul% × solde indiciaire
      if (solde > 0 && tl.base_calcul > 0 && (
        lib.includes('complément spécial') || lib.includes('complement special') ||
        lib.includes('indemnité de résidence') || lib.includes('indemnite de residence')
      )) {
        return { ...l, gain: Math.round(tl.base_calcul * solde / 100) };
      }

      // Solde mensuel indiciaire : gain = solde_mensuelle
      return {
        ...l,
        gain: indice.solde_mensuelle ?? null,
        base_calcul: l.base_calcul ?? (indice.valeur ?? null),
      };
    }

    if (tl.type === 'augmentation' && tl.rubrique_id && indice.augmentations) {
      const aug = indice.augmentations.find(a => a.id === tl.rubrique_id);
      if (aug) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pivotMontant = (aug as any).pivot?.montant;
        return { ...l, gain: pivotMontant ?? l.gain };
      }
    }

    return l;
  });
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (b: BulletinDePaie) => void;
}

export default function NouveauBulletinForm({ open, onClose, onSaved }: Props) {
  const now = new Date();
  const navigate = useNavigate();
  const [mois,       setMois]       = useState(now.getMonth() + 1);
  const [annee,      setAnnee]      = useState(now.getFullYear());
  const [empSel,     setEmpSel]     = useState<Employee | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [indiceCode, setIndiceCode] = useState('');
  const [coupure,    setCoupure]    = useState(0);
  const [heures,     setHeures]     = useState(0);
  const [heuresSup,  setHeuresSup]  = useState(0);
  const [montantSup, setMontantSup] = useState(0);
  const [lignes,     setLignes]     = useState<BulletinLigne[]>([]);
  const [rawLines,   setRawLines]   = useState<PayrollTemplateLine[]>([]);
  const [preview,    setPreview]    = useState<BulletinDePaie | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [noModelDlg, setNoModelDlg] = useState(false);

  // ── Données distantes ────────────────────────────────────────────────────────

  const { data: employees = [], isLoading: loadEmp } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ page: 1, per_page: 500 }).then(r => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Employee[];
    }),
  });

  const { data: templateDetail, isLoading: loadTemplate } = useQuery({
    queryKey: ['payroll-template-detail', templateId],
    queryFn: () => getPayrollTemplate(templateId!),
    enabled: templateId !== null,
  });

  const empIndiceId = (empSel as Employee & { indice_id?: number | null })?.indice_id ?? null;
  const { data: empIndice, isLoading: loadIndice } = useQuery<RecruitmentIndice>({
    queryKey: ['indice-detail', empIndiceId],
    queryFn: () => recruitmentApi.getIndices().then(r =>
      (r.data as RecruitmentIndice[]).find(i => i.id === empIndiceId)!
    ),
    enabled: empIndiceId !== null,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['payroll-templates'],
    queryFn: () => import('../../../api/payrollTemplates').then(m => m.getPayrollTemplates()),
  });

  const { data: agentPayeData } = useQuery<EmployeePayeData>({
    queryKey: ['employee-paye-data', empSel?.id],
    queryFn:  () => employeesApi.payeData(empSel!.id).then(r => r.data),
    enabled:  !!empSel,
  });

  const { data: hSupData } = useQuery<{ nbr_heure_sup: number; montant_heure_sup: number }>({
    queryKey: ['employee-heures-sup', empSel?.id, mois, annee],
    queryFn:  () => employeesApi.heuresSup(empSel!.id, mois, annee).then(r => r.data),
    enabled:  !!empSel,
  });

  const { data: hCoupData } = useQuery<{ nbr_heure_coupure: number }>({
    queryKey: ['employee-heures-coupure', empSel?.id, mois, annee],
    queryFn:  () => employeesApi.heuresCoupure(empSel!.id, mois, annee).then(r => r.data),
    enabled:  !!empSel,
  });

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!templateDetail?.lines) return;
    const lines = templateDetail.lines;
    setRawLines(lines);
    const converted = lines.map(templateLineToBulletinLigne);
    setLignes(empIndice ? applyIndiceToLignes(converted, empIndice, lines) : converted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateDetail]);

  useEffect(() => {
    if (!empIndice || rawLines.length === 0) return;
    setIndiceCode(empIndice.garde ? `${empIndice.garde} — ${empIndice.code}` : empIndice.code);
    setLignes(prev => applyIndiceToLignes(prev, empIndice, rawLines));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empIndice]);

  useEffect(() => {
    if (!hSupData) return;
    setHeuresSup(hSupData.nbr_heure_sup);
    setMontantSup(hSupData.montant_heure_sup);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hSupData]);

  useEffect(() => {
    if (!hCoupData) return;
    setHeures(hCoupData.nbr_heure_coupure);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hCoupData]);

  const handleEmpChange = (emp: Employee | null) => {
    setEmpSel(emp);
    setNoModelDlg(false);
    if (!emp) { setTemplateId(null); setIndiceCode(''); setLignes([]); setRawLines([]); setHeures(0); setHeuresSup(0); setMontantSup(0); setCoupure(0); return; }
    const tid = (emp as Employee & { payroll_template_id?: number | null }).payroll_template_id ?? null;
    setTemplateId(tid);
    const ind = (emp as Employee & { indice?: RecruitmentIndice }).indice;
    if (ind) setIndiceCode(ind.garde ? `${ind.garde} — ${ind.code}` : ind.code);
    if (!tid) setNoModelDlg(true);
  };

  // ── Lignes sans doublons (même libellé normalisé → on garde la 1ʳᵉ occurrence) ──

  const displayLignes = useMemo(() => {
    const seen = new Set<string>();
    return lignes.filter(l => {
      // Supprimer les lignes "Solde indiciaire" dupliquées dans AUGMENTATIONS
      if (l.section === 'augmentation') {
        const lib = l.rubrique.toLowerCase();
        if (lib.includes('solde') && lib.includes('indiciaire')) return false;
      }
      // Déduplication par libellé normalisé
      const key = l.rubrique.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [lignes]);

  // ── Phase 1 : brSocial + indemnités (indépendant d'irppData) ───────────────

  const bruts = useMemo(() => {
    let brut = 0, salaireBase = 0, brSocial = 0, indemRisquesSante = 0, transport = 0;
    for (const l of displayLignes) {
      if (!l.is_section && !l.is_total) {
        const gain = Number(l.gain) || 0;
        brut += gain;
        if (l.section === 'base') salaireBase += gain;
        if (l.section === 'base' || l.section === 'augmentation') brSocial += gain;
        const lib = l.rubrique.toLowerCase();
        if (lib.includes('risque') && lib.includes('sant')) indemRisquesSante = gain;
        if (lib.includes('transport'))                       transport         = gain;
      }
    }
    return { brut, salaireBase, brSocial, indemRisquesSante, transport };
  }, [displayLignes]);

  // ── Calcul IRPP / TRIMF (appel API barème dès que le brut social est connu) ─

  const { data: irppData } = useQuery<IrppResult>({
    queryKey: ['irpp', empSel?.id, bruts.brSocial, bruts.indemRisquesSante, bruts.transport],
    queryFn:  () => employeesApi.calculIrpp(empSel!.id, {
      sal_brut_social:    Math.round(bruts.brSocial),
      indem_risque_sante: Math.round(bruts.indemRisquesSante),
      transport:          Math.round(bruts.transport),
    }).then(r => r.data),
    enabled:   !!empSel && bruts.brSocial > 0,
    staleTime: 10_000,
  });

  // ── Phase 2 : totaux complets — IR/TRIMF calculés inline comme IPRESS ──────

  const totaux = useMemo(() => {
    const { brut, salaireBase, brSocial, indemRisquesSante } = bruts;
    const baseIPRES = brSocial - indemRisquesSante;
    let retSal = 0, retPat = 0;
    for (const l of displayLignes) {
      if (!l.is_section && !l.is_total) {
        if (l.section === 'ipress' && baseIPRES > 0) {
          retSal += Math.round(baseIPRES * (Number(l.taux_salarial) || 0) / 100);
          retPat += Math.round(baseIPRES * (Number(l.taux_patronal) || 0) / 100);
        } else if (l.section === 'css' && brSocial > 0) {
          retSal += Math.round(brSocial * (Number(l.taux_salarial) || 0) / 100);
          retPat += Math.round(brSocial * (Number(l.taux_patronal) || 0) / 100);
        } else if (l.section === 'ir' && irppData) {
          retSal += irppData.impo_sur_revn;
        } else if (l.section === 'trimf' && irppData) {
          retSal += irppData.trinf;
        } else {
          retSal += Number(l.montant_salarial) || 0;
          retPat += Number(l.montant_patronal) || 0;
        }
      }
    }
    const salaireRef = displayLignes.find(l => l.rubrique.toLowerCase().includes('solde mensuelle'))?.gain ?? 0;
    const netImposable = brut - retSal;
    return { brut, retSal, retPat, netImposable, salaireRef, salaireBase, brSocial, baseIPRES, salaireTotal: brut + retPat, netAPayer: brut - retSal };
  }, [displayLignes, bruts, irppData]);

  const buildBulletin = (): BulletinDePaie => ({
    employee_id: empSel!.id,
    matricule:   empSel!.employee_number,
    employee_name: `${empSel!.first_name} ${empSel!.last_name}`,
    mois, annee,
    modele_name: templateDetail?.name ?? '—',
    indice_code: indiceCode || '—',
    montant_coupure: coupure, heures_non_travaillees: heures,
    heures_supplementaires: heuresSup || undefined,
    montant_heures_sup: montantSup || undefined,
    lignes: lignes.map(l => {
      if (l.section === 'ipress' && totaux.baseIPRES) {
        return {
          ...l,
          base_calcul:      totaux.baseIPRES,
          montant_salarial: l.taux_salarial ? Math.round(totaux.baseIPRES * l.taux_salarial / 100) : l.montant_salarial,
          montant_patronal: l.taux_patronal ? Math.round(totaux.baseIPRES * l.taux_patronal / 100) : l.montant_patronal,
        };
      }
      if (l.section === 'css' && totaux.brSocial) {
        return {
          ...l,
          base_calcul:      totaux.brSocial,
          montant_salarial: l.taux_salarial ? Math.round(totaux.brSocial * l.taux_salarial / 100) : l.montant_salarial,
          montant_patronal: l.taux_patronal ? Math.round(totaux.brSocial * l.taux_patronal / 100) : l.montant_patronal,
        };
      }
      if (l.section === 'ir' && irppData) {
        return { ...l, base_calcul: irppData.montant_irpp, montant_salarial: irppData.impo_sur_revn };
      }
      if (l.section === 'trimf' && irppData) {
        return { ...l, montant_salarial: irppData.trinf };
      }
      return l;
    }),
    salaire_base:       totaux.salaireBase,
    charges_salariales: totaux.retSal,
    charges_patronales: totaux.retPat,
    net_imposable:      totaux.netImposable,
    salaire_reference:  totaux.salaireRef,
    salaire_total:      totaux.salaireTotal,
    net_a_payer:        totaux.netAPayer,
    status: 'draft',
  });

  const handlePreview = () => empSel && setPreview(buildBulletin());

  const handleSave = async () => {
    if (!empSel) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    onSaved?.(buildBulletin());
    onClose();
  };

  const fmt = (v: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v);

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        PaperComponent={DraggablePaper}
        PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '94vh' } }}
      >
        {/* ══ 1. Barre de titre (handle drag) ══════════════════════════════════ */}
        <DialogTitle
          id="nouveau-bulletin-title"
          sx={{
            background: 'linear-gradient(135deg, #060F1A 0%, #0D2137 55%, #142F50 100%)',
            p: 0, flexShrink: 0, cursor: 'move',
            borderBottom: '3px solid #E85D04',
            boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
          }}
        >
          <Stack direction="row" alignItems="center" gap={2} px={2} py={0.9}>

            {/* Icône encadrée */}
            <Box sx={{
              width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
              background: 'linear-gradient(135deg, #E85D04, #C2410C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(232,93,4,0.4)',
            }}>
              <ReceiptLong sx={{ color: '#fff', fontSize: 22 }} />
            </Box>

            {/* Titre + sous-titre */}
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <DragIndicator sx={{ color: '#4A6FA5', fontSize: 15 }} />
                <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: 0.8, lineHeight: 1 }}>
                  NOUVEAU BULLETIN DE PAIE
                </Typography>
              </Stack>
              <Typography sx={{ color: '#4A6FA5', fontSize: 10, letterSpacing: 0.5, mt: 0.4, pl: 2.5 }}>
                Gestion de la paie · {MONTHS_FR[mois - 1]} {annee}
              </Typography>
            </Box>

            {/* Période en pill */}
            <Box sx={{
              bgcolor: '#FFFFFF0F', border: '1px solid #FFFFFF18',
              borderRadius: '20px', px: 1.5, py: 0.4,
              display: 'flex', alignItems: 'center', gap: 0.75,
            }}>
              <CalendarMonth sx={{ fontSize: 13, color: '#93C5FD' }} />
              <Typography sx={{ color: '#CBD5E1', fontSize: 11, fontWeight: 600 }}>
                {MONTHS_FR[mois - 1]} {annee}
              </Typography>
            </Box>

            {/* Statut */}
            <Chip
              label="Brouillon"
              size="small"
              sx={{
                bgcolor: '#92400E', color: '#FEF3C7', fontWeight: 700, fontSize: 10,
                height: 22, border: '1px solid #D9770660',
                '& .MuiChip-label': { px: 1.25 },
              }}
            />

            {/* Fermer */}
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: '#4A6FA5',
                '&:hover': { color: '#fff', bgcolor: '#FFFFFF14', borderRadius: '8px' },
                transition: 'all 0.15s',
              }}
            >
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </DialogTitle>

        {/* ══ 2. Panneau de saisie ═══════════════════════════════════════════════ */}
        <Box sx={{ bgcolor: '#F1F5F9', borderBottom: '2px solid #CBD5E1', flexShrink: 0 }}>
          <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ borderColor: '#CBD5E1' }} />}>

            {/* ── Colonne gauche : Agent ──────────────────────────────────────── */}
            <Box sx={{ flex: 1, px: 2.5, py: 1.75 }}>

              {/* Titre section */}
              <Stack direction="row" alignItems="center" gap={0.75} mb={1.5}>
                <Box sx={{ width: 3, height: 16, background: `linear-gradient(180deg, ${ACT}, #C2410C)`, borderRadius: 2 }} />
                <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#475569', letterSpacing: 1.4, textTransform: 'uppercase' }}>
                  Informations Agent
                </Typography>
              </Stack>

              {/* ─ Recherche unifiée (nom OU matricule) ─ */}
              <Box mb={1.25}>
                <FieldLabel>Rechercher par nom, prénom ou matricule</FieldLabel>
                <Autocomplete
                  size="small"
                  options={employees}
                  loading={loadEmp}
                  value={empSel}
                  onChange={(_, v) => handleEmpChange(v)}
                  getOptionLabel={e => `${e.first_name} ${e.last_name}`}
                  filterOptions={(opts, { inputValue }) => {
                    const v = inputValue.trim().toLowerCase();
                    if (!v) return opts.slice(0, 25);
                    return opts.filter(e => {
                      const mat  = e.employee_number.toLowerCase();
                      const full = `${e.first_name} ${e.last_name}`.toLowerCase();
                      const fn   = e.first_name.toLowerCase();
                      const ln   = e.last_name.toLowerCase();
                      return mat.startsWith(v) || full.startsWith(v) || fn.startsWith(v) || ln.startsWith(v);
                    });
                  }}
                  renderOption={(props, e) => (
                    <Box component="li" {...props} sx={{ py: '6px !important', px: '10px !important' }}>
                      <Box sx={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, mr: 1.5,
                        background: 'linear-gradient(135deg, #0D2137, #1E3A5C)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>
                          {e.first_name[0]}{e.last_name[0]}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>
                          {e.first_name} {e.last_name}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, fontFamily: 'monospace', color: '#64748B' }}>
                          {e.employee_number}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={p => (
                    <TextField
                      {...p}
                      placeholder="Diallo Amadou, Ba Fatou, EMP0012…"
                      InputProps={{
                        ...p.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <Search sx={{ fontSize: 17, color: '#94A3B8' }} />
                            </InputAdornment>
                            {p.InputProps.startAdornment}
                          </>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#fff', fontSize: 12,
                          '&:hover fieldset': { borderColor: ACT },
                          '&.Mui-focused fieldset': { borderColor: ACT, borderWidth: 2 },
                        },
                      }}
                    />
                  )}
                  fullWidth
                />
              </Box>

              {/* ─ Carte agent (après sélection) ─ */}
              {empSel ? (
                <>
                  <Box sx={{
                    bgcolor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: 1.5, py: 0.9, mb: 0.75,
                  }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #0D2137, #1E3A5C)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(13,33,55,0.25)',
                    }}>
                      <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>
                        {empSel.first_name[0]}{empSel.last_name[0]}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                        {empSel.first_name} {empSel.last_name}
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, fontFamily: 'monospace', color: '#2563EB', mt: 0.2 }}>
                        {empSel.employee_number}
                      </Typography>
                    </Box>
                    {(loadTemplate || loadIndice)
                      ? <Stack direction="row" alignItems="center" gap={0.75}>
                          <CircularProgress size={13} sx={{ color: ACT }} />
                          <Typography sx={{ fontSize: 10, color: ACT, fontWeight: 600 }}>Chargement…</Typography>
                        </Stack>
                      : empIndice
                        ? <Stack direction="row" alignItems="center" gap={0.5}>
                            <CheckCircle sx={{ fontSize: 15, color: '#059669' }} />
                            <Typography sx={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>Indice OK</Typography>
                          </Stack>
                        : null
                    }
                  </Box>

                  {/* Badges TRIMF / Part IR / Solde / Catégorie */}
                  <Stack direction="row" gap={0.75} mb={1.25} flexWrap="wrap">
                    <Box sx={{ px: 1, py: 0.3, bgcolor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '4px' }}>
                      <Typography sx={{ fontSize: 9.5, color: '#92400E', fontWeight: 700 }}>
                        TRIMF : {agentPayeData?.Part_TRIMF
                          ? new Intl.NumberFormat('fr-FR').format(agentPayeData.Part_TRIMF)
                          : '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ px: 1, py: 0.3, bgcolor: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '4px' }}>
                      <Typography sx={{ fontSize: 9.5, color: '#881337', fontWeight: 700 }}>
                        Part IR : {agentPayeData?.Part_IR
                          ? new Intl.NumberFormat('fr-FR').format(agentPayeData.Part_IR)
                          : '—'}
                      </Typography>
                    </Box>
                    {agentPayeData && agentPayeData.mld_solde > 0 && (
                      <Box sx={{ px: 1, py: 0.3, bgcolor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '4px' }}>
                        <Typography sx={{ fontSize: 9.5, color: '#065F46', fontWeight: 700 }}>
                          Solde : {new Intl.NumberFormat('fr-FR').format(agentPayeData.mld_solde)} F
                        </Typography>
                      </Box>
                    )}
                    {agentPayeData?.categorie_agent && (
                      <Box sx={{ px: 1, py: 0.3, bgcolor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '4px' }}>
                        <Typography sx={{ fontSize: 9.5, color: '#0C4A6E', fontWeight: 700 }}>
                          {agentPayeData.categorie_agent}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </>
              ) : (
                <Box sx={{
                  border: '1.5px dashed #CBD5E1', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  py: 1.1, mb: 1.5,
                }}>
                  <Typography sx={{ fontSize: 11, color: '#CBD5E1', fontStyle: 'italic' }}>
                    Aucun agent sélectionné
                  </Typography>
                </Box>
              )}

              {/* ─ Modèle + Grade sur la même ligne ─ */}
              <Stack direction="row" gap={2} alignItems="flex-end">
                <Box sx={{ flex: 1 }}>
                  <FieldLabel>
                    Modèle de paie
                    {loadTemplate && <CircularProgress size={9} sx={{ ml: 0.75, color: ACT, verticalAlign: 'middle' }} />}
                  </FieldLabel>
                  <TextField
                    select size="small"
                    value={templateId ?? ''}
                    onChange={e => setTemplateId(e.target.value === '' ? null : Number(e.target.value))}
                    fullWidth
                    sx={{
                      bgcolor: '#fff',
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': { borderColor: ACT },
                        '&.Mui-focused fieldset': { borderColor: ACT },
                      },
                    }}
                  >
                    <MenuItem value="" sx={{ fontSize: 11.5, color: '#94A3B8' }}>— Aucun —</MenuItem>
                    {(templates as { id: number; name: string }[]).map(t => (
                      <MenuItem key={t.id} value={t.id} sx={{ fontSize: 11.5 }}>{t.name}</MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <FieldLabel>
                    Grade / Indice
                    {loadIndice && <CircularProgress size={9} sx={{ ml: 0.75, color: ACT, verticalAlign: 'middle' }} />}
                  </FieldLabel>
                  <Box sx={{
                    height: 36,
                    bgcolor: empIndice ? '#F0FDF4' : '#F8FAFC',
                    border: `1px solid ${empIndice ? '#86EFAC' : '#E2E8F0'}`,
                    borderRadius: '4px', px: 1.5,
                    display: 'flex', alignItems: 'center', gap: 0.75,
                  }}>
                    {empIndice
                      ? <CheckCircle sx={{ fontSize: 14, color: '#059669', flexShrink: 0 }} />
                      : <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#E2E8F0', flexShrink: 0 }} />
                    }
                    <Typography sx={{
                      fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
                      color: empIndice ? '#065F46' : '#94A3B8',
                    }}>
                      {indiceCode || '— non défini —'}
                    </Typography>
                  </Box>
                </Box>
              </Stack>

            </Box>

            {/* ── Colonne droite : Période / Paramètres / Heures Sup ─────────── */}
            <Box sx={{ px: 2.5, py: 1.5, minWidth: 520 }}>

              {/* ─ Ligne 1 : Période ─ */}
              <Stack direction="row" alignItems="center" gap={0.75} mb={1.1}>
                <CalendarMonth sx={{ fontSize: 13, color: '#2563EB' }} />
                <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#2563EB', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  Période
                </Typography>
              </Stack>

              <Stack direction="row" gap={1.5} alignItems="flex-end" mb={1.5}>
                <Box>
                  <FieldLabel>Mois</FieldLabel>
                  <TextField
                    select size="small" value={mois}
                    onChange={e => setMois(Number(e.target.value))}
                    sx={{
                      width: 138, bgcolor: '#fff',
                      '& .MuiSelect-select': { py: 0.6, fontSize: 11.5 },
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': { borderColor: '#2563EB' },
                        '&.Mui-focused fieldset': { borderColor: '#2563EB' },
                      },
                    }}
                  >
                    {MONTHS_FR.map((m, i) => <MenuItem key={i} value={i + 1} sx={{ fontSize: 11.5 }}>{m}</MenuItem>)}
                  </TextField>
                </Box>
                <Box>
                  <FieldLabel>Année</FieldLabel>
                  <TextField
                    type="number" size="small" value={annee}
                    onChange={e => setAnnee(Number(e.target.value))}
                    inputProps={{ min: 2020, max: 2035, style: { padding: '5.5px 10px', fontSize: 11.5 } }}
                    sx={{
                      width: 88, bgcolor: '#fff',
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': { borderColor: '#2563EB' },
                        '&.Mui-focused fieldset': { borderColor: '#2563EB' },
                      },
                    }}
                  />
                </Box>
              </Stack>

              {/* ─ Ligne 2 : Paramètres + Heures Sup côte à côte ─ */}
              <Box sx={{ borderTop: '1px solid #E2E8F0', pt: 1.25 }}>
                <Stack direction="row" gap={3} alignItems="flex-start">

                  {/* Paramètres */}
                  <Box>
                    <Stack direction="row" alignItems="center" gap={0.75} mb={1.1}>
                      <Tune sx={{ fontSize: 13, color: '#64748B' }} />
                      <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#64748B', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                        Paramètres
                      </Typography>
                    </Stack>
                    <Stack direction="row" gap={1.5} alignItems="flex-end">
                      <Box>
                        <FieldLabel>Montant coupure</FieldLabel>
                        <TextField
                          type="number" size="small" value={coupure}
                          onChange={e => setCoupure(Number(e.target.value))}
                          inputProps={{ style: { padding: '5.5px 10px', fontSize: 11.5, textAlign: 'right' } }}
                          sx={{
                            width: 112, bgcolor: '#fff',
                            '& .MuiOutlinedInput-root': {
                              '&:hover fieldset': { borderColor: ACT },
                              '&.Mui-focused fieldset': { borderColor: ACT },
                            },
                          }}
                        />
                      </Box>
                      <Box>
                        <FieldLabel>H. non trav.</FieldLabel>
                        <TextField
                          type="number" size="small" value={heures}
                          onChange={e => setHeures(Number(e.target.value))}
                          inputProps={{ style: { padding: '5.5px 10px', fontSize: 11.5, textAlign: 'right' } }}
                          sx={{
                            width: 90, bgcolor: '#fff',
                            '& .MuiOutlinedInput-root': {
                              '&:hover fieldset': { borderColor: ACT },
                              '&.Mui-focused fieldset': { borderColor: ACT },
                            },
                          }}
                        />
                      </Box>
                    </Stack>
                  </Box>

                  {/* Séparateur vertical */}
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ borderStyle: 'dashed', borderColor: '#A78BFA44', alignSelf: 'stretch', mt: 0 }}
                  />

                  {/* Heures supplémentaires */}
                  <Box>
                    <Stack direction="row" alignItems="center" gap={0.75} mb={1.1}>
                      <AccessTime sx={{ fontSize: 13, color: '#7C3AED' }} />
                      <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#7C3AED', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                        Heures Supplémentaires
                      </Typography>
                    </Stack>
                    <Stack direction="row" gap={1.5} alignItems="flex-end">
                      <Box>
                        <FieldLabel>Nb d'heures</FieldLabel>
                        <TextField
                          type="number" size="small"
                          value={heuresSup || ''}
                          placeholder="0"
                          onChange={e => setHeuresSup(e.target.value === '' ? 0 : Number(e.target.value))}
                          inputProps={{ min: 0, style: { padding: '5.5px 10px', fontSize: 11.5, textAlign: 'right' } }}
                          sx={{
                            width: 90,
                            bgcolor: heuresSup ? '#FAF5FF' : '#fff',
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': { borderColor: heuresSup ? '#A78BFA' : undefined },
                              '&:hover fieldset': { borderColor: '#7C3AED' },
                              '&.Mui-focused fieldset': { borderColor: '#7C3AED' },
                            },
                          }}
                        />
                      </Box>
                      <Box>
                        <FieldLabel>Montant (FCFA)</FieldLabel>
                        <TextField
                          type="number" size="small"
                          value={montantSup || ''}
                          placeholder="0"
                          onChange={e => setMontantSup(e.target.value === '' ? 0 : Number(e.target.value))}
                          inputProps={{ min: 0, style: { padding: '5.5px 10px', fontSize: 11.5, textAlign: 'right' } }}
                          sx={{
                            width: 112,
                            bgcolor: montantSup ? '#FAF5FF' : '#fff',
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': { borderColor: montantSup ? '#A78BFA' : undefined },
                              '&:hover fieldset': { borderColor: '#7C3AED' },
                              '&.Mui-focused fieldset': { borderColor: '#7C3AED' },
                            },
                          }}
                        />
                      </Box>
                    </Stack>
                  </Box>

                </Stack>
              </Box>

            </Box>
          </Stack>
        </Box>

        {/* ══ 3. Jauge de chargement ════════════════════════════════════════════ */}
        {(loadTemplate || loadIndice) && (
          <Box sx={{ flexShrink: 0 }}>
            <LinearProgress sx={{ height: 3, bgcolor: '#DBEAFE', '& .MuiLinearProgress-bar': { bgcolor: ACT } }} />
            <Stack direction="row" alignItems="center" gap={1} sx={{ bgcolor: '#FFF7ED', px: 2, py: 0.5 }}>
              <CircularProgress size={11} sx={{ color: ACT }} />
              <Typography sx={{ fontSize: 10.5, color: ACT, fontWeight: 600 }}>
                {loadIndice ? "Chargement de l'indice et du grade…" : 'Chargement du modèle de paie…'}
              </Typography>
            </Stack>
          </Box>
        )}
        {!loadTemplate && !loadIndice && empSel && lignes.length === 0 && templateId && (
          <Box sx={{ bgcolor: '#FFFBEB', px: 2, py: 0.5, flexShrink: 0, borderBottom: '1px solid #FDE68A' }}>
            <Typography sx={{ fontSize: 10.5, color: '#D97706' }}>Aucune rubrique dans ce modèle.</Typography>
          </Box>
        )}

        {/* ══ 4. Barre rubriques ════════════════════════════════════════════════ */}
        <Box sx={{
          bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', px: 2, py: 0.6, flexShrink: 0,
        }}>
          <Box sx={{ width: 3, height: 14, bgcolor: NAV, borderRadius: 1, mr: 1 }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: NAV }}>
            Rubriques du bulletin
          </Typography>
          {lignes.length > 0 && (
            <Chip
              label={`${lignes.length} rubriques`}
              size="small"
              sx={{ ml: 1.5, fontSize: 10, bgcolor: '#E2E8F0', color: NAV, fontWeight: 700, height: 20 }}
            />
          )}
        </Box>

        {/* ══ 5. Tableau ═══════════════════════════════════════════════════════ */}
        <DialogContent sx={{ p: 0, overflow: 'auto', flex: 1 }}>
          <TableContainer>
            <Table size="small" sx={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '24%' }} />
                <col style={{ width: 54 }} />
                <col style={{ width: 88 }} />
                <col style={{ width: 88 }} />
                <col style={{ width: 54 }} />
                <col style={{ width: 88 }} />
                <col style={{ width: 54 }} />
                <col style={{ width: 88 }} />
              </colgroup>

              <TableHead>
                <TableRow sx={{ bgcolor: NAV }}>
                  <TableCell rowSpan={2} sx={HDR}>Rubriques</TableCell>
                  <TableCell rowSpan={2} sx={{ ...HDR, textAlign: 'right' }}>Nbre</TableCell>
                  <TableCell rowSpan={2} sx={{ ...HDR, textAlign: 'right' }}>Base calcul</TableCell>
                  <TableCell colSpan={3} sx={{ ...HDR, textAlign: 'center', borderBottom: '1px solid #1E3A5C' }}>
                    Charges du salarié
                  </TableCell>
                  <TableCell colSpan={2} sx={{ ...HDR, textAlign: 'center', borderBottom: '1px solid #1E3A5C' }}>
                    Charges employeur
                  </TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#0D2B4E' }}>
                  <TableCell sx={{ ...HDR, textAlign: 'right' }}>GAIN</TableCell>
                  <TableCell sx={{ ...HDR, textAlign: 'right' }}>Taux</TableCell>
                  <TableCell sx={{ ...HDR, textAlign: 'right' }}>Montant</TableCell>
                  <TableCell sx={{ ...HDR, textAlign: 'right' }}>Taux</TableCell>
                  <TableCell sx={{ ...HDR, textAlign: 'right' }}>Montant</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {lignes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6, color: '#94A3B8', fontSize: 12, border: 'none' }}>
                      {empSel
                        ? 'Sélectionnez un modèle de paie pour charger les rubriques.'
                        : 'Sélectionnez un agent pour commencer.'}
                    </TableCell>
                  </TableRow>
                )}

                {(() => {
                  const groups = groupLignes(displayLignes);
                  const brSocial = groups
                    .filter(g => g.section === 'base' || g.section === 'augmentation')
                    .reduce((sum, g) => sum + g.items.reduce((s, { l }) => s + (Number(l.gain) || 0), 0), 0);

                  return groups.map((group) => {
                    const stGain = group.items.reduce((s, { l }) => s + (Number(l.gain) || 0), 0);
                    const stSal  = group.items.reduce((s, { l }) => {
                      if (l.section === 'ipress' && totaux.baseIPRES > 0)
                        return s + Math.round(totaux.baseIPRES * (Number(l.taux_salarial) || 0) / 100);
                      if (l.section === 'css' && bruts.brSocial > 0)
                        return s + Math.round(bruts.brSocial * (Number(l.taux_salarial) || 0) / 100);
                      if (l.section === 'ir'    && irppData) return s + irppData.impo_sur_revn;
                      if (l.section === 'trimf' && irppData) return s + irppData.trinf;
                      return s + (Number(l.montant_salarial) || 0);
                    }, 0);
                    const stPat  = group.items.reduce((s, { l }) => {
                      if (l.section === 'ipress' && totaux.baseIPRES > 0)
                        return s + Math.round(totaux.baseIPRES * (Number(l.taux_patronal) || 0) / 100);
                      if (l.section === 'css' && bruts.brSocial > 0)
                        return s + Math.round(bruts.brSocial * (Number(l.taux_patronal) || 0) / 100);
                      return s + (Number(l.montant_patronal) || 0);
                    }, 0);

                    return (
                      <Fragment key={group.section}>

                        {/* ── En-tête de section (rupture) ── */}
                        <TableRow>
                          <TableCell colSpan={8} sx={{ bgcolor: group.bg, py: 0.55, px: 2, border: 'none' }}>
                            <Typography sx={{
                              color: '#fff', fontWeight: 800, fontSize: 9.5,
                              letterSpacing: 1, textTransform: 'uppercase',
                            }}>
                              {group.label}
                            </Typography>
                          </TableCell>
                        </TableRow>

                        {/* ── Lignes (lecture seule) ── */}
                        {group.items.map(({ l, idx }) => {
                          const bg = idx % 2 === 0 ? '#fff' : '#F8FAFC';
                          const ipres = l.section === 'ipress' && totaux.baseIPRES > 0;
                          const css   = l.section === 'css'    && bruts.brSocial   > 0;
                          const effMontSal =
                            ipres                         ? Math.round(totaux.baseIPRES * (Number(l.taux_salarial) || 0) / 100)
                            : css                         ? Math.round(bruts.brSocial   * (Number(l.taux_salarial) || 0) / 100)
                            : l.section === 'ir' && irppData    ? irppData.impo_sur_revn
                            : l.section === 'trimf' && irppData ? irppData.trinf
                            : (Number(l.montant_salarial) || 0);
                          const effMontPat =
                            ipres ? Math.round(totaux.baseIPRES * (Number(l.taux_patronal) || 0) / 100)
                            : css ? Math.round(bruts.brSocial   * (Number(l.taux_patronal) || 0) / 100)
                            : (Number(l.montant_patronal) || 0);
                          const effBase =
                            ipres                      ? totaux.baseIPRES
                            : css                      ? bruts.brSocial
                            : l.section === 'ir' && irppData ? irppData.montant_irpp
                            : l.base_calcul;
                          return (
                            <TableRow key={idx} sx={{ bgcolor: bg, '&:hover': { bgcolor: '#EFF6FF' } }}>
                              <TableCell sx={{ ...DC, pl: 2 }}>
                                <Typography sx={{ fontSize: 11, color: '#1E293B', fontWeight: 500 }}>
                                  {l.rubrique}
                                </Typography>
                              </TableCell>
                              <TableCell sx={DC}><N value={l.nombre} /></TableCell>
                              <TableCell sx={DC}><N value={effBase} /></TableCell>
                              <TableCell sx={{ ...DC, bgcolor: l.gain ? '#F0FDF4' : bg }}>
                                <N value={l.gain} green />
                              </TableCell>
                              <TableCell sx={DC}><N value={l.taux_salarial} /></TableCell>
                              <TableCell sx={{ ...DC, bgcolor: effMontSal ? '#FFF5F5' : bg }}>
                                <N value={effMontSal || null} red />
                              </TableCell>
                              <TableCell sx={DC}><N value={l.taux_patronal} /></TableCell>
                              <TableCell sx={DC}><N value={effMontPat || null} /></TableCell>
                            </TableRow>
                          );
                        })}

                        {/* ── Sous-total de section ── */}
                        <TableRow sx={{ bgcolor: `${group.bg}14` }}>
                          <TableCell colSpan={3} sx={{ ...DC, pl: 2, py: 0.5 }}>
                            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: group.bg, letterSpacing: 0.5 }}>
                              Sous-total · {group.label}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ ...DC, textAlign: 'right', py: 0.5 }}>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 800, fontFamily: 'monospace', color: '#059669' }}>
                              {stGain ? fmt(stGain) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={DC} />
                          <TableCell sx={{ ...DC, textAlign: 'right', py: 0.5 }}>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 800, fontFamily: 'monospace', color: '#DC2626' }}>
                              {stSal ? fmt(stSal) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={DC} />
                          <TableCell sx={{ ...DC, textAlign: 'right', py: 0.5 }}>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 800, fontFamily: 'monospace', color: '#D97706' }}>
                              {stPat ? fmt(stPat) : '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>

                        {/* ── Salaire Brut Social (après AUGMENTATIONS) ── */}
                        {group.section === 'augmentation' && brSocial > 0 && (
                          <TableRow>
                            <TableCell colSpan={3} sx={{ bgcolor: '#1E3A5C', py: 0.65, px: 2, border: '1px solid #2D4A6A' }}>
                              <Typography sx={{ fontSize: 10, fontWeight: 900, color: '#93C5FD', letterSpacing: 1, textTransform: 'uppercase' }}>
                                Salaire Brut Social
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ bgcolor: '#1E3A5C', py: 0.65, px: 1, border: '1px solid #2D4A6A', textAlign: 'right' }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 900, fontFamily: 'monospace', color: '#34D399' }}>
                                {fmt(brSocial)}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ bgcolor: '#1E3A5C', border: '1px solid #2D4A6A' }} />
                            <TableCell sx={{ bgcolor: '#1E3A5C', border: '1px solid #2D4A6A' }} />
                            <TableCell sx={{ bgcolor: '#1E3A5C', border: '1px solid #2D4A6A' }} />
                            <TableCell sx={{ bgcolor: '#1E3A5C', border: '1px solid #2D4A6A' }} />
                          </TableRow>
                        )}

                      </Fragment>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        {/* ══ 6. Barre des totaux ═══════════════════════════════════════════════ */}
        <Box sx={{ borderTop: '2px solid #0D2137', bgcolor: '#0D2137', flexShrink: 0 }}>
          <Stack direction="row">
            {[
              { label: 'Salaire Brut',       val: totaux.salaireBase,   color: '#F1F5F9', accent: '#93C5FD' },
              { label: 'Charges Salariales', val: totaux.retSal,        color: '#FEE2E2', accent: '#FCA5A5' },
              { label: 'Charges Employeur',  val: totaux.retPat,        color: '#FEF3C7', accent: '#FCD34D' },
              { label: 'Net Imposable',      val: totaux.netImposable,  color: '#EFF6FF', accent: '#93C5FD' },
              { label: 'Salaire Référence',  val: totaux.salaireRef,    color: '#F8FAFC', accent: '#94A3B8' },
              { label: 'Salaire Total',      val: totaux.salaireTotal,  color: '#F1F5F9', accent: '#A5B4FC' },
              { label: 'NET À PAYER',        val: totaux.netAPayer,     color: '#F0FDF4', accent: '#34D399' },
            ].map(({ label, val, color, accent }, i) => (
              <Box key={i} sx={{
                flex: i === 6 ? 1.3 : 1,
                textAlign: 'center',
                bgcolor: i === 6 ? '#064E3B' : undefined,
                borderRight: i < 6 ? '1px solid #1E3A5C' : undefined,
                py: 0.9, px: 0.5,
              }}>
                <Typography sx={{ fontSize: 9, color: accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: i === 6 ? 14 : 12.5, fontWeight: 800, fontFamily: 'monospace', color, mt: 0.2 }}>
                  {fmt(val)}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* ══ 7. Actions ════════════════════════════════════════════════════════ */}
        <DialogActions sx={{ px: 2, py: 0.75, gap: 1, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Visibility sx={{ fontSize: 14 }} />}
            onClick={handlePreview}
            disabled={!empSel}
            sx={{ fontSize: 11, textTransform: 'none', borderColor: '#2563EB', color: '#2563EB', '&:hover': { bgcolor: '#EFF6FF' } }}
          >
            Aperçu bulletin
          </Button>
          <Box flex={1} />
          <Button
            size="small"
            variant="outlined"
            onClick={onClose}
            sx={{ fontSize: 11, textTransform: 'none', borderColor: '#CBD5E1', color: '#64748B' }}
          >
            Annuler
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={saving ? <CircularProgress size={12} color="inherit" /> : <Save sx={{ fontSize: 14 }} />}
            onClick={handleSave}
            disabled={!empSel || saving}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, fontSize: 11, fontWeight: 700, textTransform: 'none', px: 2 }}
          >
            {saving ? 'Enregistrement…' : 'Sauvegarder le bulletin'}
          </Button>
        </DialogActions>

      </Dialog>

      {/* ── Aperçu bulletin ── */}
      {preview && (
        <Dialog open maxWidth="xl" fullWidth onClose={() => setPreview(null)}
          PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden', p: 0, maxHeight: '95vh' } }}>
          <Box sx={{ overflow: 'auto' }}>
            <BulletinViewer bulletin={preview} onClose={() => setPreview(null)} />
          </Box>
        </Dialog>
      )}

      {/* ── Dialog : modèle de paie manquant ── */}
      <Dialog
        open={noModelDlg}
        onClose={() => setNoModelDlg(false)}
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
      >
        <Box sx={{ bgcolor: '#FFF7ED', borderBottom: '3px solid #F97316', px: 2.5, py: 1.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>
            Modèle de paie non configuré
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Typography sx={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
            La fiche de <strong>{empSel?.first_name} {empSel?.last_name}</strong> ne comporte
            aucun modèle de paie associé.
            <br />
            Voulez-vous accéder à sa fiche pour le configurer ?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setNoModelDlg(false);
              setEmpSel(null);
              setTemplateId(null);
              setIndiceCode('');
              setLignes([]);
              setRawLines([]);
            }}
            sx={{ fontSize: 11, textTransform: 'none', borderColor: '#CBD5E1', color: '#64748B' }}
          >
            Non, continuer quand même
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setNoModelDlg(false);
              onClose();
              navigate(`/employees/${empSel!.id}/edit`);
            }}
            sx={{ bgcolor: '#E85D04', '&:hover': { bgcolor: '#C2410C' }, fontSize: 11, fontWeight: 700, textTransform: 'none' }}
          >
            Oui, configurer la fiche
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
