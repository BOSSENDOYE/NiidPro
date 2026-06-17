import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Button, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Skeleton, Stack, Avatar, LinearProgress, Paper, Stepper, Step, StepLabel,
  Card, CardContent, Grid,
} from '@mui/material';
import {
  Add, CheckCircle, Cancel, Edit, Delete, Visibility,
  Work, Assignment, ListAlt, Engineering, Groups,
  TrendingUp, AccountBalance, AccessTime,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { planRecrutementApi } from '../../api/planRecrutement';
import { departmentsApi } from '../../api/departments';
import type {
  PlanPoste, BesoinRecrutement, PlanRecrutement, LignePlan,
  ProcessusRecrutement, CandidaturePlan, ClassificationCCNI,
  EtapeRecrutement, Department,
} from '../../types';

// ─── constants ────────────────────────────────────────────────────────────────

const CCNI_COLORS: Record<ClassificationCCNI, { bg: string; color: string }> = {
  A1: { bg: '#FEF3C7', color: '#92400E' },
  A2: { bg: '#FFFBEB', color: '#B45309' },
  B1: { bg: '#EFF6FF', color: '#1E40AF' },
  B2: { bg: '#DBEAFE', color: '#1D4ED8' },
  C1: { bg: '#F0FDF4', color: '#166534' },
  C2: { bg: '#DCFCE7', color: '#15803D' },
};

const MOTIF_LABELS = { depart: 'Départ', nouveau_besoin: 'Nouveau besoin', projet: 'Projet' };
const STATUT_BESOIN_COLORS: Record<string, { bg: string; color: string }> = {
  collecte: { bg: '#F1F5F9', color: '#475569' },
  valide:   { bg: '#ECFDF5', color: '#059669' },
  rejete:   { bg: '#FEF2F2', color: '#DC2626' },
};

const ETAPES: { key: EtapeRecrutement; label: string }[] = [
  { key: 'analyse_besoin',       label: 'Analyse besoin' },
  { key: 'elaboration_fiche',    label: 'Fiche de poste' },
  { key: 'publication',          label: 'Publication' },
  { key: 'selection_cv',         label: 'Sélection CV' },
  { key: 'tests_ecrits',         label: 'Tests écrits' },
  { key: 'entretien_rh',         label: 'Entretien RH' },
  { key: 'entretien_commission', label: 'Commission' },
  { key: 'deliberation',         label: 'Délibération' },
  { key: 'decision_dg',          label: 'Décision DG' },
  { key: 'integration',          label: 'Intégration' },
  { key: 'essai',                label: 'Période d\'essai' },
  { key: 'cloture',              label: 'Clôture' },
];

const STATUT_PROCESSUS_COLORS: Record<string, { bg: string; color: string }> = {
  en_cours:  { bg: '#EFF6FF', color: '#2563EB' },
  cloture:   { bg: '#ECFDF5', color: '#059669' },
  abandonne: { bg: '#FEF2F2', color: '#DC2626' },
};

const STATUT_CAND_COLORS: Record<string, { bg: string; color: string }> = {
  recu:       { bg: '#F1F5F9', color: '#475569' },
  shortliste: { bg: '#EFF6FF', color: '#2563EB' },
  test:       { bg: '#FFFBEB', color: '#D97706' },
  entretien:  { bg: '#F5F3FF', color: '#7C3AED' },
  retenu:     { bg: '#ECFDF5', color: '#059669' },
  rejete:     { bg: '#FEF2F2', color: '#DC2626' },
};

const fmtDate = (d?: string | null) => d ? dayjs(d).format('DD/MM/YYYY') : '—';
const fmtMoney = (n?: number | null) =>
  n != null ? new Intl.NumberFormat('fr-FR').format(n) + ' F' : '—';

function CcniBadge({ ccni }: { ccni: ClassificationCCNI }) {
  const c = CCNI_COLORS[ccni] ?? { bg: '#F1F5F9', color: '#475569' };
  return (
    <Chip label={ccni} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: c.bg, color: c.color, border: `1px solid ${c.color}30` }} />
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number | string; color: string; bg: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 150, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, display: 'flex', alignItems: 'center', gap: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Box sx={{ color, '& svg': { fontSize: 20 } }}>{icon}</Box>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{value}</Typography>
        <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>{label}</Typography>
      </Box>
    </Box>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

// ── Tab 1: Dashboard ──────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: dash } = useQuery({
    queryKey: ['plan-rh', 'dashboard'],
    queryFn: () => planRecrutementApi.dashboard().then(r => r.data),
  });
  const { data: plans = [] } = useQuery<PlanRecrutement[]>({
    queryKey: ['plan-rh', 'plans'],
    queryFn: () => planRecrutementApi.plans().then(r => r.data as PlanRecrutement[]),
  });
  const { data: processus = [] } = useQuery<ProcessusRecrutement[]>({
    queryKey: ['plan-rh', 'processus'],
    queryFn: () => planRecrutementApi.processus().then(r => r.data as ProcessusRecrutement[]),
  });

  const enCours = processus.filter(p => p.statut === 'en_cours').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <StatCard icon={<ListAlt />}      label="Plans de recrutement" value={dash?.total_plans ?? 0}        color="#2563EB" bg="#EFF6FF" />
        <StatCard icon={<Assignment />}   label="Besoins collectés"   value={dash?.besoins_by_statut?.collecte ?? 0} color="#D97706" bg="#FFFBEB" />
        <StatCard icon={<CheckCircle />}  label="Besoins validés"     value={dash?.besoins_by_statut?.valide ?? 0}   color="#059669" bg="#ECFDF5" />
        <StatCard icon={<Engineering />}  label="Processus en cours"  value={enCours}                         color="#7C3AED" bg="#F5F3FF" />
      </Box>

      {/* Plans récents */}
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 1.5 }}>Plans récents</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {plans.slice(0, 5).map(plan => (
          <Box key={plan.id} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{plan.titre}</Typography>
              <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                {plan.annee} · {fmtDate(plan.periode_debut)} → {fmtDate(plan.periode_fin)}
                {plan.lignes_count !== undefined && ` · ${plan.lignes_count} ligne${plan.lignes_count !== 1 ? 's' : ''}`}
              </Typography>
            </Box>
            <Chip
              label={plan.statut === 'valide_dg' ? 'Validé DG' : 'Brouillon'}
              size="small"
              sx={{ height: 22, fontSize: 11, fontWeight: 700,
                bgcolor: plan.statut === 'valide_dg' ? '#ECFDF5' : '#F1F5F9',
                color:   plan.statut === 'valide_dg' ? '#059669'  : '#475569',
              }}
            />
          </Box>
        ))}
        {plans.length === 0 && (
          <Typography sx={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', py: 4 }}>Aucun plan créé</Typography>
        )}
      </Box>
    </Box>
  );
}

// ── Tab 2: Postes ─────────────────────────────────────────────────────────────
function PostesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titre: '', direction_id: '', classification_ccni: 'B1', type_contrat_defaut: 'CDI', description: '' });

  const { data: postes = [], isLoading } = useQuery<PlanPoste[]>({
    queryKey: ['plan-rh', 'postes'],
    queryFn: () => planRecrutementApi.postes().then(r => r.data as PlanPoste[]),
  });
  const { data: depts = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then(r => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Department[];
    }),
  });

  const createMut = useMutation({
    mutationFn: (data: typeof form) => planRecrutementApi.createPoste({ ...data, direction_id: Number(data.direction_id) } as Partial<PlanPoste>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan-rh', 'postes'] }); setOpen(false); setForm({ titre: '', direction_id: '', classification_ccni: 'B1', type_contrat_defaut: 'CDI', description: '' }); },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ borderRadius: '10px', fontSize: 13 }}>
          Nouveau poste
        </Button>
      </Box>

      <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                {['Titre', 'Direction', 'Classification', 'Type contrat', 'Statut'].map(h => (
                  <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', py: 1.25, borderBottom: '2px solid #E2E8F0' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
              )) : postes.length === 0 ? (
                <TableRow><TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Aucun poste</TableCell></TableRow>
              ) : postes.map(p => (
                <TableRow key={p.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                  <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{p.titre}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#334155' }}>{p.direction?.name ?? '—'}</TableCell>
                  <TableCell><CcniBadge ccni={p.classification_ccni} /></TableCell>
                  <TableCell>
                    <Chip label={p.type_contrat_defaut} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={p.statut === 'actif' ? 'Actif' : 'Inactif'} size="small"
                      sx={{ height: 20, fontSize: 10, fontWeight: 700,
                        bgcolor: p.statut === 'actif' ? '#ECFDF5' : '#F1F5F9',
                        color:   p.statut === 'actif' ? '#059669'  : '#64748B',
                      }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Nouveau poste à pourvoir</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Titre du poste *" size="small" fullWidth value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
            <FormControl size="small" fullWidth>
              <InputLabel>Direction *</InputLabel>
              <Select value={form.direction_id} label="Direction *" onChange={e => setForm(f => ({ ...f, direction_id: String(e.target.value) }))}>
                {depts.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Classification CCNI</InputLabel>
                <Select value={form.classification_ccni} label="Classification CCNI" onChange={e => setForm(f => ({ ...f, classification_ccni: e.target.value }))}>
                  {(['A1','A2','B1','B2','C1','C2'] as const).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Type contrat défaut</InputLabel>
                <Select value={form.type_contrat_defaut} label="Type contrat défaut" onChange={e => setForm(f => ({ ...f, type_contrat_defaut: e.target.value }))}>
                  {['CDI','CDD','DECRET','Stage'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField label="Description" size="small" fullWidth multiline rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button size="small" onClick={() => setOpen(false)}>Annuler</Button>
          <Button size="small" variant="contained" onClick={() => createMut.mutate(form)} disabled={!form.titre || !form.direction_id || createMut.isPending} sx={{ borderRadius: '8px', px: 2.5 }}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Tab 3: Besoins ────────────────────────────────────────────────────────────
function BesoinsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ poste_id: '', direction_id: '', motif: 'nouveau_besoin', date_constat: '', description: '' });

  const { data: besoins = [], isLoading } = useQuery<BesoinRecrutement[]>({
    queryKey: ['plan-rh', 'besoins', filter],
    queryFn: () => planRecrutementApi.besoins(filter !== 'all' ? { statut: filter } : {}).then(r => r.data as BesoinRecrutement[]),
  });
  const { data: postes = [] } = useQuery<PlanPoste[]>({
    queryKey: ['plan-rh', 'postes'],
    queryFn: () => planRecrutementApi.postes().then(r => r.data as PlanPoste[]),
  });
  const { data: depts = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then(r => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Department[];
    }),
  });

  const createMut = useMutation({
    mutationFn: (data: typeof form) => planRecrutementApi.createBesoin({ ...data, poste_id: Number(data.poste_id), direction_id: Number(data.direction_id) } as Partial<BesoinRecrutement>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan-rh', 'besoins'] }); setOpen(false); },
  });

  const validerMut = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: 'valide' | 'rejete' }) =>
      planRecrutementApi.validerBesoin(id, statut),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-rh', 'besoins'] }),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {['all', 'collecte', 'valide', 'rejete'].map(s => (
            <Chip key={s} label={{ all: 'Tous', collecte: 'Collecte', valide: 'Validé', rejete: 'Rejeté' }[s]}
              onClick={() => setFilter(s)}
              sx={{ cursor: 'pointer', fontWeight: filter === s ? 700 : 400,
                bgcolor: filter === s ? '#EFF6FF' : '#F8FAFC',
                color: filter === s ? '#2563EB' : '#64748B',
                border: filter === s ? '1.5px solid #BFDBFE' : '1px solid #E2E8F0',
              }} />
          ))}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ borderRadius: '10px', fontSize: 13 }}>
          Nouveau besoin
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={72} sx={{ borderRadius: '10px' }} />) :
          besoins.length === 0 ? (
            <Typography sx={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', py: 6 }}>Aucun besoin</Typography>
          ) : besoins.map(b => {
            const sc = STATUT_BESOIN_COLORS[b.statut];
            return (
              <Box key={b.id} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', p: 2, display: 'flex', alignItems: 'flex-start', gap: 2, '&:hover': { bgcolor: '#FAFAFA' } }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      {b.poste?.titre ?? `Poste #${b.poste_id}`}
                    </Typography>
                    <CcniBadge ccni={(b.poste?.classification_ccni ?? 'B1') as ClassificationCCNI} />
                    <Chip label={MOTIF_LABELS[b.motif]} size="small" sx={{ height: 19, fontSize: 10, fontWeight: 600 }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                    {b.direction?.name ?? '—'} · Constaté le {fmtDate(b.date_constat)}
                    {b.description && ` · ${b.description}`}
                  </Typography>
                </Box>
                <Chip label={b.statut === 'collecte' ? 'En collecte' : b.statut === 'valide' ? 'Validé' : 'Rejeté'}
                  size="small"
                  sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
                {b.statut === 'collecte' && (
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Valider">
                      <IconButton size="small" onClick={() => validerMut.mutate({ id: b.id, statut: 'valide' })}
                        sx={{ bgcolor: '#ECFDF5', color: '#059669', '&:hover': { bgcolor: '#D1FAE5' }, borderRadius: '6px', p: 0.5 }}>
                        <CheckCircle sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Rejeter">
                      <IconButton size="small" onClick={() => validerMut.mutate({ id: b.id, statut: 'rejete' })}
                        sx={{ bgcolor: '#FEF2F2', color: '#DC2626', '&:hover': { bgcolor: '#FEE2E2' }, borderRadius: '6px', p: 0.5 }}>
                        <Cancel sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Box>
            );
          })
        }
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Nouveau besoin de recrutement</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Poste *</InputLabel>
              <Select value={form.poste_id} label="Poste *" onChange={e => setForm(f => ({ ...f, poste_id: String(e.target.value) }))}>
                {postes.filter(p => p.statut === 'actif').map(p => <MenuItem key={p.id} value={p.id}>{p.titre}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Direction *</InputLabel>
              <Select value={form.direction_id} label="Direction *" onChange={e => setForm(f => ({ ...f, direction_id: String(e.target.value) }))}>
                {depts.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Motif *</InputLabel>
              <Select value={form.motif} label="Motif *" onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}>
                {Object.entries(MOTIF_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField type="date" label="Date du constat *" size="small" fullWidth InputLabelProps={{ shrink: true }}
              value={form.date_constat} onChange={e => setForm(f => ({ ...f, date_constat: e.target.value }))} />
            <TextField label="Description" size="small" fullWidth multiline rows={2}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button size="small" onClick={() => setOpen(false)}>Annuler</Button>
          <Button size="small" variant="contained" onClick={() => createMut.mutate(form)}
            disabled={!form.poste_id || !form.direction_id || !form.date_constat || createMut.isPending}
            sx={{ borderRadius: '8px', px: 2.5 }}>Créer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Tab 4: Plans ──────────────────────────────────────────────────────────────
function PlansTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [ligneOpen, setLigneOpen] = useState(false);
  const [form, setForm] = useState({ annee: new Date().getFullYear(), titre: '', periode_debut: '', periode_fin: '', enveloppe_budgetaire: '', notes: '' });
  const [ligneForm, setLigneForm] = useState({ besoin_id: '', classification_ccni: 'B1', type_contrat: 'CDI', duree_cdd: '', salaire_base_estime: '', urgence_operationnelle: 3, impact_reglementaire: 3, disponibilite_budgetaire: 3, profil_marche_disponible: 3, notes: '' });

  const { data: plans = [], isLoading } = useQuery<PlanRecrutement[]>({
    queryKey: ['plan-rh', 'plans'],
    queryFn: () => planRecrutementApi.plans().then(r => r.data as PlanRecrutement[]),
  });
  const { data: planDetail } = useQuery<PlanRecrutement>({
    queryKey: ['plan-rh', 'plan', selectedPlan],
    queryFn: () => planRecrutementApi.showPlan(selectedPlan!).then(r => r.data),
    enabled: selectedPlan !== null,
  });
  const { data: besoins = [] } = useQuery<BesoinRecrutement[]>({
    queryKey: ['plan-rh', 'besoins', 'valide'],
    queryFn: () => planRecrutementApi.besoins({ statut: 'valide' }).then(r => r.data as BesoinRecrutement[]),
  });

  const createPlanMut = useMutation({
    mutationFn: (data: typeof form) => planRecrutementApi.createPlan({ ...data, annee: Number(data.annee), enveloppe_budgetaire: data.enveloppe_budgetaire ? Number(data.enveloppe_budgetaire) : undefined } as Partial<PlanRecrutement>),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['plan-rh', 'plans'] }); setOpen(false); setSelectedPlan((res.data as PlanRecrutement).id); },
  });

  const validerMut = useMutation({
    mutationFn: (id: number) => planRecrutementApi.validerPlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-rh', 'plans'] }),
  });

  const createLigneMut = useMutation({
    mutationFn: (data: typeof ligneForm) => planRecrutementApi.createLigne(selectedPlan!, {
      ...data,
      besoin_id: data.besoin_id ? Number(data.besoin_id) : undefined,
      duree_cdd: data.duree_cdd ? Number(data.duree_cdd) : undefined,
      salaire_base_estime: data.salaire_base_estime ? Number(data.salaire_base_estime) : undefined,
      urgence_operationnelle: Number(data.urgence_operationnelle),
      impact_reglementaire: Number(data.impact_reglementaire),
      disponibilite_budgetaire: Number(data.disponibilite_budgetaire),
      profil_marche_disponible: Number(data.profil_marche_disponible),
    } as Partial<LignePlan>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan-rh', 'plan', selectedPlan] }); setLigneOpen(false); },
  });

  const deleteLigneMut = useMutation({
    mutationFn: (id: number) => planRecrutementApi.deleteLigne(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-rh', 'plan', selectedPlan] }),
  });

  const lignes = planDetail?.lignes ?? [];
  const totalCout = lignes.reduce((sum, l) => sum + (l.cout_estime ?? 0), 0);

  return (
    <Box>
      {/* Plan list */}
      {selectedPlan === null ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ borderRadius: '10px', fontSize: 13 }}>
              Nouveau plan
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={80} sx={{ borderRadius: '10px' }} />) :
              plans.length === 0 ? (
                <Typography sx={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', py: 6 }}>Aucun plan créé</Typography>
              ) : plans.map(plan => (
                <Box key={plan.id} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC', borderColor: '#BFDBFE' } }}
                  onClick={() => setSelectedPlan(plan.id)}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#2563EB' }}>{plan.annee}</Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{plan.titre}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                      {fmtDate(plan.periode_debut)} → {fmtDate(plan.periode_fin)}
                      {plan.enveloppe_budgetaire && ` · Enveloppe : ${fmtMoney(plan.enveloppe_budgetaire)}`}
                      {plan.lignes_count !== undefined && ` · ${plan.lignes_count} poste${(plan.lignes_count ?? 0) !== 1 ? 's' : ''}`}
                    </Typography>
                  </Box>
                  <Chip label={plan.statut === 'valide_dg' ? 'Validé DG' : 'Brouillon'} size="small"
                    sx={{ height: 22, fontSize: 11, fontWeight: 700,
                      bgcolor: plan.statut === 'valide_dg' ? '#ECFDF5' : '#FFFBEB',
                      color:   plan.statut === 'valide_dg' ? '#059669'  : '#D97706',
                    }} />
                  {plan.statut === 'brouillon' && (
                    <Tooltip title="Valider DG">
                      <IconButton size="small" onClick={e => { e.stopPropagation(); validerMut.mutate(plan.id); }}
                        sx={{ bgcolor: '#ECFDF5', color: '#059669', '&:hover': { bgcolor: '#D1FAE5' }, borderRadius: '6px', p: 0.5 }}>
                        <CheckCircle sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              ))
            }
          </Box>
        </>
      ) : (
        /* Plan detail with lignes */
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Button size="small" onClick={() => setSelectedPlan(null)} sx={{ fontSize: 12, color: '#64748B' }}>
              ← Retour aux plans
            </Button>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{planDetail?.titre}</Typography>
              <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                {planDetail?.annee} · Coût total estimé : {fmtMoney(totalCout)}
              </Typography>
            </Box>
            {planDetail?.statut === 'brouillon' && (
              <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setLigneOpen(true)} sx={{ borderRadius: '8px', fontSize: 12 }}>
                Ajouter une ligne
              </Button>
            )}
          </Box>

          <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    {['Poste / Besoin', 'Classif.', 'Contrat', 'Salaire estimé', 'Coût total', 'Score priorité', ''].map(h => (
                      <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', py: 1.25, borderBottom: '2px solid #E2E8F0' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lignes.length === 0 ? (
                    <TableRow><TableCell colSpan={7} sx={{ py: 5, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Aucune ligne</TableCell></TableRow>
                  ) : lignes.map(l => (
                    <TableRow key={l.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                        {l.besoin?.poste?.titre ?? `Ligne #${l.id}`}
                        {l.notes && <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>{l.notes}</Typography>}
                      </TableCell>
                      <TableCell><CcniBadge ccni={l.classification_ccni} /></TableCell>
                      <TableCell>
                        <Chip label={l.type_contrat} size="small" sx={{ height: 19, fontSize: 10, fontWeight: 700, bgcolor: '#F0F9FF', color: '#0284C7' }} />
                        {l.duree_cdd && <Typography sx={{ fontSize: 10, color: '#64748B' }}>{l.duree_cdd} mois</Typography>}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{fmtMoney(l.salaire_base_estime)}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{fmtMoney(l.cout_estime)}</TableCell>
                      <TableCell>
                        {l.priorite_score != null && (
                          <Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: l.priorite_score >= 75 ? '#DC2626' : l.priorite_score >= 50 ? '#D97706' : '#059669' }}>
                              {Number(l.priorite_score).toFixed(0)}
                            </Typography>
                            <LinearProgress variant="determinate" value={Number(l.priorite_score)}
                              sx={{ height: 4, borderRadius: 2, bgcolor: '#F1F5F9',
                                '& .MuiLinearProgress-bar': { bgcolor: l.priorite_score >= 75 ? '#DC2626' : l.priorite_score >= 50 ? '#D97706' : '#059669', borderRadius: 2 },
                              }} />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {planDetail?.statut === 'brouillon' && (
                          <IconButton size="small" onClick={() => deleteLigneMut.mutate(l.id)} sx={{ p: 0.5 }}>
                            <Delete sx={{ fontSize: 15, color: '#EF4444' }} />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}

      {/* Create plan dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Nouveau plan de recrutement</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Année *" type="number" size="small" sx={{ width: 100 }} value={form.annee} onChange={e => setForm(f => ({ ...f, annee: Number(e.target.value) }))} />
              <TextField label="Titre *" size="small" sx={{ flexGrow: 1 }} value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField type="date" label="Période début *" size="small" fullWidth InputLabelProps={{ shrink: true }} value={form.periode_debut} onChange={e => setForm(f => ({ ...f, periode_debut: e.target.value }))} />
              <TextField type="date" label="Période fin *" size="small" fullWidth InputLabelProps={{ shrink: true }} value={form.periode_fin} onChange={e => setForm(f => ({ ...f, periode_fin: e.target.value }))} />
            </Box>
            <TextField label="Enveloppe budgétaire (FCFA)" type="number" size="small" fullWidth value={form.enveloppe_budgetaire} onChange={e => setForm(f => ({ ...f, enveloppe_budgetaire: e.target.value }))} />
            <TextField label="Notes" size="small" fullWidth multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button size="small" onClick={() => setOpen(false)}>Annuler</Button>
          <Button size="small" variant="contained" onClick={() => createPlanMut.mutate(form)}
            disabled={!form.titre || !form.periode_debut || !form.periode_fin || createPlanMut.isPending}
            sx={{ borderRadius: '8px', px: 2.5 }}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Add ligne dialog */}
      <Dialog open={ligneOpen} onClose={() => setLigneOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Ajouter une ligne au plan</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Besoin validé (optionnel)</InputLabel>
              <Select value={ligneForm.besoin_id} label="Besoin validé (optionnel)" onChange={e => setLigneForm(f => ({ ...f, besoin_id: String(e.target.value) }))}>
                <MenuItem value="">— Sans besoin lié —</MenuItem>
                {besoins.map(b => <MenuItem key={b.id} value={b.id}>{b.poste?.titre ?? `Besoin #${b.id}`} · {b.direction?.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Classification CCNI</InputLabel>
                <Select value={ligneForm.classification_ccni} label="Classification CCNI" onChange={e => setLigneForm(f => ({ ...f, classification_ccni: e.target.value }))}>
                  {(['A1','A2','B1','B2','C1','C2'] as const).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Type contrat</InputLabel>
                <Select value={ligneForm.type_contrat} label="Type contrat" onChange={e => setLigneForm(f => ({ ...f, type_contrat: e.target.value }))}>
                  {['CDI','CDD','DECRET','Stage'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            {ligneForm.type_contrat === 'CDD' && (
              <TextField label="Durée CDD (mois)" type="number" size="small" fullWidth value={ligneForm.duree_cdd} onChange={e => setLigneForm(f => ({ ...f, duree_cdd: e.target.value }))} />
            )}
            <TextField label="Salaire de base estimé (FCFA)" type="number" size="small" fullWidth value={ligneForm.salaire_base_estime} onChange={e => setLigneForm(f => ({ ...f, salaire_base_estime: e.target.value }))} />
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Critères de priorité (1 = faible, 5 = élevé)</Typography>
            <Grid container spacing={2}>
              {[
                { key: 'urgence_operationnelle', label: 'Urgence opérationnelle' },
                { key: 'impact_reglementaire', label: 'Impact réglementaire' },
                { key: 'disponibilite_budgetaire', label: 'Budget disponible' },
                { key: 'profil_marche_disponible', label: 'Profil marché' },
              ].map(({ key, label }) => (
                <Grid item xs={6} key={key}>
                  <TextField label={label} type="number" size="small" fullWidth
                    value={ligneForm[key as keyof typeof ligneForm]}
                    onChange={e => setLigneForm(f => ({ ...f, [key]: Math.max(1, Math.min(5, Number(e.target.value))) }))}
                    InputProps={{ inputProps: { min: 1, max: 5 } }} />
                </Grid>
              ))}
            </Grid>
            <TextField label="Notes" size="small" fullWidth multiline rows={2} value={ligneForm.notes} onChange={e => setLigneForm(f => ({ ...f, notes: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button size="small" onClick={() => setLigneOpen(false)}>Annuler</Button>
          <Button size="small" variant="contained" onClick={() => createLigneMut.mutate(ligneForm)}
            disabled={createLigneMut.isPending} sx={{ borderRadius: '8px', px: 2.5 }}>Ajouter</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Tab 5: Processus ──────────────────────────────────────────────────────────
function ProcessusTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('en_cours');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [etapeOpen, setEtapeOpen] = useState(false);
  const [etapeForm, setEtapeForm] = useState({ etape: 'publication' as EtapeRecrutement, commentaire: '' });
  const [candOpen, setCandOpen] = useState(false);
  const [candForm, setCandForm] = useState({ nom: '', prenom: '', email: '', telephone: '', notes: '' });
  const [form, setForm] = useState({ ligne_plan_id: '', date_demarrage: '', notes: '' });

  const { data: processus = [], isLoading } = useQuery<ProcessusRecrutement[]>({
    queryKey: ['plan-rh', 'processus', filter],
    queryFn: () => planRecrutementApi.processus(filter !== 'all' ? { statut: filter } : {}).then(r => r.data as ProcessusRecrutement[]),
  });

  const { data: detail } = useQuery<ProcessusRecrutement>({
    queryKey: ['plan-rh', 'processus', selected],
    queryFn: () => planRecrutementApi.showProcessus(selected!).then(r => r.data),
    enabled: selected !== null,
  });

  const { data: plans = [] } = useQuery<PlanRecrutement[]>({
    queryKey: ['plan-rh', 'plans'],
    queryFn: () => planRecrutementApi.plans().then(r => r.data as PlanRecrutement[]),
  });

  const createMut = useMutation({
    mutationFn: (data: typeof form) => planRecrutementApi.createProcessus({ ...data, ligne_plan_id: Number(data.ligne_plan_id) } as Partial<ProcessusRecrutement>),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['plan-rh', 'processus'] }); setOpen(false); setSelected((res.data as ProcessusRecrutement).id); },
  });

  const avancerMut = useMutation({
    mutationFn: (data: typeof etapeForm) => planRecrutementApi.avancerEtape(selected!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan-rh', 'processus', selected] }); setEtapeOpen(false); },
  });

  const createCandMut = useMutation({
    mutationFn: (data: typeof candForm) => planRecrutementApi.createCandidature({ ...data, processus_id: selected! } as Partial<CandidaturePlan>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan-rh', 'processus', selected] }); setCandOpen(false); },
  });

  const etapeIdx = detail ? ETAPES.findIndex(e => e.key === detail.etape_courante) : 0;

  // All lignes from all plans for the create form
  const allLignes = useMemo(() => plans.flatMap(p => p.lignes ?? []), [plans]);

  return (
    <Box>
      {selected === null ? (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {['all', 'en_cours', 'cloture', 'abandonne'].map(s => (
                <Chip key={s} label={{ all: 'Tous', en_cours: 'En cours', cloture: 'Clôturé', abandonne: 'Abandonné' }[s]}
                  onClick={() => setFilter(s)}
                  sx={{ cursor: 'pointer', fontWeight: filter === s ? 700 : 400,
                    bgcolor: filter === s ? '#EFF6FF' : '#F8FAFC',
                    color: filter === s ? '#2563EB' : '#64748B',
                    border: filter === s ? '1.5px solid #BFDBFE' : '1px solid #E2E8F0',
                  }} />
              ))}
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ borderRadius: '10px', fontSize: 13 }}>
              Nouveau processus
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={80} sx={{ borderRadius: '10px' }} />) :
              processus.length === 0 ? (
                <Typography sx={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', py: 6 }}>Aucun processus</Typography>
              ) : processus.map(p => {
                const sc = STATUT_PROCESSUS_COLORS[p.statut];
                const stepIdx = ETAPES.findIndex(e => e.key === p.etape_courante);
                const progress = Math.round(((stepIdx + 1) / ETAPES.length) * 100);
                return (
                  <Box key={p.id} onClick={() => setSelected(p.id)}
                    sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', p: 2, cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC', borderColor: '#BFDBFE' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                          {p.lignePlan?.besoin?.poste?.titre ?? `Processus #${p.id}`}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                          Démarré le {fmtDate(p.date_demarrage)} · Plan {p.lignePlan?.planRecrutement?.annee}
                        </Typography>
                      </Box>
                      <Chip label={p.statut === 'en_cours' ? 'En cours' : p.statut === 'cloture' ? 'Clôturé' : 'Abandonné'}
                        size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={progress} sx={{ flexGrow: 1, height: 5, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#2563EB', borderRadius: 3 } }} />
                      <Typography sx={{ fontSize: 10, color: '#64748B', minWidth: 100 }}>
                        {ETAPES[stepIdx]?.label} ({progress}%)
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            }
          </Box>
        </>
      ) : (
        /* Processus detail */
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Button size="small" onClick={() => setSelected(null)} sx={{ fontSize: 12, color: '#64748B' }}>← Retour</Button>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                {detail?.lignePlan?.besoin?.poste?.titre ?? `Processus #${detail?.id}`}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#64748B' }}>Démarré le {fmtDate(detail?.date_demarrage)}</Typography>
            </Box>
            {detail?.statut === 'en_cours' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setCandOpen(true)} sx={{ borderRadius: '8px', fontSize: 12 }}>
                  Candidature
                </Button>
                <Button size="small" variant="contained" onClick={() => setEtapeOpen(true)} sx={{ borderRadius: '8px', fontSize: 12 }}>
                  Avancer l'étape
                </Button>
              </Box>
            )}
          </Box>

          {/* Stepper */}
          <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', p: 2.5, mb: 2, overflowX: 'auto' }}>
            <Stepper activeStep={etapeIdx} alternativeLabel>
              {ETAPES.map((e, i) => (
                <Step key={e.key} completed={i < etapeIdx}>
                  <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 10 } }}>{e.label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Candidatures */}
          {(detail?.candidatures?.length ?? 0) > 0 && (
            <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, mb: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', mb: 1.5 }}>
                Candidatures ({detail?.candidatures?.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {detail?.candidatures?.map(c => {
                  const sc = STATUT_CAND_COLORS[c.statut];
                  return (
                    <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: '#EFF6FF', color: '#2563EB' }}>
                        {c.prenom[0]}{c.nom[0]}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{c.prenom} {c.nom}</Typography>
                        <Typography sx={{ fontSize: 10, color: '#64748B' }}>{c.email ?? c.telephone ?? '—'}</Typography>
                      </Box>
                      {c.score != null && (
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{c.score}/100</Typography>
                      )}
                      <Chip label={c.statut} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Historique étapes */}
          {(detail?.etapesHistorique?.length ?? 0) > 0 && (
            <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', p: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', mb: 1.5 }}>Journal des étapes</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {detail?.etapesHistorique?.map(e => (
                  <Box key={e.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1, borderRadius: '8px', bgcolor: '#F8FAFC' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: e.date_sortie ? '#059669' : '#2563EB', mt: 0.7, flexShrink: 0 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                        {ETAPES.find(et => et.key === e.etape)?.label ?? e.etape}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: '#64748B' }}>
                        {fmtDate(e.date_entree)}{e.date_sortie && ` → ${fmtDate(e.date_sortie)}`}
                        {e.role_validateur && ` · ${e.role_validateur}`}
                        {e.commentaire && ` · ${e.commentaire}`}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Create processus */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Lancer un processus de recrutement</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Ligne de plan *</InputLabel>
              <Select value={form.ligne_plan_id} label="Ligne de plan *" onChange={e => setForm(f => ({ ...f, ligne_plan_id: String(e.target.value) }))}>
                {allLignes.map(l => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.besoin?.poste?.titre ?? `Ligne #${l.id}`} · {l.type_contrat} · {l.classification_ccni}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField type="date" label="Date de démarrage *" size="small" fullWidth InputLabelProps={{ shrink: true }}
              value={form.date_demarrage} onChange={e => setForm(f => ({ ...f, date_demarrage: e.target.value }))} />
            <TextField label="Notes" size="small" fullWidth multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button size="small" onClick={() => setOpen(false)}>Annuler</Button>
          <Button size="small" variant="contained" onClick={() => createMut.mutate(form)}
            disabled={!form.ligne_plan_id || !form.date_demarrage || createMut.isPending}
            sx={{ borderRadius: '8px', px: 2.5 }}>Lancer</Button>
        </DialogActions>
      </Dialog>

      {/* Avancer étape */}
      <Dialog open={etapeOpen} onClose={() => setEtapeOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Avancer l'étape</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Nouvelle étape</InputLabel>
              <Select value={etapeForm.etape} label="Nouvelle étape" onChange={e => setEtapeForm(f => ({ ...f, etape: e.target.value as EtapeRecrutement }))}>
                {ETAPES.filter((_, i) => i > etapeIdx).map(e => (
                  <MenuItem key={e.key} value={e.key}>{e.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Commentaire" size="small" fullWidth multiline rows={2} value={etapeForm.commentaire} onChange={e => setEtapeForm(f => ({ ...f, commentaire: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button size="small" onClick={() => setEtapeOpen(false)}>Annuler</Button>
          <Button size="small" variant="contained" onClick={() => avancerMut.mutate(etapeForm)}
            disabled={avancerMut.isPending} sx={{ borderRadius: '8px', px: 2.5 }}>Valider</Button>
        </DialogActions>
      </Dialog>

      {/* Add candidature */}
      <Dialog open={candOpen} onClose={() => setCandOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Enregistrer une candidature</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Prénom *" size="small" fullWidth value={candForm.prenom} onChange={e => setCandForm(f => ({ ...f, prenom: e.target.value }))} />
              <TextField label="Nom *" size="small" fullWidth value={candForm.nom} onChange={e => setCandForm(f => ({ ...f, nom: e.target.value }))} />
            </Box>
            <TextField label="Email" size="small" fullWidth value={candForm.email} onChange={e => setCandForm(f => ({ ...f, email: e.target.value }))} />
            <TextField label="Téléphone" size="small" fullWidth value={candForm.telephone} onChange={e => setCandForm(f => ({ ...f, telephone: e.target.value }))} />
            <TextField label="Notes" size="small" fullWidth multiline rows={2} value={candForm.notes} onChange={e => setCandForm(f => ({ ...f, notes: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button size="small" onClick={() => setCandOpen(false)}>Annuler</Button>
          <Button size="small" variant="contained" onClick={() => createCandMut.mutate(candForm)}
            disabled={!candForm.nom || !candForm.prenom || createCandMut.isPending}
            sx={{ borderRadius: '8px', px: 2.5 }}>Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PlanRecrutementPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
          Plan de Recrutement
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.5 }}>
          Planification annuelle · Besoins · Processus · Candidatures
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', mb: 3, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ px: 2, '& .MuiTab-root': { fontSize: 13, fontWeight: 600, minHeight: 48 }, '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' } }}>
          <Tab icon={<TrendingUp sx={{ fontSize: 16 }} />} iconPosition="start" label="Tableau de bord" />
          <Tab icon={<Work sx={{ fontSize: 16 }} />} iconPosition="start" label="Postes" />
          <Tab icon={<Assignment sx={{ fontSize: 16 }} />} iconPosition="start" label="Besoins" />
          <Tab icon={<ListAlt sx={{ fontSize: 16 }} />} iconPosition="start" label="Plans" />
          <Tab icon={<Engineering sx={{ fontSize: 16 }} />} iconPosition="start" label="Processus" />
        </Tabs>
      </Box>

      {/* Tab content */}
      {tab === 0 && <DashboardTab />}
      {tab === 1 && <PostesTab />}
      {tab === 2 && <BesoinsTab />}
      {tab === 3 && <PlansTab />}
      {tab === 4 && <ProcessusTab />}
    </Box>
  );
}
