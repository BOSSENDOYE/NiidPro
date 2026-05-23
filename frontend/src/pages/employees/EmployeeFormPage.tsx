import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Grid, MenuItem, CircularProgress, Alert, Divider,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeesApi } from '../../api/employees';
import { departmentsApi } from '../../api/departments';

const schema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  professional_email: z.string().email('Email invalide'),
  personal_email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  hire_date: z.string().min(1, 'Date d\'entrée requise'),
  base_salary: z.number({ coerce: true }).min(0, 'Salaire invalide'),
  department_id: z.number({ coerce: true }).min(1, 'Direction requise'),
  status: z.enum(['active', 'inactive', 'suspended']),
  city: z.string().optional(),
  country: z.string().optional(),
  annual_leave_days: z.number({ coerce: true }).min(0),
});

type FormData = z.infer<typeof schema>;

export default function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  const { data: employee, isLoading: loadingEmp } = useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.get(Number(id)).then((r) => r.data),
    enabled: isEdit,
  });

  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'active',
      annual_leave_days: 30,
      base_salary: 0,
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        first_name: employee.first_name,
        last_name: employee.last_name,
        professional_email: employee.professional_email,
        personal_email: employee.personal_email ?? '',
        phone: employee.phone ?? '',
        hire_date: employee.hire_date,
        base_salary: employee.base_salary,
        department_id: employee.department_id,
        status: employee.status,
        city: employee.city ?? '',
        country: employee.country ?? '',
        annual_leave_days: employee.annual_leave_days,
      });
    }
  }, [employee, reset]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => employeesApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      navigate(`/employees/${res.data.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => employeesApi.update(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      navigate(`/employees/${id}`);
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEdit) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const mutError = (createMutation.error ?? updateMutation.error) as
    { response?: { data?: { message?: string } } } | null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(isEdit ? `/employees/${id}` : '/employees')}
          variant="outlined"
          size="small"
          sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: '8px' }}
        >
          Retour
        </Button>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
          {isEdit ? 'Modifier l\'employé' : 'Nouvel employé'}
        </Typography>
      </Box>

      {mutError && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
          {mutError.response?.data?.message ?? 'Une erreur est survenue'}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {loadingEmp && isEdit ? (
          <Card><CardContent sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={32} />
          </CardContent></Card>
        ) : (
          <Grid container spacing={2.5}>
            {/* Identité */}
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0F172A', mb: 2 }}>
                    Identité
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('first_name')}
                        label="Prénom *"
                        fullWidth
                        error={!!errors.first_name}
                        helperText={errors.first_name?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('last_name')}
                        label="Nom *"
                        fullWidth
                        error={!!errors.last_name}
                        helperText={errors.last_name?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('professional_email')}
                        label="Email professionnel *"
                        type="email"
                        fullWidth
                        error={!!errors.professional_email}
                        helperText={errors.professional_email?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('personal_email')}
                        label="Email personnel"
                        type="email"
                        fullWidth
                        error={!!errors.personal_email}
                        helperText={errors.personal_email?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('phone')}
                        label="Téléphone"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        {...register('city')}
                        label="Ville"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        {...register('country')}
                        label="Pays"
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Poste */}
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0F172A', mb: 2 }}>
                    Poste & Contrat
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="department_id"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            select
                            label="Direction *"
                            fullWidth
                            error={!!errors.department_id}
                            helperText={errors.department_id?.message}
                            value={field.value ?? ''}
                          >
                            {departments?.map((d) => (
                              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                            ))}
                          </TextField>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('hire_date')}
                        label="Date d'entrée *"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.hire_date}
                        helperText={errors.hire_date?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        {...register('base_salary', { valueAsNumber: true })}
                        label="Salaire de base (€) *"
                        type="number"
                        fullWidth
                        inputProps={{ min: 0, step: 100 }}
                        error={!!errors.base_salary}
                        helperText={errors.base_salary?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        {...register('annual_leave_days', { valueAsNumber: true })}
                        label="Jours de congés / an"
                        type="number"
                        fullWidth
                        inputProps={{ min: 0, max: 60 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} select label="Statut" fullWidth value={field.value ?? 'active'}>
                            <MenuItem value="active">Actif</MenuItem>
                            <MenuItem value="inactive">Inactif</MenuItem>
                            <MenuItem value="suspended">Suspendu</MenuItem>
                          </TextField>
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(isEdit ? `/employees/${id}` : '/employees')}
                  sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: '8px' }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  disabled={isSubmitting}
                  sx={{ borderRadius: '8px', px: 3 }}
                >
                  {isEdit ? 'Enregistrer' : 'Créer l\'employé'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
}
