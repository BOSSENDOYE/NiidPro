import { useState, useRef, useEffect } from 'react';
import {
  Box, IconButton, Paper, Stack, Typography, TextField,
  Avatar, CircularProgress, Tooltip, Fade, Badge,
} from '@mui/material';
import { SmartToy, Close, Send, Delete, Person, Remove } from '@mui/icons-material';
import { agentIAApi } from '../../api/agentIA';
import { useAuthStore } from '../../store/auth.store';

const NAV = '#0D2137';
const ACT = '#E85D04';

interface Message {
  id:       number;
  role:     'user' | 'assistant';
  content:  string;
  loading?: boolean;
  error?:   boolean;
}

export default function ChatbotWidget() {
  const { hasRole } = useAuthStore();

  // Visible pour tous les rôles authentifiés
  const canAccess =
    hasRole('super_admin') ||
    hasRole('admin_rh')    ||
    hasRole('manager')     ||
    hasRole('employe');

  const [open,      setOpen]      = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [busy,      setBusy]      = useState(false);
  const [unread,    setUnread]    = useState(0);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const nextId                    = useRef(1);

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  if (!canAccess) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    setInput('');
    setBusy(true);

    const userMsg: Message = { id: nextId.current++, role: 'user',      content: text };
    const botMsg:  Message = { id: nextId.current++, role: 'assistant', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, botMsg]);

    try {
      const { reply } = await agentIAApi.chat(text);
      setMessages(prev =>
        prev.map(m => m.id === botMsg.id ? { ...m, content: reply, loading: false } : m),
      );
      if (!open) setUnread(u => u + 1);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Erreur. Veuillez réessayer.';
      setMessages(prev =>
        prev.map(m => m.id === botMsg.id ? { ...m, content: msg, loading: false, error: true } : m),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* ── Panel chat ── */}
      <Fade in={open}>
        <Paper elevation={8} sx={{
          position: 'fixed', bottom: 80, right: 24, zIndex: 1400,
          width: 360, height: minimized ? 0 : 500,
          overflow: 'hidden',
          borderRadius: '16px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          transition: 'height 0.25s ease',
        }}>

          {/* Header */}
          <Box sx={{ bgcolor: NAV, px: 2, py: 1.2, flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Avatar sx={{ bgcolor: ACT, width: 28, height: 28 }}>
                  <SmartToy sx={{ fontSize: 15 }} />
                </Avatar>
                <Box>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
                    Assistant RH
                  </Typography>
                  <Typography sx={{ color: '#93C5FD', fontSize: 10.5 }}>
                    Propulsé par Claude
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.3}>
                {messages.length > 0 && (
                  <Tooltip title="Effacer la conversation">
                    <IconButton size="small" onClick={() => setMessages([])} sx={{ color: '#93C5FD' }}>
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Réduire">
                  <IconButton size="small" onClick={() => setMinimized(m => !m)} sx={{ color: '#93C5FD' }}>
                    <Remove sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Fermer">
                  <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#93C5FD' }}>
                    <Close sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>

          {/* Messages */}
          <Box sx={{
            flex: 1, overflowY: 'auto', p: 1.5,
            bgcolor: '#F8FAFC',
            display: 'flex', flexDirection: 'column', gap: 1,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 2 },
          }}>
            {messages.length === 0 && (
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <SmartToy sx={{ fontSize: 36, color: '#CBD5E1', mb: 1 }} />
                <Typography sx={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>
                  Bonjour ! Je suis votre assistant RH.
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#CBD5E1', mt: 0.5 }}>
                  Posez-moi une question sur les congés,{'\n'}les agents, les contrats…
                </Typography>
              </Box>
            )}

            {messages.map(msg => (
              <Stack
                key={msg.id}
                direction="row"
                spacing={0.75}
                alignItems="flex-end"
                sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}
              >
                {msg.role === 'assistant' && (
                  <Avatar sx={{ bgcolor: NAV, width: 22, height: 22, mb: 0.3, flexShrink: 0 }}>
                    <SmartToy sx={{ fontSize: 12 }} />
                  </Avatar>
                )}
                <Box sx={{
                  px: 1.5, py: 0.9,
                  bgcolor: msg.role === 'user'
                    ? NAV : msg.error ? '#FEF2F2' : '#fff',
                  color: msg.role === 'user' ? '#fff'
                    : msg.error ? '#991B1B' : '#0F172A',
                  borderRadius: msg.role === 'user'
                    ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                  border: msg.role === 'assistant' && !msg.error
                    ? '1px solid #E2E8F0' : 'none',
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.loading ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <CircularProgress size={11} sx={{ color: '#94A3B8' }} />
                      <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>…</Typography>
                    </Stack>
                  ) : msg.content}
                </Box>
                {msg.role === 'user' && (
                  <Avatar sx={{ bgcolor: ACT, width: 22, height: 22, mb: 0.3, flexShrink: 0 }}>
                    <Person sx={{ fontSize: 12 }} />
                  </Avatar>
                )}
              </Stack>
            ))}
            <div ref={bottomRef} />
          </Box>

          {/* Zone saisie */}
          <Box sx={{ px: 1.5, py: 1, bgcolor: '#fff', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="flex-end">
              <TextField
                fullWidth multiline maxRows={3} size="small"
                placeholder="Votre question…"
                disabled={busy}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 13 },
                  '& .MuiOutlinedInput-input': { py: 0.75 },
                }}
              />
              <IconButton
                size="small"
                disabled={!input.trim() || busy}
                onClick={send}
                sx={{
                  bgcolor: NAV, color: '#fff',
                  width: 34, height: 34, borderRadius: '8px', flexShrink: 0,
                  '&:hover': { bgcolor: '#1a3a5c' },
                  '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' },
                }}
              >
                {busy
                  ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                  : <Send sx={{ fontSize: 15 }} />
                }
              </IconButton>
            </Stack>
          </Box>
        </Paper>
      </Fade>

      {/* ── Bouton flottant ── */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1400 }}>
        <Tooltip title={open ? "Fermer l'assistant" : 'Assistant IA'} placement="left">
          <Badge badgeContent={unread} color="error" overlap="circular">
            <IconButton
              onClick={() => { setOpen(o => !o); setMinimized(false); setUnread(0); }}
              sx={{
                bgcolor: open ? '#475569' : NAV,
                color: '#fff',
                width: 52, height: 52,
                borderRadius: '50%',
                boxShadow: '0 4px 20px rgba(13,33,55,0.45)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: open ? '#334155' : '#1a3a5c',
                  transform: 'scale(1.08)',
                  boxShadow: '0 6px 24px rgba(13,33,55,0.55)',
                },
              }}
            >
              {open
                ? <Close sx={{ fontSize: 22 }} />
                : <SmartToy sx={{ fontSize: 24 }} />
              }
            </IconButton>
          </Badge>
        </Tooltip>
      </Box>
    </>
  );
}
