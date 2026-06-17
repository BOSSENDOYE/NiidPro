import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, TextField, Chip,
  Dialog, DialogContent, Grid, MenuItem, Select,
  FormControl, IconButton, Tooltip, Table, TableBody,
  TableCell, TableHead, TableRow, Skeleton, Avatar,
  InputAdornment, alpha, Divider, Autocomplete, Slider,
  LinearProgress,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Refresh, Close, Save,
  Assessment, CheckCircle, HourglassBottom, DraftsTwoTone,
  VerifiedUser, EmojiEvents, Star, DescriptionOutlined,
  CalendarMonth, Person,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { evaluationsApi } from '../../api/evaluations';
import { employeesApi } from '../../api/employees';
import { formatDate } from '../../utils/format';
import type { Evaluation, Employee } from '../../types';

/* ─────────────────────────── constantes ── */

const ACCENT = '#F59E0B';

const CRITERIA = [
  { key: 'score_performance',   label: 'Performance',             icon: '🎯' },
  { key: 'score_punctuality',   label: 'Ponctualité & Assiduité', icon: '⏰' },
  { key: 'score_teamwork',      label: 'Travail en équipe',       icon: '🤝' },
  { key: 'score_initiative',    label: 'Initiative & Autonomie',  icon: '💡' },
  { key: 'score_communication', label: 'Communication',           icon: '💬' },
] as const;

type CriteriaKey = typeof CRITERIA[number]['key'];

const RATING_META: Record<Evaluation['rating'], { label: string; color: string; bg: string; border: string }> = {
  excellent:    { label: 'Excellent',    color: '#059669', bg: 'rgba(5,150,105,0.1)',   border: 'rgba(5,150,105,0.28)'   },
  good:         { label: 'Bien',         color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.28)'  },
  satisfactory: { label: 'Satisfaisant', color: '#D97706', bg: 'rgba(217,119,6,0.1)',   border: 'rgba(217,119,6,0.28)'   },
  insufficient: { label: 'Insuffisant',  color: '#DC2626', bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.28)'   },
};

const STATUS_META: Record<Evaluation['status'], { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Brouillon', color: '#64748B', icon: <DraftsTwoTone sx={{ fontSize: 12 }} /> },
  submitted: { label: 'Soumise',   color: '#3B82F6', icon: <HourglassBottom sx={{ fontSize: 12 }} /> },
  validated: { label: 'Validée',   color: '#059669', icon: <CheckCircle sx={{ fontSize: 12 }} /> },
};

const PERIODS = [
  'T1 2025', 'T2 2025', 'T3 2025', 'T4 2025',
  'Annuelle 2025', 'T1 2024', 'T2 2024', 'T3 2024', 'T4 2024', 'Annuelle 2024',
];

function calcRating(score: number): Evaluation['rating'] {
  if (score >= 4.5) return 'excellent';
  if (score >= 3.5) return 'good';
  if (score >= 2.5) return 'satisfactory';
  return 'insufficient';
}

function calcOverall(scores: Record<CriteriaKey, number>): number {
  const vals = CRITERIA.map(c => scores[c.key]);
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

/* ── Mini score bar ── */
function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <LinearProgress
        variant="determinate" value={(score / 5) * 100}
        sx={{
          width: 50, height: 5, borderRadius: 3,
          bgcolor: alpha(color, 0.15),
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
      <Typography sx={{ fontSize: 11, fontWeight: 700, color, minWidth: 22 }}>
        {score.toFixed(1)}
      </Typography>
    </Box>
  );
}

/* ── Score global (étoiles + chiffre) ── */
function OverallScore({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const rating = calcRating(score);
  const { color } = RATING_META[rating];
  const stars     = Math.round(score);
  const isSmall   = size === 'sm';
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} sx={{ fontSize: isSmall ? 13 : 16, color: i < stars ? color : '#E2E8F0' }} />
      ))}
      <Typography sx={{ fontSize: isSmall ? 11 : 13, fontWeight: 800, color, ml: 0.25 }}>
        {score.toFixed(1)}
      </Typography>
    </Stack>
  );
}

/* ─────────────────────────── schéma form ── */

const schema = z.object({
  employee_id:        z.number().min(1),
  period:             z.string().min(1, 'Période requise'),
  evaluation_date:    z.string().min(1, 'Date requise'),
  evaluator_name:     z.string().optional(),
  score_performance:    z.number().min(1).max(5),
  score_punctuality:    z.number().min(1).max(5),
  score_teamwork:       z.number().min(1).max(5),
  score_initiative:     z.number().min(1).max(5),
  score_communication:  z.number().min(1).max(5),
  status:             z.enum(['draft', 'submitted', 'validated']),
  comments:           z.string().optional(),
  objectives:         z.string().optional(),
});
type FormData = z.infer<typeof schema>;

/* ─────────────────────────── EvaluationModal ── */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  evaluation?: Evaluation;
  employees: Employee[];
}

function EvaluationModal({ open, onClose, evaluation, employees }: ModalProps) {
  const qc   = useQueryClient();
  const mode = evaluation ? 'edit' : 'create';

  const defaultScores: Record<CriteriaKey, number> = {
    score_performance:   evaluation?.score_performance   ?? 3,
    score_punctuality:   evaluation?.score_punctuality   ?? 3,
    score_teamwork:      evaluation?.score_teamwork      ?? 3,
    score_initiative:    evaluation?.score_initiative    ?? 3,
    score_communication: evaluation?.score_communication ?? 3,
  };

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: evaluation ? {
      employee_id:         evaluation.employee_id,
      period:              evaluation.period,
      evaluation_date:     evaluation.evaluation_date,
      evaluator_name:      evaluation.evaluator_name ?? '',
      status:              evaluation.status,
      comments:            evaluation.comments ?? '',
      objectives:          evaluation.objectives ?? '',
      ...defaultScores,
    } : {
      status: 'draft',
      evaluation_date: new Date().toISOString().split('T')[0],
      ...defaultScores,
    },
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) => {
      const overall = calcOverall(d as unknown as Record<CriteriaKey, number>);
      return evaluationsApi.create({ ...d, overall_score: overall, rating: calcRating(overall) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); handleClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (d: FormData) => {
      const overall = calcOverall(d as unknown as Record<CriteriaKey, number>);
      return evaluationsApi.update(evaluation!.id, { ...d, overall_score: overall, rating: calcRating(overall) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); handleClose(); },
  });

  const mutation  = mode === 'edit' ? updateMut : createMut;
  const mutError  = mutation.error as { response?: { data?: { message?: string } } } | null;
  const handleClose = () => { reset(); onClose(); };

  const scores = watch(['score_performance', 'score_punctuality', 'score_teamwork', 'score_initiative', 'score_communication']);
  const liveOverall = calcOverall({
    score_performance:   scores[0] ?? 3,
    score_punctuality:   scores[1] ?? 3,
    score_teamwork:      scores[2] ?? 3,
    score_initiative:    scores[3] ?? 3,
    score_communication: scores[4] ?? 3,
  });
  const liveRating  = calcRating(liveOverall);
  const ratingMeta  = RATING_META[liveRating];

  const defaultEmp = evaluation ? (employees.find(e => e.id === evaluation.employee_id) ?? null) : null;

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '9px', fontSize: 13,
      '&:hover fieldset': { borderColor: ACCENT },
      '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 2 },
    },
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(15,23,42,0.28)' } }}>

      {/* ── Header ── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0F172A 0%, #78350F 60%, #1E293B 100%)',
        px: 3, py: 2.5, position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 80% 40%, rgba(245,158,11,0.2) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.75}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '11px',
              background: `linear-gradient(135deg, ${ACCENT}, #D97706)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 6px 16px ${alpha(ACCENT, 0.45)}`,
            }}>
              <Assessment sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.3px' }}>
                {mode === 'create' ? 'Nouvelle évaluation' : "Modifier l'évaluation"}
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11.5 }}>
                {mode === 'create' ? 'Évaluer les performances de l\'agent' : `Évaluation #${evaluation?.id} · ${evaluation?.period}`}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={handleClose} size="small"
            sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
            <Close fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ p: 0, bgcolor: '#F8FAFC' }}>
        {mutError && (
          <Box sx={{ m: 3, mb: 0, p: 1.5, borderRadius: '9px', bgcolor: '#FFF1F2', border: '1px solid #FECDD3' }}>
            <Typography sx={{ fontSize: 12.5, color: '#BE123C' }}>
              {mutError.response?.data?.message ?? 'Une erreur est survenue'}
            </Typography>
          </Box>
        )}

        <Box component="form" id="eval-form" onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <Grid container>
            {/* ── Colonne gauche : informations générales + critères ── */}
            <Grid item xs={12} md={7} sx={{ p: 3, borderRight: '1px solid #E2E8F0' }}>
              <Grid container spacing={2}>

                {/* Agent */}
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                    Agent évalué
                  </Typography>
                  <Controller name="employee_id" control={control} render={({ field }) => (
                    <Autocomplete
                      options={employees}
                      defaultValue={defaultEmp}
                      getOptionLabel={emp => `${emp.first_name} ${emp.last_name} — ${emp.employee_number}`}
                      filterOptions={(opts, { inputValue }) => {
                        const q = inputValue.toLowerCase();
                        return opts.filter(e =>
                          `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
                          e.employee_number.toLowerCase().includes(q) ||
                          (e.department?.name ?? '').toLowerCase().includes(q)
                        );
                      }}
                      onChange={(_, val) => field.onChange(val ? val.id : null)}
                      noOptionsText="Aucun agent trouvé"
                      renderOption={(props, emp) => {
                        const { key, ...optProps } = props as typeof props & { key: React.Key };
                        return (
                        <Box key={key} component="li" {...optProps} sx={{ py: '8px !important' }}>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 800,
                              background: 'linear-gradient(135deg,#2563EB,#7C3AED)', flexShrink: 0 }}>
                              {emp.first_name[0]}{emp.last_name[0]}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: '#0F172A' }}>
                                {emp.first_name} {emp.last_name}
                              </Typography>
                              <Typography sx={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>
                                {emp.employee_number}{emp.department?.name ? ` · ${emp.department.name}` : ''}
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
                        );
                      }}
                      renderInput={params => (
                        <TextField {...params} size="small" placeholder="Taper un nom ou un matricule…"
                          error={!!errors.employee_id} helperText={errors.employee_id?.message} sx={inputSx} />
                      )}
                      slotProps={{ paper: { sx: { borderRadius: '12px', boxShadow: '0 8px 30px rgba(15,23,42,0.14)', border: '1px solid #E2E8F0', mt: 0.5 } } }}
                    />
                  )} />
                </Grid>

                {/* Période + Date */}
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                    Période
                  </Typography>
                  <Controller name="period" control={control} render={({ field }) => (
                    <FormControl fullWidth size="small" error={!!errors.period}>
                      <Select {...field} value={field.value ?? ''} displayEmpty
                        renderValue={val => val ? (
                          <Typography sx={{ fontSize: 13 }}>{val}</Typography>
                        ) : <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Sélectionner…</Typography>}
                        sx={{ borderRadius: '9px', bgcolor: '#fff', fontSize: 13 }}>
                        {PERIODS.map(p => (
                          <MenuItem key={p} value={p} sx={{ fontSize: 13 }}>{p}</MenuItem>
                        ))}
                      </Select>
                      {errors.period && <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.3 }}>{errors.period.message}</Typography>}
                    </FormControl>
                  )} />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                    Date d'évaluation
                  </Typography>
                  <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }}
                    {...register('evaluation_date')}
                    InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                    error={!!errors.evaluation_date} helperText={errors.evaluation_date?.message}
                    sx={inputSx}
                  />
                </Grid>

                {/* Évaluateur */}
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                    Évaluateur <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</Box>
                  </Typography>
                  <TextField fullWidth size="small" {...register('evaluator_name')}
                    placeholder="Nom du responsable évaluateur…"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                    sx={inputSx}
                  />
                </Grid>

                {/* Critères d'évaluation */}
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
                    Critères d'évaluation <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(1 = Insuffisant · 5 = Excellent)</Box>
                  </Typography>
                  <Stack spacing={1.75}>
                    {CRITERIA.map(({ key, label, icon }) => (
                      <Controller key={key} name={key} control={control} render={({ field }) => {
                        const val = Number(field.value) || 3;
                        const scoreColor = val >= 4.5 ? '#059669' : val >= 3.5 ? '#3B82F6' : val >= 2.5 ? '#D97706' : '#DC2626';
                        return (
                          <Box>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                              <Stack direction="row" alignItems="center" spacing={0.75}>
                                <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</Typography>
                              </Stack>
                              <Box sx={{
                                px: 1.25, py: 0.2, borderRadius: '6px', minWidth: 34, textAlign: 'center',
                                bgcolor: alpha(scoreColor, 0.12), border: `1px solid ${alpha(scoreColor, 0.3)}`,
                              }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{val}/5</Typography>
                              </Box>
                            </Stack>
                            <Slider
                              value={val}
                              onChange={(_, v) => field.onChange(v as number)}
                              min={1} max={5} step={1}
                              marks={[
                                { value: 1, label: '1' }, { value: 2, label: '2' },
                                { value: 3, label: '3' }, { value: 4, label: '4' },
                                { value: 5, label: '5' },
                              ]}
                              sx={{
                                color: scoreColor, height: 6,
                                '& .MuiSlider-thumb': {
                                  width: 18, height: 18,
                                  boxShadow: `0 2px 8px ${alpha(scoreColor, 0.4)}`,
                                  '&:hover': { boxShadow: `0 3px 12px ${alpha(scoreColor, 0.5)}` },
                                },
                                '& .MuiSlider-track': { borderRadius: 3 },
                                '& .MuiSlider-rail': { bgcolor: '#E2E8F0' },
                                '& .MuiSlider-markLabel': { fontSize: 10, color: '#94A3B8', fontWeight: 600 },
                              }}
                            />
                          </Box>
                        );
                      }} />
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </Grid>

            {/* ── Colonne droite : score global + commentaires ── */}
            <Grid item xs={12} md={5} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

              {/* Score global en temps réel */}
              <Box sx={{
                p: 2.5, borderRadius: '14px',
                background: `linear-gradient(135deg, ${alpha(ratingMeta.color, 0.06)} 0%, ${alpha(ratingMeta.color, 0.12)} 100%)`,
                border: `1.5px solid ${alpha(ratingMeta.color, 0.25)}`,
                textAlign: 'center',
              }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                  Score global
                </Typography>
                <Typography sx={{ fontSize: 42, fontWeight: 900, color: ratingMeta.color, lineHeight: 1 }}>
                  {liveOverall.toFixed(1)}
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#94A3B8', mb: 1.5 }}>/5</Typography>
                <Stack direction="row" justifyContent="center" spacing={0.25} mb={1.5}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} sx={{ fontSize: 22, color: i < Math.round(liveOverall) ? ratingMeta.color : '#E2E8F0' }} />
                  ))}
                </Stack>
                <Chip label={ratingMeta.label} size="small"
                  sx={{ fontWeight: 800, fontSize: 12, height: 24,
                    color: ratingMeta.color, bgcolor: ratingMeta.bg, border: `1px solid ${ratingMeta.border}` }} />
              </Box>

              {/* Récap mini-barres */}
              <Box sx={{ bgcolor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', p: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.25 }}>
                  Détail des scores
                </Typography>
                <Stack spacing={1}>
                  {CRITERIA.map(({ key, label }, i) => {
                    const s   = Number(scores[i]) || 3;
                    const clr = s >= 4.5 ? '#059669' : s >= 3.5 ? '#3B82F6' : s >= 2.5 ? '#D97706' : '#DC2626';
                    return (
                      <Stack key={key} direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ fontSize: 11.5, color: '#64748B', flex: 1 }}>{label}</Typography>
                        <ScoreBar score={s} color={clr} />
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>

              {/* Statut */}
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                  Statut
                </Typography>
                <Controller name="status" control={control} render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <Select {...field} sx={{ borderRadius: '9px', bgcolor: '#fff', fontSize: 13 }}
                      renderValue={val => {
                        const sm = STATUS_META[val as Evaluation['status']];
                        return sm ? (
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Box sx={{ color: sm.color, display: 'flex', alignItems: 'center' }}>{sm.icon}</Box>
                            <Typography sx={{ fontSize: 13 }}>{sm.label}</Typography>
                          </Stack>
                        ) : val;
                      }}>
                      {Object.entries(STATUS_META).map(([k, sm]) => (
                        <MenuItem key={k} value={k} sx={{ fontSize: 13 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ color: sm.color, display: 'flex', alignItems: 'center' }}>{sm.icon}</Box>
                            <Typography sx={{ fontSize: 13 }}>{sm.label}</Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )} />
              </Box>

              {/* Commentaires */}
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                  Commentaires
                </Typography>
                <TextField fullWidth size="small" multiline rows={3}
                  {...register('comments')}
                  placeholder="Observations générales…"
                  InputProps={{ startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}><DescriptionOutlined sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px', fontSize: 13, '&.Mui-focused fieldset': { borderColor: ACCENT } } }}
                />
              </Box>

              {/* Objectifs */}
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                  Objectifs prochaine période
                </Typography>
                <TextField fullWidth size="small" multiline rows={3}
                  {...register('objectives')}
                  placeholder="Axes d'amélioration et objectifs…"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px', fontSize: 13, '&.Mui-focused fieldset': { borderColor: ACCENT } } }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      {/* Footer */}
      <Box sx={{ px: 3, py: 2, bgcolor: '#fff', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
        <Button onClick={handleClose} variant="outlined" size="small"
          sx={{ borderRadius: '9px', borderColor: '#E2E8F0', color: '#64748B', fontSize: 13, fontWeight: 600 }}>
          Annuler
        </Button>
        <Button type="submit" form="eval-form" variant="contained" size="small"
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? undefined : <Save sx={{ fontSize: '15px !important' }} />}
          sx={{
            background: `linear-gradient(135deg, ${ACCENT}, #D97706)`,
            borderRadius: '9px', fontSize: 13, fontWeight: 700, px: 2.5,
            boxShadow: `0 4px 12px ${alpha(ACCENT, 0.4)}`,
            '&:hover': { background: 'linear-gradient(135deg,#D97706,#B45309)', transform: 'translateY(-1px)' },
            transition: 'all 0.2s',
          }}>
          {mutation.isPending ? 'Enregistrement…' : mode === 'create' ? 'Créer l\'évaluation' : 'Enregistrer'}
        </Button>
      </Box>
    </Dialog>
  );
}

/* ─────────────────────────── DeleteDialog ── */

function DeleteDialog({ evaluation, onConfirm, onCancel }: {
  evaluation: Evaluation; onConfirm: () => void; onCancel: () => void;
}) {
  const emp = evaluation.employee;
  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
      <Box sx={{ background: 'linear-gradient(135deg,#7F1D1D,#DC2626)', px: 3, py: 2.5 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15.5 }}>Supprimer l'évaluation</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Cette action est irréversible</Typography>
      </Box>
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography sx={{ fontSize: 13.5, color: '#0F172A', mb: 1.5 }}>
          Supprimer l'évaluation de&nbsp;
          <Box component="span" sx={{ fontWeight: 700 }}>
            {emp ? `${emp.first_name} ${emp.last_name}` : `#${evaluation.employee_id}`}
          </Box>
          &nbsp;pour la période&nbsp;<Box component="span" sx={{ fontWeight: 700 }}>{evaluation.period}</Box>&nbsp;?
        </Typography>
      </Box>
      <Box sx={{ px: 3, pb: 2.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onCancel} variant="outlined" size="small"
          sx={{ borderRadius: '9px', borderColor: '#E2E8F0', color: '#64748B', fontSize: 13 }}>Annuler</Button>
        <Button onClick={onConfirm} variant="contained" color="error" size="small"
          sx={{ borderRadius: '9px', fontSize: 13, fontWeight: 700 }}>Supprimer</Button>
      </Box>
    </Dialog>
  );
}

/* ─────────────────────────── EvaluationTab principal ── */

export default function EvaluationTab() {
  const qc = useQueryClient();

  const [search, setSearch]             = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<Evaluation['status'] | 'all'>('all');
  const [ratingFilter, setRatingFilter] = useState<Evaluation['rating'] | 'all'>('all');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editEval, setEditEval]         = useState<Evaluation | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Evaluation | null>(null);

  /* ── Données ── */
  const { data: evaluations = [], isLoading, refetch } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => evaluationsApi.list().then(r => r.data),
  });

  const { data: rawEmployees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ per_page: 500 }).then(r => {
      const d = r.data as unknown;
      if (Array.isArray(d)) return d as Employee[];
      return (d as { data?: Employee[] }).data ?? [];
    }),
  });
  const employees = (rawEmployees ?? []) as Employee[];

  /* ── Mutations ── */
  const deleteMut = useMutation({
    mutationFn: (id: number) => evaluationsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); setDeleteTarget(null); },
  });
  const validateMut = useMutation({
    mutationFn: (id: number) => evaluationsApi.validate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }),
  });

  const openCreate = () => { setEditEval(undefined); setModalOpen(true); };
  const openEdit   = (ev: Evaluation) => { setEditEval(ev); setModalOpen(true); };

  /* ── Périodes disponibles ── */
  const availablePeriods = [...new Set(evaluations.map(e => e.period))].sort().reverse();

  /* ── Filtrage ── */
  const filtered = evaluations.filter(ev => {
    const emp = ev.employee;
    const q   = search.toLowerCase();
    const matchSearch = !search ||
      (emp && `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q)) ||
      (emp?.employee_number?.toLowerCase().includes(q)) ||
      ev.period.toLowerCase().includes(q);
    const matchPeriod = periodFilter === 'all' || ev.period === periodFilter;
    const matchStatus = statusFilter === 'all' || ev.status === statusFilter;
    const matchRating = ratingFilter === 'all' || ev.rating === ratingFilter;
    return matchSearch && matchPeriod && matchStatus && matchRating;
  });

  /* ── Stats ── */
  const avgScore = evaluations.length
    ? evaluations.reduce((s, e) => s + e.overall_score, 0) / evaluations.length
    : 0;

  return (
    <>
      {/* ════ EN-TÊTE ════ */}
      <Box sx={{
        px: 2, py: 1.5,
        background: 'linear-gradient(135deg, #0F172A 0%, #78350F 60%, #1E293B 100%)',
        position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 90% 50%, rgba(245,158,11,0.16) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              background: `linear-gradient(135deg, ${ACCENT}, #D97706)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(ACCENT, 0.45)}`,
            }}>
              <Assessment sx={{ color: '#fff', fontSize: 19 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 14.5 }}>Évaluations des performances</Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11 }}>
                {evaluations.length} évaluation{evaluations.length > 1 ? 's' : ''} · Score moyen&nbsp;
                <Box component="span" sx={{ color: ACCENT, fontWeight: 700 }}>{avgScore.toFixed(1)}/5</Box>
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.75}>
            <Tooltip title="Actualiser" arrow>
              <IconButton size="small" onClick={() => refetch()}
                sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  '&:hover': { color: ACCENT, bgcolor: 'rgba(245,158,11,0.1)', borderColor: alpha(ACCENT, 0.4) } }}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button size="small" startIcon={<Add sx={{ fontSize: '15px !important' }} />} onClick={openCreate}
              sx={{
                background: `linear-gradient(135deg, ${ACCENT}, #D97706)`,
                color: '#fff', fontWeight: 700, fontSize: 12,
                borderRadius: '8px', px: 2, whiteSpace: 'nowrap',
                boxShadow: `0 3px 10px ${alpha(ACCENT, 0.5)}`,
                '&:hover': { background: 'linear-gradient(135deg,#D97706,#B45309)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}>
              Nouvelle évaluation
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ════ BARRE DE FILTRES ════ */}
      <Box sx={{ px: 2, py: 1.25, bgcolor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0',
        background: 'linear-gradient(180deg,#F8FAFC 0%,#F1F5F9 100%)' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField placeholder="Rechercher un agent ou une période…" size="small" value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ bgcolor: '#fff', width: 260 }}
            InputProps={{ sx: { fontSize: 12 },
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
          />

          {/* Filtre période */}
          <FormControl size="small" sx={{ minWidth: 140, bgcolor: '#fff' }}>
            <Select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
              displayEmpty sx={{ fontSize: 12, borderRadius: '8px' }}>
              <MenuItem value="all" sx={{ fontSize: 12 }}>Toutes les périodes</MenuItem>
              {availablePeriods.map(p => <MenuItem key={p} value={p} sx={{ fontSize: 12 }}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Filtre statut */}
          <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', px: 0.75, py: 0.4 }}>
            {([
              ['all',       'Tous',       '#475569'],
              ['draft',     'Brouillon',  '#64748B'],
              ['submitted', 'Soumises',   '#3B82F6'],
              ['validated', 'Validées',   '#059669'],
            ] as const).map(([val, lbl, clr]) => (
              <Box key={val} onClick={() => setStatusFilter(val as Evaluation['status'] | 'all')}
                sx={{
                  px: 1.1, py: 0.3, borderRadius: '6px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  bgcolor: statusFilter === val ? clr : 'transparent',
                  color: statusFilter === val ? '#fff' : clr,
                  transition: 'all .15s',
                  '&:hover': { bgcolor: statusFilter === val ? clr : `${clr}18` },
                }}>
                {lbl}
              </Box>
            ))}
          </Stack>

          {/* Filtre note */}
          <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', px: 0.75, py: 0.4 }}>
            {([
              ['all',          'Tous',         '#475569'],
              ['excellent',    'Excellent',    '#059669'],
              ['good',         'Bien',         '#3B82F6'],
              ['satisfactory', 'Satisfaisant', '#D97706'],
              ['insufficient', 'Insuffisant',  '#DC2626'],
            ] as const).map(([val, lbl, clr]) => (
              <Box key={val} onClick={() => setRatingFilter(val as Evaluation['rating'] | 'all')}
                sx={{
                  px: 1.1, py: 0.3, borderRadius: '6px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  bgcolor: ratingFilter === val ? clr : 'transparent',
                  color: ratingFilter === val ? '#fff' : clr,
                  transition: 'all .15s',
                  '&:hover': { bgcolor: ratingFilter === val ? clr : `${clr}18` },
                }}>
                {lbl}
              </Box>
            ))}
          </Stack>

          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </Typography>
        </Stack>
      </Box>

      {/* ════ STATS BAR ════ */}
      <Stack direction="row" alignItems="center" px={2.5} py={0.875}
        sx={{ bgcolor: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {Object.entries(RATING_META).map(([key, meta]) => {
            const count = evaluations.filter(e => e.rating === key).length;
            return (
              <Stack key={key} direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: meta.color }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>
                  {meta.label}&nbsp;<Box component="span" sx={{ fontWeight: 800, color: meta.color }}>{count}</Box>
                </Typography>
              </Stack>
            );
          })}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {avgScore > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <EmojiEvents sx={{ fontSize: 14, color: ACCENT }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B' }}>
                Moy. <Box component="span" sx={{ color: ACCENT, fontWeight: 800 }}>{avgScore.toFixed(2)}/5</Box>
              </Typography>
            </Stack>
          )}
        </Stack>
      </Stack>

      {/* ════ TABLE ════ */}
      <Box sx={{ bgcolor: '#F1F5F9', minHeight: 340, p: 2 }}>
        {isLoading ? (
          <Box sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 2, alignItems: 'center' }}>
                <Skeleton variant="circular" width={34} height={34} />
                <Skeleton width={150} height={18} />
                <Skeleton width={80} height={18} sx={{ ml: 'auto' }} />
                <Skeleton width={100} height={20} />
                <Skeleton width={70} height={20} />
              </Box>
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 12, textAlign: 'center' }}>
            <Stack alignItems="center" spacing={2}>
              <Box sx={{ width: 72, height: 72, borderRadius: '20px', bgcolor: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }}>
                <Assessment sx={{ fontSize: 36, color: '#CBD5E1' }} />
              </Box>
              <Box textAlign="center">
                <Typography fontWeight={700} color="text.secondary" fontSize={15}>Aucune évaluation trouvée</Typography>
                <Typography variant="caption" color="text.disabled">
                  {evaluations.length === 0 ? 'Créez la première évaluation' : 'Modifiez vos critères de recherche'}
                </Typography>
              </Box>
              {evaluations.length === 0 && (
                <Button size="small" variant="outlined" startIcon={<Add fontSize="small" />} onClick={openCreate}
                  sx={{ borderRadius: '20px', fontSize: 12, fontWeight: 600, borderColor: ACCENT, color: ACCENT }}>
                  Nouvelle évaluation
                </Button>
              )}
            </Stack>
          </Box>
        ) : (
          <Box sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(15,23,42,0.07)' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  {['Agent', 'Période', 'Date', 'Score global', 'Critères', 'Évaluateur', 'Statut', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#64748B',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      borderBottom: '2px solid #E2E8F0', py: 1.25, px: 2 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((ev, idx) => {
                  const emp       = ev.employee;
                  const initials  = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??';
                  const smeta     = STATUS_META[ev.status];
                  const rmeta     = RATING_META[ev.rating];
                  const isDraft   = ev.status === 'draft';
                  const isSubmit  = ev.status === 'submitted';

                  return (
                    <TableRow key={ev.id} sx={{
                      bgcolor: idx % 2 === 0 ? '#fff' : '#FAFBFC',
                      '&:hover': { bgcolor: '#FFFBEB' }, '&:last-child td': { border: 0 },
                      transition: 'background 0.15s',
                    }}>
                      {/* Agent */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Avatar sx={{ width: 34, height: 34, fontSize: 12.5, fontWeight: 800,
                            background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)',
                            boxShadow: '0 3px 10px rgba(37,99,235,0.25)' }}>
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                              {emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${ev.employee_id}`}
                            </Typography>
                            {emp?.employee_number && (
                              <Typography sx={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>
                                {emp.employee_number}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Période */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Chip label={ev.period} size="small"
                          sx={{ height: 20, fontSize: 11, fontWeight: 700, color: '#7C3AED',
                            bgcolor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }} />
                      </TableCell>

                      {/* Date */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Typography sx={{ fontSize: 12.5, color: '#334155' }}>{formatDate(ev.evaluation_date)}</Typography>
                      </TableCell>

                      {/* Score global */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Stack spacing={0.5}>
                          <OverallScore score={ev.overall_score} size="sm" />
                          <Chip label={rmeta.label} size="small"
                            sx={{ height: 16, fontSize: 9.5, fontWeight: 700, width: 'fit-content',
                              color: rmeta.color, bgcolor: rmeta.bg, border: `1px solid ${rmeta.border}` }} />
                        </Stack>
                      </TableCell>

                      {/* Mini barres critères */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Stack spacing={0.35}>
                          {CRITERIA.map(({ key, label }) => {
                            const s   = ev[key as keyof Evaluation] as number;
                            const clr = s >= 4.5 ? '#059669' : s >= 3.5 ? '#3B82F6' : s >= 2.5 ? '#D97706' : '#DC2626';
                            return (
                              <Tooltip key={key} title={`${label}: ${s}/5`} arrow>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <LinearProgress variant="determinate" value={(s / 5) * 100}
                                    sx={{ width: 44, height: 4, borderRadius: 2,
                                      bgcolor: alpha(clr, 0.15),
                                      '& .MuiLinearProgress-bar': { bgcolor: clr, borderRadius: 2 } }} />
                                  <Typography sx={{ fontSize: 10, fontWeight: 600, color: clr, minWidth: 16 }}>{s}</Typography>
                                </Box>
                              </Tooltip>
                            );
                          })}
                        </Stack>
                      </TableCell>

                      {/* Évaluateur */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
                          {ev.evaluator_name || <Box component="span" sx={{ color: '#CBD5E1', fontStyle: 'italic' }}>—</Box>}
                        </Typography>
                      </TableCell>

                      {/* Statut */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Chip
                          icon={<Box sx={{ display: 'flex', alignItems: 'center', color: `${smeta.color} !important` }}>{smeta.icon}</Box>}
                          label={smeta.label} size="small"
                          sx={{ height: 22, fontSize: 11, fontWeight: 700,
                            color: smeta.color,
                            bgcolor: smeta.color === '#64748B' ? 'rgba(100,116,139,0.1)' : smeta.color === '#3B82F6' ? 'rgba(59,130,246,0.1)' : 'rgba(5,150,105,0.1)',
                            border: `1px solid ${alpha(smeta.color, 0.28)}` }} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Stack direction="row" spacing={0.5}>
                          {(isDraft || isSubmit) && (
                            <Tooltip title="Valider l'évaluation" arrow>
                              <IconButton size="small" onClick={() => validateMut.mutate(ev.id)}
                                disabled={validateMut.isPending}
                                sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#F0FDF4', color: '#16A34A',
                                  '&:hover': { bgcolor: '#DCFCE7', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                <VerifiedUser sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Modifier" arrow>
                            <IconButton size="small" onClick={() => openEdit(ev)}
                              sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#FFF7ED', color: '#F97316',
                                '&:hover': { bgcolor: '#FED7AA', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                              <Edit sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer" arrow>
                            <IconButton size="small" onClick={() => setDeleteTarget(ev)}
                              sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#FFF1F2', color: '#E11D48',
                                '&:hover': { bgcolor: '#FFE4E6', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                              <Delete sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      {/* ── Dialogs ── */}
      {modalOpen && (
        <EvaluationModal open={modalOpen} onClose={() => setModalOpen(false)}
          evaluation={editEval} employees={employees} />
      )}
      {deleteTarget && (
        <DeleteDialog evaluation={deleteTarget}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
}
