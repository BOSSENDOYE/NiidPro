import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box, Button, Checkbox, Chip, Dialog, DialogContent, DialogTitle,
  FormControlLabel, MenuItem, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  type PayrollTemplate,
  type PayrollTemplateLine,
  type RubriqueOption,
  type TemplateLineType,
  createPayrollTemplate,
  getPayrollTemplate,
  updatePayrollTemplate,
} from '../../api/payrollTemplates';
import RubriqueSelectionModal from './RubriqueSelectionModal';

// ── Constantes ─────────────────────────────────────────────────────────────

const NAVY  = '#002f59';
const LIGHT = '#f8f9fa';

const SECTION_ORDER: TemplateLineType[] = ['base', 'augmentation', 'ipress', 'ipm', 'css', 'ir', 'trimf', 'retenue'];

const SECTION_LABELS: Record<TemplateLineType, string> = {
  base:         'ÉLÉMENTS DE BASE',
  augmentation: 'AUGMENTATIONS',
  ipress:       'COTISATIONS IPRESS — RETRAITE',
  ipm:          'COTISATIONS IPM',
  css:          'COTISATIONS CSS',
  ir:           'IMPÔT SUR LE REVENU (IR)',
  trimf:        'TRIMF',
  retenue:      'RETENUES DIVERSES',
};

const TYPE_SELECT_OPTIONS: { value: TemplateLineType; label: string }[] = [
  { value: 'augmentation', label: 'Augmentation' },
  { value: 'ipress',       label: 'IPRESS — Retraite' },
  { value: 'ipm',          label: 'IPM' },
  { value: 'css',          label: 'CSS' },
  { value: 'ir',           label: 'IR — Impôt sur le revenu' },
  { value: 'trimf',        label: 'TRIMF' },
  { value: 'retenue',      label: 'Retenue' },
];

// ── Rubriques fixes (toujours présentes, non supprimables) ─────────────────

const DEFAULT_BASE_LINES: PayrollTemplateLine[] = [
  {
    type: 'base', code: 'SMI', libelle: 'Solde Mensuel Indiciaire',
    nombre: 1, base_calcul: 0, gain: 0,
    taux_salarial: 100, retenu_salarial: 0,
    taux_patronal: 0, retenu_patronal: 0,
  },
  {
    type: 'base', code: 'CSS_S', libelle: 'Complément Spécial de Solde',
    nombre: 1, base_calcul: 0, gain: 0,
    taux_salarial: 14, retenu_salarial: 0,
    taux_patronal: 0, retenu_patronal: 0,
  },
  {
    type: 'base', code: 'IND_R', libelle: 'Indemnité de Résidence',
    nombre: 1, base_calcul: 0, gain: 0,
    taux_salarial: 14, retenu_salarial: 0,
    taux_patronal: 0, retenu_patronal: 0,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function computeRetenu(base: number, taux: number): number {
  return +(base * taux / 100).toFixed(2);
}

// ── Cellule numérique éditable (hors du composant parent pour éviter le remontage) ──

function NumCell({
  value, onChange, bgcolor, blankOne = false,
}: { value: number | string; onChange: (v: number) => void; bgcolor?: string; blankOne?: boolean }) {
  // MySQL DECIMAL retourne des strings "1.0000", "0.0000" — on cast en number
  const n = Number(value) || 0;
  const isEmpty = n === 0 || (blankOne && n === 1);
  return (
    <TableCell align="right"
      sx={{ border: '1px solid #E2E8F0', p: 0.25, bgcolor: bgcolor ?? '#fff' }}>
      <input
        type="number"
        value={isEmpty ? '' : n}
        step="0.01"
        placeholder="—"
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: '100%', textAlign: 'right', border: 'none', outline: 'none',
          background: 'transparent', fontSize: 12, padding: '2px 4px',
        }}
      />
    </TableCell>
  );
}

// ── En-tête colonnes (avec cellules fusionnées) ─────────────────────────────

function TableHeader() {
  const hCell = (label: string, align: 'left' | 'center' | 'right' = 'center', width?: number) => ({
    label, align, width,
  });

  return (
    <TableHead>
      {/* Ligne 1 : groupes */}
      <TableRow>
        {/* Description des Augmentations */}
        <TableCell colSpan={6} align="center"
          sx={{ bgcolor: NAVY, color: '#fff', fontWeight: 700, fontSize: 11, border: '1px solid #1a4a7a', py: 0.6 }}>
          Description des Augmentations
        </TableCell>
        {/* Part Salariale */}
        <TableCell colSpan={3} align="center"
          sx={{ bgcolor: NAVY, color: '#fff', fontWeight: 700, fontSize: 11, border: '1px solid #1a4a7a', py: 0.6 }}>
          Part Salariale
        </TableCell>
        {/* Part Patronale */}
        <TableCell colSpan={2} align="center"
          sx={{ bgcolor: NAVY, color: '#fff', fontWeight: 700, fontSize: 11, border: '1px solid #1a4a7a', py: 0.6 }}>
          Part Patronale
        </TableCell>
        {/* Actions */}
        <TableCell sx={{ bgcolor: NAVY, border: '1px solid #1a4a7a', py: 0.6 }} />
      </TableRow>
      {/* Ligne 2 : colonnes détail */}
      <TableRow>
        {[
          hCell('N°#', 'center', 40),
          hCell('Type', 'center', 90),
          hCell('Code', 'center', 70),
          hCell('Rubriques', 'left'),
          hCell('Nombre', 'center', 70),
          hCell('Base de Calcul', 'center', 100),
          hCell('Gain', 'center', 80),
          hCell('Taux', 'center', 65),
          hCell('Retenu', 'center', 80),
          hCell('taux', 'center', 65),
          hCell('Retenu (-)', 'center', 80),
          hCell('', 'center', 36),
        ].map(({ label, align, width }, i) => (
          <TableCell key={i} align={align as 'left' | 'center' | 'right'} width={width}
            sx={{
              bgcolor: NAVY, color: '#fff', fontWeight: 700, fontSize: 11,
              border: '1px solid #1a4a7a', py: 0.5, px: 1,
              // colonnes Part Salariale (6-8) en fond légèrement différent
              ...(i >= 6 && i <= 8  ? { bgcolor: '#1a3f6a' } : {}),
              ...(i >= 9 && i <= 10 ? { bgcolor: '#142f55' } : {}),
            }}>
            {label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

// ── Ligne de séparation (rupture) avec collapse ──────────────────────────────

function SectionBreak({
  label, collapsed, onToggle, count,
}: { label: string; collapsed: boolean; onToggle: () => void; count: number }) {
  return (
    <TableRow
      onClick={onToggle}
      sx={{ cursor: 'pointer', userSelect: 'none', '&:hover td': { bgcolor: '#d4dce8' } }}
    >
      <TableCell colSpan={12}
        sx={{
          bgcolor: '#e8edf3', color: NAVY, fontWeight: 700, fontSize: 11,
          border: '1px solid #CBD5E1', py: 0.35, px: 1.5, letterSpacing: 0.5,
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ExpandMoreIcon sx={{
            fontSize: 16, color: NAVY, transition: 'transform 0.2s',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }} />
          {label}
          {count > 0 && (
            <Chip
              label={collapsed ? `${count} ligne${count > 1 ? 's' : ''} masquée${count > 1 ? 's' : ''}` : `${count} ligne${count > 1 ? 's' : ''}`}
              size="small"
              sx={{ height: 16, fontSize: 9.5, fontWeight: 700, ml: 0.5,
                bgcolor: collapsed ? '#CBD5E1' : '#BFDBFE',
                color:   collapsed ? '#475569'  : NAVY }}
            />
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ── Ligne de sous-total ──────────────────────────────────────────────────────

function SubtotalRow({
  lines, type,
}: { lines: PayrollTemplateLine[]; type: TemplateLineType }) {
  const sLines = lines.filter(l => l.type === type);
  const totalGain      = sLines.reduce((s, l) => s + (Number(l.gain)            || 0), 0);
  const totalRetenuSal = sLines.reduce((s, l) => s + (Number(l.retenu_salarial) || 0), 0);
  const totalRetenuPat = sLines.reduce((s, l) => s + (Number(l.retenu_patronal) || 0), 0);

  return (
    <TableRow sx={{ bgcolor: '#f0f4f8' }}>
      <TableCell colSpan={6} sx={{ fontWeight: 700, fontSize: 11, border: '1px solid #CBD5E1', px: 1 }}>
        Sous-Total {SECTION_LABELS[type]}
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, border: '1px solid #CBD5E1', px: 1, color: totalGain === 0 ? '#9ca3af' : 'inherit' }}>
        {totalGain === 0 ? '—' : totalGain.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell sx={{ border: '1px solid #CBD5E1' }} />
      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, border: '1px solid #CBD5E1', px: 1, color: totalRetenuSal === 0 ? '#9ca3af' : 'inherit' }}>
        {totalRetenuSal === 0 ? '—' : totalRetenuSal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell sx={{ border: '1px solid #CBD5E1' }} />
      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, border: '1px solid #CBD5E1', px: 1, color: totalRetenuPat === 0 ? '#9ca3af' : 'inherit' }}>
        {totalRetenuPat === 0 ? '—' : totalRetenuPat.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell sx={{ border: '1px solid #CBD5E1' }} />
    </TableRow>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────

interface Props {
  open: boolean;
  template?: PayrollTemplate | null;
  onClose: () => void;
}

export default function PayrollTemplateDialog({ open, template, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(template?.id);

  // ── État en-tête ──────────────────────────────────────────────────────────
  const [name,         setName]        = useState('');
  const [description,  setDescription] = useState('');
  const [creationDate, setCreationDate] = useState('');
  const [isActive,     setIsActive]    = useState(true);

  // ── État lignes ───────────────────────────────────────────────────────────
  const [lines, setLines] = useState<PayrollTemplateLine[]>([]);

  // ── Modal sélection rubrique ──────────────────────────────────────────────
  const [modalType,   setModalType]   = useState<TemplateLineType | null>(null);
  const [pendingType, setPendingType] = useState<TemplateLineType>('augmentation');

  // ── Sections repliées ────────────────────────────────────────────────────
  const [collapsedSections, setCollapsedSections] = useState<Set<TemplateLineType>>(new Set());
  const toggleSection = (type: TemplateLineType) =>
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });

  // ── Chargement du template complet (avec lignes) en mode édition ──────────
  const { data: fullTemplate } = useQuery({
    queryKey: ['payroll-template', template?.id],
    queryFn:  () => getPayrollTemplate(template!.id),
    enabled:  open && Boolean(template?.id),
    staleTime: 0,
  });

  // ── Init au chargement ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    // En mode édition, attendre que les lignes soient chargées
    const src = fullTemplate ?? template;
    setName(src?.name ?? '');
    setDescription(src?.description ?? '');
    setCreationDate(src?.creation_date ?? '');
    setIsActive(src?.is_active ?? true);
    setLines(src?.lines?.length ? src.lines : [...DEFAULT_BASE_LINES]);
  }, [open, fullTemplate, template]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const payload = { name, description, creation_date: creationDate, is_active: isActive, lines };
      return isEdit
        ? updatePayrollTemplate(template!.id, payload)
        : createPayrollTemplate(payload as Parameters<typeof createPayrollTemplate>[0]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-templates'] });
      onClose();
    },
  });

  // ── Gestion lignes ────────────────────────────────────────────────────────

  const addFromRubriques = (selected: RubriqueOption[]) => {
    const type = modalType!;
    const newLines: PayrollTemplateLine[] = selected.map(r => ({
      type,
      rubrique_id:   r.id,
      rubrique_type: r.rubrique_type,
      code:          r.code,
      libelle:       r.libelle,
      nombre:        0,
      base_calcul:   0,
      gain:          0,
      taux_salarial:   r.taux_salarial,
      retenu_salarial: r.valeur ?? 0,
      taux_patronal:   r.taux_patronal,
      retenu_patronal: 0,
    }));
    setLines(prev => [...prev, ...newLines]);
    setModalType(null);
  };

  const updateLine = (idx: number, field: keyof PayrollTemplateLine, raw: string | number) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: raw };
      if (updated.type === 'base') {
        // Rubriques de base : gain = base_calcul * taux_salarial / 100
        if (field === 'base_calcul' || field === 'taux_salarial') {
          const newBase = field === 'base_calcul' ? +raw : updated.base_calcul;
          const newTaux = field === 'taux_salarial' ? +raw : updated.taux_salarial;
          updated.gain = computeRetenu(newBase, newTaux);
        }
      } else if (updated.type === 'retenue') {
        // Retenues : saisie directe de retenu_salarial, pas de calcul auto
      } else {
        // Autres types : retenu = base_calcul * taux / 100
        if (field === 'base_calcul' || field === 'taux_salarial') {
          updated.retenu_salarial = computeRetenu(
            field === 'base_calcul' ? +raw : updated.base_calcul,
            field === 'taux_salarial' ? +raw : updated.taux_salarial,
          );
        }
        if (field === 'base_calcul' || field === 'taux_patronal') {
          updated.retenu_patronal = computeRetenu(
            field === 'base_calcul' ? +raw : updated.base_calcul,
            field === 'taux_patronal' ? +raw : updated.taux_patronal,
          );
        }
      }
      return updated;
    }));
  };

  const removeLine = (idx: number) =>
    setLines(prev => prev.filter((_, i) => i !== idx));

  // ── Numérotation globale ──────────────────────────────────────────────────
  const linesByType = (type: TemplateLineType) => lines.filter(l => l.type === type);

  let globalNum = 0;

  // Totaux généraux (Number() pour gérer les strings décimales de MySQL)
  const totalGain      = lines.reduce((s, l) => s + (Number(l.gain)            || 0), 0);
  const totalRetenuSal = lines.reduce((s, l) => s + (Number(l.retenu_salarial) || 0), 0);
  const totalRetenuPat = lines.reduce((s, l) => s + (Number(l.retenu_patronal) || 0), 0);

  // Already-selected ids par type pour le modal
  const alreadySelectedIds = lines
    .filter(l => l.type === (modalType ?? pendingType) && l.rubrique_id)
    .map(l => l.rubrique_id!);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth={false}
        PaperProps={{ sx: { width: '92vw', maxWidth: 1320, maxHeight: '92vh', borderRadius: 1, overflow: 'hidden' } }}>

        {/* ── Titre ────────────────────────────────────────────────────────── */}
        <DialogTitle sx={{
          bgcolor: NAVY, color: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', py: 1, px: 2, fontSize: 14, fontWeight: 700,
        }}>
          {isEdit ? 'Modification' : 'Création'} d'un modèle fiche de Paie
          <Stack direction="row" gap={1}>
            <Button size="small" variant="contained"
              onClick={() => save()}
              disabled={isPending || !name.trim()}
              sx={{ bgcolor: '#ff7631', '&:hover': { bgcolor: '#e5681f' }, fontSize: 12, py: 0.4 }}>
              Sauvegarder
            </Button>
            <Button size="small" variant="outlined"
              onClick={onClose}
              sx={{ color: '#fff', borderColor: '#ffffff55', fontSize: 12, py: 0.4 }}>
              Fermer
            </Button>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── En-tête ───────────────────────────────────────────────────── */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #CBD5E1', bgcolor: LIGHT }}>
            <Stack direction="row" gap={2} alignItems="flex-start" flexWrap="wrap">
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#374151', fontSize: 11 }}>
                  Date de Création
                </Typography>
                <TextField
                  type="date" size="small" value={creationDate}
                  onChange={e => setCreationDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ display: 'block', mt: 0.5, '& input': { fontSize: 12 }, width: 140 }}
                />
              </Box>
              <Box sx={{ flex: '0 0 200px' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#374151', fontSize: 11 }}>
                  Nom Modèle *
                </Typography>
                <TextField
                  size="small" fullWidth value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nom du modèle"
                  sx={{ display: 'block', mt: 0.5, '& input': { fontSize: 12 } }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#374151', fontSize: 11 }}>
                  Description Modèle
                </Typography>
                <TextField
                  size="small" fullWidth value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Description..."
                  sx={{ display: 'block', mt: 0.5, '& input': { fontSize: 12 } }}
                />
              </Box>
              <Box sx={{ pt: 2.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      icon={<CheckBoxOutlineBlankIcon />}
                      checkedIcon={<CheckBoxIcon />}
                      sx={{ '&.Mui-checked': { color: NAVY } }}
                      size="small"
                    />
                  }
                  label={<Typography sx={{ fontSize: 12 }}>Actif</Typography>}
                />
              </Box>
            </Stack>
          </Box>

          {/* ── Barre d'actions ────────────────────────────────────────────── */}
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #CBD5E1', display: 'flex', gap: 1 }}>
            <Stack direction="row" gap={1} alignItems="center">
              <Select
                size="small"
                value={pendingType}
                onChange={e => setPendingType(e.target.value as TemplateLineType)}
                sx={{ fontSize: 12, height: 30, minWidth: 140 }}>
                {TYPE_SELECT_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 12 }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              <Button
                size="small" variant="outlined"
                onClick={() => setModalType(pendingType)}
                sx={{
                  fontSize: 11, py: 0.3, px: 1.5, borderColor: NAVY, color: NAVY,
                  borderRadius: 20, '&:hover': { bgcolor: '#f0f4f8' },
                }}>
                Ajouter une ligne
              </Button>
            </Stack>
          </Box>

          {/* ── Tableau ────────────────────────────────────────────────────── */}
          <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
            <Table size="small" sx={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
              <TableHeader />
              <TableBody>
                {SECTION_ORDER.map(sectionType => {
                  const sectionLines = linesByType(sectionType);
                  const isCollapsed  = collapsedSections.has(sectionType);
                  return (
                    <>
                      {/* Rupture avec toggle */}
                      <SectionBreak
                        key={`break-${sectionType}`}
                        label={SECTION_LABELS[sectionType]}
                        collapsed={isCollapsed}
                        onToggle={() => toggleSection(sectionType)}
                        count={sectionLines.length}
                      />

                      {/* Lignes de la section (masquées si replié) */}
                      {!isCollapsed && sectionLines.map(line => {
                        const idx = lines.indexOf(line);
                        globalNum++;
                        const num = globalNum;
                        return (
                          <TableRow key={idx} hover>
                            {/* N° */}
                            <TableCell align="center"
                              sx={{ fontSize: 11, border: '1px solid #E2E8F0', bgcolor: '#f8fafc', p: 0.5 }}>
                              {num}
                            </TableCell>
                            {/* Type (éditable pour les lignes non-base) */}
                            <TableCell align="center"
                              sx={{ fontSize: 11, border: '1px solid #E2E8F0', p: 0.25 }}>
                              {line.type === 'base'
                                ? <Typography sx={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>Base</Typography>
                                : (
                                  <Select
                                    size="small"
                                    value={line.type}
                                    onChange={e => updateLine(idx, 'type', e.target.value as TemplateLineType)}
                                    sx={{ fontSize: 10, height: 22, minWidth: 80, '& .MuiSelect-select': { py: 0.2, px: 0.5 } }}
                                  >
                                    {TYPE_SELECT_OPTIONS.map(opt => (
                                      <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 11 }}>
                                        {opt.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                )}
                            </TableCell>
                            {/* Code */}
                            <TableCell align="center"
                              sx={{ fontSize: 11, border: '1px solid #E2E8F0', p: 0.5, fontFamily: 'monospace' }}>
                              {line.code || '—'}
                            </TableCell>
                            {/* Libellé */}
                            <TableCell sx={{ fontSize: 11, border: '1px solid #E2E8F0', p: 0.5 }}>
                              {line.libelle}
                            </TableCell>
                            {/* Nombre (éditable) */}
                            <NumCell value={line.nombre} onChange={v => updateLine(idx, 'nombre', v)} blankOne />
                            {/* Base de Calcul (éditable) */}
                            <NumCell value={line.base_calcul} onChange={v => updateLine(idx, 'base_calcul', v)} />
                            {/* Gain (Part Salariale) */}
                            <NumCell value={line.gain} onChange={v => updateLine(idx, 'gain', v)} bgcolor="#fffef0" />
                            {/* Taux Salarial */}
                            <NumCell value={line.taux_salarial} onChange={v => updateLine(idx, 'taux_salarial', v)} bgcolor="#fffef0" />
                            {/* Retenu Salarial — toujours éditable */}
                            <NumCell value={line.retenu_salarial} onChange={v => updateLine(idx, 'retenu_salarial', v)} bgcolor="#fffef0" />
                            {/* Taux Patronal */}
                            <NumCell value={line.taux_patronal} onChange={v => updateLine(idx, 'taux_patronal', v)} bgcolor="#f5f5f5" />
                            {/* Retenu Patronal — toujours éditable */}
                            <NumCell value={line.retenu_patronal} onChange={v => updateLine(idx, 'retenu_patronal', v)} bgcolor="#f5f5f5" />
                            {/* Supprimer (désactivé pour les rubriques fixes de base) */}
                            <TableCell align="center"
                              sx={{ border: '1px solid #E2E8F0', p: 0.25 }}>
                              {line.type !== 'base' && (
                                <Button size="small" onClick={() => removeLine(idx)}
                                  sx={{ minWidth: 0, p: 0.25, color: '#ef4444' }}>
                                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Sous-total de section (masqué si replié) */}
                      {!isCollapsed && sectionLines.length > 0 && (
                        <SubtotalRow key={`subtotal-${sectionType}`} lines={lines} type={sectionType} />
                      )}
                    </>
                  );
                })}

                {/* Ligne vide si aucune ligne */}
                {lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} align="center"
                      sx={{ py: 4, color: 'text.secondary', fontSize: 12 }}>
                      Aucune ligne. Sélectionnez un type et cliquez sur "Ajouter une ligne".
                    </TableCell>
                  </TableRow>
                )}

                {/* Total général */}
                {lines.length > 0 && (
                  <TableRow sx={{ bgcolor: '#1a3d6b' }}>
                    <TableCell colSpan={6}
                      sx={{ color: '#fff', fontWeight: 700, fontSize: 12, border: '1px solid #0d2a50', px: 1 }}>
                      TOTAL GÉNÉRAL
                    </TableCell>
                    <TableCell align="right"
                      sx={{ color: totalGain === 0 ? 'rgba(255,255,255,0.4)' : '#fff', fontWeight: 700, fontSize: 12, border: '1px solid #0d2a50', px: 1 }}>
                      {totalGain === 0 ? '—' : totalGain.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #0d2a50' }} />
                    <TableCell align="right"
                      sx={{ color: totalRetenuSal === 0 ? 'rgba(255,255,255,0.4)' : '#fff', fontWeight: 700, fontSize: 12, border: '1px solid #0d2a50', px: 1 }}>
                      {totalRetenuSal === 0 ? '—' : totalRetenuSal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #0d2a50' }} />
                    <TableCell align="right"
                      sx={{ color: totalRetenuPat === 0 ? 'rgba(255,255,255,0.4)' : '#fff', fontWeight: 700, fontSize: 12, border: '1px solid #0d2a50', px: 1 }}>
                      {totalRetenuPat === 0 ? '—' : totalRetenuPat.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #0d2a50' }} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      {/* ── Modal sélection rubriques ─────────────────────────────────────── */}
      {modalType && (
        <RubriqueSelectionModal
          open={Boolean(modalType)}
          type={modalType}
          alreadySelected={alreadySelectedIds}
          onConfirm={addFromRubriques}
          onClose={() => setModalType(null)}
        />
      )}
    </>
  );
}
