import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Skeleton, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, Stack, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, Checkbox, Chip,
  Avatar, IconButton, Tooltip,
} from '@mui/material';
import {
  Add, Search, Clear, CheckCircle, Cancel, AttachFile,
  Visibility, Close, Download, PictureAsPdf, Image as ImageIcon,
} from '@mui/icons-material';
import { justificationsApi, type Justification } from '../../api/justifications';
import { employeesApi } from '../../api/employees';
import StatusChip from '../../components/common/StatusChip';
import { formatDate } from '../../utils/format';
import type { Employee } from '../../types';

/* ─── Palette ─── */
const NAV = '#0D2137';
const ACT = '#E85D04';
const TH  = '#1A3A5C';

/* ─── Types d'absence ─── */
const ABSENCE_TYPES: { value: string; label: string; color: string; bg: string }[] = [
  { value: 'maladie',   label: 'Maladie',         color: '#DC2626', bg: '#FEE2E2' },
  { value: 'personnel', label: 'Personnel',        color: '#2563EB', bg: '#EFF6FF' },
  { value: 'formation', label: 'Formation',        color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'accident',  label: 'Accident travail', color: '#D97706', bg: '#FEF3C7' },
  { value: 'autre',     label: 'Autre',            color: '#475569', bg: '#F1F5F9' },
];

const getTypeConfig = (type?: string) =>
  ABSENCE_TYPES.find((t) => t.value === type) ?? ABSENCE_TYPES[4];

/* ─── Main ─── */
export default function JustificationsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab]         = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /* filtres */
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [service,     setService]     = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');
  const [matricule,   setMatricule]   = useState('');

  /* dialogs */
  const [newOpen,      setNewOpen]      = useState(false);
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [validateOpen, setValidateOpen] = useState<{ item: Justification; action: 'approve' | 'reject' } | null>(null);
  const [comment,      setComment]      = useState('');

  /* form nouveau */
  const [formEmp,    setFormEmp]    = useState<Employee | null>(null);
  const [formDate,   setFormDate]   = useState('');
  const [formType,   setFormType]   = useState('maladie');
  const [formReason, setFormReason] = useState('');
  const [formFile,   setFormFile]   = useState<File | null>(null);

  /* queries */
  const { data: all = [], isLoading } = useQuery({
    queryKey: ['justifications'],
    queryFn: () => justificationsApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? (d as Justification[]) : ((d as { data?: Justification[] }).data ?? []);
    }),
  });

  const { data: pending = [] } = useQuery({
    queryKey: ['justifications', 'pending'],
    queryFn: () => justificationsApi.pending().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? (d as Justification[]) : ((d as { data?: Justification[] }).data ?? []);
    }),
    refetchInterval: 60_000,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 1, '', 'all'],
    queryFn: () => employeesApi.list({ page: 1, per_page: 200 }).then((r) => r.data),
  });
  const employees = employeesData?.data ?? [];

  /* mutations */
  const createMutation = useMutation({
    mutationFn: () => justificationsApi.create({
      employee_id:  formEmp!.id,
      absence_date: formDate,
      absence_type: formType,
      reason:       formReason,
      document:     formFile ?? undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['justifications'] });
      setNewOpen(false);
      resetForm();
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      justificationsApi.approve(id, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['justifications'] }); setValidateOpen(null); setComment(''); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      justificationsApi.reject(id, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['justifications'] }); setValidateOpen(null); setComment(''); },
  });

  const resetForm = () => {
    setFormEmp(null); setFormDate(''); setFormType('maladie'); setFormReason(''); setFormFile(null);
  };

  /* filtrage */
  const filtered = useMemo(() => {
    const source = tab === 1 ? pending : all;
    return source.filter((j) => {
      if (dateFrom && j.date < dateFrom) return false;
      if (dateTo   && j.date > dateTo)   return false;
      if (service  && (j.employee?.department?.name ?? '').toLowerCase().indexOf(service.toLowerCase()) === -1) return false;
      if (typeFilter && j.absence_type !== typeFilter) return false;
      if (matricule  && !(j.employee?.employee_number ?? '').toLowerCase().includes(matricule.toLowerCase())) return false;
      return true;
    });
  }, [all, pending, tab, dateFrom, dateTo, service, typeFilter, matricule]);

  const selectedItem = all.find((j) => j.id === selectedId) ?? null;

  const isImage = (url?: string) => url ? /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url) : false;

  /* ─── Render contenu tableau ─── */
  const renderTable = () => (
    <Box>
      {/* Titre section */}
      <Box sx={{ bgcolor: TH, px: 2.5, py: 1.25 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          {tab === 0 ? 'Toutes les Justifications d\'Absence' : 'Justifications en attente de validation'}
        </Typography>
      </Box>

      {/* Filtres */}
      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none', p: 2, bgcolor: '#F8FAFC' }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Filtres
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="flex-end">
          <TextField label="Date du" type="date" size="small" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ bgcolor: '#fff', width: 155 }} />
          <TextField label="Au" type="date" size="small" value={dateTo}
            onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ bgcolor: '#fff', width: 155 }} />
          <TextField label="Service" size="small" value={service}
            onChange={e => setService(e.target.value)} sx={{ bgcolor: '#fff', width: 160 }} />
          <FormControl size="small" sx={{ bgcolor: '#fff', width: 190 }}>
            <InputLabel>Type d'absence</InputLabel>
            <Select value={typeFilter} label="Type d'absence" onChange={e => setTypeFilter(e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              {ABSENCE_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Matricule" size="small" value={matricule}
            onChange={e => setMatricule(e.target.value)} sx={{ bgcolor: '#fff', width: 140 }} />
          <Button variant="contained" size="small" startIcon={<Search sx={{ fontSize: '14px !important' }} />}
            sx={{ bgcolor: TH, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '6px', fontSize: 12, fontWeight: 700 }}>
            Chercher
          </Button>
          <Button variant="outlined" size="small" startIcon={<Clear sx={{ fontSize: '14px !important' }} />}
            onClick={() => { setDateFrom(''); setDateTo(''); setService(''); setTypeFilter(''); setMatricule(''); }}
            sx={{ borderRadius: '6px', fontSize: 12, fontWeight: 600, borderColor: '#CBD5E1', color: '#64748B' }}>
            Effacer
          </Button>
        </Stack>
      </Box>

      {/* Boutons actions */}
      <Box sx={{
        display: 'flex', justifyContent: 'flex-end', gap: 1,
        px: 2, py: 1, bgcolor: '#F1F5F9', border: '1px solid #CBD5E1', borderTop: 'none',
      }}>
        <Button variant="contained" size="small" startIcon={<Add sx={{ fontSize: '14px !important' }} />}
          onClick={() => setNewOpen(true)}
          sx={{ bgcolor: TH, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '6px', fontSize: 12, fontWeight: 700, minWidth: 90 }}>
          Nouveau
        </Button>
        <Button variant="outlined" size="small" startIcon={<Visibility sx={{ fontSize: '14px !important' }} />}
          disabled={!selectedId}
          onClick={() => setDetailOpen(true)}
          sx={{ borderRadius: '6px', fontSize: 12, fontWeight: 700, minWidth: 90, borderColor: TH, color: TH }}>
          Détails
        </Button>
      </Box>

      {/* Table */}
      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
        <Typography sx={{
          fontSize: 11, fontWeight: 700, color: '#fff', bgcolor: '#334155',
          px: 2, py: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          Liste
        </Typography>
        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                <TableCell padding="checkbox" sx={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>
                  <Checkbox size="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />
                </TableCell>
                {['N°#','Matricule','Prénom et Nom','Service','Date Absence','Type','Motif','Document','Statut','Actions'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton height={18} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} sx={{ textAlign: 'center', py: 6, color: '#94A3B8', fontSize: 13 }}>
                        Aucune justification
                      </TableCell>
                    </TableRow>
                  )
                : filtered.map((item, idx) => {
                    const tc = getTypeConfig(item.absence_type);
                    return (
                      <TableRow
                        key={item.id} hover
                        selected={selectedId === item.id}
                        onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: selectedId === item.id ? '#EFF6FF' : idx % 2 === 0 ? '#fff' : '#F8FAFC',
                          '&:hover': { bgcolor: '#EFF6FF' },
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox size="small" checked={selectedId === item.id}
                            onChange={() => setSelectedId(item.id === selectedId ? null : item.id)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>
                          {item.employee?.employee_number ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar sx={{ width: 26, height: 26, fontSize: 10, fontWeight: 700, bgcolor: '#1E3A5F' }}>
                              {item.employee?.first_name?.[0]}{item.employee?.last_name?.[0]}
                            </Avatar>
                            <Typography sx={{ fontSize: 12 }}>
                              {item.employee?.first_name} {item.employee?.last_name}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{item.employee?.department?.name ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>{formatDate(item.date)}</TableCell>
                        <TableCell>
                          <Chip label={tc.label} size="small" sx={{ fontSize: 10, height: 20, fontWeight: 700, color: tc.color, bgcolor: tc.bg }} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 160 }}>
                          <Typography sx={{ fontSize: 12, color: '#475569' }} noWrap>{item.reason}</Typography>
                        </TableCell>
                        <TableCell>
                          {item.file_url ? (
                            <Tooltip title="Voir le document">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(item.file_url, '_blank'); }}
                                sx={{ color: ACT }}>
                                <AttachFile sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography sx={{ fontSize: 11, color: '#CBD5E1' }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell><StatusChip status={item.status} /></TableCell>
                        <TableCell>
                          {item.status === 'pending' && (
                            <Stack direction="row" spacing={0.5}>
                              <Button size="small" variant="contained" color="success"
                                startIcon={<CheckCircle sx={{ fontSize: '12px !important' }} />}
                                onClick={(e) => { e.stopPropagation(); setValidateOpen({ item, action: 'approve' }); }}
                                sx={{ fontSize: 10, py: 0.25, px: 1, minWidth: 0, borderRadius: '5px' }}>
                                Valider
                              </Button>
                              <Button size="small" variant="contained" color="error"
                                startIcon={<Cancel sx={{ fontSize: '12px !important' }} />}
                                onClick={(e) => { e.stopPropagation(); setValidateOpen({ item, action: 'reject' }); }}
                                sx={{ fontSize: 10, py: 0.25, px: 1, minWidth: 0, borderRadius: '5px' }}>
                                Refuser
                              </Button>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );

  return (
    <Box>
      {/* ══ En-tête ══ */}
      <Box sx={{ bgcolor: NAV, px: 3, py: 1.5, borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>
          Justifications d'Absence
        </Typography>
        <Stack direction="row" spacing={2}>
          {[
            { label: 'Total',      count: all.length,                                         color: '#93C5FD' },
            { label: 'En attente', count: all.filter(j => j.status === 'pending').length,     color: '#FCD34D' },
            { label: 'Approuvées', count: all.filter(j => j.status === 'approved').length,    color: '#6EE7B7' },
            { label: 'Refusées',   count: all.filter(j => j.status === 'rejected').length,    color: '#FCA5A5' },
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
      <Box sx={{ bgcolor: '#F1F5F9', px: 2.5, pt: 2, pb: 0, display: 'flex', gap: 1, flexWrap: 'wrap', borderBottom: `2px solid ${NAV}` }}>
        {[
          { label: 'Toutes les Justifications', count: all.length,     dot: false },
          { label: 'En attente',                count: pending.length, dot: pending.length > 0 },
        ].map((cfg, i) => {
          const isActive = i === tab;
          return (
            <Box key={i} onClick={() => setTab(i)} sx={{
              px: 2, py: 1, cursor: 'pointer', borderRadius: '8px 8px 0 0',
              fontWeight: 700, fontSize: 13, userSelect: 'none',
              bgcolor:      isActive ? ACT : '#fff',
              color:        isActive ? '#fff' : TH,
              border:       `1.5px solid ${isActive ? ACT : '#93C5FD'}`,
              borderBottom: 'none',
              boxShadow:    isActive ? '0 -2px 8px rgba(232,93,4,0.25)' : 'none',
              transition:   'all 0.15s',
              '&:hover':    { bgcolor: isActive ? ACT : '#EFF6FF' },
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {cfg.dot && !isActive && (
                <Box sx={{
                  width: 7, height: 7, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0,
                  boxShadow: '0 0 0 2px rgba(239,68,68,0.25)',
                  animation: 'pulse 1.8s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%,100%': { transform: 'scale(1)', opacity: 1 },
                    '50%':     { transform: 'scale(1.4)', opacity: 0.6 },
                  },
                }} />
              )}
              {cfg.label}
              <Box sx={{
                px: 0.9, py: 0, borderRadius: '10px', fontSize: 11, fontWeight: 800, lineHeight: '20px',
                bgcolor: isActive ? 'rgba(255,255,255,0.28)' : cfg.dot ? '#EF4444' : '#E2E8F0',
                color:   isActive ? '#fff' : cfg.dot ? '#fff' : '#64748B',
                minWidth: 20, textAlign: 'center', transition: 'all 0.2s',
              }}>
                {cfg.count}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ══ Contenu ══ */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #CBD5E1', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
        {renderTable()}
      </Box>

      {/* ── Dialog : Nouvelle justification ── */}
      <Dialog open={newOpen} onClose={() => { setNewOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: TH, color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Nouvelle justification d'absence
          <IconButton size="small" onClick={() => { setNewOpen(false); resetForm(); }} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            {/* Agent */}
            <FormControl size="small" fullWidth>
              <InputLabel shrink>Agent *</InputLabel>
              <Select
                value={formEmp?.id ?? ''}
                label="Agent *"
                notched
                onChange={(e) => setFormEmp(employees.find((emp) => emp.id === Number(e.target.value)) ?? null)}
                displayEmpty
              >
                <MenuItem value="" disabled><em>Sélectionner un agent…</em></MenuItem>
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.employee_number} — {emp.first_name} {emp.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <TextField label="Date d'absence" type="date" size="small" fullWidth required
                value={formDate} onChange={e => setFormDate(e.target.value)}
                InputLabelProps={{ shrink: true }} />
              <FormControl size="small" fullWidth required>
                <InputLabel>Type d'absence</InputLabel>
                <Select value={formType} label="Type d'absence" onChange={e => setFormType(e.target.value)}>
                  {ABSENCE_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      <Chip label={t.label} size="small" sx={{ fontSize: 11, fontWeight: 700, color: t.color, bgcolor: t.bg }} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField label="Motif" multiline rows={3} size="small" fullWidth required
              value={formReason} onChange={e => setFormReason(e.target.value)}
              placeholder="Décrivez le motif de l'absence…" />

            {/* Zone pièce jointe */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', mb: 1 }}>
                Pièce justificative (optionnel)
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
              />
              {formFile ? (
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1.5, border: '1.5px solid #6EE7B7', borderRadius: '8px', bgcolor: '#F0FDF4',
                }}>
                  {formFile.type.startsWith('image/') ? (
                    <ImageIcon sx={{ color: '#059669', fontSize: 22 }} />
                  ) : (
                    <PictureAsPdf sx={{ color: '#DC2626', fontSize: 22 }} />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#065F46' }} noWrap>
                      {formFile.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B7280' }}>
                      {(formFile.size / 1024).toFixed(0)} Ko
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setFormFile(null)} sx={{ color: '#DC2626' }}>
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: '2px dashed #CBD5E1', borderRadius: '8px', p: 2.5,
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                    '&:hover': { borderColor: TH, bgcolor: '#F8FAFC' },
                  }}
                >
                  <AttachFile sx={{ color: '#94A3B8', fontSize: 28, mb: 0.5 }} />
                  <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                    Glisser-déposer ou cliquer pour joindre
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#94A3B8', mt: 0.5 }}>
                    PDF, JPG, PNG — 5 Mo max
                  </Typography>
                </Box>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setNewOpen(false); resetForm(); }}>Annuler</Button>
          <Button variant="contained"
            disabled={!formEmp || !formDate || !formReason || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            sx={{ bgcolor: TH, '&:hover': { bgcolor: '#0D2A40' } }}>
            {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog : Détails ── */}
      {selectedItem && (
        <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: TH, color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Justification #{selectedItem.id}
            <IconButton size="small" onClick={() => setDetailOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Stack spacing={1.5}>
              {[
                ['Agent',     `${selectedItem.employee?.first_name} ${selectedItem.employee?.last_name}`],
                ['Matricule', selectedItem.employee?.employee_number ?? '—'],
                ['Service',   selectedItem.employee?.department?.name ?? '—'],
                ['Date',      formatDate(selectedItem.date)],
                ['Motif',     selectedItem.reason],
              ].map(([k, v]) => (
                <Stack key={k} direction="row" spacing={2}>
                  <Typography sx={{ minWidth: 100, fontWeight: 700, fontSize: 13, color: '#475569' }}>{k} :</Typography>
                  <Typography sx={{ fontSize: 13 }}>{v}</Typography>
                </Stack>
              ))}

              <Stack direction="row" spacing={2} alignItems="center">
                <Typography sx={{ minWidth: 100, fontWeight: 700, fontSize: 13, color: '#475569' }}>Type :</Typography>
                {(() => { const tc = getTypeConfig(selectedItem.absence_type);
                  return <Chip label={tc.label} size="small" sx={{ fontSize: 11, fontWeight: 700, color: tc.color, bgcolor: tc.bg }} />;
                })()}
              </Stack>

              <Stack direction="row" spacing={2} alignItems="center">
                <Typography sx={{ minWidth: 100, fontWeight: 700, fontSize: 13, color: '#475569' }}>Statut :</Typography>
                <StatusChip status={selectedItem.status} />
              </Stack>

              {selectedItem.comment && (
                <Stack direction="row" spacing={2}>
                  <Typography sx={{ minWidth: 100, fontWeight: 700, fontSize: 13, color: '#475569' }}>Commentaire :</Typography>
                  <Typography sx={{ fontSize: 13, color: '#475569' }}>{selectedItem.comment}</Typography>
                </Stack>
              )}

              {/* Document joint */}
              {selectedItem.file_url && (
                <Box sx={{ mt: 1, p: 1.5, border: '1px solid #BAE6FD', borderRadius: '8px', bgcolor: '#F0F9FF' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0369A1', mb: 1 }}>
                    Pièce justificative jointe
                  </Typography>
                  {isImage(selectedItem.file_url) ? (
                    <Box>
                      <Box
                        component="img"
                        src={selectedItem.file_url}
                        alt="justificatif"
                        sx={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: '6px', border: '1px solid #E2E8F0', mb: 1 }}
                      />
                      <Button size="small" variant="outlined" startIcon={<Download sx={{ fontSize: '13px !important' }} />}
                        component="a" href={selectedItem.file_url} target="_blank" rel="noreferrer"
                        sx={{ fontSize: 11, borderColor: '#0369A1', color: '#0369A1' }}>
                        Télécharger
                      </Button>
                    </Box>
                  ) : (
                    <Button size="small" variant="contained" startIcon={<PictureAsPdf sx={{ fontSize: '13px !important' }} />}
                      component="a" href={selectedItem.file_url} target="_blank" rel="noreferrer"
                      sx={{ fontSize: 11, bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' } }}>
                      Ouvrir le PDF
                    </Button>
                  )}
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDetailOpen(false)}>Fermer</Button>
            {selectedItem.status === 'pending' && (
              <>
                <Button variant="contained" color="success"
                  onClick={() => { setDetailOpen(false); setValidateOpen({ item: selectedItem, action: 'approve' }); }}>
                  Approuver
                </Button>
                <Button variant="contained" color="error"
                  onClick={() => { setDetailOpen(false); setValidateOpen({ item: selectedItem, action: 'reject' }); }}>
                  Refuser
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      )}

      {/* ── Dialog : Valider / Refuser ── */}
      <Dialog open={Boolean(validateOpen)} onClose={() => { setValidateOpen(null); setComment(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          bgcolor: validateOpen?.action === 'approve' ? '#166534' : '#991B1B',
          color: '#fff', fontWeight: 700, fontSize: 15,
        }}>
          {validateOpen?.action === 'approve' ? 'Approuver la justification' : 'Refuser la justification'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ fontSize: 13, color: '#475569', mb: 2 }}>
            {validateOpen?.item.employee?.first_name} {validateOpen?.item.employee?.last_name} — Absence du{' '}
            {formatDate(validateOpen?.item.date)}
          </Typography>
          <TextField label="Commentaire (optionnel)" fullWidth multiline rows={3}
            value={comment} onChange={e => setComment(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setValidateOpen(null); setComment(''); }}>Annuler</Button>
          <Button variant="contained"
            color={validateOpen?.action === 'approve' ? 'success' : 'error'}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            onClick={() => {
              if (!validateOpen) return;
              if (validateOpen.action === 'approve') approveMutation.mutate({ id: validateOpen.item.id, comment });
              else rejectMutation.mutate({ id: validateOpen.item.id, comment });
            }}>
            {validateOpen?.action === 'approve' ? 'Confirmer l\'approbation' : 'Confirmer le refus'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
