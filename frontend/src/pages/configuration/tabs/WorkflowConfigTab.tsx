import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Stack, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Switch, FormControlLabel, Chip, Alert,
  Snackbar, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Tooltip, Divider,
} from '@mui/material';
import {
  AccountTree, Add, Save, Delete, DragIndicator, Info,
  CheckCircle, RadioButtonUnchecked,
} from '@mui/icons-material';
import { workflowConfigApi, type WorkflowGroup, type WorkflowLevel } from '../../../api/workflowConfig';
import { rolesApi } from '../../../api/roles';
import SectionCard from '../SectionCard';

const LEVEL_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

const EMPTY_LEVELS = (wfKey: string, wfLabel: string): WorkflowLevel[] =>
  [1, 2, 3, 4, 5].map(n => ({
    workflow_key: wfKey, workflow_label: wfLabel,
    level: n, label: `Niveau ${n}`, role_name: '', is_active: n <= 3,
  }));

function LevelRow({
  row, roleOptions, onChange,
}: {
  row: WorkflowLevel;
  roleOptions: string[];
  onChange: (updated: WorkflowLevel) => void;
}) {
  const color = LEVEL_COLORS[(row.level - 1) % LEVEL_COLORS.length];

  return (
    <Stack direction="row" spacing={1.5} alignItems="center"
      sx={{
        px: 2, py: 1.25, borderRadius: '10px',
        bgcolor: row.is_active ? 'background.paper' : '#F8FAFC',
        border: '1px solid',
        borderColor: row.is_active ? color + '40' : '#E2E8F0',
        opacity: row.is_active ? 1 : 0.6,
        transition: 'all 0.15s',
      }}>

      {/* Numéro niveau */}
      <Box sx={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        bgcolor: row.is_active ? color : '#CBD5E1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: 14,
      }}>
        {row.level}
      </Box>

      {/* Label */}
      <TextField
        size="small" label="Libellé du niveau"
        value={row.label}
        onChange={e => onChange({ ...row, label: e.target.value })}
        disabled={!row.is_active}
        sx={{ flex: 2, minWidth: 180 }}
        InputProps={{ sx: { fontSize: 13 } }}
      />

      {/* Rôle */}
      <FormControl size="small" sx={{ flex: 1, minWidth: 150 }} disabled={!row.is_active}>
        <InputLabel sx={{ fontSize: 13 }}>Rôle assigné</InputLabel>
        <Select
          value={row.role_name}
          label="Rôle assigné"
          onChange={e => onChange({ ...row, role_name: e.target.value })}
          sx={{ fontSize: 13 }}
        >
          {roleOptions.map(r => (
            <MenuItem key={r} value={r} sx={{ fontSize: 13 }}>{r}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Toggle actif */}
      <Tooltip title={row.is_active ? 'Niveau actif — cliquer pour désactiver' : 'Niveau inactif — cliquer pour activer'}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {row.is_active
            ? <CheckCircle sx={{ fontSize: 18, color }} />
            : <RadioButtonUnchecked sx={{ fontSize: 18, color: '#94A3B8' }} />}
          <Switch
            checked={row.is_active}
            size="small"
            onChange={e => onChange({ ...row, is_active: e.target.checked })}
            sx={{
              '& .MuiSwitch-thumb':  { bgcolor: row.is_active ? color : '#94A3B8' },
              '& .MuiSwitch-track':  { bgcolor: row.is_active ? color + '60' : undefined },
            }}
          />
        </Box>
      </Tooltip>
    </Stack>
  );
}

function WorkflowCard({
  group, roleOptions, onSave, onDelete, saving,
}: {
  group: WorkflowGroup;
  roleOptions: string[];
  onSave: (rows: WorkflowLevel[]) => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [wfLabel, setWfLabel] = useState(group.label);
  const [levels,  setLevels]  = useState<WorkflowLevel[]>(() => {
    const existing = new Map(group.levels.map(l => [l.level, l]));
    return [1, 2, 3, 4, 5].map(n => existing.get(n) ?? {
      workflow_key: group.key, workflow_label: group.label,
      level: n, label: `Niveau ${n}`, role_name: roleOptions[0] ?? '', is_active: false,
    });
  });

  const activeCount = levels.filter(l => l.is_active).length;

  const handleSave = () => {
    const rows = levels.map(l => ({ ...l, workflow_label: wfLabel }));
    onSave(rows);
  };

  return (
    <SectionCard
      icon={<AccountTree sx={{ fontSize: 20 }} />}
      title={wfLabel}
      subtitle={`${activeCount} niveau${activeCount > 1 ? 'x' : ''} actif${activeCount > 1 ? 's' : ''} sur 5`}
      action={
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={group.key} size="small"
            sx={{ fontSize: 11, height: 22, bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontFamily: 'monospace' }} />
          {onDelete && (
            <Tooltip title="Supprimer ce workflow">
              <IconButton size="small" color="error" onClick={onDelete}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      }
    >
      <Stack spacing={1.5}>
        {/* Nom du workflow */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
          <TextField
            size="small" label="Nom du workflow"
            value={wfLabel}
            onChange={e => setWfLabel(e.target.value)}
            sx={{ maxWidth: 320 }}
            InputProps={{ sx: { fontSize: 13 } }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
            <Info sx={{ fontSize: 15 }} />
            <Typography sx={{ fontSize: 11 }}>
              Désactivez un niveau pour le sauter automatiquement dans le workflow
            </Typography>
          </Box>
        </Stack>

        <Divider />

        {/* Lignes des niveaux */}
        <Stack spacing={1}>
          {levels.map((row, i) => (
            <LevelRow
              key={row.level}
              row={row}
              roleOptions={roleOptions}
              onChange={updated => setLevels(prev => prev.map((r, j) => j === i ? updated : r))}
            />
          ))}
        </Stack>

        {/* Bouton sauvegarder */}
        <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button variant="contained" size="small"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save sx={{ fontSize: '15px !important' }} />}
            onClick={handleSave}
            sx={{
              borderRadius: '8px', fontWeight: 700, fontSize: 13,
              background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
              '&:hover': { background: 'linear-gradient(135deg,#1D4ED8,#6D28D9)' },
            }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </Stack>
      </Stack>
    </SectionCard>
  );
}

/* ─── Dialoge nouveau workflow ──────────────────────────────────────────── */
function NewWorkflowDialog({ roles, onClose, onConfirm }: {
  roles: string[];
  onClose: () => void;
  onConfirm: (rows: WorkflowLevel[]) => void;
}) {
  const [key,   setKey]   = useState('');
  const [label, setLabel] = useState('');

  const valid = key.trim() && label.trim() && /^[a-z_]+$/.test(key.trim());

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 15 }}>
        Nouveau circuit de validation
      </DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <Stack spacing={2}>
          <TextField size="small" label="Clé technique (ex: conge_special)"
            value={key} onChange={e => setKey(e.target.value.toLowerCase().replace(/[^a-z_]/g, ''))}
            helperText="Lettres minuscules et _ uniquement" fullWidth />
          <TextField size="small" label="Nom affiché (ex: Congés spéciaux)"
            value={label} onChange={e => setLabel(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748B' }}>Annuler</Button>
        <Button variant="contained" disabled={!valid}
          onClick={() => onConfirm(EMPTY_LEVELS(key.trim(), label.trim()))}
          sx={{ borderRadius: '8px', fontWeight: 700 }}>
          Créer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Onglet principal ──────────────────────────────────────────────────── */
export default function WorkflowConfigTab() {
  const qc = useQueryClient();
  const [snack,    setSnack]    = useState('');
  const [newDlg,   setNewDlg]   = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflow-configs'],
    queryFn:  () => workflowConfigApi.list(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn:  () => rolesApi.list().then(r => r.data),
  });
  const roleOptions = rolesData?.roles.map(r => r.name) ?? [];

  const saveMutation = useMutation({
    mutationFn: (rows: WorkflowLevel[]) => workflowConfigApi.save(rows),
    onSuccess: (_, rows) => {
      qc.invalidateQueries({ queryKey: ['workflow-configs'] });
      setSavingKey(null);
      setSnack('Configuration enregistrée.');
    },
    onError: () => { setSavingKey(null); setSnack('Erreur lors de la sauvegarde.'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => workflowConfigApi.remove(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-configs'] });
      setSnack('Workflow supprimé.');
    },
  });

  const handleSave = (key: string, rows: WorkflowLevel[]) => {
    setSavingKey(key);
    saveMutation.mutate(rows);
  };

  const handleNewWorkflow = (rows: WorkflowLevel[]) => {
    setNewDlg(false);
    setSavingKey(rows[0].workflow_key);
    saveMutation.mutate(rows);
  };

  if (isLoading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Stack spacing={3}>
      {/* En-tête */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: 'text.primary' }}>
            Circuits de validation
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
            Configurez les niveaux de validation et les rôles associés pour chaque processus RH.
            Les rôles se gèrent dans l'onglet <strong>Profils & droits</strong>.
          </Typography>
        </Box>
        <Button variant="outlined" size="small"
          startIcon={<Add sx={{ fontSize: '15px !important' }} />}
          onClick={() => setNewDlg(true)}
          sx={{ borderRadius: '8px', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
          Nouveau workflow
        </Button>
      </Stack>

      {/* Info */}
      <Alert severity="info" icon={<Info fontSize="small" />} sx={{ fontSize: 12, borderRadius: '10px' }}>
        <strong>Comment ça fonctionne :</strong> Chaque agent soumettant une demande doit obtenir
        l'approbation des niveaux actifs dans l'ordre. Un niveau inactif est automatiquement sauté.
        L'utilisateur doit avoir le rôle assigné au niveau pour pouvoir valider.
      </Alert>

      {/* Cards des workflows */}
      {workflows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: '#94A3B8' }}>
          <AccountTree sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
          <Typography sx={{ fontSize: 14 }}>Aucun circuit configuré</Typography>
        </Box>
      ) : (
        workflows.map(wf => (
          <WorkflowCard
            key={wf.key}
            group={wf}
            roleOptions={roleOptions}
            saving={savingKey === wf.key && saveMutation.isPending}
            onSave={rows => handleSave(wf.key, rows)}
            onDelete={wf.key !== 'absence' ? () => deleteMutation.mutate(wf.key) : undefined}
          />
        ))
      )}

      {newDlg && (
        <NewWorkflowDialog
          roles={roleOptions}
          onClose={() => setNewDlg(false)}
          onConfirm={handleNewWorkflow}
        />
      )}

      <Snackbar
        open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
}
