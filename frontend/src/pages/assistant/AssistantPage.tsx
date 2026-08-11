import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, TextField, IconButton, Paper, Stack,
  Avatar, CircularProgress, Alert, Chip, Tooltip, Drawer,
  List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction,
  Divider, Badge, LinearProgress,
} from '@mui/material';
import {
  Send, Delete, SmartToy, Person, AttachFile, Close,
  FolderOpen, PictureAsPdf, Image, Article, TextSnippet,
  BookmarkBorder, Bookmark, DeleteOutline, AddPhotoAlternate,
} from '@mui/icons-material';
import { agentIAApi, type IAFile } from '../../api/agentIA';
import { assistantApi } from '../../api/assistant';

const NAV = '#0D2137';
const ACT = '#E85D04';

interface Message {
  id:       number;
  role:     'user' | 'assistant';
  content:  string;
  loading?: boolean;
  error?:   boolean;
  file?:    IAFile;
}

const SUGGESTIONS = [
  'Combien d\'agents sont en poste actuellement ?',
  'Quels agents sont en congé ce mois ?',
  'Donne-moi les statistiques RH globales',
  'Qui a eu des avancements cette année ?',
];

function FileTypeIcon({ type }: { type: IAFile['type_label'] }) {
  if (type === 'pdf')   return <PictureAsPdf sx={{ fontSize: 20, color: '#DC2626' }} />;
  if (type === 'image') return <Image       sx={{ fontSize: 20, color: '#2563EB' }} />;
  if (type === 'texte') return <TextSnippet sx={{ fontSize: 20, color: '#16A34A' }} />;
  return                       <Article    sx={{ fontSize: 20, color: '#7C3AED' }} />;
}

function formatSize(kb: number): string {
  return kb < 1024 ? `${kb} Ko` : `${(kb / 1024).toFixed(1)} Mo`;
}

export default function AssistantPage() {
  const qc = useQueryClient();

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [busy,        setBusy]        = useState(false);
  const [attachment,  setAttachment]  = useState<IAFile | null>(null);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId    = useRef(1);

  const { data: cfg, isLoading: cfgLoading } = useQuery({
    queryKey: ['assistant-config'],
    queryFn:  assistantApi.getConfig,
  });

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['ia-files'],
    queryFn:  agentIAApi.listFiles,
    enabled:  drawerOpen,
  });

  const persistentCount = files.filter(f => f.is_persistent).length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const fileToSend = attachment;
    setInput('');
    setAttachment(null);
    setBusy(true);

    const userMsg:    Message = { id: nextId.current++, role: 'user',      content: text, file: fileToSend ?? undefined };
    const loadingMsg: Message = { id: nextId.current++, role: 'assistant', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);

    try {
      const { reply } = await agentIAApi.chat(text, fileToSend?.id);
      setMessages(prev =>
        prev.map(m => m.id === loadingMsg.id ? { ...m, content: reply, loading: false } : m)
      );
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Une erreur est survenue.';
      setMessages(prev =>
        prev.map(m => m.id === loadingMsg.id ? { ...m, content: msg, loading: false, error: true } : m)
      );
    } finally {
      setBusy(false);
    }
  };

  const clearConversation = async () => {
    setMessages([]);
    setAttachment(null);
    try { await agentIAApi.clearHistory(); } catch { /* silencieux */ }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await agentIAApi.uploadFile(file);
      qc.invalidateQueries({ queryKey: ['ia-files'] });
      setAttachment(uploaded);
      setDrawerOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Erreur lors de l\'upload.';
      setUploadError(msg);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }, [qc]);

  const handleTogglePersistent = async (file: IAFile) => {
    await agentIAApi.togglePersistent(file.id);
    qc.invalidateQueries({ queryKey: ['ia-files'] });
  };

  const handleDeleteFile = async (file: IAFile) => {
    await agentIAApi.deleteFile(file.id);
    qc.invalidateQueries({ queryKey: ['ia-files'] });
    if (attachment?.id === file.id) setAttachment(null);
  };

  const renderContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            style={{ color: ACT, textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)', gap: 0 }}>
      {/* Input fichier — déclenché via label htmlFor="ia-file-input" */}
      <input
        id="ia-file-input"
        type="file"
        style={{ display: 'none' }}
        accept=".txt,.csv,.json,.md,.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
        onChange={handleFileUpload}
      />

      {/* ── Colonne principale : chat ───────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* En-tête */}
        <Box sx={{ bgcolor: NAV, px: 3, py: 1.5, borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar sx={{ bgcolor: ACT, width: 34, height: 34 }}>
                <SmartToy sx={{ fontSize: 19 }} />
              </Avatar>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                  Assistant RH
                </Typography>
                <Typography sx={{ color: '#93C5FD', fontSize: 11.5 }}>
                  {cfgLoading ? '…' : cfg?.is_active
                    ? `${cfg.model} · DB temps réel · 13 outils`
                    : 'Non configuré — Paramètres → Assistant IA'
                  }
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              {cfg?.is_active && (
                <Chip label="Actif" size="small"
                  sx={{ bgcolor: '#166534', color: '#fff', fontSize: 11, fontWeight: 700 }} />
              )}
              {/* Bouton Bibliothèque */}
              <Tooltip title="Bibliothèque de fichiers">
                <IconButton size="small" onClick={() => setDrawerOpen(true)} sx={{ color: '#93C5FD' }}>
                  <Badge badgeContent={persistentCount} color="warning" max={9}>
                    <FolderOpen sx={{ fontSize: 20 }} />
                  </Badge>
                </IconButton>
              </Tooltip>
              {messages.length > 0 && (
                <Tooltip title="Nouvelle conversation">
                  <IconButton size="small" onClick={clearConversation} sx={{ color: '#93C5FD' }}>
                    <Delete sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </Box>

        {/* Messages */}
        <Box sx={{
          flex: 1, overflowY: 'auto', px: 3, py: 2,
          bgcolor: '#F8FAFC',
          display: 'flex', flexDirection: 'column', gap: 1.5,
        }}>
          {messages.length === 0 && !cfgLoading && (
            <Box sx={{ textAlign: 'center', mt: 6 }}>
              <Avatar sx={{ bgcolor: NAV, width: 56, height: 56, mx: 'auto', mb: 2 }}>
                <SmartToy sx={{ fontSize: 30 }} />
              </Avatar>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: NAV }}>
                Bonjour, comment puis-je vous aider ?
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 13, mt: 0.5, maxWidth: 440, mx: 'auto' }}>
                Je suis connecté à la base de données RH en temps réel et je peux analyser
                vos fichiers (PDF, images, textes).
              </Typography>
              {!cfg?.is_active && (
                <Alert severity="warning" sx={{ mt: 3, maxWidth: 420, mx: 'auto', fontSize: 12.5 }}>
                  Configurez la clé API dans <strong>Configuration → Assistant IA</strong>.
                </Alert>
              )}
              {cfg?.is_active && (
                <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" sx={{ mt: 3 }}>
                  {SUGGESTIONS.map(s => (
                    <Chip key={s} label={s} size="small" clickable onClick={() => setInput(s)}
                      sx={{ fontSize: 12, bgcolor: '#fff', border: '1px solid #E2E8F0',
                            '&:hover': { bgcolor: '#EFF6FF', borderColor: '#93C5FD' } }} />
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {messages.map(msg => (
            <Stack key={msg.id} direction="row" spacing={1.2} alignItems="flex-start"
              sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}
            >
              {msg.role === 'assistant' && (
                <Avatar sx={{ bgcolor: NAV, width: 30, height: 30, mt: 0.3, flexShrink: 0 }}>
                  <SmartToy sx={{ fontSize: 16 }} />
                </Avatar>
              )}
              <Box>
                {/* Badge fichier joint */}
                {msg.file && msg.role === 'user' && (
                  <Chip
                    icon={<FileTypeIcon type={msg.file.type_label} />}
                    label={msg.file.filename}
                    size="small"
                    sx={{
                      mb: 0.5, fontSize: 11, fontWeight: 600,
                      bgcolor: '#E0E7FF', color: '#3730A3',
                      maxWidth: '100%',
                    }}
                  />
                )}
                <Paper elevation={0} sx={{
                  px: 2, py: 1.2,
                  bgcolor: msg.role === 'user' ? NAV : msg.error ? '#FEF2F2' : '#fff',
                  color:   msg.role === 'user' ? '#fff' : msg.error ? '#991B1B' : '#0F172A',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  border: msg.role === 'assistant' && !msg.error ? '1px solid #E2E8F0' : 'none',
                }}>
                  {msg.loading ? (
                    <Stack direction="row" spacing={0.8} alignItems="center">
                      <CircularProgress size={13} sx={{ color: '#94A3B8' }} />
                      <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>En train de réfléchir…</Typography>
                    </Stack>
                  ) : (
                    <Typography sx={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {renderContent(msg.content)}
                    </Typography>
                  )}
                </Paper>
              </Box>
              {msg.role === 'user' && (
                <Avatar sx={{ bgcolor: ACT, width: 30, height: 30, mt: 0.3, flexShrink: 0 }}>
                  <Person sx={{ fontSize: 16 }} />
                </Avatar>
              )}
            </Stack>
          ))}
          <div ref={bottomRef} />
        </Box>

        {/* Input */}
        <Box sx={{
          px: 2, py: 1.5, bgcolor: '#fff',
          borderTop: '1px solid #E2E8F0',
          borderRadius: '0 0 12px 12px',
          flexShrink: 0,
        }}>
          {uploadError && (
            <Alert severity="error" onClose={() => setUploadError(null)} sx={{ mb: 1, py: 0.5, fontSize: 12 }}>
              {uploadError}
            </Alert>
          )}
          {uploading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

          {/* Fichier attaché */}
          {attachment && (
            <Box sx={{ mb: 1 }}>
              <Chip
                icon={<FileTypeIcon type={attachment.type_label} />}
                label={`${attachment.filename} (${formatSize(attachment.size_kb)})`}
                size="small"
                onDelete={() => setAttachment(null)}
                deleteIcon={<Close sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: '#EEF2FF', color: '#3730A3', fontWeight: 600, fontSize: 12,
                  '& .MuiChip-deleteIcon': { color: '#3730A3', opacity: 0.7 },
                }}
              />
            </Box>
          )}

          <Stack direction="row" spacing={1} alignItems="flex-end">
            {/* Bouton joindre fichier — label htmlFor pour ouvrir le sélecteur nativement */}
            <Tooltip title="Joindre un fichier (PDF, image, texte…)">
              <Box
                component="label"
                htmlFor={busy || uploading ? undefined : 'ia-file-input'}
                sx={{
                  display: 'inline-flex',
                  flexShrink: 0,
                  cursor: busy || uploading ? 'not-allowed' : 'pointer',
                  pointerEvents: busy || uploading ? 'none' : 'auto',
                }}
              >
                <IconButton
                  component="span"
                  size="small"
                  disabled={busy || uploading}
                  sx={{
                    color: attachment ? ACT : '#94A3B8',
                    border: '1px solid #E2E8F0', borderRadius: '10px',
                    width: 40, height: 40,
                    '&:hover': { bgcolor: '#F8FAFC', color: ACT },
                  }}
                >
                  <AttachFile sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Tooltip>

            <TextField
              fullWidth multiline maxRows={4} size="small"
              placeholder={cfg?.is_active ? 'Posez votre question ou joignez un fichier…' : 'Assistant non configuré'}
              disabled={!cfg?.is_active || busy}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13.5 } }}
            />
            <IconButton onClick={send}
              disabled={!input.trim() || !cfg?.is_active || busy}
              sx={{
                bgcolor: NAV, color: '#fff', width: 40, height: 40, borderRadius: '10px',
                flexShrink: 0,
                '&:hover': { bgcolor: '#1a3a5c' },
                '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' },
              }}
            >
              {busy ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Send sx={{ fontSize: 18 }} />}
            </IconButton>
          </Stack>
          <Typography sx={{ fontSize: 11, color: '#94A3B8', mt: 0.5, textAlign: 'center' }}>
            Entrée pour envoyer · Maj+Entrée nouvelle ligne · PDF, image, Word, TXT supportés
          </Typography>
        </Box>
      </Box>

      {/* ── Tiroir : Bibliothèque de fichiers ───────────────────── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 320, display: 'flex', flexDirection: 'column' } }}
      >
        {/* En-tête du tiroir */}
        <Box sx={{ bgcolor: NAV, px: 2, py: 1.5, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <FolderOpen sx={{ color: '#93C5FD', fontSize: 20 }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                Bibliothèque
              </Typography>
              {persistentCount > 0 && (
                <Chip label={`${persistentCount} mémorisé${persistentCount > 1 ? 's' : ''}`}
                  size="small"
                  sx={{ bgcolor: ACT, color: '#fff', fontSize: 10, fontWeight: 700, height: 18 }} />
              )}
            </Stack>
            <IconButton size="small" onClick={() => setDrawerOpen(false)} sx={{ color: '#93C5FD' }}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Box>

        {/* Bouton upload — label htmlFor pour ouvrir le sélecteur nativement */}
        <Box sx={{ p: 2, flexShrink: 0 }}>
          <label htmlFor="ia-file-input" style={{ display: 'block', cursor: 'pointer' }}>
            <Paper
              elevation={0}
              component="span"
              sx={{
                display: 'block',
                border: '2px dashed #CBD5E1', borderRadius: '10px',
                p: 2, textAlign: 'center',
                '&:hover': { borderColor: ACT, bgcolor: '#FFF7ED' },
                transition: 'all .15s',
              }}
            >
              <AddPhotoAlternate sx={{ fontSize: 28, color: '#94A3B8', mb: 0.5 }} />
              <Typography sx={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>
                Cliquer pour choisir un fichier
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8', mt: 0.3 }}>
                PDF, image, texte, CSV — max 5 Mo
              </Typography>
            </Paper>
          </label>
          {uploading && <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />}
          {uploadError && (
            <Alert severity="error" onClose={() => setUploadError(null)} sx={{ mt: 1, py: 0.5, fontSize: 12 }}>
              {uploadError}
            </Alert>
          )}
        </Box>

        <Divider />

        {/* Liste des fichiers */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {filesLoading && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {!filesLoading && files.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>
                Aucun fichier. Uploadez un document pour l'analyser ou le mémoriser.
              </Typography>
            </Box>
          )}

          {/* Section fichiers mémorisés */}
          {files.some(f => f.is_persistent) && (
            <>
              <Box sx={{ px: 2, py: 0.75, bgcolor: '#FFF7ED' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: ACT, textTransform: 'uppercase', letterSpacing: .5 }}>
                  Mémoire
                </Typography>
              </Box>
              <List dense disablePadding>
                {files.filter(f => f.is_persistent).map(file => (
                  <FileListItem key={file.id} file={file}
                    isAttached={attachment?.id === file.id}
                    onAttach={() => { setAttachment(file); setDrawerOpen(false); }}
                    onToggle={() => handleTogglePersistent(file)}
                    onDelete={() => handleDeleteFile(file)}
                  />
                ))}
              </List>
              <Divider />
            </>
          )}

          {/* Section fichiers récents */}
          {files.some(f => !f.is_persistent) && (
            <>
              <Box sx={{ px: 2, py: 0.75, bgcolor: '#F8FAFC' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: .5 }}>
                  Récents
                </Typography>
              </Box>
              <List dense disablePadding>
                {files.filter(f => !f.is_persistent).map(file => (
                  <FileListItem key={file.id} file={file}
                    isAttached={attachment?.id === file.id}
                    onAttach={() => { setAttachment(file); setDrawerOpen(false); }}
                    onToggle={() => handleTogglePersistent(file)}
                    onDelete={() => handleDeleteFile(file)}
                  />
                ))}
              </List>
            </>
          )}
        </Box>

        {/* Légende */}
        <Box sx={{ p: 2, borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Bookmark sx={{ fontSize: 14, color: ACT }} />
              <Typography sx={{ fontSize: 11, color: '#64748B' }}>Mémoriser = disponible dans toutes les conversations</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AttachFile sx={{ fontSize: 14, color: NAV }} />
              <Typography sx={{ fontSize: 11, color: '#64748B' }}>Joindre = analyser dans ce message</Typography>
            </Stack>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
}

// ── Sous-composant : item de fichier ──────────────────────────────────────────

function FileListItem({ file, isAttached, onAttach, onToggle, onDelete }: {
  file:       IAFile;
  isAttached: boolean;
  onAttach:   () => void;
  onToggle:   () => void;
  onDelete:   () => void;
}) {
  return (
    <ListItem
      sx={{
        px: 2, py: 0.75,
        bgcolor: isAttached ? '#EEF2FF' : 'transparent',
        '&:hover': { bgcolor: isAttached ? '#E0E7FF' : '#F8FAFC' },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <FileTypeIcon type={file.type_label} />
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
            {file.filename}
          </Typography>
        }
        secondary={
          <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
            {formatSize(file.size_kb)} · {file.type_label}
          </Typography>
        }
      />
      <ListItemSecondaryAction>
        <Stack direction="row" spacing={0}>
          <Tooltip title={isAttached ? 'Joindre (déjà attaché)' : 'Joindre à ce message'}>
            <IconButton size="small" onClick={onAttach}
              sx={{ color: isAttached ? '#3730A3' : '#94A3B8', '&:hover': { color: '#3730A3' } }}>
              <AttachFile sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={file.is_persistent ? 'Retirer de la mémoire' : 'Mémoriser'}>
            <IconButton size="small" onClick={onToggle}
              sx={{ color: file.is_persistent ? ACT : '#94A3B8', '&:hover': { color: ACT } }}>
              {file.is_persistent ? <Bookmark sx={{ fontSize: 15 }} /> : <BookmarkBorder sx={{ fontSize: 15 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton size="small" onClick={onDelete}
              sx={{ color: '#94A3B8', '&:hover': { color: '#DC2626' } }}>
              <DeleteOutline sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </ListItemSecondaryAction>
    </ListItem>
  );
}
