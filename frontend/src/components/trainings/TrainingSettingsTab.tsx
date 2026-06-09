import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Tabs, Tab, Button, Stack, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Chip,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { trainingsApi } from '../../api/trainings';
import { departmentsApi } from '../../api/departments';
import type {
  Department, TrainingType, TrainingProvider, TrainingBudget, TrainingCostCenter,
} from '../../types';

const TH = '#5B21B5';
const ACT = '#8B5CF6';

type Section = 'types' | 'providers' | 'budgets' | 'cost_centers';

export default function TrainingSettingsTab() {
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>('types');
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; data: Record<string, unknown> } | null>(null);

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: Department[] }).data ?? [])) as Department[];
    }),
  });

  const { data: types = [] } = useQuery({ queryKey: ['trainings', 'types'], queryFn: () => trainingsApi.types().then((r) => r.data) });
  const { data: providers = [] } = useQuery({ queryKey: ['trainings', 'providers'], queryFn: () => trainingsApi.providers().then((r) => r.data) });
  const { data: budgets = [] } = useQuery({ queryKey: ['trainings', 'budgets'], queryFn: () => trainingsApi.budgets().then((r) => r.data) });
  const { data: costCenters = [] } = useQuery({ queryKey: ['trainings', 'cost-centers'], queryFn: () => trainingsApi.costCenters().then((r) => r.data) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['trainings', 'types'] });
    qc.invalidateQueries({ queryKey: ['trainings', 'providers'] });
    qc.invalidateQueries({ queryKey: ['trainings', 'budgets'] });
    qc.invalidateQueries({ queryKey: ['trainings', 'cost-centers'] });
  };

  const saveMutation = useMutation<unknown, Error, { mode: 'create' | 'edit'; data: Record<string, unknown> }>({
    mutationFn: ({ mode, data }) => {
      const id = data.id as number;
      if (section === 'types') return mode === 'create' ? trainingsApi.createType(data) : trainingsApi.updateType(id, data);
      if (section === 'providers') return mode === 'create' ? trainingsApi.createProvider(data) : trainingsApi.updateProvider(id, data);
      if (section === 'budgets') return mode === 'create' ? trainingsApi.createBudget(data) : trainingsApi.updateBudget(id, data);
      return mode === 'create' ? trainingsApi.createCostCenter(data) : trainingsApi.updateCostCenter(id, data);
    },
    onSuccess: () => { invalidate(); setDialog(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      if (section === 'types') return trainingsApi.deleteType(id);
      if (section === 'providers') return trainingsApi.deleteProvider(id);
      if (section === 'budgets') return trainingsApi.deleteBudget(id);
      return trainingsApi.deleteCostCenter(id);
    },
    onSuccess: invalidate,
  });

  const openCreate = () => {
    const defaults: Record<Section, Record<string, unknown>> = {
      types: { name: '', code: '', description: '' },
      providers: { name: '', contact_person: '', email: '', phone: '', city: '', country: '' },
      budgets: { name: '', department_id: null, year: new Date().getFullYear(), amount: 0 },
      cost_centers: { name: '', code: '', department_id: null, description: '', is_active: true },
    };
    setDialog({ mode: 'create', data: { ...defaults[section] } });
  };

  const set = (key: string, value: unknown) => setDialog((d) => d && { ...d, data: { ...d.data, [key]: value } });
  const v = (key: string) => (dialog?.data[key] ?? '') as string | number;

  return (
    <Box sx={{ p: 2.5 }}>
      <Tabs value={section} onChange={(_, s) => setSection(s)} sx={{ mb: 2, '& .MuiTab-root': { fontSize: 12.5, fontWeight: 700, textTransform: 'none' }, '& .MuiTabs-indicator': { bgcolor: TH } }}>
        <Tab value="types" label="Types de formation" />
        <Tab value="providers" label="Organismes" />
        <Tab value="budgets" label="Budgets" />
        <Tab value="cost_centers" label="Centres de coûts" />
      </Tabs>

      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
        <Button variant="contained" size="small" startIcon={<Add sx={{ fontSize: '16px !important' }} />} onClick={openCreate}
          sx={{ bgcolor: ACT, fontWeight: 700, fontSize: 12 }}>
          Ajouter
        </Button>
      </Stack>

      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          {/* ── Types ── */}
          {section === 'types' && (
            <>
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Nom</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {types.map((t: TrainingType) => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{t.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}><Chip label={t.code} size="small" sx={{ height: 20, fontSize: 10 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{t.description ?? '—'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <RowActions onEdit={() => setDialog({ mode: 'edit', data: { ...t } })} onDelete={() => deleteMutation.mutate(t.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}

          {/* ── Organismes ── */}
          {section === 'providers' && (
            <>
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Nom</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Ville</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {providers.map((p: TrainingProvider) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{p.name}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{p.contact_person ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{p.email ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{(p as TrainingProvider & { city?: string }).city ?? '—'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <RowActions onEdit={() => setDialog({ mode: 'edit', data: { ...p } })} onDelete={() => deleteMutation.mutate(p.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}

          {/* ── Budgets ── */}
          {section === 'budgets' && (
            <>
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Nom</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Année</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'right' }}>Montant</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'right' }}>Consommé</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {budgets.map((b: TrainingBudget) => (
                  <TableRow key={b.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{b.name}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{b.department?.name ?? 'Central'}</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{b.year}</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{new Intl.NumberFormat('fr-FR').format(b.amount)} F</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'right', color: '#DC2626' }}>{new Intl.NumberFormat('fr-FR').format(b.consumed_amount ?? 0)} F</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <RowActions onEdit={() => setDialog({ mode: 'edit', data: { ...b, department_id: b.department_id ?? null } })} onDelete={() => deleteMutation.mutate(b.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}

          {/* ── Centres de coûts ── */}
          {section === 'cost_centers' && (
            <>
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Nom</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Actif</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costCenters.map((c: TrainingCostCenter) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{c.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}><Chip label={c.code} size="small" sx={{ height: 20, fontSize: 10 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{c.department?.name ?? '—'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip label={c.is_active ? 'Oui' : 'Non'} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, color: c.is_active ? '#059669' : '#DC2626', bgcolor: c.is_active ? '#ECFDF5' : '#FEF2F2' }} />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <RowActions onEdit={() => setDialog({ mode: 'edit', data: { ...c, department_id: c.department_id ?? null } })} onDelete={() => deleteMutation.mutate(c.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}
        </Table>
      </TableContainer>

      {/* ── Dialog création/édition ── */}
      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: TH, color: '#fff', fontWeight: 700 }}>
          {dialog?.mode === 'create' ? 'Ajouter' : 'Modifier'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {section === 'types' && (
              <>
                <TextField label="Nom *" size="small" fullWidth value={v('name')} onChange={(e) => set('name', e.target.value)} />
                <TextField label="Code *" size="small" fullWidth value={v('code')} onChange={(e) => set('code', e.target.value)} />
                <TextField label="Description" size="small" fullWidth multiline rows={2} value={v('description')} onChange={(e) => set('description', e.target.value)} />
              </>
            )}
            {section === 'providers' && (
              <>
                <TextField label="Nom *" size="small" fullWidth value={v('name')} onChange={(e) => set('name', e.target.value)} />
                <TextField label="Personne de contact" size="small" fullWidth value={v('contact_person')} onChange={(e) => set('contact_person', e.target.value)} />
                <TextField label="Email" size="small" fullWidth value={v('email')} onChange={(e) => set('email', e.target.value)} />
                <TextField label="Téléphone" size="small" fullWidth value={v('phone')} onChange={(e) => set('phone', e.target.value)} />
                <Stack direction="row" spacing={2}>
                  <TextField label="Ville" size="small" fullWidth value={v('city')} onChange={(e) => set('city', e.target.value)} />
                  <TextField label="Pays" size="small" fullWidth value={v('country')} onChange={(e) => set('country', e.target.value)} />
                </Stack>
              </>
            )}
            {section === 'budgets' && (
              <>
                <TextField label="Nom *" size="small" fullWidth value={v('name')} onChange={(e) => set('name', e.target.value)} />
                <TextField select label="Service" size="small" fullWidth value={(dialog?.data.department_id as number) ?? ''} onChange={(e) => set('department_id', e.target.value === '' ? null : Number(e.target.value))}>
                  <MenuItem value="">Central (inter-services)</MenuItem>
                  {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </TextField>
                <Stack direction="row" spacing={2}>
                  <TextField label="Année *" type="number" size="small" fullWidth value={v('year')} onChange={(e) => set('year', Number(e.target.value))} />
                  <TextField label="Montant (F) *" type="number" size="small" fullWidth value={v('amount')} onChange={(e) => set('amount', Number(e.target.value))} />
                </Stack>
              </>
            )}
            {section === 'cost_centers' && (
              <>
                <TextField label="Nom *" size="small" fullWidth value={v('name')} onChange={(e) => set('name', e.target.value)} />
                <TextField label="Code *" size="small" fullWidth value={v('code')} onChange={(e) => set('code', e.target.value)} />
                <TextField select label="Service" size="small" fullWidth value={(dialog?.data.department_id as number) ?? ''} onChange={(e) => set('department_id', e.target.value === '' ? null : Number(e.target.value))}>
                  <MenuItem value="">Aucun</MenuItem>
                  {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </TextField>
                <TextField label="Description" size="small" fullWidth multiline rows={2} value={v('description')} onChange={(e) => set('description', e.target.value)} />
                <TextField select label="Actif" size="small" fullWidth value={(dialog?.data.is_active ?? true) ? 'true' : 'false'} onChange={(e) => set('is_active', e.target.value === 'true')}>
                  <MenuItem value="true">Oui</MenuItem>
                  <MenuItem value="false">Non</MenuItem>
                </TextField>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialog(null)}>Annuler</Button>
          <Button variant="contained" sx={{ bgcolor: ACT }} disabled={saveMutation.isPending}
            onClick={() => dialog && saveMutation.mutate({ mode: dialog.mode, data: dialog.data })}>
            {dialog?.mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <Stack direction="row" spacing={0.5} justifyContent="center">
      <Tooltip title="Modifier"><IconButton size="small" onClick={onEdit} sx={{ color: ACT }}><Edit sx={{ fontSize: 16 }} /></IconButton></Tooltip>
      <Tooltip title="Supprimer"><IconButton size="small" onClick={() => { if (confirm('Supprimer cet élément ?')) onDelete(); }} sx={{ color: '#DC2626' }}><Delete sx={{ fontSize: 16 }} /></IconButton></Tooltip>
    </Stack>
  );
}
