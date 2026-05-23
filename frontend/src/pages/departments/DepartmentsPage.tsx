import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Grid, Card, CardContent, Typography, Avatar, IconButton,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Skeleton, Chip, Stack,
} from '@mui/material';
import { Add, Edit, Delete, People } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { departmentsApi } from '../../api/departments';
import PageHeader from '../../components/common/PageHeader';
import type { Department } from '../../types';

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm<Partial<Department>>();

  const createMutation = useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Department> }) =>
      departmentsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: departmentsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });

  const openCreate = () => { reset({}); setEditTarget(null); setDialogOpen(true); };
  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    reset({ name: dept.name, code: dept.code, description: dept.description, color: dept.color });
    setValue('color', dept.color ?? '#6366F1');
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditTarget(null); reset({}); };

  const onSubmit = (formData: Partial<Department>) => {
    if (editTarget) updateMutation.mutate({ id: editTarget.id, data: formData });
    else createMutation.mutate(formData);
  };

  return (
    <Box>
      <PageHeader
        title="Directions"
        subtitle={`${data?.length ?? '...'} directions`}
        action={{ label: 'Nouvelle direction', icon: <Add />, onClick: openCreate }}
      />

      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} sm={6} lg={4} key={i}>
                <Card><CardContent><Skeleton height={120} /></CardContent></Card>
              </Grid>
            ))
          : data?.map((dept) => (
              <Grid item xs={12} sm={6} lg={4} key={dept.id}>
                <Card sx={{ borderTop: `4px solid ${dept.color ?? '#6366F1'}` }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Avatar sx={{ bgcolor: dept.color ?? '#6366F1', mr: 2 }}>
                        <People />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography fontWeight={600}>{dept.name}</Typography>
                        <Stack direction="row" spacing={1} mt={0.5}>
                          <Chip label={dept.code} size="small" variant="outlined" />
                          <Chip
                            label={`${dept.employees_count ?? 0} employés`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>
                      </Box>
                      <Box>
                        <Tooltip title="Modifier">
                          <IconButton size="small" onClick={() => openEdit(dept)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteMutation.mutate(dept.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    {dept.description && (
                      <Typography variant="body2" color="text.secondary" mt={1} noWrap>
                        {dept.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
      </Grid>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? 'Modifier la direction' : 'Nouvelle direction'}</DialogTitle>
        <DialogContent>
          <Box component="form" id="dept-form" onSubmit={handleSubmit(onSubmit)} sx={{ pt: 1 }}>
            <TextField {...register('name')} label="Nom *" fullWidth sx={{ mb: 2 }} />
            <TextField {...register('code')} label="Code" fullWidth sx={{ mb: 2 }} />
            <TextField {...register('description')} label="Description" fullWidth multiline rows={2} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">Couleur</Typography>
              <input type="color" {...register('color')} style={{ width: 48, height: 36, cursor: 'pointer', border: 'none' }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annuler</Button>
          <Button form="dept-form" type="submit" variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending}>
            {editTarget ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
