import { useRef } from 'react';
import {
  Box, Typography, Stack, Button, Divider,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import { Print, Close, Save } from '@mui/icons-material';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BulletinLigne {
  rubrique: string;
  nombre?: number | null;
  base_calcul?: number | null;
  gain?: number | null;
  taux_salarial?: number | null;
  montant_salarial?: number | null;
  taux_patronal?: number | null;
  montant_patronal?: number | null;
  bold?: boolean;
  is_section?: boolean;
  is_total?: boolean;
  section?: string;
}

export interface BulletinDePaie {
  id?: number;
  employee_id: number;
  matricule: string;
  employee_name: string;
  department?: string;
  mois: number;
  annee: number;
  modele_name?: string;
  indice_code?: string;
  montant_coupure?: number;
  heures_non_travaillees?: number;
  heures_supplementaires?: number;
  montant_heures_sup?: number;
  lignes: BulletinLigne[];
  salaire_base: number;
  charges_salariales: number;
  charges_patronales: number;
  net_imposable: number;
  salaire_reference: number;
  salaire_total: number;
  net_a_payer: number;
  status?: 'draft' | 'validated' | 'paid';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const fmt = (v?: number | null) =>
  v != null && v !== 0
    ? new Intl.NumberFormat('fr-FR').format(Math.round(v))
    : '';

// ─── Sous-composants ──────────────────────────────────────────────────────────

const HDR_CELL = {
  color: '#fff', fontWeight: 700, fontSize: 10.5, py: 0.6, px: 1,
  border: '1px solid #4a5568', whiteSpace: 'nowrap' as const,
} as const;

const DATA_CELL = {
  fontSize: 11.5, py: 0.4, px: 1,
  border: '1px solid #CBD5E1',
} as const;

function InfoRow({ label, value, wide }: { label: string; value?: string | number; wide?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" gap={0.5}>
      <Typography sx={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>{label}</Typography>
      <Box sx={{
        bgcolor: '#fff', border: '1px solid #94A3B8', borderRadius: '3px',
        px: 1, py: 0.25, minWidth: wide ? 200 : 90, maxWidth: wide ? 260 : 110,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#0F172A' }}>
          {value ?? ''}
        </Typography>
      </Box>
    </Stack>
  );
}

function FooterCell({ label, value, red, green }: { label: string; value?: number; red?: boolean; green?: boolean }) {
  return (
    <Box sx={{ flex: 1, textAlign: 'center', border: '1px solid #CBD5E1', py: 0.5, px: 0.5 }}>
      <Typography sx={{ fontSize: 9.5, color: '#64748B', whiteSpace: 'nowrap' }}>{label}</Typography>
      <Typography sx={{
        fontSize: 13, fontWeight: 800, fontFamily: 'monospace',
        color: green ? '#059669' : red ? '#DC2626' : '#0F172A',
        mt: 0.25,
      }}>
        {value != null ? new Intl.NumberFormat('fr-FR').format(Math.round(value)) : '—'}
      </Typography>
    </Box>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  bulletin: BulletinDePaie;
  onClose?: () => void;
  onSave?: () => void;
}

export default function BulletinViewer({ bulletin, onClose, onSave }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) return;
    w.document.write(`
      <html><head><title>Bulletin de Paie</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 12px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #cbd5e1; padding: 2px 6px; font-size: 10.5px; }
        th { background: #1e3a5c; color: #fff; }
        .bold { font-weight: 700; }
        .section { background: #e2e8f0; font-weight: 700; }
        .total-row { background: #fee2e2; font-weight: 800; }
        .footer { display: flex; border: 1px solid #cbd5e1; margin-top: 4px; }
        .footer-cell { flex: 1; text-align: center; border-right: 1px solid #cbd5e1; padding: 4px 2px; }
        .net { font-size: 14px; font-weight: 900; color: #059669; }
        @media print { @page { size: A4 landscape; margin: 8mm; } }
      </style></head><body>${content}</body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const moisLabel = MONTHS_FR[bulletin.mois - 1] ?? '';

  return (
    <Box ref={printRef} sx={{ bgcolor: '#F1F5F9', p: 0, userSelect: 'text' }}>

      {/* ── Barre titre ── */}
      <Box sx={{
        bgcolor: '#1E3A5C', display: 'flex', alignItems: 'center',
        gap: 2, px: 2, py: 0.75, flexWrap: 'wrap',
      }}>
        <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: '0.5px', mr: 1 }}>
          FICHE DE PAIE
        </Typography>
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Typography sx={{ color: '#93C5FD', fontSize: 10.5, whiteSpace: 'nowrap' }}>Montant Coupure</Typography>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #64748B', px: 1, py: 0.25, borderRadius: '3px', minWidth: 60, textAlign: 'right' }}>
            <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
              {bulletin.montant_coupure ?? 0}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Typography sx={{ color: '#93C5FD', fontSize: 10.5, whiteSpace: 'nowrap' }}>Nombre heure Non travaillé</Typography>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #64748B', px: 1, py: 0.25, borderRadius: '3px', minWidth: 60, textAlign: 'right' }}>
            <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
              {bulletin.heures_non_travaillees ?? 0}
            </Typography>
          </Box>
        </Stack>
        <Box flex={1} />
        {onSave && (
          <Button size="small" variant="contained" startIcon={<Save sx={{ fontSize: 14 }} />} onClick={onSave}
            sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, fontSize: 11, fontWeight: 700, py: 0.4, borderRadius: '5px', textTransform: 'none' }}>
            Sauvegarder
          </Button>
        )}
        {onClose && (
          <Button size="small" variant="contained" startIcon={<Close sx={{ fontSize: 14 }} />} onClick={onClose}
            sx={{ bgcolor: '#475569', '&:hover': { bgcolor: '#334155' }, fontSize: 11, fontWeight: 700, py: 0.4, borderRadius: '5px', textTransform: 'none' }}>
            Fermer
          </Button>
        )}
        <Button size="small" variant="contained" startIcon={<Print sx={{ fontSize: 14 }} />} onClick={handlePrint}
          sx={{ bgcolor: '#E85D04', '&:hover': { bgcolor: '#C2410C' }, fontSize: 11, fontWeight: 700, py: 0.4, borderRadius: '5px', textTransform: 'none' }}>
          Imprimer
        </Button>
      </Box>

      {/* ── Info employé ── */}
      <Box sx={{ bgcolor: '#EAF0F6', px: 2, py: 0.75, borderBottom: '1px solid #CBD5E1' }}>
        <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
          <InfoRow label="Matricule" value={bulletin.matricule} />
          <InfoRow label="Agent" value={bulletin.employee_name} wide />
          <InfoRow label="Modèle" value={bulletin.modele_name} wide />
          <InfoRow label="Indice" value={bulletin.indice_code} />
        </Stack>
      </Box>

      {/* ── Sous-onglets + Période ── */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', px: 1.5, py: 0, gap: 0 }}>
        {['Info de paie d\'agent', 'Autre information'].map((label, i) => (
          <Box key={label} sx={{
            px: 2, py: 0.6, fontSize: 11.5, fontWeight: i === 0 ? 700 : 500,
            borderBottom: i === 0 ? '2.5px solid #1E3A5C' : '2.5px solid transparent',
            color: i === 0 ? '#1E3A5C' : '#64748B',
            cursor: 'default',
          }}>
            {label}
          </Box>
        ))}
        <Box flex={1} />
        <Stack direction="row" alignItems="center" gap={1.5} pr={1}>
          <InfoRow label="Mois" value={moisLabel} />
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Typography sx={{ fontSize: 11, color: '#64748B' }}>Mois en cours</Typography>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#1E3A5C', bgcolor: '#EAF0F6', px: 1, py: 0.25, borderRadius: '3px' }}>
              {moisLabel}
            </Typography>
          </Stack>
          <InfoRow label="Année" value={bulletin.annee} />
        </Stack>
      </Box>

      {/* ── Tableau principal ── */}
      <TableContainer sx={{ borderRadius: 0 }}>
        <Table size="small" sx={{ borderCollapse: 'collapse', minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1E3A5C' }}>
              <TableCell rowSpan={2} sx={{ ...HDR_CELL, width: '22%' }}>Rubriques</TableCell>
              <TableCell rowSpan={2} sx={{ ...HDR_CELL, textAlign: 'right', width: '7%' }}>Nombre</TableCell>
              <TableCell rowSpan={2} sx={{ ...HDR_CELL, textAlign: 'right', width: '10%' }}>Base de calcul</TableCell>
              <TableCell colSpan={3} sx={{ ...HDR_CELL, textAlign: 'center', borderBottom: '1px solid #2D4A6A' }}>Charges du salarié</TableCell>
              <TableCell colSpan={2} sx={{ ...HDR_CELL, textAlign: 'center', borderBottom: '1px solid #2D4A6A' }}>Charges de l'employeur</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: '#1E3A5C' }}>
              <TableCell sx={{ ...HDR_CELL, textAlign: 'right', width: '10%' }}>GAIN</TableCell>
              <TableCell sx={{ ...HDR_CELL, textAlign: 'right', width: '7%' }}>Taux</TableCell>
              <TableCell sx={{ ...HDR_CELL, textAlign: 'right', width: '9%' }}>Montant</TableCell>
              <TableCell sx={{ ...HDR_CELL, textAlign: 'right', width: '7%' }}>Taux</TableCell>
              <TableCell sx={{ ...HDR_CELL, textAlign: 'right', width: '9%' }}>Montant</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bulletin.lignes.map((l, idx) => {
              const isSection = l.is_section;
              const isTotal   = l.is_total;
              const isBold    = l.bold || isSection || isTotal;

              const rowBg = isTotal
                ? '#FEE2E2'
                : isSection
                ? '#E2E8F0'
                : idx % 2 === 0 ? '#fff' : '#F8FAFC';

              return (
                <TableRow key={idx} sx={{ bgcolor: rowBg }}>
                  <TableCell sx={{
                    ...DATA_CELL,
                    fontWeight: isBold ? 700 : 400,
                    color: isSection ? '#1E3A5C' : isTotal ? '#991B1B' : '#0F172A',
                    pl: isSection || isTotal ? 1.5 : 2.5,
                  }}>
                    {l.rubrique}
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL, textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                    {l.nombre != null && l.nombre !== 0 ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(l.nombre) : ''}
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL, textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                    {fmt(l.base_calcul)}
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL, textAlign: 'right', fontFamily: 'monospace', fontWeight: isBold ? 700 : 400, color: '#059669' }}>
                    {fmt(l.gain)}
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL, textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                    {l.taux_salarial != null && l.taux_salarial !== 0
                      ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(l.taux_salarial)
                      : ''}
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL, textAlign: 'right', fontFamily: 'monospace', fontWeight: isBold ? 700 : 400, color: '#DC2626' }}>
                    {fmt(l.montant_salarial)}
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL, textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                    {l.taux_patronal != null && l.taux_patronal !== 0
                      ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(l.taux_patronal)
                      : ''}
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL, textAlign: 'right', fontFamily: 'monospace', fontWeight: isBold ? 700 : 400, color: '#D97706' }}>
                    {fmt(l.montant_patronal)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Pied de page ── */}
      <Box sx={{ display: 'flex', borderTop: '2px solid #DC2626', bgcolor: '#fff' }}>
        <FooterCell label="Salaire de base"          value={bulletin.salaire_base} />
        <FooterCell label="Charges Salariales"        value={bulletin.charges_salariales} red />
        <FooterCell label="Charges de l'employeur"    value={bulletin.charges_patronales} />
        <FooterCell label="Net Imposable"             value={bulletin.net_imposable} />
        <Box sx={{ width: 8, border: '1px solid #CBD5E1', borderLeft: 'none' }} />
        <FooterCell label="Salaire de Référence"      value={bulletin.salaire_reference} />
        <FooterCell label="Salaire Total"             value={bulletin.salaire_total} />
        <FooterCell label="NET À PAYER"               value={bulletin.net_a_payer} green />
      </Box>
    </Box>
  );
}
