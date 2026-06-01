import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  Box, Typography, Button, Stack, Dialog, DialogContent,
  IconButton, Tooltip, Divider, Avatar,
  CircularProgress, Snackbar, Alert,
} from '@mui/material';
import {
  Close, Print, Download, Login, Logout,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { attendancesApi } from '../../api/attendances';
import { settingsApi } from '../../api/settings';
import { formatDate } from '../../utils/format';
import type { Employee } from '../../types';

/* ─────────────── dimensions carte paysage ── */
const CARD_W = 500;
const CARD_H = 300;

function qrPayload(emp: Employee): string {
  return JSON.stringify({
    app: 'NIIDPRO',
    action: 'BADGE',
    num: emp.employee_number,
    id: emp.id,
  });
}

/* ─────────────── Carte visuelle (format carte d'identité paysage) ── */

interface CardProps {
  employee: Employee;
  cardRef?: React.RefObject<HTMLDivElement | null>;
  companyName?: string;
}

function BadgeCard({ employee: emp, cardRef, companyName = 'Mon Entreprise' }: CardProps) {
  const isActive  = emp.status === 'active';
  const initials  = `${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`.toUpperCase();

  /* palette selon statut */
  const accent   = isActive ? '#16A34A' : '#DC2626';
  const strip    = isActive ? '#16A34A' : '#DC2626';
  const textDark = '#0F172A';
  const textMid  = '#475569';
  const textSub  = '#94A3B8';

  return (
    <Box
      ref={cardRef}
      id="badge-card"
      sx={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: '14px',
        overflow: 'hidden',
        position: 'relative',
        bgcolor: '#ffffff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        fontFamily: "'Inter', system-ui, sans-serif",
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Bande colorée haute ── */}
      <Box sx={{
        height: 10,
        backgroundColor: strip,
        backgroundImage: `linear-gradient(90deg, ${strip}, ${accent}, ${strip})`,
      }} />

      {/* ── Drapeau Sénégal en haut à gauche ── */}
      <Box
        component="img"
        src="/drapeau.png"
        alt="Drapeau Sénégal"
        sx={{
          position: 'absolute',
          top: 18,
          left: 16,
          width: 52,
          height: 'auto',
          borderRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          zIndex: 2,
        }}
      />

      {/* ── Contenu principal ── */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
        zIndex: 1,
        px: 2.5,
        py: 1.5,
        gap: 2,
      }}>

        {/* ── Colonne gauche : photo ── */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          minWidth: 100,
        }}>
          <Box sx={{
            border: `3px solid ${accent}`,
            borderRadius: '8px',
            overflow: 'hidden',
            width: 90,
            height: 108,
            bgcolor: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px rgba(0,0,0,0.15)`,
          }}>
            {emp.photo_url ? (
              <Box
                component="img"
                src={emp.photo_url}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 90, height: 108, borderRadius: 0,
                  fontSize: 32, fontWeight: 900,
                  bgcolor: accent,
                  color: '#fff',
                }}
              >
                {initials}
              </Avatar>
            )}
          </Box>
          {/* Statut */}
          <Box sx={{
            px: 1, py: 0.25, borderRadius: '20px',
            bgcolor: isActive ? '#DCFCE7' : '#FEE2E2',
            border: `1px solid ${isActive ? '#86EFAC' : '#FCA5A5'}`,
          }}>
            <Typography sx={{
              fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em',
              color: isActive ? '#15803D' : '#DC2626', textTransform: 'uppercase',
            }}>
              {isActive ? 'ACTIF' : 'INACTIF'}
            </Typography>
          </Box>
        </Box>

        {/* ── Colonne centrale : infos ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5 }}>
          {/* En-tête : nom entreprise */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <Box sx={{
              width: 22, height: 22, borderRadius: '6px',
              bgcolor: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BadgeIcon sx={{ color: '#fff', fontSize: 13 }} />
            </Box>
            <Box>
              <Typography sx={{
                color: textDark, fontWeight: 900,
                fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1,
              }}>
                {companyName}
              </Typography>
              <Typography sx={{
                color: textSub, fontWeight: 600,
                fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                Badge Professionnel
              </Typography>
            </Box>
          </Box>

          {/* Ligne séparatrice */}
          <Box sx={{
            height: 1.5,
            bgcolor: accent,
            borderRadius: 1,
            mb: 0.75,
            opacity: 0.5,
          }} />

          {/* Matricule */}
          <Box>
            <Typography sx={{ fontSize: 8.5, color: textSub, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
              Matricule N°
            </Typography>
            <Typography sx={{
              fontFamily: 'monospace', fontSize: 16, fontWeight: 900,
              color: accent, letterSpacing: '0.1em', lineHeight: 1.2,
            }}>
              {emp.employee_number}
            </Typography>
          </Box>

          {/* Nom complet */}
          <Box sx={{ mt: 0.25 }}>
            <Typography sx={{
              fontSize: 18, fontWeight: 900, color: textDark,
              letterSpacing: '-0.3px', lineHeight: 1.15,
            }}>
              {emp.first_name} <span style={{ textTransform: 'uppercase' }}>{emp.last_name}</span>
            </Typography>
          </Box>

          {/* Poste + Service */}
          {(emp.position?.title || emp.department?.name) && (
            <Box sx={{ mt: 0.25 }}>
              {emp.position?.title && (
                <Typography sx={{ fontSize: 11, color: textMid, fontWeight: 500 }}>
                  {emp.position.title}
                </Typography>
              )}
              {emp.department?.name && (
                <Typography sx={{ fontSize: 10.5, color: accent, fontWeight: 700, letterSpacing: '0.03em' }}>
                  {emp.department.name}
                </Typography>
              )}
            </Box>
          )}

          {/* Date entrée */}
          <Box sx={{ mt: 'auto', pt: 0.5 }}>
            <Typography sx={{ fontSize: 9, color: textSub, fontWeight: 500 }}>
              En service depuis le {formatDate(emp.hire_date)} · #{String(emp.id).padStart(5, '0')}
            </Typography>
          </Box>
        </Box>

        {/* ── Séparateur vertical ── */}
        <Box sx={{
          width: 1,
          bgcolor: '#E2E8F0',
          alignSelf: 'stretch',
        }} />

        {/* ── Colonne droite : QR Code ── */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          minWidth: 120,
        }}>
          <Box sx={{
            p: 1.25,
            bgcolor: '#fff',
            borderRadius: '10px',
            border: `1px solid #E2E8F0`,
            boxShadow: `0 2px 8px rgba(0,0,0,0.1)`,
          }}>
            <QRCodeSVG
              value={qrPayload(emp)}
              size={96}
              level="H"
              fgColor="#0F172A"
              bgColor="#ffffff"
            />
          </Box>
          <Typography sx={{
            fontSize: 8, color: textSub, textAlign: 'center',
            fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            lineHeight: 1.4,
          }}>
            Scanner pour<br />badger
          </Typography>
        </Box>
      </Box>

      {/* ── Bande basse ── */}
      <Box sx={{
        height: 28,
        bgcolor: '#F8FAFC',
        borderTop: `1px solid #E2E8F0`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2.5,
      }}>
        <Typography sx={{ fontSize: 8, color: textSub, fontWeight: 600, letterSpacing: '0.08em' }}>
          DOCUMENT OFFICIEL · RÉPUBLIQUE DU SÉNÉGAL
        </Typography>
        <Typography sx={{ fontSize: 8, fontFamily: 'monospace', color: textSub }}>
          {new Date().getFullYear()}
        </Typography>
      </Box>
    </Box>
  );
}

/* ─────────────── Modal principal ── */

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee;
}

export default function EmployeeBadgeCard({ open, onClose, employee }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
    staleTime: Infinity,
  });
  const companyName = settings?.company_name ?? 'Mon Entreprise';

  const badgeMut = useMutation({
    mutationFn: ({ action, notes }: { action: 'in' | 'out'; notes?: string }) =>
      attendancesApi.badge(employee.employee_number, action, notes),
    onSuccess: (_, { action }) => {
      setToast({ type: 'success', msg: action === 'in' ? '✅ Entrée enregistrée avec succès' : '✅ Sortie enregistrée avec succès' });
    },
    onError: () => {
      setToast({ type: 'error', msg: 'Erreur lors du badgeage. Vérifiez la connexion.' });
    },
  });

  const handlePrint = () => {
    const printContent = document.getElementById('badge-card');
    if (!printContent) return;
    const win = window.open('', '_blank', 'width=650,height=480');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8" />
      <title>Badge — ${employee.first_name} ${employee.last_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; }
        @media print { body { background: white; } .no-print { display: none !important; } }
        .card-wrapper { padding: 24px; }
      </style>
      </head><body>
      <div class="card-wrapper">${printContent.outerHTML}</div>
      <div class="no-print" style="text-align:center;margin-top:16px">
        <button onclick="window.print()" style="padding:8px 20px;border-radius:8px;background:#0F172A;color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:600">
          🖨 Imprimer
        </button>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handleDownloadSVG = () => {
    const svgEl = cardRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `badge-qr-${employee.employee_number}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: '20px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.35)', bgcolor: '#0F172A' } }}>

        {/* ── Header modal ── */}
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
                Carte professionnelle
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11.5 }}>
                {employee.first_name} {employee.last_name} · {employee.employee_number}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small"
            sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0, bgcolor: '#0F172A' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 0 }}>

            {/* ── Colonne gauche : aperçu carte ── */}
            <Box sx={{
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.05) 0%, transparent 70%)',
            }}>
              <BadgeCard employee={employee} cardRef={cardRef} companyName={companyName} />
            </Box>

            {/* ── Séparateur vertical ── */}
            <Box sx={{ width: 1, bgcolor: 'rgba(255,255,255,0.07)', display: { xs: 'none', md: 'block' } }} />

            {/* ── Colonne droite : actions ── */}
            <Box sx={{ flex: 1, p: 3.5, display: 'flex', flexDirection: 'column', gap: 3 }}>

              {/* Info agent */}
              <Box>
                <Typography sx={{ color: '#64748B', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
                  Informations agent
                </Typography>
                <Stack spacing={1}>
                  {[
                    { label: 'Nom complet', value: `${employee.first_name} ${employee.last_name}` },
                    { label: 'Matricule',   value: employee.employee_number, mono: true },
                    { label: 'Poste',       value: employee.position?.title ?? '—' },
                    { label: 'Service',     value: employee.department?.name ?? '—' },
                    { label: 'Recrutement', value: formatDate(employee.hire_date) },
                  ].map(({ label, value, mono }) => (
                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{label}</Typography>
                      <Typography sx={{
                        fontSize: 12, color: '#CBD5E1', fontWeight: 600, textAlign: 'right',
                        fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '0.08em' : 'inherit',
                        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

              {/* ── Actions badgeage ── */}
              <Box>
                <Typography sx={{ color: '#64748B', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
                  Badgeage manuel
                </Typography>
                <Stack spacing={1}>
                  <Button
                    fullWidth variant="contained" size="large"
                    disabled={badgeMut.isPending}
                    startIcon={badgeMut.isPending ? <CircularProgress size={16} color="inherit" /> : <Login />}
                    onClick={() => badgeMut.mutate({ action: 'in' })}
                    sx={{
                      background: 'linear-gradient(135deg,#059669,#047857)',
                      borderRadius: '12px', fontWeight: 700, fontSize: 14, py: 1.5,
                      boxShadow: '0 4px 16px rgba(5,150,105,0.4)',
                      '&:hover': { background: 'linear-gradient(135deg,#047857,#065F46)', transform: 'translateY(-1px)' },
                      transition: 'all 0.2s',
                    }}
                  >
                    Enregistrer une ENTRÉE
                  </Button>
                  <Button
                    fullWidth variant="outlined" size="large"
                    disabled={badgeMut.isPending}
                    startIcon={badgeMut.isPending ? <CircularProgress size={16} color="inherit" /> : <Logout />}
                    onClick={() => badgeMut.mutate({ action: 'out' })}
                    sx={{
                      borderColor: 'rgba(239,68,68,0.5)', color: '#FCA5A5',
                      borderRadius: '12px', fontWeight: 700, fontSize: 14, py: 1.5,
                      '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', borderColor: '#EF4444', transform: 'translateY(-1px)' },
                      transition: 'all 0.2s',
                    }}
                  >
                    Enregistrer une SORTIE
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

              {/* ── Exporter ── */}
              <Box>
                <Typography sx={{ color: '#64748B', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
                  Exporter la carte
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Imprimer la carte" arrow>
                    <Button
                      variant="outlined" size="small" startIcon={<Print sx={{ fontSize: '15px !important' }} />}
                      onClick={handlePrint}
                      sx={{
                        flex: 1, borderColor: 'rgba(255,255,255,0.15)', color: '#CBD5E1',
                        borderRadius: '10px', fontWeight: 600, fontSize: 12,
                        '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
                      }}
                    >
                      Imprimer
                    </Button>
                  </Tooltip>
                  <Tooltip title="Télécharger le QR Code (SVG)" arrow>
                    <Button
                      variant="outlined" size="small" startIcon={<Download sx={{ fontSize: '15px !important' }} />}
                      onClick={handleDownloadSVG}
                      sx={{
                        flex: 1, borderColor: 'rgba(255,255,255,0.15)', color: '#CBD5E1',
                        borderRadius: '10px', fontWeight: 600, fontSize: 12,
                        '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
                      }}
                    >
                      QR Code
                    </Button>
                  </Tooltip>
                </Stack>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.type}
          onClose={() => setToast(null)}
          sx={{ borderRadius: '12px', fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </>
  );
}
