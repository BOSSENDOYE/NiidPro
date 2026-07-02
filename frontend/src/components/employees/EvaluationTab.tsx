import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Chip, TextField,
  Table, TableBody, TableCell, TableHead, TableRow,
  Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel, LinearProgress,
  IconButton, Tooltip, Divider, Alert,
} from '@mui/material';
import {
  Add, OpenInNew, Refresh, AssignmentLate, CheckCircle,
  HourglassBottom, Cancel, Loop, Search,
} from '@mui/icons-material';
import { evaluationApi } from '../../api/evaluations';
import { employeesApi } from '../../api/employees';
import AgentAutocomplete from '../common/AgentAutocomplete';
import type {
  EvaluationPeriodeEssai,
  AppreciationEvaluation,
  DecisionEvaluation,
  StatutEvaluation,
} from '../../types';
import type { Employee } from '../../types';

// ── Constantes ───────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<string, string> = {
  brouillon:       'Brouillon',
  auto_evaluation: 'Auto-évaluation',
  entretien:       'Entretien',
  signe:           'Signé',
  valide_rrh:      'Validé RRH',
  decision_dg:     'Décision DG',
  archive:         'Archivé',
};

const STATUT_COLOR: Record<string, string> = {
  brouillon:       '#64748B',
  auto_evaluation: '#0EA5E9',
  entretien:       '#6366F1',
  signe:           '#F59E0B',
  valide_rrh:      '#F97316',
  decision_dg:     '#8B5CF6',
  archive:         '#059669',
};

const APPRECIATION_COLOR: Record<string, string> = {
  insuffisant:  '#DC2626',
  passable:     '#D97706',
  satisfaisant: '#3B82F6',
  excellent:    '#059669',
};

const APPRECIATION_LABEL: Record<string, string> = {
  insuffisant:  'Insuffisant',
  passable:     'Passable',
  satisfaisant: 'Satisfaisant',
  excellent:    'Excellent',
};

const DECISION_COLOR: Record<string, string> = {
  confirmation:     '#059669',
  renouvellement:   '#F59E0B',
  non_confirmation: '#DC2626',
};

const DECISION_LABEL: Record<string, string> = {
  confirmation:     'Confirmation',
  renouvellement:   'Renouvellement',
  non_confirmation: 'Non-confirmation',
};

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Mini composants ───────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const color = STATUT_COLOR[statut] ?? '#64748B';
  return (
    <Chip
      label={STATUT_LABELS[statut] ?? statut}
      size="small"
      sx={{ fontSize: 10.5, fontWeight: 700, height: 20,
        color, bgcolor: `${color}18`, border: `1px solid ${color}40` }}
    />
  );
}

function AppreciationChip({ val }: { val: string | null }) {
  if (!val) return <Typography sx={{ color: '#CBD5E1', fontSize: 12 }}>—</Typography>;
  const color = APPRECIATION_COLOR[val] ?? '#64748B';
  return (
    <Chip
      label={APPRECIATION_LABEL[val] ?? val}
      size="small"
      sx={{ fontSize: 10.5, fontWeight: 700, height: 20,
        color, bgcolor: `${color}18`, border: `1px solid ${color}40` }}
    />
  );
}

function DecisionChip({ val }: { val: string | null }) {
  if (!val) return <Typography sx={{ color: '#CBD5E1', fontSize: 12 }}>—</Typography>;
  const color = DECISION_COLOR[val] ?? '#64748B';
  return (
    <Chip
      label={DECISION_LABEL[val] ?? val}
      size="small"
      sx={{ fontSize: 10.5, fontWeight: 700, height: 20,
        color, bgcolor: `${color}18`, border: `1px solid ${color}40` }}
    />
  );
}

function NoteBar({ note }: { note: number | null }) {
  if (!note) return <Typography sx={{ color: '#CBD5E1', fontSize: 12 }}>—</Typography>;
  const pct   = (note / 4) * 100;
  const color = note >= 3.25 ? '#059669' : note >= 2.5 ? '#3B82F6' : note >= 1.5 ? '#D97706' : '#DC2626';
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <LinearProgress variant="determinate" value={pct}
        sx={{ width: 56, height: 6, borderRadius: 3, bgcolor: `${color}20`,
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
      <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{note.toFixed(2)}</Typography>
    </Stack>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 120, p: 2, borderRadius: '12px',
      bgcolor: '#fff', border: '1.5px solid #E2E8F0',
      boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Box sx={{ color, fontSize: 0 }}>{icon}</Box>
        <Typography sx={{ fontSize: 22, fontWeight: 900, color }}>{value}</Typography>
      </Stack>
      <Typography sx={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>{label}</Typography>
    </Box>
  );
}

// ── Dialog création rapide ────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
}

function CreateDialog({ open, onClose, employees }: CreateDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    employee_id: '',
    type: '3_mois' as '3_mois' | '6_mois',
    categorie: 'A1' as string,
    date_prise_poste: '',
    date_fin_periode: '',
    responsable_id: 1,
  });
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () => evaluationApi.create({
      employee_id: Number(form.employee_id),
      type: form.type,
      categorie: form.categorie as EvaluationPeriodeEssai['categorie'],
      date_prise_poste: form.date_prise_poste,
      date_fin_periode: form.date_fin_periode,
      responsable_id: form.responsable_id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eval-essai'] });
      qc.invalidateQueries({ queryKey: ['eval-essai-dashboard'] });
      onClose();
      setForm({ employee_id: '', type: '3_mois', categorie: 'A1', date_prise_poste: '', date_fin_periode: '', responsable_id: 1 });
      setError('');
    },
    onError: () => setError('Erreur lors de la création. Vérifiez les champs.'),
  });

  const handleSubmit = () => {
    if (!form.employee_id || !form.date_prise_poste || !form.date_fin_periode) {
      setError('Agent, date de prise de poste et date de fin sont obligatoires.');
      return;
    }
    createMut.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, fontSize: 16, pb: 1 }}>
        Nouvelle évaluation période d'essai
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>{error}</Alert>}
        <Stack spacing={2}>
          <AgentAutocomplete
            employees={employees}
            value={employees.find(e => e.id === Number(form.employee_id)) ?? null}
            onChange={(emp) => setForm(f => ({ ...f, employee_id: emp ? String(emp.id) : '' }))}
            label="Agent *"
            required
          />

          <Stack direction="row" spacing={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Type de période</InputLabel>
              <Select label="Type de période" value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as '3_mois' | '6_mois' }))}>
                <MenuItem value="3_mois">3 mois</MenuItem>
                <MenuItem value="6_mois">6 mois</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Catégorie</InputLabel>
              <Select label="Catégorie" value={form.categorie}
                onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                {['A1','A2','B1','B2','C1','C2','D','E'].map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <TextField fullWidth size="small" type="date" label="Date prise de poste *"
              InputLabelProps={{ shrink: true }}
              value={form.date_prise_poste}
              onChange={e => setForm(f => ({ ...f, date_prise_poste: e.target.value }))} />
            <TextField fullWidth size="small" type="date" label="Fin de période *"
              InputLabelProps={{ shrink: true }}
              value={form.date_fin_periode}
              onChange={e => setForm(f => ({ ...f, date_fin_periode: e.target.value }))} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: '#64748B' }}>Annuler</Button>
        <Button variant="contained" onClick={handleSubmit}
          disabled={createMut.isPending}
          sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' }, borderRadius: '8px', fontWeight: 700 }}>
          {createMut.isPending ? 'Création…' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function EvaluationTab() {
  const navigate  = useNavigate();
  const [search, setSearch]     = useState('');
  const [statut, setStatut]     = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['eval-essai-dashboard'],
    queryFn: () => evaluationApi.dashboard().then(r => r.data),
  });

  const { data: evaluations = [], isLoading, refetch } = useQuery({
    queryKey: ['eval-essai'],
    queryFn: () => evaluationApi.list().then(r => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d as EvaluationPeriodeEssai[]
        : ((d as { data?: EvaluationPeriodeEssai[] }).data ?? []);
    }),
  });

  const { data: rawEmployees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ per_page: 500 }).then(r => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d as Employee[] : ((d as { data?: Employee[] }).data ?? []);
    }),
  });
  const employees = (rawEmployees ?? []) as Employee[];

  const filtered = evaluations.filter(ev => {
    const name = ev.employee
      ? `${ev.employee.first_name} ${ev.employee.last_name}`.toLowerCase()
      : '';
    const matchSearch = !search ||
      name.includes(search.toLowerCase()) ||
      ev.type.includes(search.toLowerCase()) ||
      ev.categorie?.toLowerCase().includes(search.toLowerCase());
    const matchStatut = statut === 'all' || ev.statut === statut;
    return matchSearch && matchStatut;
  });

  return (
    <>
      {/* ═══ EN-TÊTE ═══ */}
      <Box sx={{
        px: 2.5, py: 1.75,
        background: 'linear-gradient(135deg, #0F172A 0%, #78350F 60%, #1E293B 100%)',
        position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 90% 50%, rgba(245,158,11,0.18) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 34, height: 34, borderRadius: '10px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245,158,11,0.35)' }}>
              <AssignmentLate sx={{ fontSize: 18, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                Évaluation Période d'Essai
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                Grille ANASER · ANASER-RH-GE-2025-002
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Rafraîchir">
              <IconButton size="small" onClick={() => refetch()}
                sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                <Refresh sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            <Button variant="contained" size="small" startIcon={<Add />}
              onClick={() => setCreateOpen(true)}
              sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' },
                borderRadius: '8px', fontWeight: 700, fontSize: 12,
                boxShadow: '0 2px 8px rgba(245,158,11,0.4)' }}>
              Nouvelle évaluation
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ═══ KPIs ═══ */}
      <Box sx={{ px: 2.5, py: 2, bgcolor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <KpiCard label="Total évaluations"  value={dashboard?.total ?? evaluations.length}
            icon={<AssignmentLate sx={{ fontSize: 18 }} />} color="#F59E0B" />
          <KpiCard label="En cours"           value={dashboard?.en_cours ?? evaluations.filter(e => e.statut !== 'archive').length}
            icon={<HourglassBottom sx={{ fontSize: 18 }} />} color="#6366F1" />
          <KpiCard label="Confirmés"          value={dashboard?.confirmes ?? evaluations.filter(e => e.statut_dossier === 'confirme').length}
            icon={<CheckCircle sx={{ fontSize: 18 }} />} color="#059669" />
          <KpiCard label="Renouvelés"         value={dashboard?.renouveles ?? evaluations.filter(e => e.statut_dossier === 'renouvele').length}
            icon={<Loop sx={{ fontSize: 18 }} />} color="#F97316" />
          <KpiCard label="Non confirmés"      value={dashboard?.non_confirmes ?? evaluations.filter(e => e.statut_dossier === 'non_confirme').length}
            icon={<Cancel sx={{ fontSize: 18 }} />} color="#DC2626" />
        </Stack>
      </Box>

      {/* ═══ LIEN MODULE COMPLET ═══ */}
      <Box sx={{ px: 2.5, py: 1.25, bgcolor: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontSize: 12.5, color: '#92400E' }}>
            Pour accéder au workflow complet (notes, auto-évaluation, décision DG) →
          </Typography>
          <Button size="small" endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
            onClick={() => navigate('/evaluations')}
            sx={{ fontSize: 12, fontWeight: 700, color: '#D97706',
              '&:hover': { bgcolor: '#FEF3C7' }, textTransform: 'none' }}>
            Ouvrir le module Évaluation Période d'Essai
          </Button>
        </Stack>
      </Box>

      {/* ═══ FILTRES ═══ */}
      <Box sx={{ px: 2.5, py: 1.25, bgcolor: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField size="small" placeholder="Rechercher un agent, type, catégorie…"
            value={search} onChange={e => setSearch(e.target.value)}
            sx={{ width: 280 }}
            InputProps={{ sx: { fontSize: 12.5, borderRadius: '8px' },
              startAdornment: <Search sx={{ fontSize: 16, color: '#94A3B8', mr: 0.5 }} /> }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select value={statut} onChange={e => setStatut(e.target.value)}
              displayEmpty sx={{ fontSize: 12.5, borderRadius: '8px' }}>
              <MenuItem value="all">Tous les statuts</MenuItem>
              {Object.entries(STATUT_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>
            {filtered.length} dossier{filtered.length > 1 ? 's' : ''}
          </Typography>
        </Stack>
      </Box>

      {/* ═══ TABLE ═══ */}
      <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', minHeight: 300 }}>
        {isLoading ? (
          <Box sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #F1F5F9' }}>
                <Skeleton height={32} />
              </Box>
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: '#94A3B8' }}>
            <AssignmentLate sx={{ fontSize: 48, opacity: 0.25, mb: 1 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Aucune évaluation trouvée</Typography>
            <Typography sx={{ fontSize: 12.5, mt: 0.5 }}>
              Créez la première évaluation en cliquant sur "Nouvelle évaluation"
            </Typography>
          </Box>
        ) : (
          <Box sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(15,23,42,0.07)' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  {['Agent', 'Type', 'Cat.', 'Prise de poste', 'Fin période', 'Note', 'Appréciation', 'Décision', 'Statut', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 10.5, fontWeight: 700, color: '#64748B',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: '2px solid #E2E8F0', py: 1.1, px: 1.75 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((ev, idx) => {
                  const emp  = ev.employee;
                  const name = emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${ev.employee_id}`;
                  return (
                    <TableRow key={ev.id}
                      sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#FAFBFC',
                        '&:hover': { bgcolor: '#FFF7ED' },
                        '&:last-child td': { border: 0 },
                        transition: 'background .12s' }}>

                      {/* Agent */}
                      <TableCell sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{name}</Typography>
                        {emp?.employee_number && (
                          <Typography sx={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>
                            {emp.employee_number}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Type */}
                      <TableCell sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Chip label={ev.type === '3_mois' ? '3 mois' : '6 mois'} size="small"
                          sx={{ fontSize: 10.5, fontWeight: 700, height: 20,
                            color: '#7C3AED', bgcolor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }} />
                      </TableCell>

                      {/* Catégorie */}
                      <TableCell sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                          {ev.categorie ?? '—'}
                        </Typography>
                      </TableCell>

                      {/* Date prise de poste */}
                      <TableCell sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Typography sx={{ fontSize: 12.5, color: '#334155' }}>
                          {fmtDate(ev.date_prise_poste)}
                        </Typography>
                      </TableCell>

                      {/* Date fin période */}
                      <TableCell sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Typography sx={{ fontSize: 12.5, color: '#334155' }}>
                          {fmtDate(ev.date_fin_periode)}
                        </Typography>
                      </TableCell>

                      {/* Note globale */}
                      <TableCell sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <NoteBar note={ev.note_globale ?? null} />
                      </TableCell>

                      {/* Appréciation */}
                      <TableCell sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <AppreciationChip val={ev.appreciation ?? null} />
                      </TableCell>

                      {/* Décision */}
                      <TableCell sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <DecisionChip val={ev.decision_finale ?? ev.decision_recommandee ?? null} />
                      </TableCell>

                      {/* Statut */}
                      <TableCell sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <StatutBadge statut={ev.statut} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Tooltip title="Ouvrir le dossier complet" arrow>
                          <IconButton size="small"
                            onClick={() => navigate('/evaluations', { state: { openId: ev.id } })}
                            sx={{ width: 28, height: 28, borderRadius: '7px',
                              bgcolor: '#FFF7ED', color: '#D97706',
                              '&:hover': { bgcolor: '#FEF3C7', transform: 'scale(1.1)' },
                              transition: 'all .14s' }}>
                            <OpenInNew sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} employees={employees} />
    </>
  );
}
