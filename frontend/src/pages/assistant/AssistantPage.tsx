import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, TextField, IconButton, Paper, Stack,
  Avatar, CircularProgress, Alert, Chip, Tooltip, LinearProgress,
} from '@mui/material';
import {
  Send, Delete, SmartToy, Person, Lock,
  AttachFile, PictureAsPdf, Image, Article, Close,
} from '@mui/icons-material';
import { assistantApi, type ChatMessage, type UploadedFile } from '../../api/assistant';
import { useAuthStore } from '../../store/auth.store';

const NAV = '#0D2137';
const ACT = '#E85D04';

interface Message extends ChatMessage {
  id:       number;
  loading?: boolean;
  error?:   boolean;
}

export default function AssistantPage() {
  const { hasRole } = useAuthStore();
  const canAccess   = hasRole('super_admin') || hasRole('admin_rh');

  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState('');
  const [busy,         setBusy]         = useState(false);
  const [attachment,   setAttachment]   = useState<UploadedFile | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState<string | null>(null);
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const bottomRef                       = useRef<HTMLDivElement>(null);
  let   nextId                          = useRef(1);

  const { data: cfg, isLoading: cfgLoading } = useQuery({
    queryKey: ['assistant-config'],
    queryFn:  assistantApi.getConfig,
    enabled:  canAccess,
  });

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!canAccess) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Stack alignItems="center" spacing={2}>
          <Lock sx={{ fontSize: 48, color: '#CBD5E1' }} />
          <Typography sx={{ color: '#64748B', fontSize: 15 }}>
            Accès réservé aux administrateurs RH
          </Typography>
        </Stack>
      </Box>
    );
  }

  const history: ChatMessage[] = messages
    .filter(m => !m.loading && !m.error)
    .map(({ role, content }) => ({ role, content }));

  // ── Upload fichier ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await assistantApi.upload(file);
      setAttachment(uploaded);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Erreur lors de l\'upload.';
      setUploadError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const fileToSend = attachment;
    setInput('');
    setAttachment(null);
    setBusy(true);

    // Label du fichier pour affichage dans la bulle
    const fileLabel = fileToSend ? ` [📎 ${fileToSend.filename}]` : '';
    const userMsg: Message = {
      id: nextId.current++, role: 'user',
      content: text + fileLabel,
    };
    const loadingMsg: Message = { id: nextId.current++, role: 'assistant', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);

    try {
      const { reply } = await assistantApi.chat(text, history, fileToSend ?? undefined);
      setMessages(prev =>
        prev.map(m => m.id === loadingMsg.id ? { ...m, content: reply, loading: false } : m)
      );
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Une erreur est survenue.';
      setMessages(prev =>
        prev.map(m => m.id === loadingMsg.id
          ? { ...m, content: msg, loading: false, error: true }
          : m
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const clearConversation = () => { setMessages([]); setAttachment(null); };

  const fileIcon = (type?: string) => {
    if (type === 'image')    return <Image sx={{ fontSize: 14 }} />;
    if (type === 'document') return <PictureAsPdf sx={{ fontSize: 14 }} />;
    return <Article sx={{ fontSize: 14 }} />;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>

      {/* ── En-tête ── */}
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
                  ? `Modèle : ${cfg.model}`
                  : 'Non configuré — allez dans Paramètres → Assistant IA'
                }
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            {cfg?.is_active && (
              <Chip label="Actif" size="small"
                sx={{ bgcolor: '#166534', color: '#fff', fontSize: 11, fontWeight: 700 }} />
            )}
            {messages.length > 0 && (
              <Tooltip title="Effacer la conversation">
                <IconButton size="small" onClick={clearConversation} sx={{ color: '#93C5FD' }}>
                  <Delete sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* ── Zone de messages ── */}
      <Box sx={{
        flex: 1, overflowY: 'auto', px: 3, py: 2,
        bgcolor: '#F8FAFC',
        display: 'flex', flexDirection: 'column', gap: 1.5,
      }}>

        {/* Message de bienvenue */}
        {messages.length === 0 && !cfgLoading && (
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Avatar sx={{ bgcolor: NAV, width: 56, height: 56, mx: 'auto', mb: 2 }}>
              <SmartToy sx={{ fontSize: 30 }} />
            </Avatar>
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: NAV }}>
              Bonjour, comment puis-je vous aider ?
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: 13, mt: 0.5, maxWidth: 420, mx: 'auto' }}>
              Je suis votre assistant RH. Posez-moi vos questions sur les effectifs,
              congés, absences, formations ou la paie.
            </Typography>
            {!cfg?.is_active && (
              <Alert severity="warning" sx={{ mt: 3, maxWidth: 420, mx: 'auto', fontSize: 12.5 }}>
                L'assistant n'est pas encore activé. Configurez la clé API dans{' '}
                <strong>Configuration → Assistant IA</strong>.
              </Alert>
            )}

            {/* Suggestions */}
            {cfg?.is_active && (
              <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" sx={{ mt: 3 }}>
                {[
                  'Combien d\'agents sont en congé ce mois ?',
                  'Quelles formations sont prévues ?',
                  'Aide-moi à rédiger un rapport RH',
                  'Qu\'est-ce qu\'un rapport de jouissance ?',
                ].map(s => (
                  <Chip key={s} label={s} size="small" clickable
                    onClick={() => { setInput(s); }}
                    sx={{ fontSize: 12, bgcolor: '#fff', border: '1px solid #E2E8F0',
                          '&:hover': { bgcolor: '#EFF6FF', borderColor: '#93C5FD' } }} />
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <Stack
            key={msg.id}
            direction="row"
            spacing={1.2}
            alignItems="flex-start"
            sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}
          >
            {msg.role === 'assistant' && (
              <Avatar sx={{ bgcolor: NAV, width: 30, height: 30, mt: 0.3, flexShrink: 0 }}>
                <SmartToy sx={{ fontSize: 16 }} />
              </Avatar>
            )}
            <Paper elevation={0} sx={{
              px: 2, py: 1.2,
              bgcolor: msg.role === 'user'
                ? NAV
                : msg.error ? '#FEF2F2' : '#fff',
              color: msg.role === 'user' ? '#fff' : msg.error ? '#991B1B' : '#0F172A',
              borderRadius: msg.role === 'user'
                ? '16px 16px 4px 16px'
                : '16px 16px 16px 4px',
              border: msg.role === 'assistant' && !msg.error ? '1px solid #E2E8F0' : 'none',
            }}>
              {msg.loading ? (
                <Stack direction="row" spacing={0.8} alignItems="center">
                  <CircularProgress size={13} sx={{ color: '#94A3B8' }} />
                  <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>En train de réfléchir…</Typography>
                </Stack>
              ) : (
                <Typography sx={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Typography>
              )}
            </Paper>
            {msg.role === 'user' && (
              <Avatar sx={{ bgcolor: ACT, width: 30, height: 30, mt: 0.3, flexShrink: 0 }}>
                <Person sx={{ fontSize: 16 }} />
              </Avatar>
            )}
          </Stack>
        ))}

        <div ref={bottomRef} />
      </Box>

      {/* ── Input ── */}
      <Box sx={{
        px: 2, py: 1.5, bgcolor: '#fff',
        borderTop: '1px solid #E2E8F0',
        borderRadius: '0 0 12px 12px',
        flexShrink: 0,
      }}>
        {/* Input file caché */}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt,.csv"
          onChange={handleFileChange}
        />

        {/* Erreur upload */}
        {uploadError && (
          <Alert severity="error" onClose={() => setUploadError(null)} sx={{ mb: 1, py: 0.5, fontSize: 12 }}>
            {uploadError}
          </Alert>
        )}

        {/* Barre de progression upload */}
        {uploading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

        {/* Chip fichier attaché */}
        {attachment && (
          <Box sx={{ mb: 1 }}>
            <Chip
              icon={fileIcon(attachment.type)}
              label={`${attachment.filename} (${attachment.size_kb} Ko)`}
              size="small"
              onDelete={() => setAttachment(null)}
              deleteIcon={<Close sx={{ fontSize: 14 }} />}
              sx={{
                bgcolor: attachment.type === 'image'    ? '#EFF6FF' :
                         attachment.type === 'document' ? '#FEF2F2' : '#F0FDF4',
                color:   attachment.type === 'image'    ? '#2563EB' :
                         attachment.type === 'document' ? '#DC2626' : '#16A34A',
                fontWeight: 600, fontSize: 12, maxWidth: '100%',
                '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.7 },
              }}
            />
          </Box>
        )}

        <Stack direction="row" spacing={1} alignItems="flex-end">
          {/* Bouton attacher fichier */}
          <Tooltip title="Joindre un fichier (PDF, image, Word, TXT)">
            <span>
              <IconButton
                size="small"
                disabled={!cfg?.is_active || busy || uploading}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  color: attachment ? ACT : '#94A3B8',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  width: 40, height: 40,
                  flexShrink: 0,
                  '&:hover': { bgcolor: '#F8FAFC', color: ACT },
                }}
              >
                <AttachFile sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>

          <TextField
            fullWidth multiline maxRows={4} size="small"
            placeholder={cfg?.is_active ? 'Écrivez votre message…' : 'Assistant non configuré'}
            disabled={!cfg?.is_active || busy}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13.5 } }}
          />
          <IconButton
            onClick={send}
            disabled={!input.trim() || !cfg?.is_active || busy}
            sx={{
              bgcolor: NAV, color: '#fff', width: 40, height: 40, borderRadius: '10px',
              flexShrink: 0,
              '&:hover': { bgcolor: '#1a3a5c' },
              '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' },
            }}
          >
            {busy
              ? <CircularProgress size={18} sx={{ color: '#fff' }} />
              : <Send sx={{ fontSize: 18 }} />
            }
          </IconButton>
        </Stack>
        <Typography sx={{ fontSize: 11, color: '#94A3B8', mt: 0.5, textAlign: 'center' }}>
          Entrée pour envoyer · Maj+Entrée pour nouvelle ligne · PDF, image, Word, TXT supportés
        </Typography>
      </Box>
    </Box>
  );
}
