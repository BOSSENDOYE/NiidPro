import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  Box, Typography, Button, Stack, Dialog, DialogContent,
  IconButton, Tooltip, Divider, Avatar,
  CircularProgress, Snackbar, Alert, Tabs, Tab,
} from '@mui/material';
import {
  Close, Print, Login, Logout,
  Badge as BadgeIcon, FlipCameraAndroid,
} from '@mui/icons-material';
import { attendancesApi } from '../../api/attendances';
import { formatDate } from '../../utils/format';
import type { Employee } from '../../types';

/* ── Dimensions carte credit-card paysage ── */
const CARD_W = 540;
const CARD_H = 340;

function qrPayload(emp: Employee): string {
  return JSON.stringify({ app: 'NIIDPRO', id: emp.id, num: emp.employee_number });
}

/* ════════════════════════════ RECTO ════════════════════════════ */
function Recto({ emp, cardRef }: { emp: Employee; cardRef?: React.RefObject<HTMLDivElement | null> }) {
  const initials = `${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <Box ref={cardRef} id="badge-recto" sx={{
      width: CARD_W, height: CARD_H,
      borderRadius: '10px', overflow: 'hidden',
      position: 'relative', bgcolor: '#FFFFFF',
      boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.07)',
      fontFamily: "'Arial', Helvetica, sans-serif",
      userSelect: 'none',
    }}>

      {/* ── EN-TÊTE ── */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 58, bgcolor: '#fff', zIndex: 6,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        px: 2, pt: 1.25,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        {/* Gauche : République */}
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 900, color: '#1a1a1a', letterSpacing: '0.05em', lineHeight: 1.2 }}>
            REPUBLIQUE DU SÉNÉGAL
          </Typography>
          <Typography sx={{ fontSize: 6.5, color: '#555', lineHeight: 1.4, mt: 0.2 }}>
            Un Peuple - Un But - Une Foi
          </Typography>
          <Typography sx={{ fontSize: 6.5, color: '#555', lineHeight: 1.4 }}>
            Ministère des Transports et des Travaux Publics
          </Typography>
          <Typography sx={{ fontSize: 6.5, color: '#555', lineHeight: 1.4 }}>
            Agence Nationale de Sécurité Routière (ANASER)
          </Typography>
        </Box>

        {/* Droite : Logo ANASER */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: 6, color: '#555', lineHeight: 1.35 }}>
              Sénégal<br />
              <strong>AGENCE NATIONALE</strong><br />
              DE SÉCURITÉ ROUTIÈRE
            </Typography>
          </Box>
          {/* Icône stylisée ANASER (croix orange + texte bleu) */}
          <Box sx={{ position: 'relative', width: 44, height: 38 }}>
            {/* Barre diagonale orange */}
            <Box sx={{
              position: 'absolute', width: 3, height: 36,
              bgcolor: '#F97316', top: 1, left: 22,
              transform: 'rotate(-20deg)',
              borderRadius: 1,
            }} />
            <Typography sx={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              fontSize: 14, fontWeight: 900, color: '#1D4ED8',
              letterSpacing: '-0.5px', fontStyle: 'italic',
              textAlign: 'center', lineHeight: 1,
            }}>
              ANASER
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── CHAMPS IDENTITÉ (gauche, au-dessus de la bande) ── */}
      <Box sx={{
        position: 'absolute',
        top: 65, left: 18,
        zIndex: 6, width: '50%',
      }}>
        {[
          { label: 'N°',        value: String(emp.id ?? '').padStart(4, '0') },
          { label: 'Nom',       value: (emp.last_name ?? '').toUpperCase() },
          { label: 'Prénom',    value: emp.first_name ?? '' },
          { label: 'Fonctions', value: emp.position?.title ?? '—' },
          { label: 'Matricule', value: emp.employee_number ?? '' },
        ].map(({ label, value }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.35 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#111', minWidth: 62, lineHeight: 1.5 }}>
              {label} :
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#111', lineHeight: 1.5, fontWeight: 400 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── BANDE DIAGONALE (drapeau sénégal) ── */}
      {/* Vert */}
      <Box sx={{
        position: 'absolute',
        width: '170%', height: 22,
        left: '-35%',
        top: '58%',
        transform: 'translateY(-50%) rotate(-26deg)',
        bgcolor: '#00853F', zIndex: 3,
      }} />
      {/* Jaune */}
      <Box sx={{
        position: 'absolute',
        width: '170%', height: 22,
        left: '-35%',
        top: '67%',
        transform: 'translateY(-50%) rotate(-26deg)',
        bgcolor: '#FDEF42', zIndex: 3,
      }} />
      {/* Rouge */}
      <Box sx={{
        position: 'absolute',
        width: '170%', height: 22,
        left: '-35%',
        top: '76%',
        transform: 'translateY(-50%) rotate(-26deg)',
        bgcolor: '#E31937', zIndex: 3,
      }} />

      {/* ── TEXTE "CARTE PROFESSIONNELLE" sur la bande ── */}
      <Box sx={{
        position: 'absolute',
        width: '90%',
        top: '64%',
        left: '6%',
        transform: 'translateY(-50%) rotate(-26deg)',
        zIndex: 4,
        pointerEvents: 'none',
      }}>
        <Typography sx={{
          fontSize: 22, fontWeight: 900,
          color: '#fff',
          letterSpacing: '0.08em',
          textShadow: '0 1px 4px rgba(0,0,0,0.45)',
          textTransform: 'uppercase',
          fontStyle: 'italic',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          CARTE PROFESSIONNELLE
        </Typography>
      </Box>

      {/* ── PHOTO (bas droite) ── */}
      <Box sx={{
        position: 'absolute',
        bottom: 14, right: 18,
        zIndex: 6,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4,
      }}>
        <Box sx={{
          width: 80, height: 96,
          border: '1.5px solid #999',
          borderRadius: '3px', overflow: 'hidden', bgcolor: '#e8e8e8',
        }}>
          {emp.photo_url ? (
            <Box component="img" src={emp.photo_url} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Avatar sx={{ width: 80, height: 96, borderRadius: 0, fontSize: 26, bgcolor: '#1D4ED8', color: '#fff' }}>
              {initials}
            </Avatar>
          )}
        </Box>
        <Typography sx={{ fontSize: 7.5, color: '#333', fontStyle: 'italic', textAlign: 'center' }}>
          Le Directeur Général
        </Typography>
        <Box sx={{ width: 78, height: 0.75, bgcolor: '#888' }} />
      </Box>

      {/* ── LOGO ANASER bas gauche ── */}
      <Box sx={{
        position: 'absolute',
        bottom: 14, left: 18,
        zIndex: 6,
        display: 'flex', alignItems: 'center', gap: 0.5,
      }}>
        <Box sx={{ position: 'relative', width: 38, height: 32 }}>
          <Box sx={{ position: 'absolute', width: 2.5, height: 30, bgcolor: '#F97316', top: 1, left: 18, transform: 'rotate(-20deg)', borderRadius: 1 }} />
          <Typography sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 12, fontWeight: 900, color: '#1D4ED8', fontStyle: 'italic', textAlign: 'center', lineHeight: 1 }}>
            ANASER
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 5.5, color: '#666', lineHeight: 1.3 }}>
          Sénégal<br /><strong>AGENCE NATIONALE</strong><br />DE SÉCURITÉ ROUTIÈRE
        </Typography>
      </Box>
    </Box>
  );
}

/* ════════════════════════════ VERSO ════════════════════════════ */
function Verso({ emp, cardRef }: { emp: Employee; cardRef?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <Box ref={cardRef} id="badge-verso" sx={{
      width: CARD_W, height: CARD_H,
      borderRadius: '10px', overflow: 'hidden',
      position: 'relative', bgcolor: '#FFFFFF',
      boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.07)',
      fontFamily: "'Arial', Helvetica, sans-serif",
      userSelect: 'none',
      p: 2.5,
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── LOGO ANASER (haut gauche) ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.75 }}>
        <Box sx={{ position: 'relative', width: 52, height: 42 }}>
          <Box sx={{ position: 'absolute', width: 3, height: 40, bgcolor: '#F97316', top: 1, left: 26, transform: 'rotate(-20deg)', borderRadius: 1 }} />
          <Typography sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 18, fontWeight: 900, color: '#1D4ED8', fontStyle: 'italic', textAlign: 'center', lineHeight: 1 }}>
            ANASER
          </Typography>
        </Box>
        <Box sx={{ borderLeft: '1px solid #ddd', pl: 1 }}>
          <Typography sx={{ fontSize: 7.5, color: '#444', lineHeight: 1.5 }}>
            Sénégal<br />
            <strong style={{ fontSize: 8 }}>AGENCE NATIONALE</strong><br />
            DE SÉCURITÉ ROUTIÈRE
          </Typography>
        </Box>
      </Box>

      {/* ── TEXTE LÉGAL ── */}
      <Box sx={{ flex: 1, px: 0.5 }}>
        <Typography sx={{
          fontSize: 10.5, color: '#222', lineHeight: 1.85,
          textAlign: 'justify',
        }}>
          Cette carte est strictement personnelle, propriété de l'Agence Nationale de Sécurité
          Routière (ANASER). En cas de cessation de service ou d'affection, l'agent doit déposer
          sa carte à la Direction Générale de l'agence. Toute personne trouvant cette carte est
          priée de bien vouloir la déposer au siège de l'agence :
        </Typography>

        <Box sx={{ mt: 1.25, textAlign: 'right' }}>
          <Typography sx={{ fontSize: 11, color: '#222', fontWeight: 600 }}>
            Adresse : Cité Keur Gorgui
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#222', fontWeight: 600 }}>
            Tél : 33 856 40 46
          </Typography>
        </Box>
      </Box>

      {/* ── QR CODE (bas gauche) ── */}
      <Box sx={{
        position: 'absolute',
        bottom: 16, left: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
      }}>
        <Box sx={{
          p: 0.75, bgcolor: '#fff',
          border: '1.5px solid #ccc', borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <QRCodeSVG
            value={qrPayload(emp)}
            size={80}
            level="H"
            fgColor="#0F172A"
            bgColor="#FFFFFF"
          />
        </Box>
        <Typography sx={{ fontSize: 7.5, color: '#666', textAlign: 'center', letterSpacing: '0.04em' }}>
          Scanner pour vérifier
        </Typography>
      </Box>
    </Box>
  );
}

/* ════════════════════════════ MODAL PRINCIPAL ════════════════════════════ */
interface Props { open: boolean; onClose: () => void; employee: Employee }

export default function EmployeeBadgeCard({ open, onClose, employee }: Props) {
  const rectoRef = useRef<HTMLDivElement>(null);
  const versoRef = useRef<HTMLDivElement>(null);
  const [side, setSide]   = useState<0 | 1>(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const badgeMut = useMutation({
    mutationFn: ({ action }: { action: 'in' | 'out' }) =>
      attendancesApi.badge(employee.employee_number, action),
    onSuccess: (_, { action }) =>
      setToast({ type: 'success', msg: action === 'in' ? '✅ Entrée enregistrée' : '✅ Sortie enregistrée' }),
    onError: () =>
      setToast({ type: 'error', msg: 'Erreur lors du badgeage.' }),
  });

  const printSide = (id: string, label: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const win = window.open('', '_blank', 'width=680,height=500');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Badge ${label} — ${employee.first_name} ${employee.last_name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif}
        .wrap{padding:32px}
        @media print{body{background:#fff}.no-print{display:none!important}}
      </style></head><body>
      <div class="wrap">${el.outerHTML}</div>
      <div class="no-print" style="text-align:center;margin-top:16px">
        <button onclick="window.print()" style="padding:10px 24px;border-radius:8px;background:#0F172A;color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:600">
          🖨 Imprimer ${label}
        </button>
      </div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handlePrintBoth = () => {
    const r = document.getElementById('badge-recto');
    const v = document.getElementById('badge-verso');
    if (!r || !v) return;
    const win = window.open('', '_blank', 'width=680,height=900');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Badge Recto/Verso — ${employee.first_name} ${employee.last_name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#e2e8f0;display:flex;flex-direction:column;align-items:center;padding:24px;gap:24px;font-family:Arial,sans-serif}
        h3{color:#475569;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
        @media print{body{background:#fff;gap:8px}.no-print{display:none!important}h3{display:none}}
      </style></head><body>
      <div><h3>RECTO</h3>${r.outerHTML}</div>
      <div><h3>VERSO</h3>${v.outerHTML}</div>
      <div class="no-print" style="margin-top:8px">
        <button onclick="window.print()" style="padding:10px 24px;border-radius:8px;background:#0F172A;color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:600">
          🖨 Imprimer Recto + Verso
        </button>
      </div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: '20px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.35)', bgcolor: '#0F172A' } }}>

        {/* ── Header ── */}
        <Box sx={{
          px: 3, py: 2,
          background: 'linear-gradient(135deg,#0F172A,#1E293B)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59,130,246,0.45)',
            }}>
              <BadgeIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 15 }}>
                Carte professionnelle ANASER
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11.5 }}>
                {employee.first_name} {employee.last_name} · {employee.employee_number}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small"
            sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0, bgcolor: '#0F172A' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>

            {/* ── Aperçu carte ── */}
            <Box sx={{
              flex: '0 0 auto',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              p: 4, gap: 2,
              background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.07) 0%, transparent 70%)',
            }}>
              {/* Toggle recto/verso */}
              <Tabs value={side} onChange={(_, v) => setSide(v)}
                sx={{
                  minHeight: 34,
                  bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '10px', p: 0.4,
                  '& .MuiTabs-indicator': { display: 'none' },
                  '& .MuiTab-root': { minHeight: 26, fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'none', borderRadius: '7px', px: 2, py: 0.5, minWidth: 90 },
                  '& .Mui-selected': { color: '#fff !important', bgcolor: 'rgba(255,255,255,0.12)' },
                }}>
                <Tab label="↩ Recto" />
                <Tab label="Verso ↪" />
              </Tabs>

              {/* Carte */}
              <Box sx={{ transition: 'all .3s' }}>
                {side === 0
                  ? <Recto emp={employee} cardRef={rectoRef} />
                  : <Verso emp={employee} cardRef={versoRef} />
                }
              </Box>

              {/* Recto & Verso rendus en invisible pour l'impression */}
              <Box sx={{ position: 'absolute', opacity: 0, pointerEvents: 'none', left: -9999, top: -9999 }}>
                <Recto emp={employee} cardRef={rectoRef} />
                <Verso emp={employee} cardRef={versoRef} />
              </Box>
            </Box>

            <Box sx={{ width: 1, bgcolor: 'rgba(255,255,255,0.07)', display: { xs: 'none', md: 'block' } }} />

            {/* ── Actions ── */}
            <Box sx={{ flex: 1, p: 3.5, display: 'flex', flexDirection: 'column', gap: 3 }}>

              {/* Info agent */}
              <Box>
                <Typography sx={{ color: '#64748B', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
                  Informations
                </Typography>
                <Stack spacing={1}>
                  {[
                    { label: 'Nom complet',  value: `${employee.first_name} ${employee.last_name}` },
                    { label: 'Matricule',    value: employee.employee_number, mono: true },
                    { label: 'Poste',        value: employee.position?.title ?? '—' },
                    { label: 'Service',      value: employee.department?.name ?? '—' },
                    { label: 'Recrutement',  value: formatDate(employee.hire_date) },
                  ].map(({ label, value, mono }) => (
                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontSize: 12, color: '#64748B' }}>{label}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '0.08em' : 'normal', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

              {/* Badgeage */}
              <Box>
                <Typography sx={{ color: '#64748B', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
                  Badgeage manuel
                </Typography>
                <Stack spacing={1}>
                  <Button fullWidth variant="contained" size="large" disabled={badgeMut.isPending}
                    startIcon={badgeMut.isPending ? <CircularProgress size={16} color="inherit" /> : <Login />}
                    onClick={() => badgeMut.mutate({ action: 'in' })}
                    sx={{ background: 'linear-gradient(135deg,#059669,#047857)', borderRadius: '12px', fontWeight: 700, fontSize: 14, py: 1.5, boxShadow: '0 4px 16px rgba(5,150,105,0.4)', '&:hover': { background: 'linear-gradient(135deg,#047857,#065F46)', transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}>
                    Enregistrer une ENTRÉE
                  </Button>
                  <Button fullWidth variant="outlined" size="large" disabled={badgeMut.isPending}
                    startIcon={badgeMut.isPending ? <CircularProgress size={16} color="inherit" /> : <Logout />}
                    onClick={() => badgeMut.mutate({ action: 'out' })}
                    sx={{ borderColor: 'rgba(239,68,68,0.5)', color: '#FCA5A5', borderRadius: '12px', fontWeight: 700, fontSize: 14, py: 1.5, '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', borderColor: '#EF4444', transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}>
                    Enregistrer une SORTIE
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

              {/* Impression */}
              <Box>
                <Typography sx={{ color: '#64748B', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
                  Imprimer
                </Typography>
                <Stack spacing={0.75}>
                  <Button fullWidth variant="outlined" size="small" startIcon={<Print sx={{ fontSize: '15px !important' }} />}
                    onClick={handlePrintBoth}
                    sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#E2E8F0', borderRadius: '10px', fontWeight: 700, fontSize: 12.5, py: 1, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.07)' } }}>
                    Imprimer Recto + Verso
                  </Button>
                  <Stack direction="row" spacing={0.75}>
                    <Tooltip title="Imprimer le recto seulement" arrow>
                      <Button variant="outlined" size="small" startIcon={<FlipCameraAndroid sx={{ fontSize: '14px !important' }} />}
                        onClick={() => printSide('badge-recto', 'Recto')} fullWidth
                        sx={{ borderColor: 'rgba(255,255,255,0.12)', color: '#94A3B8', borderRadius: '10px', fontWeight: 600, fontSize: 11, '&:hover': { borderColor: '#93C5FD', color: '#93C5FD' } }}>
                        Recto seul
                      </Button>
                    </Tooltip>
                    <Tooltip title="Imprimer le verso seulement" arrow>
                      <Button variant="outlined" size="small" startIcon={<FlipCameraAndroid sx={{ fontSize: '14px !important', transform: 'scaleX(-1)' }} />}
                        onClick={() => printSide('badge-verso', 'Verso')} fullWidth
                        sx={{ borderColor: 'rgba(255,255,255,0.12)', color: '#94A3B8', borderRadius: '10px', fontWeight: 600, fontSize: 11, '&:hover': { borderColor: '#93C5FD', color: '#93C5FD' } }}>
                        Verso seul
                      </Button>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.type} onClose={() => setToast(null)} sx={{ borderRadius: '12px', fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </>
  );
}
