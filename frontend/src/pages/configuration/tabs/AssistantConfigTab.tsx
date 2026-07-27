import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider,
  FormControlLabel, InputAdornment, MenuItem, Slider,
  Stack, Switch, TextField, Typography,
} from '@mui/material';
import { CheckCircle, Error, Key, Psychology, Save, Wifi } from '@mui/icons-material';
import { assistantApi } from '../../../api/assistant';

const NAV = '#0D2137';

const CLAUDE_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — Rapide & économique' },
  { value: 'claude-sonnet-5',           label: 'Claude Sonnet 5 — Équilibré' },
  { value: 'claude-opus-4-8',           label: 'Claude Opus 4.8 — Le plus puissant' },
];

export default function AssistantConfigTab() {
  const qc = useQueryClient();

  const { data: cfg, isLoading } = useQuery({
    queryKey: ['assistant-config'],
    queryFn:  assistantApi.getConfig,
  });

  const [apiKey,       setApiKey]       = useState('');
  const [model,        setModel]        = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [maxTokens,    setMaxTokens]    = useState<number>(1024);
  const [temperature,  setTemperature]  = useState<number>(0.7);
  const [isActive,     setIsActive]     = useState(false);
  const [initialized,  setInitialized]  = useState(false);
  const [testResult,   setTestResult]   = useState<{ ok: boolean; message: string } | null>(null);
  const [saveSuccess,  setSaveSuccess]  = useState(false);

  // Initialiser les valeurs depuis la config
  if (cfg && !initialized) {
    setModel(cfg.model);
    setSystemPrompt(cfg.system_prompt);
    setMaxTokens(cfg.max_tokens);
    setTemperature(cfg.temperature);
    setIsActive(cfg.is_active);
    setInitialized(true);
  }

  const saveMut = useMutation({
    mutationFn: () => assistantApi.updateConfig({
      model,
      system_prompt: systemPrompt,
      max_tokens:    maxTokens,
      temperature,
      is_active:     isActive,
      ...(apiKey ? { api_key: apiKey } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant-config'] });
      setApiKey('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const testMut = useMutation({
    mutationFn: assistantApi.test,
    onSuccess: (d) => setTestResult(d),
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setTestResult({ ok: false, message: e.response?.data?.message ?? 'Erreur.' }),
  });

  if (isLoading) return <Box sx={{ p: 3 }}><CircularProgress size={24} /></Box>;

  return (
    <Box sx={{ maxWidth: 680 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Psychology sx={{ color: NAV, fontSize: 26 }} />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: NAV }}>
            Configuration de l'Assistant IA
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748B' }}>
            Paramétrez le chatbot IA accessible aux administrateurs RH
          </Typography>
        </Box>
      </Stack>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>Configuration sauvegardée avec succès.</Alert>
      )}
      {saveMut.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(saveMut.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur lors de la sauvegarde.'}
        </Alert>
      )}

      {/* ── Activation ── */}
      <Paper_section title="Activation">
        <FormControlLabel
          control={
            <Switch
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16A34A' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#16A34A' } }}
            />
          }
          label={
            <Stack>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                Assistant activé
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                Si désactivé, l'interface chat affiche un message d'indisponibilité
              </Typography>
            </Stack>
          }
        />
      </Paper_section>

      {/* ── Clé API ── */}
      <Paper_section title="Clé API">
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 13, color: '#475569' }}>État :</Typography>
          {cfg?.has_api_key
            ? <Chip icon={<Key sx={{ fontSize: 14 }} />} label="Clé configurée" size="small"
                sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 700 }} />
            : <Chip label="Aucune clé" size="small"
                sx={{ bgcolor: '#FEF9C3', color: '#854D0E', fontWeight: 700 }} />
          }
        </Stack>
        <TextField
          fullWidth size="small" type="password"
          label={cfg?.has_api_key ? 'Nouvelle clé API (laisser vide pour conserver)' : 'Clé API Anthropic *'}
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-ant-api03-..."
          InputProps={{ startAdornment: <InputAdornment position="start"><Key sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
          helperText="Votre clé API Anthropic. Elle est chiffrée avant d'être stockée."
        />
      </Paper_section>

      {/* ── Modèle ── */}
      <Paper_section title="Modèle">
        <TextField
          select fullWidth size="small" label="Modèle Claude"
          value={model}
          onChange={e => setModel(e.target.value)}
        >
          {CLAUDE_MODELS.map(m => (
            <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
          ))}
        </TextField>
      </Paper_section>

      {/* ── System Prompt ── */}
      <Paper_section title="Prompt système">
        <TextField
          fullWidth multiline minRows={4} size="small"
          label="Instructions pour l'assistant"
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          helperText="Ce texte est envoyé à chaque conversation pour définir le comportement de l'assistant."
        />
      </Paper_section>

      {/* ── Paramètres avancés ── */}
      <Paper_section title="Paramètres avancés">
        <Stack spacing={3}>
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Tokens maximum</Typography>
              <Chip label={`${maxTokens} tokens`} size="small"
                sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 700 }} />
            </Stack>
            <Slider
              value={maxTokens} min={256} max={4096} step={128}
              onChange={(_, v) => setMaxTokens(v as number)}
              marks={[{ value: 256, label: '256' }, { value: 2048, label: '2048' }, { value: 4096, label: '4096' }]}
              sx={{ color: NAV }}
            />
            <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>
              Longueur maximale de la réponse. Haiku fonctionne bien avec 1024.
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Température</Typography>
              <Chip label={temperature.toFixed(1)} size="small"
                sx={{ bgcolor: '#FFF7ED', color: ACT, fontWeight: 700 }} />
            </Stack>
            <Slider
              value={temperature} min={0} max={1} step={0.1}
              onChange={(_, v) => setTemperature(v as number)}
              marks={[{ value: 0, label: '0 — Précis' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1 — Créatif' }]}
              sx={{ color: NAV }}
            />
          </Box>
        </Stack>
      </Paper_section>

      {/* ── Actions ── */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Button
          variant="contained" size="small"
          startIcon={saveMut.isPending ? <CircularProgress size={14} color="inherit" /> : <Save />}
          disabled={saveMut.isPending}
          onClick={() => saveMut.mutate()}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#1a3a5c' } }}
        >
          Sauvegarder
        </Button>

        <Button
          variant="outlined" size="small"
          startIcon={testMut.isPending ? <CircularProgress size={14} /> : <Wifi />}
          disabled={testMut.isPending || !cfg?.has_api_key}
          onClick={() => { setTestResult(null); testMut.mutate(); }}
          sx={{ borderColor: NAV, color: NAV }}
        >
          Tester la connexion
        </Button>
      </Stack>

      {testResult && (
        <Alert
          severity={testResult.ok ? 'success' : 'error'}
          icon={testResult.ok ? <CheckCircle /> : <Error />}
          sx={{ mt: 2 }}
          onClose={() => setTestResult(null)}
        >
          {testResult.message}
        </Alert>
      )}
    </Box>
  );
}

// ── Section card helper ───────────────────────────────────────────────────────
const ACT = '#E85D04';

function Paper_section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2.5, p: 2.5, bgcolor: '#fff', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', mb: 1.5, letterSpacing: 0.5 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Box>
  );
}
