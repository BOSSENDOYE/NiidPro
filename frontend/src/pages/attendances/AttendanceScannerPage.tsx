import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Avatar, Chip, IconButton, Button,
  TextField, InputAdornment, Tooltip, Divider,
} from '@mui/material';
import {
  QrCodeScanner, Login, Logout, CheckCircle, Cancel,
  CameraAlt, CameraAltOutlined, Keyboard, ArrowBack,
  Wifi,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { attendancesApi } from '../../api/attendances';
import type { Attendance } from '../../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Extract employee_number from raw QR value (JSON or plain string) */
function parseQRValue(raw: string): string | null {
  const trimmed = raw.trim();
  try {
    const obj = JSON.parse(trimmed);
    // Format: {"app":"NIIDPRO","id":1,"num":"EMP0001"}
    if (obj.num)             return String(obj.num);
    if (obj.employee_number) return String(obj.employee_number);
    if (obj.matricule)       return String(obj.matricule);
  } catch { /* not JSON */ }
  // Plain employee number (e.g. "EMP0001")
  if (trimmed.length >= 3) return trimmed.toUpperCase();
  return null;
}

interface ScanRecord {
  id:        string;
  empNum:    string;
  empName:   string;
  empDept?:  string;
  action:    'in' | 'out';
  time:      string;
  status:    'success' | 'error';
  msg:       string;
}

const MODE_CFG = {
  in:  { label: 'ENTRÉE',  color: '#059669', bg: '#ECFDF5', border: '#059669', Icon: Login  },
  out: { label: 'SORTIE',  color: '#DC2626', bg: '#FEF2F2', border: '#DC2626', Icon: Logout },
};

// ─── Camera scanner hook ──────────────────────────────────────────────────────
function useCameraScanner(onDetected: (raw: string) => void, active: boolean) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number>(0);
  const lastScanRef = useRef<number>(0);
  const [supported, setSupported]   = useState<boolean | null>(null);
  const [cameraOn,  setCameraOn]    = useState(false);
  const [error,     setError]       = useState<string>('');

  useEffect(() => {
    setSupported('BarcodeDetector' in window && 'mediaDevices' in navigator);
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);

      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const now = Date.now();
        if (now - lastScanRef.current > 1800) {
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              lastScanRef.current = now;
              onDetected(codes[0].rawValue);
            }
          } catch { /* ignore */ }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e: unknown) {
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions du navigateur.');
      setCameraOn(false);
    }
  }, [onDetected]);

  useEffect(() => {
    if (!active) stopCamera();
    return () => stopCamera();
  }, [active, stopCamera]);

  return { videoRef, supported, cameraOn, error, startCamera, stopCamera };
}

// ─── Keyboard wedge hook ──────────────────────────────────────────────────────
function useKeyboardWedge(onDetected: (raw: string) => void, active: boolean) {
  const bufferRef     = useRef('');
  const lastKeyRef    = useRef(Date.now());
  const timerRef      = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input/textarea (manual mode)
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const now = Date.now();
      const gap = now - lastKeyRef.current;
      lastKeyRef.current = now;

      if (e.key === 'Enter') {
        const val = bufferRef.current.trim();
        bufferRef.current = '';
        clearTimeout(timerRef.current);
        if (val.length >= 3) onDetected(val);
        return;
      }

      // Hardware scanners type extremely fast (< 30ms gap)
      if (gap > 100) bufferRef.current = ''; // reset on human-speed gap

      if (e.key.length === 1) bufferRef.current += e.key;

      // Auto-flush after 200ms without Enter
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const val = bufferRef.current.trim();
        bufferRef.current = '';
        if (val.length >= 3) onDetected(val);
      }, 200);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timerRef.current);
    };
  }, [active, onDetected]);
}

// ─── Feedback overlay ─────────────────────────────────────────────────────────
function FeedbackOverlay({ record, onDone }: { record: ScanRecord | null; onDone: () => void }) {
  useEffect(() => {
    if (!record) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [record, onDone]);

  if (!record) return null;

  const isOk = record.status === 'success';
  const modeCfg = MODE_CFG[record.action];
  const initials = record.empName
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: isOk ? `${modeCfg.color}CC` : '#DC2626CC',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.2s ease',
      '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
    }}>
      <Box sx={{
        bgcolor: '#fff', borderRadius: '24px', p: 5,
        textAlign: 'center', minWidth: 340, maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        animation: 'popIn 0.25s cubic-bezier(.34,1.56,.64,1)',
        '@keyframes popIn': { from: { transform: 'scale(0.8)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
      }}>
        {isOk
          ? <CheckCircle sx={{ fontSize: 64, color: modeCfg.color, mb: 2 }} />
          : <Cancel sx={{ fontSize: 64, color: '#DC2626', mb: 2 }} />
        }
        {isOk && (
          <Avatar sx={{ width: 80, height: 80, fontSize: 28, fontWeight: 800, bgcolor: modeCfg.color, mx: 'auto', mb: 2, boxShadow: `0 8px 24px ${modeCfg.color}50` }}>
            {initials}
          </Avatar>
        )}
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
          {isOk ? record.empName : 'Échec du badgeage'}
        </Typography>
        {isOk && record.empDept && (
          <Typography sx={{ fontSize: 14, color: '#64748B', mt: 0.5 }}>{record.empDept}</Typography>
        )}
        <Box sx={{
          mt: 2, px: 3, py: 1, borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: 1,
          bgcolor: isOk ? `${modeCfg.color}18` : '#FEF2F2',
        }}>
          {isOk ? <modeCfg.Icon sx={{ fontSize: 18, color: modeCfg.color }} /> : <Cancel sx={{ fontSize: 18, color: '#DC2626' }} />}
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: isOk ? modeCfg.color : '#DC2626' }}>
            {isOk ? `${modeCfg.label} · ${record.time}` : record.msg}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AttendanceScannerPage() {
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const [mode,        setMode]       = useState<'in' | 'out'>('in');
  const [inputMode,   setInputMode]  = useState<'camera' | 'keyboard' | 'manual'>('keyboard');
  const [manualNum,   setManualNum]  = useState('');
  const [log,         setLog]        = useState<ScanRecord[]>([]);
  const [feedback,    setFeedback]   = useState<ScanRecord | null>(null);
  const [pulseActive, setPulseActive] = useState(false);

  const modeCfg = MODE_CFG[mode];

  // Live today stats
  const { data: todayData } = useQuery({
    queryKey: ['attendances', 'today'],
    queryFn: () => attendancesApi.today().then((r) => r.data),
    refetchInterval: 15_000,
  });
  const stats = {
    present:  (todayData as any)?.present  ?? 0,
    late:     (todayData as any)?.late     ?? 0,
    absent:   (todayData as any)?.absent   ?? 0,
    total:    (todayData as any)?.total    ?? 0,
  };

  // Badge mutation
  const badgeMut = useMutation({
    mutationFn: ({ num, action }: { num: string; action: 'in' | 'out' }) =>
      attendancesApi.badge(num, action),
    onSuccess: (res) => {
      const att = res.data as Attendance & { employee?: { first_name: string; last_name: string; employee_number: string; department?: { name: string } } };
      const empName = att.employee ? `${att.employee.first_name} ${att.employee.last_name}` : att.employee?.employee_number ?? '—';
      const record: ScanRecord = {
        id:       String(Date.now()),
        empNum:   att.employee?.employee_number ?? '',
        empName,
        empDept:  att.employee?.department?.name,
        action:   mode,
        time:     dayjs().format('HH:mm'),
        status:   'success',
        msg:      mode === 'in' ? 'Entrée enregistrée' : 'Sortie enregistrée',
      };
      setLog((l) => [record, ...l].slice(0, 50));
      setFeedback(record);
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 500);
      qc.invalidateQueries({ queryKey: ['attendances', 'today'] });
      setManualNum('');
    },
    onError: (err: unknown, vars) => {
      const msg = (err as any)?.response?.data?.message ?? 'Erreur de badgeage';
      const record: ScanRecord = {
        id:      String(Date.now()),
        empNum:  vars.num,
        empName: vars.num,
        action:  mode,
        time:    dayjs().format('HH:mm'),
        status:  'error',
        msg,
      };
      setLog((l) => [record, ...l].slice(0, 50));
      setFeedback(record);
    },
  });

  const handleDetected = useCallback((raw: string) => {
    const num = parseQRValue(raw);
    if (num && !badgeMut.isPending) {
      badgeMut.mutate({ num, action: mode });
    }
  }, [badgeMut, mode]);

  const { videoRef, supported: camSupported, cameraOn, error: camError, startCamera, stopCamera } =
    useCameraScanner(handleDetected, inputMode === 'camera');

  useKeyboardWedge(handleDetected, inputMode === 'keyboard');

  const handleManualSubmit = () => {
    if (!manualNum.trim()) return;
    handleDetected(manualNum.trim());
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0B1120', color: '#F1F5F9', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1.75,
        bgcolor: '#060D1A', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Tooltip title="Retour au pointage">
          <IconButton size="small" onClick={() => navigate('/attendances')}
            sx={{ color: '#64748B', borderRadius: '8px', '&:hover': { color: '#F1F5F9', bgcolor: 'rgba(255,255,255,0.06)' } }}>
            <ArrowBack fontSize="small" />
          </IconButton>
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: '9px', background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
            <QrCodeScanner sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#F1F5F9', letterSpacing: '-0.2px' }}>
              Terminal de Badgeage QR
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: '#3D5068' }}>
              ANASER · {dayjs().format('dddd D MMMM YYYY')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Wifi sx={{ fontSize: 14, color: '#10B981' }} />
          <Typography sx={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>En ligne</Typography>
        </Box>
      </Box>

      {/* ── Main area ── */}
      <Box sx={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>

        {/* ── Left: Scanner ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, gap: 2.5 }}>

          {/* Mode toggle */}
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
            {(['in', 'out'] as const).map((m) => {
              const cfg = MODE_CFG[m];
              const active = mode === m;
              return (
                <Box key={m} onClick={() => setMode(m)} sx={{
                  flex: 1, maxWidth: 220, py: 2.5, borderRadius: '14px',
                  textAlign: 'center', cursor: 'pointer',
                  border: `2px solid ${active ? cfg.color : 'rgba(255,255,255,0.06)'}`,
                  bgcolor: active ? `${cfg.color}18` : 'rgba(255,255,255,0.03)',
                  transition: 'all 0.2s',
                  boxShadow: active ? `0 0 24px ${cfg.color}30` : 'none',
                }}>
                  <cfg.Icon sx={{ fontSize: 32, color: active ? cfg.color : '#3D5068', mb: 0.5 }} />
                  <Typography sx={{ fontSize: 16, fontWeight: 900, color: active ? cfg.color : '#3D5068', letterSpacing: '0.08em' }}>
                    {cfg.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Input mode tabs */}
          <Box sx={{ display: 'flex', gap: 0.75, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '10px', p: 0.5 }}>
            {[
              { key: 'keyboard', label: 'Lecteur QR', Icon: QrCodeScanner },
              { key: 'camera',   label: 'Caméra',     Icon: CameraAlt },
              { key: 'manual',   label: 'Manuel',     Icon: Keyboard },
            ].map(({ key, label, Icon }) => (
              <Box key={key} onClick={() => {
                if (key !== 'camera' && cameraOn) stopCamera();
                setInputMode(key as typeof inputMode);
              }} sx={{
                flex: 1, py: 0.75, borderRadius: '8px', textAlign: 'center',
                cursor: 'pointer',
                bgcolor: inputMode === key ? 'rgba(255,255,255,0.1)' : 'transparent',
                transition: 'background 0.15s',
              }}>
                <Icon sx={{ fontSize: 14, color: inputMode === key ? '#F1F5F9' : '#3D5068', verticalAlign: 'middle', mr: 0.5 }} />
                <Typography component="span" sx={{ fontSize: 12, fontWeight: inputMode === key ? 700 : 400, color: inputMode === key ? '#F1F5F9' : '#3D5068' }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Scanner zone */}
          <Box sx={{
            flex: 1, borderRadius: '16px',
            border: `2px solid ${pulseActive ? modeCfg.color : 'rgba(255,255,255,0.07)'}`,
            bgcolor: 'rgba(255,255,255,0.02)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, p: 3, minHeight: 280,
            transition: 'border-color 0.3s, box-shadow 0.3s',
            boxShadow: pulseActive ? `0 0 40px ${modeCfg.color}40` : 'none',
            position: 'relative', overflow: 'hidden',
          }}>

            {/* Camera mode */}
            {inputMode === 'camera' && (
              <>
                {!cameraOn
                  ? (
                    <Box sx={{ textAlign: 'center' }}>
                      {camError
                        ? <Typography sx={{ color: '#EF4444', fontSize: 13, mb: 2, maxWidth: 280 }}>{camError}</Typography>
                        : camSupported === false
                          ? <Typography sx={{ color: '#EF4444', fontSize: 13, mb: 2 }}>BarcodeDetector non supporté par ce navigateur.<br />Utilisez Chrome ou Edge récent.</Typography>
                          : <Typography sx={{ color: '#64748B', fontSize: 13, mb: 2 }}>Démarrez la caméra pour scanner les QR codes</Typography>
                      }
                      {camSupported !== false && (
                        <Button variant="outlined" startIcon={<CameraAltOutlined />} onClick={startCamera}
                          sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#F1F5F9', borderRadius: '10px', '&:hover': { borderColor: modeCfg.color, color: modeCfg.color } }}>
                          Activer la caméra
                        </Button>
                      )}
                    </Box>
                  )
                  : (
                    <Box sx={{ width: '100%', maxWidth: 420, position: 'relative' }}>
                      <video ref={videoRef} style={{ width: '100%', borderRadius: 12, display: 'block' }} playsInline muted />
                      {/* Scan corners */}
                      {['tl','tr','bl','br'].map((pos) => (
                        <Box key={pos} sx={{
                          position: 'absolute', width: 20, height: 20,
                          borderColor: modeCfg.color, borderStyle: 'solid',
                          borderWidth: pos.includes('t') ? '3px 0 0' : '0 0 3px',
                          borderRightWidth: pos.includes('r') ? 3 : 0,
                          borderLeftWidth:  pos.includes('l') ? 3 : 0,
                          top:    pos.includes('t') ? 8 : undefined,
                          bottom: pos.includes('b') ? 8 : undefined,
                          left:   pos.includes('l') ? 8 : undefined,
                          right:  pos.includes('r') ? 8 : undefined,
                        }} />
                      ))}
                      <Button size="small" onClick={stopCamera} sx={{ position: 'absolute', bottom: 8, right: 8, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', borderRadius: '8px', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, fontSize: 11, textTransform: 'none' }}>
                        Arrêter
                      </Button>
                    </Box>
                  )
                }
              </>
            )}

            {/* Keyboard wedge mode */}
            {inputMode === 'keyboard' && (
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{
                  width: 100, height: 100, borderRadius: '24px', mx: 'auto', mb: 2,
                  bgcolor: `${modeCfg.color}18`, border: `2px solid ${modeCfg.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: pulseActive ? 'pulse 0.5s ease' : 'none',
                  '@keyframes pulse': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' } },
                }}>
                  <QrCodeScanner sx={{ fontSize: 52, color: modeCfg.color }} />
                </Box>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', mb: 0.5 }}>
                  Prêt à scanner
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#3D5068', maxWidth: 260, mx: 'auto', lineHeight: 1.6 }}>
                  Passez le badge QR devant le lecteur.<br />
                  Mode : <strong style={{ color: modeCfg.color }}>{modeCfg.label}</strong>
                </Typography>
                <Box sx={{ mt: 2, px: 2, py: 0.75, borderRadius: '99px', bgcolor: 'rgba(255,255,255,0.05)', display: 'inline-block' }}>
                  <Typography sx={{ fontSize: 11, color: '#3D5068' }}>
                    Détection automatique du QR
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Manual mode */}
            {inputMode === 'manual' && (
              <Box sx={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
                <Keyboard sx={{ fontSize: 48, color: '#3D5068', mb: 2 }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', mb: 2 }}>
                  Saisie manuelle du matricule
                </Typography>
                <TextField
                  value={manualNum}
                  onChange={(e) => setManualNum(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  placeholder="Ex : EMP0001"
                  size="small"
                  fullWidth
                  autoFocus
                  inputProps={{ style: { textAlign: 'center', fontFamily: 'monospace', fontSize: 16, letterSpacing: '0.1em', fontWeight: 700 } }}
                  sx={{
                    mb: 1.5,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.06)',
                      color: '#F1F5F9',
                      borderRadius: '10px',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                      '&:hover fieldset': { borderColor: modeCfg.color },
                      '&.Mui-focused fieldset': { borderColor: modeCfg.color },
                    },
                  }}
                />
                <Button fullWidth variant="contained" onClick={handleManualSubmit}
                  disabled={!manualNum.trim() || badgeMut.isPending}
                  sx={{
                    bgcolor: modeCfg.color, borderRadius: '10px', fontWeight: 700, fontSize: 14, py: 1.25,
                    '&:hover': { bgcolor: modeCfg.color, filter: 'brightness(1.1)' },
                    boxShadow: `0 4px 16px ${modeCfg.color}50`,
                  }}>
                  {badgeMut.isPending ? 'En cours…' : `Valider ${modeCfg.label}`}
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Right: Log + stats ── */}
        <Box sx={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>

          {/* Stats mini */}
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#3D5068', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
              Aujourd'hui · {dayjs().format('DD/MM')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {[
                { label: 'Présents', value: stats.present, color: '#059669' },
                { label: 'Retards',  value: stats.late,    color: '#D97706' },
                { label: 'Absents',  value: stats.absent,  color: '#DC2626' },
                { label: 'Total',    value: stats.total,   color: '#94A3B8' },
              ].map((s) => (
                <Box key={s.label} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '8px', p: 1.25, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: 10, color: '#3D5068', mt: 0.25 }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Scan log */}
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#3D5068', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Derniers badgeages
              </Typography>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 } }}>
              {log.length === 0
                ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <QrCodeScanner sx={{ fontSize: 40, color: '#1E293B', mb: 1 }} />
                    <Typography sx={{ fontSize: 12, color: '#1E293B' }}>
                      Aucun badgeage enregistré
                    </Typography>
                  </Box>
                )
                : log.map((r) => {
                  const modC = MODE_CFG[r.action];
                  const init = r.empName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <Box key={r.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.25,
                      px: 2, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.03)',
                      bgcolor: r.status === 'error' ? 'rgba(220,38,38,0.06)' : 'transparent',
                    }}>
                      <Avatar sx={{
                        width: 30, height: 30, fontSize: 10, fontWeight: 700, flexShrink: 0,
                        bgcolor: r.status === 'success' ? `${modC.color}30` : '#DC262630',
                        color:   r.status === 'success' ? modC.color : '#EF4444',
                      }}>
                        {r.status === 'success' ? init : '!'}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: r.status === 'success' ? '#F1F5F9' : '#EF4444', lineHeight: 1.3 }} noWrap>
                          {r.empName}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: '#3D5068', lineHeight: 1.3 }} noWrap>
                          {r.status === 'success' ? r.msg : r.msg}
                        </Typography>
                      </Box>
                      <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: r.status === 'success' ? modC.color : '#EF4444' }}>
                          {r.time}
                        </Typography>
                        <Typography sx={{ fontSize: 9, color: '#3D5068', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {r.status === 'success' ? modC.label : 'ERREUR'}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              }
            </Box>
          </Box>
        </Box>
      </Box>

      <FeedbackOverlay record={feedback} onDone={() => setFeedback(null)} />
    </Box>
  );
}
