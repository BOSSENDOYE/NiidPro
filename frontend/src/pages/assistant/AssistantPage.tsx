import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, TextField, IconButton, Paper, Stack,
  Avatar, CircularProgress, Alert, Chip, Tooltip,
} from '@mui/material';
import { Send, Delete, SmartToy, Person } from '@mui/icons-material';
import { agentIAApi } from '../../api/agentIA';
import { assistantApi } from '../../api/assistant';

const NAV = '#0D2137';
const ACT = '#E85D04';

interface Message {
  id:       number;
  role:     'user' | 'assistant';
  content:  string;
  loading?: boolean;
  error?:   boolean;
}

const SUGGESTIONS = [
  'Combien d\'agents sont en poste actuellement ?',
  'Quels agents sont en congé ce mois ?',
  'Donne-moi les statistiques RH globales',
  'Qui a eu des avancements cette année ?',
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const nextId                  = useRef(1);

  const { data: cfg, isLoading: cfgLoading } = useQuery({
    queryKey: ['assistant-config'],
    queryFn:  assistantApi.getConfig,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    setInput('');
    setBusy(true);

    const userMsg:    Message = { id: nextId.current++, role: 'user',      content: text };
    const loadingMsg: Message = { id: nextId.current++, role: 'assistant', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);

    try {
      const { reply } = await agentIAApi.chat(text);
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
    try { await agentIAApi.clearHistory(); } catch { /* silencieux */ }
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>

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
                  ? `Modèle : ${cfg.model} · Accès DB en temps réel`
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
              <Tooltip title="Nouvelle conversation">
                <IconButton size="small" onClick={clearConversation} sx={{ color: '#93C5FD' }}>
                  <Delete sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Zone de messages */}
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
            <Typography sx={{ color: '#64748B', fontSize: 13, mt: 0.5, maxWidth: 420, mx: 'auto' }}>
              Je suis votre assistant RH connecté à la base de données en temps réel.
              Posez-moi vos questions sur les effectifs, congés, paie, formations ou carrières.
            </Typography>

            {!cfg?.is_active && (
              <Alert severity="warning" sx={{ mt: 3, maxWidth: 420, mx: 'auto', fontSize: 12.5 }}>
                L'assistant n'est pas encore activé. Configurez la clé API dans{' '}
                <strong>Configuration → Assistant IA</strong>.
              </Alert>
            )}

            {cfg?.is_active && (
              <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" sx={{ mt: 3 }}>
                {SUGGESTIONS.map(s => (
                  <Chip key={s} label={s} size="small" clickable
                    onClick={() => setInput(s)}
                    sx={{ fontSize: 12, bgcolor: '#fff', border: '1px solid #E2E8F0',
                          '&:hover': { bgcolor: '#EFF6FF', borderColor: '#93C5FD' } }} />
                ))}
              </Stack>
            )}
          </Box>
        )}

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
                  {renderContent(msg.content)}
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

      {/* Input */}
      <Box sx={{
        px: 2, py: 1.5, bgcolor: '#fff',
        borderTop: '1px solid #E2E8F0',
        borderRadius: '0 0 12px 12px',
        flexShrink: 0,
      }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            fullWidth multiline maxRows={4} size="small"
            placeholder={cfg?.is_active ? 'Posez votre question RH…' : 'Assistant non configuré'}
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
          Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
        </Typography>
      </Box>
    </Box>
  );
}
