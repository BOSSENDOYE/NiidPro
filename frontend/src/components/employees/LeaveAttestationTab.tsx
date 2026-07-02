import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Button, Autocomplete, TextField,
  FormControl, InputLabel, Select, MenuItem, Paper, Chip,
  Alert, Divider, CircularProgress,
} from '@mui/material';
import { Description, Download, CheckCircle, Person, EventNote } from '@mui/icons-material';
import { documentsApi } from '../../api/documents';
import { employeesApi } from '../../api/employees';
import { leavesApi } from '../../api/leaves';
import { formatDate } from '../../utils/format';
import type { Employee, DocumentTemplate, GeneratedDocument, Leave } from '../../types';

const NAV = '#0D2137';
const ACT = '#E85D04';

interface Props { searchText?: string; }

export default function LeaveAttestationTab({ searchText = '' }: Props) {
  const qc = useQueryClient();

  const [selectedEmp, setSelectedEmp]       = useState<Employee | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [lastGenerated, setLastGenerated]   = useState<GeneratedDocument | null>(null);

  /* queries */
  const { data: employeesData } = useQuery({
    queryKey: ['employees', 1, '', 'all'],
    queryFn: () => employeesApi.list({ page: 1, per_page: 200 }).then((r) => r.data),
  });
  const allEmployees = employeesData?.data ?? [];
  const employees = searchText
    ? allEmployees.filter((e) => {
        const s = searchText.toLowerCase();
        return (
          `${e.first_name} ${e.last_name}`.toLowerCase().includes(s) ||
          e.employee_number.toLowerCase().includes(s) ||
          (e.department?.name ?? '').toLowerCase().includes(s)
        );
      })
    : allEmployees;

  const { data: templates = [] } = useQuery({
    queryKey: ['documents', 'templates', 'attestation'],
    queryFn: () => documentsApi.listTemplates({ type: 'attestation' }).then((r) => r.data),
  });

  const { data: empLeaves = [] } = useQuery({
    queryKey: ['leaves', 'employee', selectedEmp?.id],
    queryFn: () => leavesApi.list().then((r) =>
      (r.data as Leave[]).filter((l) => l.employee_id === selectedEmp!.id)
    ),
    enabled: !!selectedEmp,
  });

  /* mutation */
  const generateMutation = useMutation({
    mutationFn: () => documentsApi.generate(selectedTemplate!.id, [selectedEmp!.id]),
    onSuccess: (r) => {
      setLastGenerated(r.data.documents?.[0] ?? null);
      qc.invalidateQueries({ queryKey: ['documents', 'generated'] });
    },
  });

  const canGenerate = !!selectedEmp && !!selectedTemplate;

  const approvedLeaves = (empLeaves as { status: string }[]).filter((l) => l.status === 'approved');

  return (
    <Box>
      {/* ── Titre section ── */}
      <Box sx={{ bgcolor: '#1A3A5C', px: 2.5, py: 1.25 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          Génération d'attestation de congé
        </Typography>
      </Box>

      <Box sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>

          {/* ── Formulaire ── */}
          <Box sx={{ flex: 1 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                <Person sx={{ color: NAV, fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: NAV }}>
                  Sélectionner un agent
                </Typography>
              </Stack>

              <Stack spacing={2.5}>
                <Autocomplete
                  options={employees}
                  getOptionLabel={(e) => `${e.employee_number} — ${e.first_name} ${e.last_name}`}
                  value={selectedEmp}
                  onChange={(_, v) => { setSelectedEmp(v); setLastGenerated(null); }}
                  filterOptions={(opts, { inputValue }) => {
                    const q = inputValue.trim();
                    if (q.length < 2) return [];
                    const ql = q.toLowerCase();
                    return opts.filter(e =>
                      e.employee_number.toLowerCase().includes(ql) ||
                      (e.phone_professional ?? e.phone ?? '').replace(/\s+/g, '').toLowerCase().includes(ql.replace(/\s+/g, '')) ||
                      (e.phone_personal ?? '').replace(/\s+/g, '').toLowerCase().includes(ql.replace(/\s+/g, '')) ||
                      e.first_name.toLowerCase().startsWith(ql)
                    );
                  }}
                  noOptionsText="Tapez 2 caractères (matricule, téléphone ou prénom)…"
                  renderInput={(p) => (
                    <TextField {...p} label="Agent" size="small" placeholder="Matricule, téléphone ou 2 lettres du prénom…" />
                  )}
                />

                {selectedEmp && (
                  <Box sx={{ bgcolor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', p: 1.5 }}>
                    <Stack spacing={0.5}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0C4A6E' }}>
                        {selectedEmp.first_name} {selectedEmp.last_name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#0369A1' }}>
                        {selectedEmp.employee_number} · {selectedEmp.department?.name ?? '—'} · {selectedEmp.position?.title ?? '—'}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={`${approvedLeaves.length} congé(s) approuvé(s)`}
                          size="small"
                          sx={{ fontSize: 11, bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 700 }}
                        />
                        <Chip
                          label={`${selectedEmp.annual_leave_days ?? 0} j/an`}
                          size="small"
                          sx={{ fontSize: 11, bgcolor: '#EDE9FE', color: '#5B21B6', fontWeight: 700 }}
                        />
                      </Stack>
                    </Stack>
                  </Box>
                )}

                <Divider />

                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                  <Description sx={{ color: NAV, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 14, color: NAV }}>
                    Modèle d'attestation
                  </Typography>
                </Stack>

                {templates.length === 0 ? (
                  <Alert severity="warning" sx={{ fontSize: 12 }}>
                    Aucun modèle d'attestation disponible. Créez-en un dans la section Documents.
                  </Alert>
                ) : (
                  <FormControl size="small" fullWidth>
                    <InputLabel>Modèle</InputLabel>
                    <Select
                      value={selectedTemplate?.id ?? ''}
                      label="Modèle"
                      onChange={(e) => {
                        const t = templates.find((t) => t.id === Number(e.target.value)) ?? null;
                        setSelectedTemplate(t);
                        setLastGenerated(null);
                      }}
                    >
                      {templates.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          <Stack>
                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{t.name}</Typography>
                            {t.description && (
                              <Typography sx={{ fontSize: 11, color: '#64748B' }}>{t.description}</Typography>
                            )}
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Button
                  variant="contained"
                  size="medium"
                  startIcon={generateMutation.isPending
                    ? <CircularProgress size={14} color="inherit" />
                    : <Description sx={{ fontSize: '16px !important' }} />
                  }
                  disabled={!canGenerate || generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                  sx={{
                    bgcolor: ACT, '&:hover': { bgcolor: '#C14D03' },
                    borderRadius: '8px', fontWeight: 700, fontSize: 13, mt: 0.5,
                    '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' },
                  }}
                >
                  {generateMutation.isPending ? 'Génération…' : 'Générer l\'attestation'}
                </Button>
              </Stack>
            </Paper>
          </Box>

          {/* ── Aperçu / résultat ── */}
          <Box sx={{ flex: 1 }}>
            {lastGenerated ? (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px', borderColor: '#6EE7B7' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <CheckCircle sx={{ color: '#059669', fontSize: 22 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#059669' }}>
                    Attestation générée
                  </Typography>
                </Stack>

                <Box sx={{ bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', p: 1.5, mb: 2 }}>
                  <Stack spacing={0.75}>
                    <Stack direction="row" spacing={1}>
                      <Typography sx={{ minWidth: 90, fontSize: 12, fontWeight: 700, color: '#475569' }}>Référence :</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#065F46' }}>
                        {lastGenerated.reference}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Typography sx={{ minWidth: 90, fontSize: 12, fontWeight: 700, color: '#475569' }}>Agent :</Typography>
                      <Typography sx={{ fontSize: 12 }}>
                        {lastGenerated.employee?.first_name} {lastGenerated.employee?.last_name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Typography sx={{ minWidth: 90, fontSize: 12, fontWeight: 700, color: '#475569' }}>Généré le :</Typography>
                      <Typography sx={{ fontSize: 12 }}>{formatDate(lastGenerated.created_at)}</Typography>
                    </Stack>
                  </Stack>
                </Box>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Download sx={{ fontSize: '14px !important' }} />}
                  onClick={() => window.print()}
                  sx={{ borderRadius: '6px', fontSize: 12, fontWeight: 700, borderColor: '#059669', color: '#059669' }}
                >
                  Imprimer / Télécharger
                </Button>
              </Paper>
            ) : (
              /* ── Congés de l'agent sélectionné ── */
              selectedEmp ? (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px' }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <EventNote sx={{ color: NAV, fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: NAV }}>
                      Historique congés — {selectedEmp.first_name} {selectedEmp.last_name}
                    </Typography>
                  </Stack>

                  {empLeaves.length === 0 ? (
                    <Typography sx={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', py: 3 }}>
                      Aucun congé enregistré pour cet agent
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {(empLeaves as { id: number; status: string; start_date: string; end_date: string; days_count: number; leaveType?: { name: string; color?: string } }[])
                        .slice(0, 6)
                        .map((l) => (
                          <Box key={l.id} sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            px: 1.5, py: 0.75,
                            bgcolor: l.status === 'approved' ? '#F0FDF4' : l.status === 'pending' ? '#FFFBEB' : '#FEF2F2',
                            border: `1px solid ${l.status === 'approved' ? '#BBF7D0' : l.status === 'pending' ? '#FDE68A' : '#FECACA'}`,
                            borderRadius: '6px',
                          }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Chip
                                label={l.leaveType?.name ?? '—'}
                                size="small"
                                sx={{ fontSize: 10, height: 18, fontWeight: 700,
                                  bgcolor: l.leaveType?.color ? `${l.leaveType.color}20` : '#EEF2FF',
                                  color: l.leaveType?.color ?? '#6366F1',
                                }}
                              />
                              <Typography sx={{ fontSize: 11, color: '#475569' }}>
                                {formatDate(l.start_date)} → {formatDate(l.end_date)}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F' }}>
                                {l.days_count}j
                              </Typography>
                              <Chip
                                label={l.status === 'approved' ? 'Approuvé' : l.status === 'pending' ? 'En attente' : 'Refusé'}
                                size="small"
                                sx={{
                                  fontSize: 10, height: 18, fontWeight: 700,
                                  bgcolor: l.status === 'approved' ? '#D1FAE5' : l.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                                  color:   l.status === 'approved' ? '#065F46' : l.status === 'pending' ? '#92400E' : '#991B1B',
                                }}
                              />
                            </Stack>
                          </Box>
                        ))}
                    </Stack>
                  )}
                </Paper>
              ) : (
                <Paper variant="outlined" sx={{
                  p: 4, borderRadius: '10px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                  bgcolor: '#F8FAFC', borderStyle: 'dashed',
                }}>
                  <Description sx={{ fontSize: 48, color: '#CBD5E1' }} />
                  <Typography sx={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
                    Sélectionnez un agent et un modèle<br />pour générer une attestation de congé
                  </Typography>
                </Paper>
              )
            )}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
