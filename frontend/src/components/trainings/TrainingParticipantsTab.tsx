import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, TextField, Chip,
  Dialog, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Autocomplete, IconButton, Tooltip,
} from '@mui/material';
import { Delete, PersonAdd } from '@mui/icons-material';
import ConfirmDialog from '../shared/ConfirmDialog';
import { trainingsApi } from '../../api/trainings';
import { employeesApi } from '../../api/employees';
import type { Training, Employee } from '../../types';

interface Props {
  training: Training;
  refreshTraining: () => void;
}

export default function TrainingParticipantsTab({ training, refreshTraining }: Props) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [toDel, setToDel] = useState<number | null>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 1, '', 'all'],
    queryFn: () => employeesApi.list({ page: 1, per_page: 200 }).then((r) => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Employee[];
    }),
  });

  const addParticipantsMutation = useMutation({
    mutationFn: (employeeIds: number[]) => trainingsApi.addParticipants(training.id, employeeIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      setAddOpen(false);
      setSelectedEmployees([]);
      refreshTraining();
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (employeeId: number) => trainingsApi.removeParticipant(training.id, employeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      refreshTraining();
    },
  });

  const participants = training.participants ?? [];

  const filteredEmployees = employees.filter((e) => {
    const q = search.trim();
    if (q.length < 2) return false;
    const ql = q.toLowerCase();
    const tel = ((e.phone_professional ?? e.phone ?? '') + (e.phone_personal ?? '')).replace(/\s+/g, '').toLowerCase();
    return (
      e.employee_number.toLowerCase().includes(ql) ||
      tel.includes(ql.replace(/\s+/g, '')) ||
      e.first_name.toLowerCase().startsWith(ql)
    );
  });

  return (
    <Box sx={{ p: 2.5 }}>
      {/* ── Header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
          Participants ({participants.length}/{training.participants_count})
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<PersonAdd sx={{ fontSize: '16px !important' }} />}
          onClick={() => setAddOpen(true)}
          sx={{ bgcolor: '#8B5CF6', fontSize: 12, fontWeight: 700 }}
        >
          Ajouter participants
        </Button>
      </Stack>

      {/* ── Liste participants ── */}
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F1F5F9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Matricule</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Nom & Prénom</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Département</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A', textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: '#64748B' }}>
                  Aucun participant
                </TableCell>
              </TableRow>
            ) : (
              participants.map((p) => (
                <TableRow key={p.id} hover sx={{ '&:hover': { bgcolor: 'rgba(139,92,246,0.05)' } }}>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
                    {p.employee?.employee_number ?? '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {p.employee?.first_name} {p.employee?.last_name}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, color: '#64748B' }}>
                    {p.employee?.department?.name ?? '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>
                    <Chip
                      label={
                        p.status === 'pending' ? 'En attente' :
                        p.status === 'confirmed' ? 'Confirmé' :
                        'Annulé'
                      }
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        color:
                          p.status === 'pending' ? '#D97706' :
                          p.status === 'confirmed' ? '#059669' :
                          '#DC2626',
                        bgcolor:
                          p.status === 'pending' ? '#FFFBEB' :
                          p.status === 'confirmed' ? '#ECFDF5' :
                          '#FEF2F2',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Tooltip title="Retirer">
                      <IconButton
                        size="small"
                        onClick={() => setToDel(p.employee_id)}
                        sx={{ color: '#DC2626' }}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Dialog Ajouter participants ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0F172A', mb: 2 }}>
            Ajouter des participants
          </Typography>

          <TextField
            label="Rechercher agents"
            size="small"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Matricule, téléphone ou 2 lettres du prénom…"
            sx={{ mb: 2 }}
          />

          <Autocomplete
            multiple
            options={filteredEmployees}
            getOptionLabel={(e) => `${e.employee_number} — ${e.first_name} ${e.last_name}`}
            value={selectedEmployees}
            onChange={(_, v) => setSelectedEmployees(v)}
            renderInput={(p) => <TextField {...p} label="Sélectionner agents" size="small" />}
            sx={{ mb: 2 }}
          />

          {selectedEmployees.length > 0 && (
            <Box sx={{ bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', p: 2, mb: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#065F46', mb: 1 }}>
                {selectedEmployees.length} agent(s) sélectionné(s)
              </Typography>
              <Stack spacing={0.5}>
                {selectedEmployees.map((e) => (
                  <Typography key={e.id} sx={{ fontSize: 11, color: '#065F46' }}>
                    • {e.first_name} {e.last_name}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setAddOpen(false); setSelectedEmployees([]); }}>Annuler</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#8B5CF6' }}
            onClick={() => {
              if (selectedEmployees.length > 0) {
                addParticipantsMutation.mutate(selectedEmployees.map((e) => e.id));
              }
            }}
            disabled={selectedEmployees.length === 0}
          >
            Ajouter ({selectedEmployees.length})
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={toDel !== null}
        message="Retirer ce participant de la formation ?"
        confirmLabel="Retirer"
        onConfirm={() => toDel !== null && removeParticipantMutation.mutate(toDel)}
        onClose={() => setToDel(null)}
      />
    </Box>
  );
}
