import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Stack, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Checkbox, Alert,
} from '@mui/material';
import {
  CheckCircle, Cancel as CancelIcon, Save,
} from '@mui/icons-material';
import { trainingsApi } from '../../api/trainings';
import type { Training } from '../../types';

interface Props {
  training: Training;
  refreshTraining: () => void;
}

export default function TrainingAttendanceTab({ training, refreshTraining }: Props) {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, { present: boolean; reason: string }>>({});

  const participants = training.participants ?? [];

  const recordAttendanceMutation = useMutation({
    mutationFn: async ({ employeeId, present, reason }: { employeeId: number; present: boolean; reason?: string }) => {
      return trainingsApi.recordAttendance(training.id, employeeId, present, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      refreshTraining();
    },
  });

  const handleSaveAttendance = async () => {
    for (const [employeeId, data] of Object.entries(attendanceMap)) {
      if (data) {
        await recordAttendanceMutation.mutateAsync({
          employeeId: Number(employeeId),
          present: data.present,
          reason: data.reason,
        });
      }
    }
    setAttendanceMap({});
  };

  const handleTogglePresent = (employeeId: number) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        present: !prev[employeeId]?.present,
      },
    }));
  };

  const handleSetReason = (employeeId: number, reason: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        reason,
      },
    }));
  };

  const hasChanges = Object.keys(attendanceMap).length > 0;

  return (
    <Box sx={{ p: 2.5 }}>
      {training.status !== 'in_progress' && training.status !== 'completed' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Les présences ne peuvent être enregistrées que pour les formations en cours ou réalisées.
        </Alert>
      )}

      {/* ── Sélection date ── */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="flex-end">
        <TextField
          label="Date de session"
          type="date"
          size="small"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 200 }}
        />
        <Button
          variant="outlined"
          size="small"
          sx={{ fontWeight: 700, fontSize: 12 }}
        >
          Charger présences du jour
        </Button>
      </Stack>

      {/* ── Tableau présences ── */}
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F1F5F9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Matricule</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Nom & Prénom</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Département</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A', textAlign: 'center' }}>Présent</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Motif absence</TableCell>
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
              participants.map((p) => {
                const data = attendanceMap[p.employee_id];
                const isPresent = data?.present ?? false;

                return (
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
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Checkbox
                        checked={isPresent}
                        onChange={() => handleTogglePresent(p.employee_id)}
                        icon={<CancelIcon sx={{ color: '#DC2626' }} />}
                        checkedIcon={<CheckCircle sx={{ color: '#059669' }} />}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="Motif si absent"
                        value={data?.reason ?? ''}
                        onChange={(e) => handleSetReason(p.employee_id, e.target.value)}
                        disabled={isPresent}
                        sx={{ width: 180, bgcolor: '#fff' }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Boutons actions ── */}
      {hasChanges && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setAttendanceMap({})}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Save sx={{ fontSize: '16px !important' }} />}
            onClick={handleSaveAttendance}
            disabled={recordAttendanceMutation.isPending}
            sx={{ bgcolor: '#8B5CF6', fontWeight: 700 }}
          >
            Enregistrer présences
          </Button>
        </Stack>
      )}
    </Box>
  );
}
