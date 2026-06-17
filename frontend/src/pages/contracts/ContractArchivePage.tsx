import { useRef, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, IconButton, Tooltip, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Stack, LinearProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, Autocomplete,
} from '@mui/material';
import {
  CloudUpload, Visibility, Delete, FolderOpen, InsertDriveFile,
  PictureAsPdf, Image, Description, Search, FilterList, Person,
} from '@mui/icons-material';
import { contractArchivesApi, type ContractArchive } from '../../api/contractArchives';
import { employeesApi } from '../../api/employees';
import PageHeader from '../../components/common/PageHeader';
import type { Employee } from '../../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} o`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 ** 2).toFixed(2)} Mo`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isPdf(archive: ContractArchive): boolean {
  return archive.mime_type?.toLowerCase().includes('pdf') === true
    || archive.original_name.toLowerCase().endsWith('.pdf');
}

function FileIcon({ mime }: { mime: string }) {
  if (mime?.includes('pdf'))   return <PictureAsPdf sx={{ fontSize: 20, color: '#DC2626' }} />;
  if (mime?.includes('image')) return <Image sx={{ fontSize: 20, color: '#7C3AED' }} />;
  if (mime?.includes('word') || mime?.includes('document'))
                               return <Description sx={{ fontSize: 20, color: '#2563EB' }} />;
  return <InsertDriveFile sx={{ fontSize: 20, color: '#64748B' }} />;
}

// ─── Zone de dépôt ──────────────────────────────────────────────────────────

function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef     = useRef<HTMLInputElement>(null);
  const folderRef    = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files: File[] = [];
    const items = e.dataTransfer.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry?.isFile) {
          (entry as FileSystemFileEntry).file((f) => files.push(f));
        } else if (!entry) {
          const f = items[i].getAsFile();
          if (f) files.push(f);
        }
      }
      setTimeout(() => { if (files.length) onFiles(files); }, 100);
    } else {
      Array.from(e.dataTransfer.files).forEach((f) => files.push(f));
      if (files.length) onFiles(files);
    }
  }, [onFiles]);

  return (
    <Box
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      sx={{
        border: `2px dashed ${dragging ? '#2563EB' : '#CBD5E1'}`,
        borderRadius: '14px',
        bgcolor: dragging ? '#EFF6FF' : '#F8FAFC',
        p: 4,
        textAlign: 'center',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
      onClick={() => inputRef.current?.click()}
    >
      <CloudUpload sx={{ fontSize: 48, color: dragging ? '#2563EB' : '#94A3B8', mb: 1 }} />
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
        Glissez vos fichiers ici ou cliquez pour sélectionner
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: '#64748B', mb: 2 }}>
        PDF, Word, Excel, images — 50 Mo max par fichier
      </Typography>

      <Stack direction="row" spacing={1.5} justifyContent="center">
        <Button
          variant="contained"
          size="small"
          startIcon={<InsertDriveFile />}
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          sx={{ borderRadius: '8px', fontWeight: 700, fontSize: 12, textTransform: 'none', bgcolor: '#2563EB' }}
        >
          Sélectionner fichiers
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<FolderOpen />}
          onClick={(e) => { e.stopPropagation(); folderRef.current?.click(); }}
          sx={{ borderRadius: '8px', fontWeight: 700, fontSize: 12, textTransform: 'none', borderColor: '#2563EB', color: '#2563EB' }}
        >
          Sélectionner dossier
        </Button>
      </Stack>

      {/* input fichiers */}
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); }}
      />
      {/* input dossier */}
      <input
        ref={folderRef}
        type="file"
        multiple
        hidden
        // @ts-expect-error — attribut non standard mais supporté par tous les navigateurs modernes
        webkitdirectory=""
        onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); }}
      />
    </Box>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ContractArchivePage() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [empFilter, setEmpFilter] = useState<Employee | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadEmp, setUploadEmp]   = useState<Employee | null>(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewArchive, setPreviewArchive] = useState<ContractArchive | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data: archives = [], isLoading } = useQuery({
    queryKey: ['contract-archives', search, empFilter?.id],
    queryFn: () => contractArchivesApi.list({
      search:      search || undefined,
      employee_id: empFilter?.id,
    }).then((r) => r.data as ContractArchive[]),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ page: 1, per_page: 200 }).then((r) => r.data.data ?? []),
  });
  const employees: Employee[] = empData ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: number) => contractArchivesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-archives'] }),
  });

  const handleFiles = (files: File[]) => {
    setPendingFiles(files);
    setUploadOpen(true);
  };

  const handleUpload = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    setUploadProgress(0);

    const fd = new FormData();
    pendingFiles.forEach((f) => fd.append('files[]', f));
    if (uploadEmp) fd.append('employee_id', String(uploadEmp.id));
    if (uploadLabel) fd.append('label', uploadLabel);

    try {
      await contractArchivesApi.upload(fd);
      qc.invalidateQueries({ queryKey: ['contract-archives'] });
      setUploadOpen(false);
      setPendingFiles([]);
      setUploadEmp(null);
      setUploadLabel('');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const openPreview = async (archive: ContractArchive) => {
    if (!isPdf(archive)) return;

    setPreviewLoading(true);
    try {
      const res = await contractArchivesApi.preview(archive.id);
      setPreviewUrl(URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' })));
      setPreviewArchive(archive);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPreviewArchive(null);
    setPreviewLoading(false);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const totalSize = archives.reduce((s, a) => s + (a.file_size ?? 0), 0);

  return (
    <Box>
      <PageHeader
        title="Archives Contrats"
        subtitle={`${archives.length} fichier(s) · ${fmtSize(totalSize)}`}
        action={{ label: 'Ajouter des fichiers', icon: <CloudUpload />, onClick: () => setUploadOpen(true) }}
      />

      {/* Zone de dépôt */}
      <Box sx={{ mb: 3 }}>
        <DropZone onFiles={handleFiles} />
      </Box>

      {/* Filtres */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Rechercher un fichier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <Search sx={{ fontSize: 17, color: '#94A3B8', mr: 0.5 }} /> }}
          sx={{ width: 240, bgcolor: '#fff' }}
        />
        <Autocomplete
          size="small"
          options={employees}
          getOptionLabel={(e) => `${e.employee_number} — ${e.first_name} ${e.last_name}`}
          value={empFilter}
          onChange={(_, v) => setEmpFilter(v)}
          sx={{ width: 260 }}
          renderOption={(props, e) => {
            const { key, ...optProps } = props as typeof props & { key: React.Key };
            return (
              <Box key={key} component="li" {...optProps} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: '#2563EB' }}>
                  {e.first_name?.[0]}{e.last_name?.[0]}
                </Avatar>
                <Typography sx={{ fontSize: 13 }}>{e.first_name} {e.last_name}</Typography>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField {...params} label="Filtrer par agent" placeholder="Tous les agents"
              InputProps={{ ...params.InputProps, startAdornment: <><Person sx={{ fontSize: 16, color: '#94A3B8', mr: 0.5 }} />{params.InputProps.startAdornment}</> }}
            />
          )}
        />
        {(search || empFilter) && (
          <Button size="small" onClick={() => { setSearch(''); setEmpFilter(null); }}
            sx={{ textTransform: 'none', color: '#64748B', fontSize: 12 }}>
            Réinitialiser
          </Button>
        )}
        <Typography sx={{ ml: 'auto', fontSize: 12, color: '#94A3B8' }}>
          <FilterList sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.25 }} />
          {archives.length} résultat(s)
        </Typography>
      </Box>

      {/* Tableau */}
      <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <Box sx={{ bgcolor: '#0D2137', px: 2.5, py: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Liste des archives
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                {['Type', 'Nom du fichier', 'Agent lié', 'Libellé', 'Taille', 'Uploadé le', 'Uploadé par', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Box sx={{ height: 14, bgcolor: '#F1F5F9', borderRadius: 1 }} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : archives.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                      <FolderOpen sx={{ fontSize: 40, color: '#CBD5E1', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Aucune archive disponible</Typography>
                    </TableCell>
                  </TableRow>
                )
                : archives.map((a, i) => (
                  <TableRow key={a.id} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    <TableCell sx={{ py: 0.75 }}>
                      <FileIcon mime={a.mime_type} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A', maxWidth: 220 }} noWrap>
                        {a.original_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {a.employee ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Avatar sx={{ width: 22, height: 22, fontSize: 9, bgcolor: '#1E3A5F' }}>
                            {a.employee.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </Avatar>
                          <Typography sx={{ fontSize: 11.5, fontWeight: 600 }}>{a.employee.name}</Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 11, color: '#CBD5E1' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.label
                        ? <Chip label={a.label} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 600 }} />
                        : <Typography sx={{ fontSize: 11, color: '#CBD5E1' }}>—</Typography>
                      }
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: '#64748B', whiteSpace: 'nowrap' }}>
                      {fmtSize(a.file_size)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: '#64748B', whiteSpace: 'nowrap' }}>
                      {fmtDate(a.created_at)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: '#64748B' }}>
                      {a.uploader?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.25}>
                        {isPdf(a) && (
                          <Tooltip title="Visualiser le PDF">
                            <IconButton size="small" onClick={() => openPreview(a)}>
                              <Visibility sx={{ fontSize: 15, color: '#2563EB' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Supprimer">
                          <IconButton size="small" onClick={() => deleteMut.mutate(a.id)}>
                            <Delete sx={{ fontSize: 15, color: '#EF4444' }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog
        open={Boolean(previewArchive)}
        onClose={closePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', height: 'calc(100vh - 96px)', maxHeight: 'calc(100vh - 96px)' } }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Visibility sx={{ fontSize: 18, color: '#2563EB' }} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography sx={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
              {previewArchive?.employee?.name ?? 'Archive contrat'}
            </Typography>
            <Typography noWrap sx={{ fontSize: 14, color: '#0F172A' }}>
              {previewArchive?.original_name}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 'calc(100vh - 190px)', minHeight: 520, bgcolor: '#F8FAFC' }}>
          {previewLoading && <LinearProgress />}
          {previewUrl ? (
            <iframe
              title={previewArchive?.original_name ?? 'Prévisualisation du contrat'}
              src={previewUrl}
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block' }}
            />
          ) : (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              <Typography sx={{ fontSize: 13 }}>Chargement du PDF…</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button size="small" onClick={closePreview} sx={{ borderRadius: '8px' }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog upload */}
      <Dialog open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUpload sx={{ color: '#2563EB' }} />
            Uploader des fichiers
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>

            {/* Liste des fichiers en attente */}
            {pendingFiles.length > 0 && (
              <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', p: 1.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0F172A', mb: 1 }}>
                  {pendingFiles.length} fichier(s) sélectionné(s)
                </Typography>
                <Box sx={{ maxHeight: 160, overflowY: 'auto' }}>
                  {pendingFiles.map((f, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <InsertDriveFile sx={{ fontSize: 14, color: '#64748B', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }} noWrap>{f.name}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, ml: 1 }}>{fmtSize(f.size)}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Zone de dépôt si pas encore de fichiers */}
            {pendingFiles.length === 0 && (
              <DropZone onFiles={setPendingFiles} />
            )}

            {/* Agent lié */}
            <Autocomplete
              size="small"
              options={employees}
              getOptionLabel={(e) => `${e.employee_number} — ${e.first_name} ${e.last_name}`}
              value={uploadEmp}
              onChange={(_, v) => setUploadEmp(v)}
              renderOption={(props, e) => {
                const { key, ...optProps } = props as typeof props & { key: React.Key };
                return (
                  <Box key={key} component="li" {...optProps} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: '#2563EB' }}>
                      {e.first_name?.[0]}{e.last_name?.[0]}
                    </Avatar>
                    <Typography sx={{ fontSize: 13 }}>{e.first_name} {e.last_name}</Typography>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField {...params} label="Associer à un agent (optionnel)" size="small" />
              )}
            />

            {/* Libellé */}
            <TextField
              label="Libellé / Description (optionnel)"
              size="small"
              fullWidth
              value={uploadLabel}
              onChange={(e) => setUploadLabel(e.target.value)}
              placeholder="Ex: Contrat initial, Avenant 2024…"
            />

            {/* Barre de progression */}
            {uploading && (
              <Box>
                <Typography sx={{ fontSize: 12, color: '#64748B', mb: 0.5 }}>Upload en cours…</Typography>
                <LinearProgress variant={uploadProgress > 0 ? 'determinate' : 'indeterminate'} value={uploadProgress}
                  sx={{ borderRadius: 4, height: 6 }} />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setUploadOpen(false); setPendingFiles([]); }} disabled={uploading}
            sx={{ textTransform: 'none', color: '#64748B' }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading || pendingFiles.length === 0}
            startIcon={<CloudUpload />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', bgcolor: '#2563EB' }}
          >
            {uploading ? 'Envoi en cours…' : `Uploader ${pendingFiles.length > 0 ? `(${pendingFiles.length})` : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
