import { useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, IconButton, Tooltip, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Stack, LinearProgress, Dialog, TablePagination,
  DialogTitle, DialogContent, DialogActions, Autocomplete, CircularProgress, Alert,
} from '@mui/material';
import {
  CloudUpload, Download, Delete, FolderOpen, InsertDriveFile,
  PictureAsPdf, Image, Description, Search, FilterList, Person,
  CheckCircle, ReportProblem, HelpOutline, AutoFixHigh, Visibility,
  Close, ZoomIn, ZoomOut,
} from '@mui/icons-material';
import { contractArchivesApi, type ContractArchive, type MatchResult } from '../../api/contractArchives';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchRow {
  file: File;
  type: string;
  employeeId: number | null;
  status: 'matched' | 'ambiguous' | 'none';
}

const STATUS_META: Record<MatchRow['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  matched:   { label: 'Rattaché',   color: '#059669', bg: '#ECFDF5', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  ambiguous: { label: 'À vérifier', color: '#D97706', bg: '#FFFBEB', icon: <ReportProblem sx={{ fontSize: 14 }} /> },
  none:      { label: 'Non trouvé', color: '#DC2626', bg: '#FEF2F2', icon: <HelpOutline sx={{ fontSize: 14 }} /> },
};

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ContractArchivePage({ embeddedMode = false }: { embeddedMode?: boolean }) {
  const qc = useQueryClient();
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const blobUrlRef    = useRef<string | null>(null);

  const [search, setSearch]       = useState('');
  const [empFilter, setEmpFilter] = useState<Employee | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [matchRows, setMatchRows]   = useState<MatchRow[]>([]);
  const [matching, setMatching]     = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rowFilter, setRowFilter]   = useState<'all' | 'matched' | 'unmatched'>('all');
  const [page, setPage]             = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* ── Lecteur PDF / image ── */
  const [viewerOpen,    setViewerOpen]    = useState(false);
  const [viewerUrl,     setViewerUrl]     = useState('');
  const [viewerMime,    setViewerMime]    = useState('');
  const [viewerName,    setViewerName]    = useState('');
  const [viewerLoading, setViewerLoading] = useState(false);
  const [imgZoom,       setImgZoom]       = useState(1);

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

  // Sélection de fichiers → rattachement automatique par nom de fichier
  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploadOpen(true);
    setMatching(true);
    // Lignes provisoires (avant réponse du serveur)
    setMatchRows(files.map((file) => ({ file, type: '', employeeId: null, status: 'none' })));
    try {
      const { data } = await contractArchivesApi.match(files.map((f) => f.name));
      setMatchRows(files.map((file, i) => {
        const m: MatchResult | undefined = data[i];
        return {
          file,
          type: m?.type ?? '',
          employeeId: m?.employee_id ?? null,
          status: m?.status ?? 'none',
        };
      }));
    } catch {
      // en cas d'échec on garde les lignes vides (rattachement manuel)
    } finally {
      setMatching(false);
    }
  };

  const updateRow = (idx: number, patch: Partial<MatchRow>) =>
    setMatchRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = (idx: number) =>
    setMatchRows((rows) => rows.filter((_, i) => i !== idx));

  const handleUpload = async () => {
    if (!matchRows.length) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const fd = new FormData();
    matchRows.forEach((r, i) => {
      fd.append('files[]', r.file);
      fd.append(`employee_ids[${i}]`, r.employeeId ? String(r.employeeId) : '');
      fd.append(`labels[${i}]`, r.type || '');
    });

    try {
      await contractArchivesApi.upload(fd, setUploadProgress);
      qc.invalidateQueries({ queryKey: ['contract-archives'] });
      setUploadOpen(false);
      setMatchRows([]);
      setRowFilter('all');
    } catch (err) {
      const e = err as { code?: string; response?: { status?: number; data?: { message?: string } } };
      if (e.code === 'ECONNABORTED') {
        setUploadError("Délai dépassé : le serveur met trop de temps à répondre. Réessayez (ou utilisez Apache plutôt que « php artisan serve »).");
      } else if (e.response?.status === 413) {
        setUploadError('Fichiers trop volumineux pour le serveur (limite PHP post_max_size / upload_max_filesize).');
      } else {
        setUploadError(e.response?.data?.message ?? "Échec de l'import. Vérifiez la connexion au serveur (port 8000).");
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const matchedCount = matchRows.filter((r) => r.employeeId).length;
  const visibleRows = matchRows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) =>
      rowFilter === 'all' ? true
      : rowFilter === 'matched' ? !!row.employeeId
      : !row.employeeId);

  const handleDownload = async (archive: ContractArchive) => {
    const res = await contractArchivesApi.download(archive.id);
    const url = URL.createObjectURL(new Blob([res.data as BlobPart]));
    const a   = document.createElement('a');
    a.href     = url;
    a.download = archive.original_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async (archive: ContractArchive) => {
    setViewerLoading(true);
    setViewerName(archive.original_name);
    setViewerMime(archive.mime_type ?? '');
    setViewerOpen(true);
    setImgZoom(1);
    try {
      // Libérer l'ancienne URL blob si elle existe encore
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      const res = await contractArchivesApi.preview(archive.id);
      const mime = archive.mime_type || 'application/octet-stream';
      const blob = new Blob([res.data as BlobPart], { type: mime });
      const url  = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setViewerUrl(url);
    } catch {
      setViewerOpen(false);
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerUrl('');
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  const totalSize = archives.reduce((s, a) => s + (a.file_size ?? 0), 0);
  const pagedArchives = archives.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      {!embeddedMode && (
        <PageHeader
          title="Archives Contrats"
          subtitle={`${archives.length} fichier(s) · ${fmtSize(totalSize)}`}
          action={{ label: 'Ajouter des fichiers', icon: <CloudUpload />, onClick: () => fileInputRef.current?.click() }}
        />
      )}

      {embeddedMode && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13.5, color: '#64748B' }}>
            {archives.length} fichier(s) · {fmtSize(totalSize)}
          </Typography>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ borderRadius: '9px', fontSize: 13, px: 2, py: 0.9, bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' } }}
          >
            Ajouter des fichiers
          </Button>
        </Stack>
      )}

      {/* Sélecteur de fichiers (déclenché par le bouton) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />

      {/* Filtres */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Rechercher un fichier…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <Search sx={{ fontSize: 17, color: '#94A3B8', mr: 0.5 }} /> }}
          sx={{ width: 240, bgcolor: '#fff' }}
        />
        <Autocomplete
          size="small"
          options={employees}
          getOptionLabel={(e) => `${e.employee_number} — ${e.first_name} ${e.last_name}`}
          value={empFilter}
          onChange={(_, v) => { setEmpFilter(v); setPage(0); }}
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
          <Button size="small" onClick={() => { setSearch(''); setEmpFilter(null); setPage(0); }}
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
                : pagedArchives.map((a, i) => (
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
                        <Tooltip title="Visualiser">
                          <IconButton size="small" onClick={() => handlePreview(a)}>
                            <Visibility sx={{ fontSize: 15, color: '#059669' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger">
                          <IconButton size="small" onClick={() => handleDownload(a)}>
                            <Download sx={{ fontSize: 15, color: '#2563EB' }} />
                          </IconButton>
                        </Tooltip>
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

        {/* Pagination */}
        {!isLoading && archives.length > 0 && (
          <Box sx={{ borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
            <TablePagination
              component="div"
              count={archives.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 15, 25, 50]}
              labelRowsPerPage="Lignes par page :"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              sx={{
                fontSize: 12,
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 },
                '& .MuiTablePagination-select': { fontSize: 12 },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Dialog upload + rattachement automatique */}
      <Dialog open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoFixHigh sx={{ color: '#2563EB' }} />
            Importer & rattacher les contrats
          </Box>
          <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 400, mt: 0.5 }}>
            L'agent est détecté automatiquement d'après le nom du fichier (ex. «&nbsp;CDI NDIOBA FALL&nbsp;»). Vérifiez et corrigez si besoin.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>

            {/* Zone de dépôt si aucun fichier */}
            {matchRows.length === 0 ? (
              <DropZone onFiles={handleFiles} />
            ) : (
              <>
                {/* Résumé + filtres cliquables */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {matching && <Chip icon={<CircularProgress size={12} />} label="Analyse…" size="small" sx={{ fontSize: 11 }} />}
                  <Chip
                    label={`Tous (${matchRows.length})`} size="small" clickable
                    variant={rowFilter === 'all' ? 'filled' : 'outlined'}
                    onClick={() => setRowFilter('all')}
                    sx={{ fontWeight: 700, fontSize: 11, ...(rowFilter === 'all' && { bgcolor: '#1E3A5F', color: '#fff' }) }} />
                  <Chip icon={<CheckCircle sx={{ fontSize: '14px !important' }} />}
                    label={`Rattachés (${matchedCount})`} size="small" clickable
                    onClick={() => setRowFilter('matched')}
                    sx={{ fontWeight: 700, fontSize: 11,
                      bgcolor: rowFilter === 'matched' ? '#059669' : '#ECFDF5',
                      color: rowFilter === 'matched' ? '#fff' : '#059669',
                      '& .MuiChip-icon': { color: `${rowFilter === 'matched' ? '#fff' : '#059669'} !important` } }} />
                  <Chip icon={<HelpOutline sx={{ fontSize: '14px !important' }} />}
                    label={`À compléter (${matchRows.length - matchedCount})`} size="small" clickable
                    onClick={() => setRowFilter('unmatched')}
                    sx={{ fontWeight: 700, fontSize: 11,
                      bgcolor: rowFilter === 'unmatched' ? '#DC2626' : '#FEF2F2',
                      color: rowFilter === 'unmatched' ? '#fff' : '#DC2626',
                      '& .MuiChip-icon': { color: `${rowFilter === 'unmatched' ? '#fff' : '#DC2626'} !important` } }} />
                  <Box sx={{ flex: 1 }} />
                  <Button size="small" startIcon={<InsertDriveFile sx={{ fontSize: '14px !important' }} />}
                    component="label" sx={{ textTransform: 'none', fontSize: 12 }}>
                    Ajouter
                    <input type="file" multiple hidden
                      onChange={(e) => { if (e.target.files?.length) handleFiles([...matchRows.map(r => r.file), ...Array.from(e.target.files)]); }} />
                  </Button>
                </Stack>

                {/* Tableau de correspondance éditable */}
                <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '10px', maxHeight: 380 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['Fichier', 'Type', 'Agent rattaché', 'Statut', ''].map((h) => (
                          <TableCell key={h} sx={{ bgcolor: '#F1F5F9', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: '#94A3B8', fontSize: 12 }}>
                            Aucun fichier dans ce filtre.
                          </TableCell>
                        </TableRow>
                      )}
                      {visibleRows.map(({ row, idx }) => {
                        const meta = STATUS_META[row.employeeId ? 'matched' : row.status];
                        const selectedEmp = employees.find((e) => e.id === row.employeeId) ?? null;
                        return (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ maxWidth: 200 }}>
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <FileIcon mime={row.file.type} />
                                <Typography sx={{ fontSize: 11.5, color: '#0F172A' }} noWrap>{row.file.name}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ width: 110 }}>
                              <TextField size="small" variant="standard" value={row.type}
                                onChange={(e) => updateRow(idx, { type: e.target.value })}
                                placeholder="Type" InputProps={{ sx: { fontSize: 12 } }} sx={{ width: 90 }} />
                            </TableCell>
                            <TableCell sx={{ width: 260 }}>
                              <Autocomplete
                                size="small"
                                options={employees}
                                getOptionLabel={(e) => `${e.first_name} ${e.last_name}`}
                                value={selectedEmp}
                                onChange={(_, v) => updateRow(idx, { employeeId: v?.id ?? null, status: v ? 'matched' : 'none' })}
                                isOptionEqualToValue={(o, v) => o.id === v.id}
                                renderInput={(params) => (
                                  <TextField {...params} variant="standard" placeholder="Choisir un agent"
                                    InputProps={{ ...params.InputProps, sx: { fontSize: 12 } }} />
                                )}
                                sx={{ minWidth: 230 }}
                              />
                            </TableCell>
                            <TableCell sx={{ width: 110 }}>
                              <Chip icon={meta.icon as React.ReactElement} label={meta.label} size="small"
                                sx={{ height: 22, fontSize: 10, fontWeight: 700, color: meta.color, bgcolor: meta.bg,
                                  '& .MuiChip-icon': { color: `${meta.color} !important` } }} />
                            </TableCell>
                            <TableCell sx={{ width: 40 }}>
                              <IconButton size="small" onClick={() => removeRow(idx)}>
                                <Delete sx={{ fontSize: 15, color: '#94A3B8' }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Message d'erreur */}
            {uploadError && (
              <Alert severity="error" onClose={() => setUploadError(null)} sx={{ fontSize: 12.5 }}>
                {uploadError}
              </Alert>
            )}

            {/* Barre de progression */}
            {uploading && (
              <Box>
                <Typography sx={{ fontSize: 12, color: '#64748B', mb: 0.5 }}>
                  {uploadProgress >= 100 ? 'Finalisation côté serveur…' : `Upload en cours… ${uploadProgress}%`}
                </Typography>
                <LinearProgress variant={uploadProgress > 0 && uploadProgress < 100 ? 'determinate' : 'indeterminate'} value={uploadProgress}
                  sx={{ borderRadius: 4, height: 6 }} />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setUploadOpen(false); setMatchRows([]); }} disabled={uploading}
            sx={{ textTransform: 'none', color: '#64748B' }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading || matching || matchRows.length === 0}
            startIcon={<CloudUpload />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', bgcolor: '#2563EB' }}
          >
            {uploading ? 'Envoi en cours…' : `Importer ${matchRows.length > 0 ? `(${matchRows.length})` : ''}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Lecteur PDF / Image ══ */}
      <Dialog
        open={viewerOpen}
        onClose={closeViewer}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '14px',
            height: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        {/* En-tête */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2.5, py: 1.5,
          bgcolor: '#0D2137', color: '#fff',
          flexShrink: 0,
        }}>
          {viewerMime?.includes('pdf')
            ? <PictureAsPdf sx={{ color: '#FCA5A5', fontSize: 20 }} />
            : <Image sx={{ color: '#93C5FD', fontSize: 20 }} />}
          <Typography sx={{ fontWeight: 700, fontSize: 14, flex: 1 }} noWrap>
            {viewerName}
          </Typography>

          {/* Zoom image uniquement */}
          {viewerMime?.startsWith('image/') && !viewerLoading && (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Zoom -">
                <IconButton size="small" sx={{ color: '#94A3B8' }}
                  onClick={() => setImgZoom((z) => Math.max(0.25, z - 0.25))}>
                  <ZoomOut sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Typography sx={{ color: '#CBD5E1', fontSize: 12, alignSelf: 'center', minWidth: 36, textAlign: 'center' }}>
                {Math.round(imgZoom * 100)}%
              </Typography>
              <Tooltip title="Zoom +">
                <IconButton size="small" sx={{ color: '#94A3B8' }}
                  onClick={() => setImgZoom((z) => Math.min(4, z + 0.25))}>
                  <ZoomIn sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          <Tooltip title="Fermer">
            <IconButton size="small" sx={{ color: '#94A3B8', ml: 1 }} onClick={closeViewer}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Corps */}
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {viewerLoading ? (
            <Stack alignItems="center" spacing={2}>
              <CircularProgress sx={{ color: '#60A5FA' }} />
              <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Chargement du fichier…</Typography>
            </Stack>
          ) : viewerMime?.includes('pdf') ? (
            <iframe
              src={viewerUrl}
              title={viewerName}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          ) : viewerMime?.startsWith('image/') ? (
            <Box sx={{ p: 2, overflow: 'auto', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={viewerUrl}
                alt={viewerName}
                style={{
                  maxWidth: '100%',
                  transform: `scale(${imgZoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s',
                  borderRadius: 8,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              />
            </Box>
          ) : (
            <Stack alignItems="center" spacing={2}>
              <InsertDriveFile sx={{ fontSize: 56, color: '#475569' }} />
              <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>
                Ce type de fichier ne peut pas être prévisualisé directement.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Download />}
                sx={{ color: '#60A5FA', borderColor: '#60A5FA' }}
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = viewerUrl;
                  a.download = viewerName;
                  a.click();
                }}
              >
                Télécharger le fichier
              </Button>
            </Stack>
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
