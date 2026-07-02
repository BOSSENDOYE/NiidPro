import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PayrollTemplateDialog from '../../components/payroll/PayrollTemplateDialog';
import { type PayrollTemplate, deletePayrollTemplate, getPayrollTemplates } from '../../api/payrollTemplates';
import { employeesApi } from '../../api/employees';
import { departmentsApi } from '../../api/departments';
import {
  Box, Typography, Stack, Button, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, Avatar, TextField,
  MenuItem, Divider, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, FormControl, InputLabel,
  Select, Switch, FormControlLabel, CircularProgress, TablePagination,
} from '@mui/material';
import {
  Add, Edit, Delete, Download, Print, PlayArrow, CheckCircle,
  Visibility, FilterList, BarChart, Search,
  ReceiptLong, Payments, AccountBalance, Description,
  Tune,
} from '@mui/icons-material';
import { recruitmentApi } from '../../api/recruitment';
import { useCompany } from '../../hooks/useCompany';
import HierarchiePanel from './tabs/HierarchiePanel';
import RubriquesPanel from './tabs/RubriquesPanel';
import BaremeImportDialog from './tabs/BaremeImportDialog';
import IndiceImportDialog from './tabs/IndiceImportDialog';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import GenerationPanel from './tabs/GenerationPanel';
import type {
  RecruitmentIndice, RecruitmentHierarchy,
  RecruitmentAugmentation, RecruitmentBareme,
  PaieClasse, PaieEchelon,
} from '../../types';

// ─── Palette cohérente avec LeavesPage ───────────────────────────
const NAV = '#0D2137';
const ACT = '#E85D04';
const TH  = '#1A3A5C';

// ─── Composant onglet ─────────────────────────────────────────────
function NavTab({
  label, icon, active, onClick, badge,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: '6px',
        px: 2, py: 1, cursor: 'pointer', borderRadius: '8px 8px 0 0',
        fontWeight: 700, fontSize: 13, userSelect: 'none',
        bgcolor:      active ? ACT : '#fff',
        color:        active ? '#fff' : TH,
        border:       `1.5px solid ${active ? ACT : '#93C5FD'}`,
        borderBottom: 'none',
        boxShadow:    active ? '0 -2px 8px rgba(232,93,4,0.25)' : 'none',
        transition:   'all 0.15s',
        '&:hover':    { bgcolor: active ? ACT : '#EFF6FF' },
        whiteSpace: 'nowrap',
      }}
    >
      <Box sx={{ '& svg': { fontSize: 15 } }}>{icon}</Box>
      {label}
      {badge !== undefined && badge > 0 && (
        <Box sx={{
          px: 0.9, borderRadius: '10px', fontSize: 11, fontWeight: 800,
          lineHeight: '20px', minWidth: 20, textAlign: 'center',
          bgcolor: active ? 'rgba(255,255,255,0.28)' : '#E2E8F0',
          color:   active ? '#fff' : '#64748B',
        }}>
          {badge}
        </Box>
      )}
    </Box>
  );
}

// ─── Carte stat mini ──────────────────────────────────────────────
function MiniStat({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 140, bgcolor: bg, border: `1.5px solid ${color}25`, borderRadius: '10px', p: 1.75 }}>
      <Typography sx={{ fontSize: 11, color: '#64748B', mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color }}>{value}</Typography>
    </Box>
  );
}

// ─── Placeholder vide ─────────────────────────────────────────────
function EmptySlot({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ color: '#CBD5E1', mb: 1.5, '& svg': { fontSize: 52 } }}>{icon}</Box>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#94A3B8', mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: 12.5, color: '#CBD5E1' }}>{subtitle}</Typography>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 0 — Modèle Fiche de Paie (avec 2 sous-onglets)
// ═══════════════════════════════════════════════════════════════════

// ── Sous-onglet A : liste des modèles ────────────────────────────
function ListeModelesTab() {
  const qc = useQueryClient();
  const [dlgOpen,  setDlgOpen]  = useState(false);
  const [editItem, setEditItem] = useState<PayrollTemplate | null>(null);
  const [toDel, setToDel] = useState<number | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['payroll-templates'],
    queryFn:  getPayrollTemplates,
  });

  const delMut = useMutation({
    mutationFn: deletePayrollTemplate,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['payroll-templates'] }),
  });

  const openNew  = () => { setEditItem(null); setDlgOpen(true); };
  const openEdit = (t: PayrollTemplate) => { setEditItem(t); setDlgOpen(true); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: TH }}>
          Modèles disponibles ({templates.length})
        </Typography>
        <Button size="small" variant="outlined" startIcon={<Add />} onClick={openNew}
          sx={{ borderRadius: '7px', fontSize: 12, borderColor: TH, color: TH }}>
          Nouveau modèle
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : (
        <Box sx={{ p: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {templates.map((t: PayrollTemplate) => (
            <Box key={t.id} sx={{
              width: 280, border: '1.5px solid #CBD5E1', borderRadius: '10px',
              p: 2.5, bgcolor: '#fff', position: 'relative',
              '&:hover': { borderColor: ACT, boxShadow: '0 2px 12px rgba(232,93,4,0.12)' },
              transition: 'all 0.15s',
            }}>
              <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                <Chip label={t.is_active ? 'Actif' : 'Inactif'} size="small" sx={{
                  fontSize: 10, height: 18, fontWeight: 700,
                  bgcolor: t.is_active ? '#ECFDF5' : '#F1F5F9',
                  color:   t.is_active ? '#059669'  : '#94A3B8',
                }} />
              </Box>
              <Description sx={{ fontSize: 32, color: NAV, mb: 1 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', mb: 0.5, pr: 5 }}>
                {t.name}
              </Typography>
              {t.description && (
                <Typography sx={{ fontSize: 11, color: '#64748B', mb: 1.5, lineHeight: 1.4 }}>
                  {t.description}
                </Typography>
              )}
              <Typography sx={{ fontSize: 10, color: '#94A3B8', mb: 1.5 }}>
                {t.creation_date ? new Date(t.creation_date).toLocaleDateString('fr-FR') : '—'}
              </Typography>
              <Stack direction="row" spacing={0.75}>
                <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => openEdit(t)}
                  sx={{ flex: 1, fontSize: 11, borderColor: NAV, color: NAV, py: 0.4 }}>
                  Modifier
                </Button>
                <Tooltip title="Supprimer">
                  <IconButton size="small"
                    onClick={() => setToDel(t.id)}
                    sx={{ border: '1px solid #EF4444', color: '#EF4444', borderRadius: '6px' }}>
                    <Delete sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ))}

          <Box onClick={openNew} sx={{
            width: 280, border: '2px dashed #CBD5E1', borderRadius: '10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            py: 5, cursor: 'pointer', color: '#94A3B8',
            '&:hover': { borderColor: ACT, color: ACT, bgcolor: '#FFF7F0' },
            transition: 'all 0.15s',
          }}>
            <Add sx={{ fontSize: 32, mb: 0.75 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Nouveau modèle</Typography>
          </Box>
        </Box>
      )}

      <PayrollTemplateDialog open={dlgOpen} template={editItem} onClose={() => setDlgOpen(false)} />

      <ConfirmDialog
        open={toDel !== null}
        message="Supprimer ce modèle de bulletin ?"
        onConfirm={() => toDel !== null && delMut.mutate(toDel)}
        onClose={() => setToDel(null)}
      />
    </Box>
  );
}

// ── Sous-onglet B : affecter un modèle aux employés ──────────────
function AffecterFicheTab() {
  const qc = useQueryClient();

  // ── Filtres ──────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [deptId,       setDeptId]       = useState<number | ''>('');
  const [gradeFilter,  setGradeFilter]  = useState('');
  const [affectStatus, setAffectStatus] = useState<'' | 'affected' | 'unaffected'>('');

  // ── Sélection ────────────────────────────────────────────────────
  const [selected, setSelected] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────
  const { data: empData, isLoading: loadEmp } = useQuery({
    queryKey: ['employees-paie', search, deptId],
    queryFn:  () => employeesApi.list({
      search: search || undefined,
      department_id: deptId || undefined,
      per_page: 500,
    }).then(r => r.data),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['payroll-templates'],
    queryFn:  getPayrollTemplates,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn:  () => departmentsApi.list().then(r => r.data),
  });

  // ── Liste filtrée côté client ─────────────────────────────────────
  const allEmps: import('../../types').Employee[] = (empData as { data: import('../../types').Employee[] } | undefined)?.data ?? [];

  const employees = allEmps.filter(e => {
    if (affectStatus === 'affected'   && !e.payroll_template_id) return false;
    if (affectStatus === 'unaffected' &&  e.payroll_template_id) return false;
    if (gradeFilter && !(e.position?.title ?? '').toLowerCase().includes(gradeFilter.toLowerCase())) return false;
    return true;
  });

  // ── Mutation individuelle (ligne) ────────────────────────────────
  const assignMut = useMutation({
    mutationFn: ({ id, templateId }: { id: number; templateId: number | null }) =>
      employeesApi.update(id, { payroll_template_id: templateId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees-paie'] }),
  });

  // ── Affectation groupée AUTO dès sélection du modèle ────────────
  const handleAutoAssign = async (templateId: number | '') => {
    if (!templateId || selected.length === 0 || assigning) return;
    setAssigning(true);
    await Promise.all(selected.map(id => employeesApi.update(id, { payroll_template_id: templateId })));
    await qc.invalidateQueries({ queryKey: ['employees-paie'] });
    setSelected([]);
    setAssigning(false);
  };

  // ── Sélection cases à cocher ─────────────────────────────────────
  const toggleSelect  = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () => {
    const ids = employees.map(e => e.id);
    setSelected(prev => prev.length === ids.length ? [] : ids);
  };

  const allSelected  = employees.length > 0 && selected.length === employees.length;
  const someSelected = selected.length > 0 && !allSelected;

  const resetFilters = () => {
    setSearch(''); setDeptId(''); setGradeFilter(''); setAffectStatus('');
    setSelected([]);
  };

  const activeTemplates = (templates as PayrollTemplate[]).filter(t => t.is_active);

  // Nom du modèle depuis son id
  const templateName = (id?: number | null) =>
    id ? (templates as PayrollTemplate[]).find(t => t.id === id)?.name ?? '—' : null;

  return (
    <Box>
      {/* ── Filtres ─────────────────────────────────────────────────── */}
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Matricule / Nom */}
        <TextField
          size="small" placeholder="Matricule ou nom…" value={search}
          onChange={e => { setSearch(e.target.value); setSelected([]); }}
          InputProps={{ startAdornment: <Search sx={{ fontSize: 15, color: '#94A3B8', mr: 0.5 }} /> }}
          sx={{ width: 200, '& input': { fontSize: 12 } }}
        />

        {/* Direction */}
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel sx={{ fontSize: 12 }}>Direction</InputLabel>
          <Select label="Direction" value={deptId}
            onChange={e => { setDeptId(e.target.value as number | ''); setSelected([]); }}
            sx={{ fontSize: 12 }}>
            <MenuItem value="" sx={{ fontSize: 12 }}><em>Toutes</em></MenuItem>
            {(departments as { id: number; name: string }[]).map(d => (
              <MenuItem key={d.id} value={d.id} sx={{ fontSize: 12 }}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Grade / Poste */}
        <TextField
          size="small" label="Grade / Poste" value={gradeFilter}
          onChange={e => { setGradeFilter(e.target.value); setSelected([]); }}
          sx={{ width: 160, '& input': { fontSize: 12 } }}
        />

        {/* Statut affectation */}
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel sx={{ fontSize: 12 }}>Affectation</InputLabel>
          <Select label="Affectation" value={affectStatus}
            onChange={e => { setAffectStatus(e.target.value as '' | 'affected' | 'unaffected'); setSelected([]); }}
            sx={{ fontSize: 12 }}>
            <MenuItem value=""      sx={{ fontSize: 12 }}>Tous les agents</MenuItem>
            <MenuItem value="affected"   sx={{ fontSize: 12 }}>Déjà affecté</MenuItem>
            <MenuItem value="unaffected" sx={{ fontSize: 12 }}>Non affecté</MenuItem>
          </Select>
        </FormControl>

        {/* Reset */}
        <Button size="small" variant="outlined" onClick={resetFilters}
          sx={{ fontSize: 11, borderColor: '#CBD5E1', color: '#64748B', borderRadius: '7px' }}>
          Réinitialiser
        </Button>

        {/* Compteur */}
        <Typography sx={{ ml: 'auto', fontSize: 12, color: '#64748B' }}>
          {employees.length} agent{employees.length > 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* ── Barre d'action groupée (apparaît quand sélection active) ── */}
      {selected.length > 0 && (
        <Box sx={{
          px: 2.5, py: 1.25, bgcolor: '#002f59', display: 'flex', gap: 2,
          alignItems: 'center', flexWrap: 'wrap',
        }}>
          <Typography sx={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>
            {selected.length} agent{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
          </Typography>

          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
            — Choisir le modèle à affecter :
          </Typography>

          <FormControl size="small" sx={{ minWidth: 240, bgcolor: '#fff', borderRadius: 1 }}>
            <Select
              value=""
              onChange={e => handleAutoAssign(e.target.value as number)}
              displayEmpty
              disabled={assigning}
              sx={{ fontSize: 12 }}>
              <MenuItem value="" disabled sx={{ fontSize: 12 }}>
                {assigning ? 'Affectation en cours…' : '— Sélectionner un modèle —'}
              </MenuItem>
              {activeTemplates.map(t => (
                <MenuItem key={t.id} value={t.id} sx={{ fontSize: 12 }}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {assigning && <CircularProgress size={18} sx={{ color: '#ff7631' }} />}

          <Button size="small" onClick={() => setSelected([])}
            sx={{ ml: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
            Désélectionner tout
          </Button>
        </Box>
      )}

      {/* ── Tableau ─────────────────────────────────────────────────── */}
      {loadEmp ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : (
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ bgcolor: NAV }}>
                  <input type="checkbox"
                    checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer', accentColor: '#ff7631' }} />
                </TableCell>
                {['Matricule', 'Nom Complet', 'Direction', 'Grade / Poste', 'Modèle Fiche de Paie'].map(h => (
                  <TableCell key={h} sx={{ bgcolor: NAV, color: '#fff', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', color: '#94A3B8', py: 4, fontSize: 12 }}>
                    Aucun agent trouvé avec ces filtres
                  </TableCell>
                </TableRow>
              ) : employees.map((emp, i) => {
                const isSelected = selected.includes(emp.id);
                return (
                  <TableRow key={emp.id} hover
                    onClick={() => toggleSelect(emp.id)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? '#EFF6FF' : i % 2 === 0 ? '#fff' : '#F8FAFC',
                      '&:hover': { bgcolor: '#EFF6FF' },
                    }}>
                    <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleSelect(emp.id)}
                        style={{ cursor: 'pointer', accentColor: '#002f59' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: NAV }}>
                      {emp.employee_number}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>
                      {emp.last_name} {emp.first_name}
                    </TableCell>
                    <TableCell>
                      {emp.department?.name
                        ? <Chip label={emp.department.name} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 600 }} />
                        : <Typography sx={{ fontSize: 11, color: '#CBD5E1' }}>—</Typography>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>
                      {emp.position?.title ?? '—'}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()} sx={{ minWidth: 210 }}>
                      <Select
                        size="small"
                        value={emp.payroll_template_id ?? ''}
                        onChange={e => assignMut.mutate({
                          id: emp.id,
                          templateId: e.target.value === '' ? null : Number(e.target.value),
                        })}
                        displayEmpty
                        disabled={assignMut.isPending}
                        sx={{
                          fontSize: 11, width: '100%',
                          bgcolor: emp.payroll_template_id ? '#fff8f0' : '#F8FAFC',
                          color: emp.payroll_template_id ? '#e65100' : '#94A3B8',
                          fontWeight: emp.payroll_template_id ? 700 : 400,
                          '& .MuiSelect-select': { py: 0.7, px: 1.25 },
                          '& fieldset': { borderColor: emp.payroll_template_id ? '#ff763155' : '#E2E8F0' },
                          '&:hover fieldset': { borderColor: emp.payroll_template_id ? '#ff7631' : '#94A3B8' },
                        }}>
                        <MenuItem value="" sx={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
                          — Non affecté —
                        </MenuItem>
                        {activeTemplates.map(t => (
                          <MenuItem key={t.id} value={t.id} sx={{ fontSize: 11 }}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// ── Conteneur avec les 2 sous-onglets ────────────────────────────
function ModeleFicheTab() {
  const [sub, setSub] = useState(0);

  const SUB_TABS = [
    { label: 'Modèle Fiche de Paie' },
    { label: 'Affecter Fiche de Paie' },
  ];

  return (
    <Box>
      {/* Barre de sous-onglets */}
      <Box sx={{
        display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0', bgcolor: '#F8FAFC',
      }}>
        {SUB_TABS.map((t, i) => (
          <Box key={i} onClick={() => setSub(i)} sx={{
            px: 3, py: 1.25, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
            borderBottom: `2.5px solid ${sub === i ? NAV : 'transparent'}`,
            color: sub === i ? NAV : '#64748B',
            bgcolor: sub === i ? '#fff' : 'transparent',
            mb: '-2px',
            '&:hover': { color: NAV },
            transition: 'all 0.15s',
            userSelect: 'none',
          }}>
            {t.label}
          </Box>
        ))}
      </Box>

      {/* Contenu */}
      {sub === 0 ? <ListeModelesTab /> : <AffecterFicheTab />}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 1 — Bulletin de Paie
// ═══════════════════════════════════════════════════════════════════
function BulletinPaieTab() {
  return <GenerationPanel />;
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 2 — Gestion des Indemnités
// ═══════════════════════════════════════════════════════════════════
function GestionIndemnitesTab() {
  const rows: { code: string; libelle: string; mode: string; valeur: string; impose: string; statut: string }[] = [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: TH }}>Types d'indemnités ({rows.length})</Typography>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Nouvelle indemnité
        </Button>
      </Box>

      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                {['Code','Libellé','Mode de calcul','Valeur','Imposable','Statut','Actions'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ border: 'none', p: 0 }}>
                      <EmptySlot icon={<Payments />} title="Aucune indemnité configurée" subtitle="Cliquez sur « Nouvelle indemnité » pour en ajouter une" />
                    </TableCell>
                  </TableRow>
                )
                : rows.map((row, i) => (
                  <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' }}>{row.code}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{row.libelle}</TableCell>
                    <TableCell>
                      <Chip label={row.mode} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{row.valeur}</TableCell>
                    <TableCell>
                      <Chip label={row.impose} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700,
                        bgcolor: row.impose === 'Oui' ? '#FEF2F2' : '#ECFDF5',
                        color:   row.impose === 'Oui' ? '#DC2626'  : '#059669',
                      }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={row.statut} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700,
                        bgcolor: row.statut === 'actif' ? '#ECFDF5' : '#F1F5F9',
                        color:   row.statut === 'actif' ? '#059669'  : '#94A3B8',
                      }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.25}>
                        <Tooltip title="Modifier"><IconButton size="small"><Edit sx={{ fontSize: 14, color: '#2563EB' }} /></IconButton></Tooltip>
                        <Tooltip title="Supprimer"><IconButton size="small"><Delete sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 3 — Rapport des États
// ═══════════════════════════════════════════════════════════════════
function RapportEtatsTab() {
  return (
    <Box>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField select label="Période" size="small" defaultValue="mensuel" sx={{ width: 140, bgcolor: '#fff' }}>
          {['mensuel','trimestriel','annuel'].map((v) => <MenuItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</MenuItem>)}
        </TextField>
        <TextField select label="Mois" size="small" defaultValue="6" sx={{ width: 130, bgcolor: '#fff' }}>
          {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
            .map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
        </TextField>
        <TextField type="number" label="Année" size="small" defaultValue={2026} sx={{ width: 100, bgcolor: '#fff' }} />
        <Button size="small" variant="contained" startIcon={<FilterList />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Générer rapport
        </Button>
        <Button size="small" variant="outlined" startIcon={<Download />}
          sx={{ borderRadius: '7px', fontSize: 12, borderColor: '#CBD5E1', color: '#64748B', ml: 'auto' }}>
          Exporter CSV
        </Button>
      </Box>

      {/* Cards résumé */}
      <Box sx={{ display: 'flex', gap: 1.5, p: 2.5, flexWrap: 'wrap' }}>
        <MiniStat label="Total agents payés"    value="0"    color="#2563EB" bg="#EFF6FF" />
        <MiniStat label="Masse salariale brute" value="0 F"  color="#059669" bg="#ECFDF5" />
        <MiniStat label="Total retenues"        value="0 F"  color="#DC2626" bg="#FEF2F2" />
        <MiniStat label="Total charges pat."    value="0 F"  color="#D97706" bg="#FFFBEB" />
        <MiniStat label="Masse nette versée"    value="0 F"  color="#7C3AED" bg="#F5F3FF" />
      </Box>

      {/* Tableau par direction */}
      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
        <Box sx={{ bgcolor: '#334155', px: 2, py: 0.75 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Récapitulatif par Direction
          </Typography>
        </Box>
        <EmptySlot icon={<BarChart />} title="Aucun rapport disponible" subtitle="Générez la paie du mois puis cliquez sur « Générer rapport »" />
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 4 — États de Paiement
// ═══════════════════════════════════════════════════════════════════
function EtatsPaiementTab() {
  const rows: { num: string; nom: string; net: string; mode: string; statut: string; date: string }[] = [];

  return (
    <Box>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: TH }}>Paiements du mois en cours</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button size="small" variant="contained"
            startIcon={<CheckCircle />}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
            Confirmer tous les paiements
          </Button>
          <Button size="small" variant="outlined" startIcon={<Download />}
            sx={{ borderRadius: '7px', fontSize: 12, borderColor: '#CBD5E1', color: '#64748B' }}>
            Ordre de virement
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, px: 2.5, py: 2, flexWrap: 'wrap' }}>
        <MiniStat label="Total à payer"  value="0 F" color="#2563EB" bg="#EFF6FF" />
        <MiniStat label="Payés"          value="0 F" color="#059669" bg="#ECFDF5" />
        <MiniStat label="En attente"     value="0 F" color="#D97706" bg="#FFFBEB" />
      </Box>

      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                {['Matricule','Agent','Net à Payer','Mode de Paiement','Statut','Date Paiement','Action'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ border: 'none', p: 0 }}>
                      <EmptySlot icon={<AccountBalance />} title="Aucun paiement à traiter" subtitle="Générez et validez les bulletins pour voir les états de paiement" />
                    </TableCell>
                  </TableRow>
                )
                : rows.map((row, i) => (
                  <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' }}>{row.num}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{row.nom}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{row.net}</TableCell>
                    <TableCell>
                      <Chip label={row.mode} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={row.statut} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700,
                        bgcolor: row.statut === 'payé' ? '#ECFDF5' : '#FFFBEB',
                        color:   row.statut === 'payé' ? '#059669'  : '#D97706',
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{row.date}</TableCell>
                    <TableCell>
                      {row.statut !== 'payé' && (
                        <Button size="small" variant="contained"
                          sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, borderRadius: '6px', fontSize: 10, fontWeight: 700, py: 0.25, px: 1 }}>
                          Confirmer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 5 — Paramètres (connectés à l'API)
// ═══════════════════════════════════════════════════════════════════

function SubTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Box onClick={onClick} sx={{
      px: 2, py: 0.75, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
      borderBottom: `2.5px solid ${active ? '#2563EB' : 'transparent'}`,
      color: active ? '#2563EB' : '#64748B',
      '&:hover': { color: '#2563EB' },
      transition: 'all 0.15s',
      userSelect: 'none',
    }}>
      {label}
    </Box>
  );
}

function ParametresTab() {
  const qc = useQueryClient();
  const [sub, setSub] = useState(0);

  // ── Queries ──
  const { data: indices = [], isLoading: li } = useQuery({
    queryKey: ['payroll', 'params', 'indices'],
    queryFn: () => recruitmentApi.getIndices().then((r) => r.data),
  });
  const { data: hierarchies = [], isLoading: lh } = useQuery({
    queryKey: ['payroll', 'params', 'hierarchies'],
    queryFn: () => recruitmentApi.getHierarchies().then((r) => r.data),
  });
  const { data: augmentations = [] } = useQuery({
    queryKey: ['payroll', 'params', 'augmentations'],
    queryFn: () => recruitmentApi.getAugmentations().then((r) => r.data),
  });
  const { data: baremes = [], isLoading: lb } = useQuery({
    queryKey: ['payroll', 'params', 'baremes'],
    queryFn: () => recruitmentApi.getBaremes().then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['payroll', 'params'] });

  // ── Dialog + form state ──
  const [dlg, setDlg] = useState<{ type: 'indice' | 'hier' | 'bareme' | null; item: unknown }>({ type: null, item: null });
  const [indF, setIndF]   = useState({ code: '', hierarchy_id: '', classe: '', echelon_label: '', valeur_point: '', valeur: '', solde_mensuelle: '', garde: '', description: '', is_active: true, augmentation_ids: [] as number[], augmentation_montants: {} as Record<number, string> });
  const [indClassId, setIndClassId] = useState<number | ''>('');

  const { data: indClasses = [] } = useQuery({
    queryKey: ['payroll', 'params', 'classes', indF.hierarchy_id],
    queryFn:  () => indF.hierarchy_id
      ? recruitmentApi.getClasses(Number(indF.hierarchy_id)).then(r => r.data)
      : Promise.resolve([]),
    enabled: !!indF.hierarchy_id,
  });

  const { data: indEchelons = [] } = useQuery({
    queryKey: ['payroll', 'params', 'echelons-dlg', indClassId],
    queryFn:  () => indClassId
      ? recruitmentApi.getEchelons({ class_id: Number(indClassId) }).then(r => r.data)
      : Promise.resolve([]),
    enabled: !!indClassId,
  });
  const [herF, setHerF]   = useState({ code: '', libelle: '', description: '', ordre: '0', is_active: true });
  const [barF, setBarF]   = useState({ revenu_brut: '', trimf_pers: '300', part_1: '0', part_1_5: '0', part_2: '0', part_2_5: '0', part_3: '0', part_3_5: '0', part_4: '0', part_4_5: '0', part_5: '0', id_bareme: '' });
  const [indF2, setIndF2] = useState({ hier: '', grade: '', numero: '' });

  const openDlg = (type: typeof dlg['type'], item?: unknown) => {
    setDlg({ type, item: item ?? null });
    if (type === 'indice') {
      const v = item as RecruitmentIndice | undefined;
      setIndClassId('');
      setIndF(v ? {
        code: v.code,
        hierarchy_id: v.hierarchy_id ? String(v.hierarchy_id) : '',
        classe: v.classe ?? '',
        echelon_label: v.echelon_label ?? '',
        valeur_point: v.valeur_point ? String(v.valeur_point) : '',
        valeur: String(v.valeur),
        solde_mensuelle: v.solde_mensuelle ? String(v.solde_mensuelle) : '',
        garde: v.garde ?? '',
        description: v.description ?? '',
        is_active: v.is_active,
        augmentation_ids: v.augmentations?.map((a) => a.id) ?? [],
        augmentation_montants: Object.fromEntries(
          (v.augmentations ?? []).map((a) => [a.id, a.pivot?.montant != null ? String(a.pivot.montant) : ''])
        ),
      } : { code: '', hierarchy_id: '', classe: '', echelon_label: '', valeur_point: '', valeur: '', solde_mensuelle: '', garde: '', description: '', is_active: true, augmentation_ids: [], augmentation_montants: {} });
    } else if (type === 'hier') {
      const v = item as RecruitmentHierarchy | undefined;
      setHerF(v ? { code: v.code, libelle: v.libelle, description: v.description ?? '', ordre: String(v.ordre), is_active: v.is_active } : { code: '', libelle: '', description: '', ordre: '0', is_active: true });
    } else if (type === 'bareme') {
      const v = item as RecruitmentBareme | undefined;
      setBarF(v ? {
        revenu_brut: String(v.revenu_brut ?? v.salaire_base ?? ''),
        trimf_pers: String(v.trimf_pers ?? 300),
        part_1: String(v.part_1 ?? 0),
        part_1_5: String(v.part_1_5 ?? 0),
        part_2: String(v.part_2 ?? 0),
        part_2_5: String(v.part_2_5 ?? 0),
        part_3: String(v.part_3 ?? 0),
        part_3_5: String(v.part_3_5 ?? 0),
        part_4: String(v.part_4 ?? 0),
        part_4_5: String(v.part_4_5 ?? 0),
        part_5: String(v.part_5 ?? 0),
        id_bareme: v.id_bareme ?? '',
      } : { revenu_brut: '', trimf_pers: '300', part_1: '0', part_1_5: '0', part_2: '0', part_2_5: '0', part_3: '0', part_3_5: '0', part_4: '0', part_4_5: '0', part_5: '0', id_bareme: String(Date.now()) });
    }
  };
  const closeDlg = () => setDlg({ type: null, item: null });

  // ── Mutations ──
  const saveInd = useMutation({
    mutationFn: () => {
      const augMontants: Record<number, number> = {};
      for (const id of indF.augmentation_ids) {
        const raw = indF.augmentation_montants[id];
        if (raw !== undefined && raw !== '') augMontants[id] = Number(raw);
      }
      const d = {
        code: indF.code,
        hierarchy_id: indF.hierarchy_id ? Number(indF.hierarchy_id) : null,
        classe: indF.classe || null,
        echelon_label: indF.echelon_label || null,
        valeur_point: indF.valeur_point ? Number(indF.valeur_point) : null,
        valeur: Number(indF.valeur),
        solde_mensuelle: indF.solde_mensuelle ? Number(indF.solde_mensuelle) : null,
        garde: indF.garde || null,
        description: indF.description || null,
        is_active: indF.is_active,
        augmentation_ids: indF.augmentation_ids,
        augmentation_montants: augMontants,
      };
      return (dlg.item as RecruitmentIndice | null)?.id
        ? recruitmentApi.updateIndice((dlg.item as RecruitmentIndice).id, d as never)
        : recruitmentApi.createIndice(d as never);
    },
    onSuccess: () => { invalidate(); closeDlg(); },
  });
  const delInd = useMutation({ mutationFn: (id: number) => recruitmentApi.deleteIndice(id), onSuccess: invalidate });

  const saveHer = useMutation({
    mutationFn: () => {
      const d = { ...herF, ordre: Number(herF.ordre) };
      return (dlg.item as RecruitmentHierarchy | null)?.id
        ? recruitmentApi.updateHierarchy((dlg.item as RecruitmentHierarchy).id, d)
        : recruitmentApi.createHierarchy(d);
    },
    onSuccess: () => { invalidate(); closeDlg(); },
  });
  const delHer = useMutation({ mutationFn: (id: number) => recruitmentApi.deleteHierarchy(id), onSuccess: invalidate });

  const saveBar = useMutation({
    mutationFn: () => {
      const d = {
        revenu_brut: Number(barF.revenu_brut) || 0,
        salaire_base: Number(barF.revenu_brut) || 0,
        trimf_pers: Number(barF.trimf_pers) || 0,
        part_1: Number(barF.part_1) || 0,
        part_1_5: Number(barF.part_1_5) || 0,
        part_2: Number(barF.part_2) || 0,
        part_2_5: Number(barF.part_2_5) || 0,
        part_3: Number(barF.part_3) || 0,
        part_3_5: Number(barF.part_3_5) || 0,
        part_4: Number(barF.part_4) || 0,
        part_4_5: Number(barF.part_4_5) || 0,
        part_5: Number(barF.part_5) || 0,
        id_bareme: barF.id_bareme || String(Date.now()),
      };
      return (dlg.item as RecruitmentBareme | null)?.id
        ? recruitmentApi.updateBareme((dlg.item as RecruitmentBareme).id, d as never)
        : recruitmentApi.createBareme(d as never);
    },
    onSuccess: () => { invalidate(); closeDlg(); },
  });
  useMutation({ mutationFn: (id: number) => recruitmentApi.deleteBareme(id), onSuccess: invalidate });

  const TH_CELL = { color: '#fff', fontWeight: 700, fontSize: 11, py: 1 };
  const subTabs = ['Indice', 'Rubriques', 'Hiérarchies', 'Barème', 'Rapports'];

  const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const now2 = new Date();
  const [rapF, setRapF] = useState({ annee: String(now2.getFullYear()), mois: String(now2.getMonth() + 1), matricule: '' });
  const [barF2, setBarF2] = useState({ revenu_brut: '', trimf_pers: '', parts: '' });
  const [impOpen, setImpOpen] = useState(false);
  const [indiceImpOpen, setIndiceImpOpen] = useState(false);
  const [indPage, setIndPage] = useState(0);
  const [indRowsPerPage, setIndRowsPerPage] = useState(50);
  const [barPage, setBarPage] = useState(0);
  const [barRowsPerPage, setBarRowsPerPage] = useState(50);

  return (
    <Box>
      {/* Sous-onglets */}
      <Box sx={{ display: 'flex', px: 2.5, pt: 1.5, gap: 0, borderBottom: '2px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
        {subTabs.map((s, i) => (
          <SubTab key={i} label={s} active={sub === i} onClick={() => setSub(i)} />
        ))}
      </Box>

      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>

        {/* ─── Indice ─── */}
        {sub === 0 && (() => {
          const filtered = indices.filter((r: RecruitmentIndice) => {
            const hierMatch = !indF2.hier || (r.hierarchy?.code ?? '').toLowerCase().includes(indF2.hier.toLowerCase());
            const gradeMatch = !indF2.grade || (r.garde ?? '').toLowerCase().includes(indF2.grade.toLowerCase());
            const numMatch   = !indF2.numero || String(r.valeur).includes(indF2.numero);
            return hierMatch && gradeMatch && numMatch;
          });
          return (
            <Box>
              {/* Titre */}
              <Box sx={{ bgcolor: '#0D2137', px: 2.5, py: 1.2 }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Liste des Indices</Typography>
              </Box>

              {/* Filtres */}
              <Box sx={{ m: 2, border: '1.5px solid #CBD5E1', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, px: 2.5, py: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Hiérarchie</Typography>
                    <TextField size="small" fullWidth value={indF2.hier}
                      onChange={(e) => { setIndF2((f) => ({ ...f, hier: e.target.value })); setIndPage(0); }}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Grade</Typography>
                    <TextField size="small" fullWidth value={indF2.grade}
                      onChange={(e) => { setIndF2((f) => ({ ...f, grade: e.target.value })); setIndPage(0); }}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Numéro Indice</Typography>
                    <TextField size="small" fullWidth value={indF2.numero}
                      onChange={(e) => { setIndF2((f) => ({ ...f, numero: e.target.value })); setIndPage(0); }}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pb: 0.25 }}>
                    <Button variant="outlined" size="small"
                      sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 90, color: '#2563EB', borderColor: '#2563EB' }}>
                      Chercher
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => { setIndF2({ hier: '', grade: '', numero: '' }); setIndPage(0); }}
                      sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 90, color: '#E85D04', borderColor: '#E85D04' }}>
                      Effacer
                    </Button>
                  </Box>
                </Box>
              </Box>

              {/* Boutons + corbeille */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, mb: 0.5, gap: 0.75, alignItems: 'center' }}>
                <Button variant="outlined" size="small" onClick={() => setIndiceImpOpen(true)}
                  startIcon={<span style={{ fontSize: 15 }}>⬆</span>}
                  sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, color: '#059669', borderColor: '#059669',
                    '&:hover': { bgcolor: '#F0FDF4', borderColor: '#047857' } }}>
                  Importer depuis Excel
                </Button>
                <Tooltip title="Ajouter">
                  <IconButton size="small" onClick={() => openDlg('indice')}
                    sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#0D2A40' } }}>
                    <Add sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Supprimer sélection">
                  <IconButton size="small"
                    sx={{ bgcolor: '#EF4444', color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#DC2626' } }}>
                    <Delete sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Tableau */}
              <Box sx={{ px: 2, pb: 2 }}>
                {li ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
                ) : (
                  <>
                    <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#0D2137' }}>
                            {['N° Sr','Hiérarchie','Classe','Échelon','Grade','Numéro Indice','Valeur Indicaire','Solde','Statut','Détail',''].map((h) => (
                              <TableCell key={h} sx={{ ...TH_CELL, textAlign: ['Numéro Indice','Valeur Indicaire','Solde'].includes(h) ? 'right' : 'center' }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={11} sx={{ textAlign: 'center', color: '#94A3B8', py: 3, fontSize: 12 }}>
                              {Object.values(indF2).some(Boolean) ? 'Aucun résultat pour ces critères' : 'Aucun indice configuré — cliquez sur + pour en ajouter un'}
                            </TableCell></TableRow>
                          ) : filtered.slice(indPage * indRowsPerPage, indPage * indRowsPerPage + indRowsPerPage).map((r: RecruitmentIndice, i: number) => {
                            const globalIdx = indPage * indRowsPerPage + i;
                            return (
                              <TableRow key={r.id} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC', '&:hover': { bgcolor: '#EEF2FF' } }}>
                                <TableCell sx={{ fontSize: 12, color: '#64748B', textAlign: 'center', width: 50 }}>{globalIdx + 1}</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', textAlign: 'center' }}>{r.hierarchy?.code ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{r.classe ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{r.echelon_label ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{r.garde ?? r.code}</TableCell>
                                <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#1E3A5F', textAlign: 'right', fontFamily: 'monospace' }}>{r.valeur}</TableCell>
                                <TableCell sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>
                                  {r.valeur_point ? Number(r.valeur_point).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                </TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#059669', textAlign: 'right', fontFamily: 'monospace' }}>
                                  {r.solde_mensuelle ? Number(r.solde_mensuelle).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                  <Box component="span" sx={{
                                    display: 'inline-block', width: 14, height: 14,
                                    border: '2px solid #475569', borderRadius: '3px',
                                    bgcolor: r.is_active ? '#1E3A5F' : 'transparent',
                                    position: 'relative',
                                    '&::after': r.is_active ? { content: '"✓"', position: 'absolute', top: -3, left: 0, fontSize: 11, color: '#fff', fontWeight: 900 } : {},
                                  }} />
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                  <Tooltip title="Modifier">
                                    <IconButton size="small" onClick={() => openDlg('indice', r)}>
                                      <Edit sx={{ fontSize: 15, color: '#E85D04' }} />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                  <Tooltip title="Supprimer">
                                    <IconButton size="small" onClick={() => delInd.mutate(r.id)}>
                                      <Delete sx={{ fontSize: 14, color: '#94A3B8' }} />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5, px: 0.5 }}>
                      <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                        {filtered.length} indice{filtered.length > 1 ? 's' : ''} au total
                      </Typography>
                      <TablePagination
                        component="div"
                        count={filtered.length}
                        page={indPage}
                        onPageChange={(_, p) => setIndPage(p)}
                        rowsPerPage={indRowsPerPage}
                        onRowsPerPageChange={(e) => { setIndRowsPerPage(Number(e.target.value)); setIndPage(0); }}
                        rowsPerPageOptions={[25, 50, 100, 200]}
                        labelRowsPerPage="Lignes par page :"
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
                        sx={{ '& .MuiTablePagination-toolbar': { fontSize: 12 }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 } }}
                      />
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          );
        })()}

        {/* ─── Rubriques ─── */}
        {sub === 1 && <RubriquesPanel />}

        {/* ─── Hiérarchies / Classes / Échelons / Grades ─── */}
        {sub === 2 && <HierarchiePanel />}

        {/* ─── Barème ─── */}
        {sub === 3 && (() => {
          const PARTS = ['1 part','1,5 parts','2 parts','2,5 parts','3 parts','3,5 parts','4 parts','4,5 parts','5 Parts'];
          const PART_KEYS: (keyof RecruitmentBareme)[] = ['part_1','part_1_5','part_2','part_2_5','part_3','part_3_5','part_4','part_4_5','part_5'];
          const filtered = baremes.filter((r: RecruitmentBareme) => {
            const rbMatch = !barF2.revenu_brut || String(r.revenu_brut ?? r.salaire_base).includes(barF2.revenu_brut);
            const trimfMatch = !barF2.trimf_pers || String(r.trimf_pers ?? '').includes(barF2.trimf_pers);
            return rbMatch && trimfMatch;
          });
          const paged = filtered.slice(barPage * barRowsPerPage, barPage * barRowsPerPage + barRowsPerPage);
          return (
            <Box>
              {/* Titre + boutons */}
              <Box sx={{ bgcolor: '#0D2137', px: 2.5, py: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.2px', textTransform: 'uppercase' }}>
                  Bareme Mensuel des Retenues a la Source sur Salaires
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" size="small" onClick={() => setImpOpen(true)}
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, color: '#fff', borderColor: '#fff', whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: '#fff' } }}>
                    Importer depuis Excel
                  </Button>
                  <Button variant="outlined" size="small"
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, color: '#fff', borderColor: '#fff',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: '#fff' } }}>
                    Fermer
                  </Button>
                </Stack>
              </Box>

              {/* Filtres */}
              <Box sx={{ m: 2, border: '1.5px solid #CBD5E1', borderRadius: 2, p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Revenu brut</Typography>
                    <TextField size="small" fullWidth type="number" placeholder="0,00"
                      value={barF2.revenu_brut}
                      onChange={(e) => setBarF2((f) => ({ ...f, revenu_brut: e.target.value }))}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 }, '& input': { textAlign: 'right' } }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Trimf/pers</Typography>
                    <TextField size="small" fullWidth type="number" placeholder="0,00"
                      value={barF2.trimf_pers}
                      onChange={(e) => setBarF2((f) => ({ ...f, trimf_pers: e.target.value }))}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 }, '& input': { textAlign: 'right' } }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Parts</Typography>
                    <TextField size="small" fullWidth
                      value={barF2.parts}
                      onChange={(e) => setBarF2((f) => ({ ...f, parts: e.target.value }))}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pb: 0.25 }}>
                    <Button variant="outlined" size="small"
                      sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 100, color: '#1E3A5F', borderColor: '#1E3A5F' }}>
                      Chercher
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => { setBarF2({ revenu_brut: '', trimf_pers: '', parts: '' }); setBarPage(0); }}
                      sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 100, color: '#1E3A5F', borderColor: '#1E3A5F' }}>
                      Effacer
                    </Button>
                  </Box>
                </Box>
              </Box>

              {/* Barre d'action */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 0.75, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton size="small" sx={{ border: '1px solid #CBD5E1', borderRadius: '6px', p: 0.5 }}>
                    <Delete sx={{ fontSize: 16, color: '#1E3A5F' }} />
                  </IconButton>
                  <Typography sx={{ fontSize: 12, color: '#1E3A5F', fontWeight: 500 }}>supprimer tous</Typography>
                </Box>
                <Stack direction="row" spacing={0.75}>
                  <Tooltip title="Supprimer sélection">
                    <IconButton size="small" sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#1A3A5C' } }}>
                      <Delete sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ajouter">
                    <IconButton size="small" onClick={() => openDlg('bareme')} sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#1A3A5C' } }}>
                      <Add sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifier sélection">
                    <IconButton size="small" sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#1A3A5C' } }}>
                      <Edit sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Tableau */}
              <Box sx={{ px: 2, pb: 2, pt: 1 }}>
                {lb ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
                ) : (
                  <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1, maxHeight: 420 }}>
                    <Table size="small" stickyHeader sx={{ minWidth: 1100 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ ...TH_CELL, bgcolor: '#0D2137', textAlign: 'center', width: 55 }}>N° Sr</TableCell>
                          <TableCell sx={{ ...TH_CELL, bgcolor: '#0D2137', textAlign: 'right', whiteSpace: 'nowrap' }}>Revenu brut</TableCell>
                          <TableCell sx={{ ...TH_CELL, bgcolor: '#0D2137', textAlign: 'right', whiteSpace: 'nowrap' }}>TRIMF/Pers</TableCell>
                          {PARTS.map((p, i) => (
                            <TableCell key={p} sx={{ ...TH_CELL, bgcolor: '#0D2137', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.4 }}>
                                {p}
                                {i >= 3 && <Search sx={{ fontSize: 11, opacity: 0.65 }} />}
                              </Box>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.length === 0 ? (
                          <TableRow><TableCell colSpan={12} sx={{ textAlign: 'center', color: '#94A3B8', py: 3, fontSize: 12 }}>
                            Aucune donnée — cliquez sur + pour ajouter ou importez depuis Excel
                          </TableCell></TableRow>
                        ) : paged.map((r: RecruitmentBareme, i: number) => {
                          const globalIdx = barPage * barRowsPerPage + i;
                          return (
                            <TableRow key={r.id} hover sx={{
                              bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: '#EEF2FF' },
                            }}>
                              <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#64748B' }}>{globalIdx + 1}</TableCell>
                              <TableCell sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#1E293B' }}>
                                {Number(r.revenu_brut ?? r.salaire_base).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#1E293B' }}>
                                {Number(r.trimf_pers ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              {PART_KEYS.map((key) => (
                                <TableCell key={key} sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#1E293B' }}>
                                  {Number(r[key] ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                {/* Pagination */}
                {filtered.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, pt: 0.5, borderTop: '1px solid #E2E8F0' }}>
                    <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                      {filtered.length} ligne{filtered.length > 1 ? 's' : ''} au total
                    </Typography>
                    <TablePagination
                      component="div"
                      count={filtered.length}
                      page={barPage}
                      onPageChange={(_, p) => setBarPage(p)}
                      rowsPerPage={barRowsPerPage}
                      onRowsPerPageChange={(e) => { setBarRowsPerPage(Number(e.target.value)); setBarPage(0); }}
                      rowsPerPageOptions={[25, 50, 100, 200]}
                      labelRowsPerPage="Lignes par page :"
                      labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
                      sx={{ '& .MuiTablePagination-toolbar': { fontSize: 12 }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 } }}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          );
        })()}

        {/* ─── Dialog import barème ─── */}
        <BaremeImportDialog
          open={impOpen}
          onClose={() => setImpOpen(false)}
          onSuccess={() => invalidate()}
        />

        {/* ─── Dialog import indices ─── */}
        <IndiceImportDialog
          open={indiceImpOpen}
          onClose={() => setIndiceImpOpen(false)}
          onSuccess={() => invalidate()}
        />

        {/* ─── Rapports ─── */}
        {sub === 4 && (
          <Box>
            {/* Titre */}
            <Box sx={{ bgcolor: '#0D2137', px: 2.5, py: 1.2 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Les rapports (Journal de paie)</Typography>
            </Box>

            {/* Filtres */}
            <Box sx={{ m: 2, border: '1.5px solid #CBD5E1', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, px: 2.5, py: 1.5, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Annee</Typography>
                  <TextField select size="small" value={rapF.annee}
                    onChange={(e) => setRapF((f) => ({ ...f, annee: e.target.value }))}
                    sx={{ width: 120, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }}>
                    {[2024,2025,2026,2027].map((y) => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
                  </TextField>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Mois</Typography>
                  <TextField select size="small" value={rapF.mois}
                    onChange={(e) => setRapF((f) => ({ ...f, mois: e.target.value }))}
                    sx={{ width: 150, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }}>
                    {MONTHS_FR.map((m, i) => <MenuItem key={i} value={String(i + 1)}>{m}</MenuItem>)}
                  </TextField>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Matricule</Typography>
                  <TextField size="small" fullWidth
                    placeholder="Rechercher un agent  par matricule ici"
                    value={rapF.matricule}
                    onChange={(e) => setRapF((f) => ({ ...f, matricule: e.target.value }))}
                    sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pb: 0.25 }}>
                  <Button variant="outlined" size="small"
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 100, color: '#E85D04', borderColor: '#E85D04' }}>
                    Chercher
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => setRapF((f) => ({ ...f, matricule: '' }))}
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 100, color: '#E85D04', borderColor: '#E85D04' }}>
                    Effacer
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Tableau */}
            <Box sx={{ px: 2, pb: 2 }}>
              {/* Bouton Imprimer */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.75 }}>
                <Button variant="contained" size="small" startIcon={<Print />}
                  sx={{ bgcolor: '#0D2137', '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '20px', fontWeight: 700, fontSize: 12, px: 2.5 }}>
                  Imprimer
                </Button>
              </Box>

              <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1 }}>
                <Table size="small" sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#0D2137' }}>
                      {[
                        'N° Sr',
                        'Agent(Employé)',
                        'RETENUE AVANCE TABASKI',
                        'IPRES TRAVAILLEUR',
                        'TRIMF',
                        'CHECK OFF',
                        'IR',
                        'CSS',
                        'TOTAL RETENUE',
                        'MONTANT NET A PAYER',
                      ].map((h) => (
                        <TableCell key={h} sx={{ ...TH_CELL, textAlign: ['N° Sr'].includes(h) ? 'center' : 'left', whiteSpace: 'nowrap', fontSize: 10.5 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Lignes vides simulées (à connecter à une API future) */}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC', height: 32 }}>
                        {Array.from({ length: 10 }).map((__, j) => (
                          <TableCell key={j} sx={{ fontSize: 12, py: 0.5, borderBottom: '1px solid #E2E8F0' }} />
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                  {/* Ligne Somme */}
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC', borderTop: '2px solid #CBD5E1' }}>
                      <TableCell colSpan={2} sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', py: 0.75 }}>Somme</TableCell>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <TableCell key={i} sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', py: 0.75 }} />
                      ))}
                    </TableRow>
                  </TableHead>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        )}

      </Box>

      {/* ════ DIALOGS ════ */}

      {/* Indice */}
      <Dialog open={dlg.type === 'indice'} onClose={closeDlg} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          {(dlg.item as RecruitmentIndice | null)?.id ? 'Modifier l\'indice' : 'Nouvel indice'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, px: 3 }}>
          {/* Champs du formulaire */}
          <Box sx={{ border: '1.5px solid #CBD5E1', borderRadius: 2, p: 2, mb: 2.5 }}>
            <Grid container spacing={2}>
              {/* Ligne 1 */}
              <Grid item xs={3}>
                <TextField fullWidth size="small" label="ID indice *"
                  value={indF.code}
                  onChange={(e) => setIndF((f) => ({ ...f, code: e.target.value }))}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                />
              </Grid>
              <Grid item xs={3}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 700, fontSize: 11, color: '#0D2137' }}>Hiérarchie</InputLabel>
                  <Select label="Hiérarchie" value={indF.hierarchy_id}
                    onChange={(e) => {
                      const hid = String(e.target.value);
                      const h = hierarchies.find((h: RecruitmentHierarchy) => String(h.id) === hid);
                      setIndClassId('');
                      setIndF((f) => ({ ...f, hierarchy_id: hid, classe: '', echelon_label: '', garde: h ? h.code : '' }));
                    }}>
                    <MenuItem value=""><em>—</em></MenuItem>
                    {hierarchies.map((h: RecruitmentHierarchy) => <MenuItem key={h.id} value={h.id}>{h.code}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              {/* ── Classe (Select dynamique selon hiérarchie) ── */}
              <Grid item xs={3}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 700, fontSize: 11, color: '#0D2137' }}>Classe</InputLabel>
                  <Select
                    label="Classe"
                    value={indClassId}
                    disabled={!indF.hierarchy_id}
                    onChange={(e) => {
                      const cid = e.target.value as number | '';
                      const c = (indClasses as PaieClasse[]).find(c => c.id === cid);
                      setIndClassId(cid);
                      setIndF((f) => {
                        const h = hierarchies.find((h: RecruitmentHierarchy) => String(h.id) === f.hierarchy_id);
                        const code = c?.code ?? '';
                        return { ...f, classe: code, echelon_label: '', garde: `${h?.code ?? ''} ${code}`.trim() };
                      });
                    }}
                  >
                    <MenuItem value=""><em>— Sélectionner —</em></MenuItem>
                    {(indClasses as PaieClasse[]).map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.code} — {c.libelle}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* ── Échelon (Select dynamique selon classe) ── */}
              <Grid item xs={3}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 700, fontSize: 11, color: '#0D2137' }}>Échelon</InputLabel>
                  <Select
                    label="Échelon"
                    value={indF.echelon_label}
                    disabled={!indClassId}
                    onChange={(e) => {
                      const label = e.target.value as string;
                      setIndF((f) => {
                        const h = hierarchies.find((h: RecruitmentHierarchy) => String(h.id) === f.hierarchy_id);
                        return { ...f, echelon_label: label, garde: `${h?.code ?? ''} ${f.classe} ${label}`.trim() };
                      });
                    }}
                  >
                    <MenuItem value=""><em>— Sélectionner —</em></MenuItem>
                    {(indEchelons as PaieEchelon[]).map(e => (
                      <MenuItem key={e.id} value={e.libelle ?? String(e.numero)}>
                        {e.numero}{e.libelle ? ` — ${e.libelle}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Ligne 2 */}
              <Grid item xs={4}>
                <TextField fullWidth size="small" label="VALEUR INDICE" type="number"
                  value={indF.valeur_point}
                  onChange={(e) => setIndF((f) => ({
                    ...f, valeur_point: e.target.value,
                    solde_mensuelle: f.valeur && e.target.value ? String((Number(e.target.value) * Number(f.valeur)).toFixed(2)) : f.solde_mensuelle,
                  }))}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                  inputProps={{ step: '0.01' }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth size="small" label="INDICE *" type="number"
                  value={indF.valeur}
                  onChange={(e) => setIndF((f) => ({
                    ...f, valeur: e.target.value,
                    solde_mensuelle: f.valeur_point && e.target.value ? String((Number(f.valeur_point) * Number(e.target.value)).toFixed(2)) : f.solde_mensuelle,
                  }))}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth size="small" label="Solde mensuelle indiciaire assimilés" type="number"
                  value={indF.solde_mensuelle}
                  onChange={(e) => setIndF((f) => ({ ...f, solde_mensuelle: e.target.value }))}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                  inputProps={{ step: '0.01' }}
                />
              </Grid>

              {/* Ligne 3 */}
              <Grid item xs={8}>
                <TextField fullWidth size="small" label="GARDE"
                  value={indF.garde}
                  onChange={(e) => setIndF((f) => ({ ...f, garde: e.target.value }))}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                />
              </Grid>
              <Grid item xs={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={<Switch checked={indF.is_active} onChange={(e) => setIndF((f) => ({ ...f, is_active: e.target.checked }))} />}
                  label={<Typography sx={{ fontWeight: 700, fontSize: 13 }}>Actif</Typography>}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Liste des augmentations */}
          <Box>
            <Box sx={{ bgcolor: '#0D2137', px: 2, py: 1, borderRadius: '6px 6px 0 0' }}>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>les augmentations</Typography>
            </Box>
            <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none', borderRadius: '0 0 6px 6px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                    <TableCell sx={{ ...TH_CELL, width: 50, textAlign: 'center' }}>N° Sr</TableCell>
                    <TableCell sx={{ ...TH_CELL, width: 60, textAlign: 'center' }}>
                      <Box
                        component="span"
                        onClick={() => {
                          const allIds = augmentations.map((a: RecruitmentAugmentation) => a.id);
                          const allChecked = allIds.every((id: number) => indF.augmentation_ids.includes(id));
                          setIndF((f) => ({ ...f, augmentation_ids: allChecked ? [] : allIds }));
                        }}
                        sx={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #94A3B8', borderRadius: '3px', bgcolor: 'transparent', cursor: 'pointer' }}
                      />
                      &nbsp;Choix
                    </TableCell>
                    <TableCell sx={TH_CELL}>Nom Augmentation</TableCell>
                    <TableCell sx={{ ...TH_CELL, textAlign: 'right' }}>Montant</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {augmentations.length === 0 ? (
                    <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', color: '#94A3B8', py: 2, fontSize: 12 }}>Aucune augmentation disponible</TableCell></TableRow>
                  ) : augmentations.map((a: RecruitmentAugmentation, i: number) => {
                    const checked = indF.augmentation_ids.includes(a.id);
                    return (
                      <TableRow key={a.id} hover
                        onClick={() => setIndF((f) => ({
                          ...f,
                          augmentation_ids: checked ? f.augmentation_ids.filter((id) => id !== a.id) : [...f.augmentation_ids, a.id],
                        }))}
                        sx={{ cursor: 'pointer', bgcolor: checked ? '#EEF2FF' : (i % 2 === 0 ? '#fff' : '#F8FAFC') }}>
                        <TableCell sx={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>{i + 1}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Box component="span" sx={{
                            display: 'inline-block', width: 14, height: 14,
                            border: '2px solid #475569', borderRadius: '3px',
                            bgcolor: checked ? '#1E3A5F' : 'transparent',
                            position: 'relative',
                            '&::after': checked ? { content: '"✓"', position: 'absolute', top: -3, left: 0, fontSize: 11, color: '#fff', fontWeight: 900 } : {},
                          }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, color: '#1E293B' }}>{a.libelle}</TableCell>
                        <TableCell sx={{ textAlign: 'right', py: 0.5 }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            value={indF.augmentation_montants[a.id] ?? ''}
                            onChange={(e) => setIndF((f) => ({
                              ...f,
                              augmentation_montants: { ...f.augmentation_montants, [a.id]: e.target.value },
                            }))}
                            placeholder="0"
                            style={{
                              width: 110, textAlign: 'right', fontSize: 13, fontWeight: 600,
                              fontFamily: 'monospace', border: '1px solid #CBD5E1',
                              borderRadius: 4, padding: '3px 6px',
                              background: checked ? '#fff' : '#F8FAFC',
                              color: checked ? '#059669' : '#94A3B8',
                              outline: 'none',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1, borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
          <Button variant="outlined" onClick={closeDlg} sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained" disabled={saveInd.isPending || !indF.code || !indF.valeur} onClick={() => saveInd.mutate()}
            sx={{ bgcolor: NAV, borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            {(dlg.item as RecruitmentIndice | null)?.id ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hiérarchie */}
      <Dialog open={dlg.type === 'hier'} onClose={closeDlg} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{(dlg.item as RecruitmentHierarchy | null)?.id ? 'Modifier la hiérarchie' : 'Nouvelle hiérarchie'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={4}><TextField fullWidth size="small" label="Code *" value={herF.code} onChange={(e) => setHerF((f) => ({ ...f, code: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Libellé *" value={herF.libelle} onChange={(e) => setHerF((f) => ({ ...f, libelle: e.target.value }))} /></Grid>
            <Grid item xs={2}><TextField fullWidth size="small" label="Ordre" type="number" value={herF.ordre} onChange={(e) => setHerF((f) => ({ ...f, ordre: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Description" multiline rows={2} value={herF.description} onChange={(e) => setHerF((f) => ({ ...f, description: e.target.value }))} /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Switch checked={herF.is_active} onChange={(e) => setHerF((f) => ({ ...f, is_active: e.target.checked }))} />} label="Actif" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={closeDlg} sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained" disabled={saveHer.isPending || !herF.code || !herF.libelle} onClick={() => saveHer.mutate()}
            sx={{ bgcolor: NAV, borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            {(dlg.item as RecruitmentHierarchy | null)?.id ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barème */}
      {(() => {
        const isEdit = !!(dlg.item as RecruitmentBareme | null)?.id;
        const numField = (label: string, key: keyof typeof barF) => (
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>{label}</Typography>
            <TextField size="small" fullWidth type="number"
              value={barF[key]}
              onChange={(e) => setBarF((f) => ({ ...f, [key]: e.target.value }))}
              sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '4px', fontSize: 13 }, '& input': { textAlign: 'right' } }}
              inputProps={{ step: '0.01' }}
            />
          </Box>
        );
        return (
          <Dialog open={dlg.type === 'bareme'} onClose={closeDlg} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
            {/* Barre titre style screenshot */}
            <Box sx={{ bgcolor: '#0D2137', px: 2.5, py: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>
                {isEdit ? 'Modifier le Bareme' : 'Ajout de Bareme'}
              </Typography>
              <Stack direction="row" spacing={0.75}>
                <Button variant="outlined" size="small" disabled={saveBar.isPending || !barF.revenu_brut} onClick={() => saveBar.mutate()}
                  sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 11, color: '#fff', borderColor: '#fff', whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.3)' } }}>
                  Sauvegarder
                </Button>
                <Button variant="outlined" size="small" disabled={saveBar.isPending || !barF.revenu_brut}
                  onClick={() => saveBar.mutateAsync().then(() => closeDlg())}
                  sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 11, color: '#fff', borderColor: '#fff', whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.3)' } }}>
                  Sauvegarder&amp;Fermer
                </Button>
                <Button variant="outlined" size="small" onClick={closeDlg}
                  sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 11, color: '#fff', borderColor: '#fff',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                  Fermer
                </Button>
              </Stack>
            </Box>

            <DialogContent sx={{ pt: 2.5, px: 3, pb: 3 }}>
              <Grid container spacing={2.5}>
                <Grid item xs={6}>{numField('Revenu brut', 'revenu_brut')}</Grid>
                <Grid item xs={6}>{numField('TRIMF/Pers', 'trimf_pers')}</Grid>
                <Grid item xs={6}>{numField('1 Part', 'part_1')}</Grid>
                <Grid item xs={6}>{numField('1.5 Part', 'part_1_5')}</Grid>
                <Grid item xs={6}>{numField('2 Part', 'part_2')}</Grid>
                <Grid item xs={6}>{numField('2.5 Parts', 'part_2_5')}</Grid>
                <Grid item xs={6}>{numField('3 Parts', 'part_3')}</Grid>
                <Grid item xs={6}>{numField('3.5 Parts', 'part_3_5')}</Grid>
                <Grid item xs={6}>{numField('4 Parts', 'part_4')}</Grid>
                <Grid item xs={6}>{numField('4.5 Parts', 'part_4_5')}</Grid>
                <Grid item xs={6}>{numField('5 Parts', 'part_5')}</Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>ID barème</Typography>
                  <Box sx={{ border: '1px solid #CBD5E1', borderRadius: '4px', px: 1.5, py: 1, bgcolor: '#F8FAFC', minHeight: 40, display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#E85D04', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {barF.id_bareme}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
          </Dialog>
        );
      })()}

    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════
export default function PayrollPage() {
  const [tab, setTab] = useState(1);
  const { name: companyName } = useCompany();

  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const now = new Date();

  const tabs = [
    { label: 'Modèle fiche de paie',   icon: <Description />,   comp: <ModeleFicheTab /> },
    { label: 'Bulletin de Paie',        icon: <ReceiptLong />,   comp: <BulletinPaieTab /> },
    { label: 'Gestion des Indemnités',  icon: <Payments />,      comp: <GestionIndemnitesTab /> },
    { label: 'Rapport des États',       icon: <BarChart />,      comp: <RapportEtatsTab /> },
    { label: 'États de Paiement',       icon: <AccountBalance />,comp: <EtatsPaiementTab /> },
    { label: 'Paramètres',              icon: <Tune />,          comp: <ParametresTab /> },
  ];

  return (
    <Box>
      {/* ══ En-tête ══ */}
      <Box sx={{
        bgcolor: NAV, px: 3, py: 1.5,
        borderRadius: '12px 12px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>
            Gestion de la Paie
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11.5, mt: 0.1 }}>
            {MONTHS[now.getMonth()]} {now.getFullYear()} · {companyName}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          {[
            { label: 'Bulletins',   count: 0, color: '#93C5FD' },
            { label: 'Validés',     count: 0, color: '#6EE7B7' },
            { label: 'En attente',  count: 0, color: '#FCD34D' },
            { label: 'Payés',       count: 0, color: '#C4B5FD' },
          ].map(({ label, count, color }) => (
            <Stack key={label} direction="row" alignItems="center" spacing={0.75}>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</Typography>
              <Box sx={{ px: 1, py: 0.1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.12)', minWidth: 24, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color }}>{count}</Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* ══ Onglets ══ */}
      <Box sx={{
        bgcolor: '#F1F5F9', px: 2.5, pt: 2, pb: 0,
        display: 'flex', gap: 1, flexWrap: 'wrap',
        borderBottom: `2px solid ${NAV}`,
      }}>
        {tabs.map((t, i) => (
          <NavTab
            key={i}
            label={t.label}
            icon={t.icon}
            active={tab === i}
            onClick={() => setTab(i)}
            />
        ))}
      </Box>

      {/* ══ Contenu ══ */}
      <Box sx={{
        bgcolor: '#fff',
        border: '1px solid #CBD5E1',
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden',
      }}>
        {tabs[tab].comp}
      </Box>
    </Box>
  );
}
