import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Stack, Chip, MenuItem, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import {
  UploadFile, Delete, Download, WorkspacePremium, InsertDriveFile,
} from '@mui/icons-material';
import ConfirmDialog from '../shared/ConfirmDialog';
import { trainingsApi } from '../../api/trainings';
import { formatDate } from '../../utils/format';
import type { Training, TrainingDocument } from '../../types';

interface Props {
  training: Training;
}

const ACT = '#8B5CF6';

const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  piece_jointe: { label: 'Pièce jointe', color: '#0284C7', bg: '#F0F9FF' },
  support:      { label: 'Support',      color: '#7C3AED', bg: '#F5F3FF' },
  certificat:   { label: 'Certificat',   color: '#059669', bg: '#ECFDF5' },
  rapport:      { label: 'Rapport',      color: '#D97706', bg: '#FFFBEB' },
  autre:        { label: 'Autre',        color: '#64748B', bg: '#F1F5F9' },
};

function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export default function TrainingDocumentsTab({ training }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>('piece_jointe');
  const [toDel, setToDel] = useState<number | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['trainings', training.id, 'documents'],
    queryFn: () => trainingsApi.documents(training.id).then((r) => r.data),
    enabled: !!training.id,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      return trainingsApi.uploadDocument(training.id, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings', training.id, 'documents'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: number) => trainingsApi.deleteDocument(training.id, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings', training.id, 'documents'] }),
  });

  const certifyMutation = useMutation({
    mutationFn: () => trainingsApi.generateCertificates(training.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings', training.id, 'documents'] }),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  const canCertify = training.status === 'completed' || training.status === 'archived';

  return (
    <Box sx={{ p: 2.5 }}>
      {/* ── Barre d'actions ── */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <TextField
          select size="small" label="Catégorie" value={category}
          onChange={(e) => setCategory(e.target.value)} sx={{ width: 170 }}
        >
          {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'certificat').map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.label}</MenuItem>
          ))}
        </TextField>
        <input ref={fileRef} type="file" hidden onChange={handleFile} />
        <Button
          variant="contained" size="small"
          startIcon={uploadMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <UploadFile sx={{ fontSize: '16px !important' }} />}
          onClick={() => fileRef.current?.click()}
          disabled={uploadMutation.isPending}
          sx={{ bgcolor: ACT, fontWeight: 700, fontSize: 12 }}
        >
          Téléverser
        </Button>

        <Box sx={{ flex: 1 }} />

        <Tooltip title={canCertify ? 'Générer les attestations pour tous les participants' : 'Disponible une fois la formation réalisée'}>
          <span>
            <Button
              variant="outlined" size="small"
              startIcon={certifyMutation.isPending ? <CircularProgress size={14} /> : <WorkspacePremium sx={{ fontSize: '16px !important' }} />}
              onClick={() => certifyMutation.mutate()}
              disabled={!canCertify || certifyMutation.isPending}
              sx={{ fontWeight: 700, fontSize: 12, borderColor: '#059669', color: '#059669' }}
            >
              Générer attestations
            </Button>
          </span>
        </Tooltip>
      </Stack>

      {uploadMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Échec du téléversement (taille max 10 Mo).</Alert>}
      {certifyMutation.isSuccess && <Alert severity="success" sx={{ mb: 2 }}>Attestations générées.</Alert>}

      {/* ── Tableau documents ── */}
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F1F5F9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Nom</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Catégorie</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Agent</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Taille</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={20} /></TableCell></TableRow>
            ) : documents.length === 0 ? (
              <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#64748B' }}>Aucun document</TableCell></TableRow>
            ) : (
              documents.map((doc: TrainingDocument) => {
                const cat = CATEGORY_LABELS[doc.category] ?? CATEGORY_LABELS.autre;
                return (
                  <TableRow key={doc.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <InsertDriveFile sx={{ fontSize: 15, color: '#94A3B8' }} />
                        <span>{doc.name}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={cat.label} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, color: cat.color, bgcolor: cat.bg }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>
                      {doc.employee ? `${doc.employee.first_name} ${doc.employee.last_name}` : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{formatSize(doc.file_size)}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{formatDate(doc.created_at)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {doc.url && (
                          <Tooltip title="Ouvrir / Télécharger">
                            <IconButton size="small" component="a" href={doc.url} target="_blank" rel="noopener" sx={{ color: ACT }}>
                              <Download sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Supprimer">
                          <IconButton size="small" onClick={() => setToDel(doc.id)} sx={{ color: '#DC2626' }}>
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={toDel !== null}
        message="Supprimer ce document définitivement ?"
        onConfirm={() => toDel !== null && deleteMutation.mutate(toDel)}
        onClose={() => setToDel(null)}
      />
    </Box>
  );
}
