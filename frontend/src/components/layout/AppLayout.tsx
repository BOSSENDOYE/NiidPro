import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leavesApi } from '../../api/leaves';
import type { LeaveEndingSoon, DetailPlanningConge } from '../../api/leaves';
import { settingsApi } from '../../api/settings';
import { justificationsApi } from '../../api/justifications';
import type { Justification } from '../../api/justifications';
import { trainingsApi } from '../../api/trainings';
import { recruitmentApi } from '../../api/recruitment';
import type { Training, RecruitmentRequest, PaginatedResponse } from '../../types';
import client from '../../api/client';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Avatar, Menu, MenuItem, Divider, Tooltip, Badge,
  Popover, Button, Snackbar,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Logout, Person, Settings,
  NotificationsNone, Dashboard, Groups, Description, AccessTime,
  CameraAlt, BeachAccess, AssignmentLate, AccountTree, CheckBox,
  Payments, BarChart, PhoneAndroid, KeyboardArrowDown,
  Article, QrCodeScanner, School, PersonSearch,
  WorkspacePremium, Close, ArrowForward, EventBusy, AssignmentReturn, FlightTakeoff,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth';

const DRAWER_WIDTH   = 260;
const COLLAPSED_WIDTH = 66;

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  color?: string;
  sub?: boolean;   // sous-menu : indentation + style réduit
}
interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    label: 'VUE D\'ENSEMBLE',
    items: [
      { path: '/dashboard', label: 'Tableau de bord', icon: <Dashboard />, color: '#60A5FA' },
    ],
  },
  {
    label: 'GESTION RH',
    items: [
      { path: '/employees',     label: 'Agents',            icon: <Groups />,         color: '#F97316' },
      { path: '/contracts',          label: 'Contrats',         icon: <Description />, color: '#A78BFA' },
      { path: '/leaves',        label: 'Congés & Absences', icon: <BeachAccess />,    color: '#FCD34D' },
      { path: '/trainings',     label: 'Gestion Formation', icon: <School />,         color: '#8B5CF6' },
      { path: '/recruitment',        label: 'Recrutements',      icon: <PersonSearch />,  color: '#0EA5E9' },
      { path: '/evaluations',        label: 'Évaluation',           icon: <AssignmentLate />,   color: '#F59E0B' },
      { path: '/carrieres',          label: 'Carrières',            icon: <WorkspacePremium />, color: '#7C3AED' },
    ],
  },
  {
    label: 'GESTION PRÉSENCES',
    items: [
      { path: '/attendances',        label: 'Présences du jour',  icon: <AccessTime />,    color: '#34D399' },
      { path: '/attendance-scanner', label: 'Terminal QR',        icon: <QrCodeScanner />, color: '#7C3AED' },
      { path: '/attendance-visual',  label: 'Calendrier mensuel', icon: <CameraAlt />,     color: '#67E8F9' },
    ],
  },
  {
    label: 'ORGANISATION',
    items: [
      { path: '/departments',   label: 'Directions & Services', icon: <AccountTree />, color: '#818CF8' },
      { path: '/tasks',         label: 'Tâches',                icon: <CheckBox />,    color: '#4ADE80' },
      { path: '/payroll',       label: 'Gestion de la paie',    icon: <Payments />,    color: '#FBBF24' },
      { path: '/social-report', label: 'Bilan social',          icon: <BarChart />,    color: '#38BDF8' },
    ],
  },
  {
    label: 'DOCUMENTS',
    items: [
      { path: '/documents', label: 'Documents de Service', icon: <Article />, color: '#0EA5E9' },
    ],
  },
  {
    label: 'ESPACE AGENT',
    items: [
      { path: '/agent-portal', label: 'Portail Agent', icon: <PhoneAndroid />, color: '#FB7185' },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { path: '/configuration', label: 'Configuration', icon: <Settings />, color: '#94A3B8' },
    ],
  },
];

// Page labels for top bar
const PAGE_LABELS: Record<string, string> = {
  '/dashboard':         'Tableau de bord',
  '/employees':         'Gestion des Agents',
  '/contracts':          'Contrats & Alertes',
  '/attendances':        'Pointage — Tableau de bord',
  '/attendance-scanner': 'Terminal de Badgeage QR',
  '/attendance-visual':  'Pointage — Calendrier',
  '/leaves':            'Congés & Absences',
  '/trainings':         'Gestion des Formations',
  '/recruitment':          'Gestion des Recrutements',
  '/evaluations':          'Évaluation',
  '/carrieres':            'Gestion des Carrières',
  '/departments':       'Directions',
  '/tasks':             'Gestion des Tâches',
  '/payroll':           'Paie & Bulletins',
  '/social-report':     'Bilan Social',
  '/documents':         'Documents de Service',
  '/schema':            'Schéma SQL',
  '/agent-portal':      'Portail Agent',
  '/configuration':     'Configuration de l\'entreprise',
  '/profile':           'Mon Profil',
};

const SB = {
  bg:             '#0B1120',
  bgDeep:         '#060D1A',
  border:         'rgba(255,255,255,0.055)',
  sectionLabel:   '#3D5068',
  itemText:       '#7A93AB',
  itemTextActive: '#F1F5F9',
  activeBg:       'rgba(37,99,235,0.16)',
  activeBorder:   '#3B82F6',
  hoverBg:        'rgba(255,255,255,0.045)',
  badge:          '#EF4444',
};

export default function AppLayout() {
  const [open, setOpen]             = useState(true);
  const [anchorEl, setAnchorEl]     = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const notifOpen = Boolean(notifAnchorEl);
  const { user, logout }        = useAuthStore();
  const navigate                = useNavigate();
  const location                = useLocation();

  const { data: pendingLeaves = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ['leaves', 'pending'],
    queryFn: () => leavesApi.pending().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: pendingJustifications = [], isLoading: loadingJustifs } = useQuery<Justification[]>({
    queryKey: ['justifications', 'pending'],
    queryFn: () => justificationsApi.pending().then(r => r.data as unknown as Justification[]),
    refetchInterval: 60_000,
  });

  const { data: pendingTrainings = [], isLoading: loadingTrainings } = useQuery<Training[]>({
    queryKey: ['trainings', 'pending'],
    queryFn: () => trainingsApi.pending().then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: pendingRecruitRaw, isLoading: loadingRecruit } = useQuery<PaginatedResponse<RecruitmentRequest>>({
    queryKey: ['recruitment', 'pending'],
    queryFn: () => recruitmentApi.pending().then(r => r.data),
    refetchInterval: 60_000,
  });
  const pendingRecruitItems  = pendingRecruitRaw?.data ?? [];
  const pendingRecruitCount  = pendingRecruitRaw?.total ?? pendingRecruitItems.length;

  const { data: pendingEnrollRaw, isLoading: loadingEnroll } = useQuery<{ total?: number }>({
    queryKey: ['enrollments-pending-count'],
    queryFn: () => client.get('/enrollments', { params: { status: 'pending' } }).then(r => r.data),
    refetchInterval: 60_000,
  });
  const pendingEnrollCount = pendingEnrollRaw?.total ?? 0;

  const { data: endingSoon = [], isLoading: loadingEndingSoon } = useQuery<LeaveEndingSoon[]>({
    queryKey: ['leaves', 'ending-soon'],
    queryFn:  () => leavesApi.endingSoon(3),
    refetchInterval: 60_000,
  });

  const { data: planningDepartures = [], isLoading: loadingPlanDep } = useQuery<DetailPlanningConge[]>({
    queryKey: ['planning', 'upcoming'],
    queryFn:  () => leavesApi.planningUpcoming(14),
    refetchInterval: 60_000,
  });

  const { data: company } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const companyName = company?.name || 'RH+PAIE';

  const dynamicBadges: Record<string, number> = {
    '/leaves':      pendingLeaves.length + pendingJustifications.length + endingSoon.length + planningDepartures.length,
    '/trainings':   pendingTrainings.length,
    '/recruitment': pendingRecruitCount,
    '/employees':   pendingEnrollCount,
  };

  const totalBadges = pendingLeaves.length + pendingJustifications.length + pendingEnrollCount + pendingTrainings.length + pendingRecruitCount + endingSoon.length + planningDepartures.length;

  const notifTimeAgo = (dateStr: string) => {
    const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
    if (h < 1) return '<1h';
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}j`;
  };

  // ── Détection de nouvelles notifications (toast d'alerte) ─────────────────
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg,  setSnackMsg]  = useState('');
  const bellButtonRef   = useRef<HTMLButtonElement>(null);
  const prevCountsRef   = useRef<{ leaves: number; justifs: number; enroll: number; trainings: number; recruit: number; reprises: number; departures: number } | null>(null);
  const notifInitRef    = useRef(false);
  const allQueriesLoaded = !loadingLeaves && !loadingJustifs && !loadingTrainings && !loadingRecruit && !loadingEnroll && !loadingEndingSoon && !loadingPlanDep;

  useEffect(() => {
    if (!allQueriesLoaded) return;
    const current = {
      leaves:     pendingLeaves.length,
      justifs:    pendingJustifications.length,
      enroll:     pendingEnrollCount,
      trainings:  pendingTrainings.length,
      recruit:    pendingRecruitCount,
      reprises:   endingSoon.length,
      departures: planningDepartures.length,
    };
    if (!notifInitRef.current) {
      notifInitRef.current = true;
      prevCountsRef.current = current;
      return;
    }
    const prev = prevCountsRef.current!;
    const parts: string[] = [];
    const d = (n: number, s: string, p: string) => `${n} ${n > 1 ? p : s}`;
    if (current.leaves    > prev.leaves)    parts.push(d(current.leaves    - prev.leaves,    'congé',            'congés'));
    if (current.justifs   > prev.justifs)   parts.push(d(current.justifs   - prev.justifs,   'justification',    'justifications'));
    if (current.enroll    > prev.enroll)    parts.push(d(current.enroll    - prev.enroll,    'enrôlement',       'enrôlements'));
    if (current.trainings > prev.trainings) parts.push(d(current.trainings - prev.trainings, 'formation',        'formations'));
    if (current.recruit   > prev.recruit)   parts.push(d(current.recruit   - prev.recruit,   'recrutement',      'recrutements'));
    if (current.reprises   > prev.reprises)   parts.push(d(current.reprises   - prev.reprises,   'reprise imminente', 'reprises imminentes'));
    if (current.departures > prev.departures) parts.push(d(current.departures - prev.departures, 'départ planifié',   'départs planifiés'));
    if (parts.length > 0) {
      setSnackMsg(parts.join(' · '));
      setSnackOpen(true);
    }
    prevCountsRef.current = current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allQueriesLoaded, pendingLeaves.length, pendingJustifications.length, pendingEnrollCount, pendingTrainings.length, pendingRecruitCount, endingSoon.length, planningDepartures.length]);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin_rh:    'Admin RH',
    manager:     'Manager',
    employe:     'Employé',
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const userRole     = roleLabel[user?.roles?.[0] ?? ''] ?? user?.roles?.[0] ?? '';
  const drawerWidth  = open ? DRAWER_WIDTH : COLLAPSED_WIDTH;

  const currentLabel = (() => {
    const path = location.pathname;
    for (const [key, label] of Object.entries(PAGE_LABELS)) {
      if (path === key || (key !== '/dashboard' && path.startsWith(key))) return label;
    }
    return 'RH+PAIE';
  })();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F1F5F9' }}>
      {/* ══════════════════════ SIDEBAR ══════════════════════ */}
      <Box component="nav" sx={{ width: drawerWidth, flexShrink: 0, transition: 'width 220ms cubic-bezier(.4,0,.2,1)' }}>
        <Drawer
          variant="permanent"
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              transition: 'width 220ms cubic-bezier(.4,0,.2,1)',
              overflowX: 'hidden',
              bgcolor: SB.bg,
              borderRight: `1px solid ${SB.border}`,
              display: 'flex',
              flexDirection: 'column',
              backgroundImage: `
                radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.12) 0%, transparent 60%),
                linear-gradient(180deg, ${SB.bg} 0%, ${SB.bgDeep} 100%)
              `,
            },
          }}
        >
          {/* ─── BRAND ─── */}
          <Box
            sx={{
              display: 'flex', alignItems: 'center',
              px: open ? 2 : 1, height: 62, flexShrink: 0,
              borderBottom: `1px solid ${SB.border}`,
              gap: open ? 1.5 : 0,
            }}
          >
            <Box
              sx={{
                width: 38, height: 38, borderRadius: '10px', flexShrink: 0, overflow: 'hidden',
                background: company?.logo_url ? '#fff' : 'linear-gradient(135deg, #002f59 0%, #014a8f 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,47,89,0.5)',
                p: company?.logo_url ? '4px' : 0,
              }}
            >
              {company?.logo_url
                ? <img src={company.logo_url} alt={companyName}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                : <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 16, letterSpacing: '-1px' }}>
                    {companyName[0]?.toUpperCase() ?? 'N'}
                  </Typography>}
            </Box>

            {open && (
              <>
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  <Typography sx={{ color: '#F1F5F9', fontWeight: 800, fontSize: 15, letterSpacing: '-0.4px', lineHeight: 1.2 }} noWrap>
                    {companyName}
                  </Typography>
                  <Typography sx={{ color: SB.sectionLabel, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }} noWrap>
                    {company?.legal_name || 'Ressources Humaines'}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setOpen(false)}
                  sx={{ color: SB.sectionLabel, '&:hover': { color: '#F1F5F9', bgcolor: SB.hoverBg }, borderRadius: '7px' }}>
                  <ChevronLeft fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>

          {/* ─── NAV ─── */}
          <Box
            sx={{
              flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5,
              '&::-webkit-scrollbar': { width: 3 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 4 },
            }}
          >
            {NAV.map((section, si) => (
              <Box key={section.label} sx={{ mb: 0.5 }}>
                {open ? (
                  <Typography sx={{
                    px: 2.5, pt: si === 0 ? 0.5 : 1.75, pb: 0.75,
                    fontSize: 9.5, fontWeight: 700, color: SB.sectionLabel,
                    letterSpacing: '0.1em', textTransform: 'uppercase', userSelect: 'none',
                  }}>
                    {section.label}
                  </Typography>
                ) : si > 0 ? (
                  <Divider sx={{ borderColor: SB.border, mx: 1.5, my: 0.75 }} />
                ) : null}

                <List dense disablePadding sx={{ px: 1 }}>
                  {section.items.map((item) => {
                    const active = item.path === '/dashboard'
                      ? location.pathname === item.path
                      : location.pathname === item.path || (item.path !== '/contracts' && location.pathname.startsWith(item.path));

                    return (
                      <Tooltip key={item.path} title={!open ? item.label : ''} placement="right" arrow>
                        <ListItemButton
                          onClick={() => navigate(item.path)}
                          sx={{
                            borderRadius: '9px', mb: 0.5,
                            pl: open ? (item.sub ? 3 : 1.5) : 0,
                            pr: open ? 1.5 : 0,
                            py: item.sub ? '5px' : '7px',
                            justifyContent: open ? 'flex-start' : 'center',
                            position: 'relative',
                            bgcolor: active ? SB.activeBg : 'transparent',
                            borderLeft: active ? `2px solid ${SB.activeBorder}` : item.sub && open ? '2px solid rgba(255,255,255,0.06)' : '2px solid transparent',
                            '&:hover': { bgcolor: active ? SB.activeBg : SB.hoverBg },
                            transition: 'all 150ms ease',
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: open ? (item.sub ? 28 : 34) : 'unset',
                              justifyContent: 'center',
                              '& svg': {
                                fontSize: item.sub ? 15 : 18,
                                color: active ? (item.color ?? '#60A5FA') : SB.itemText,
                                transition: 'color 150ms',
                                filter: active ? `drop-shadow(0 0 6px ${item.color ?? '#60A5FA'}80)` : 'none',
                              },
                            }}
                          >
                            {item.icon}
                          </ListItemIcon>

                          {open && (
                            <>
                              <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{
                                  fontSize: item.sub ? 12 : 13,
                                  fontWeight: active ? 600 : 400,
                                  color: active ? SB.itemTextActive : item.sub ? '#5A7A90' : SB.itemText,
                                  noWrap: true, letterSpacing: '-0.1px',
                                }}
                              />
                              {(() => {
                                const b = item.badge ?? dynamicBadges[item.path];
                                return b !== undefined && b > 0 ? (
                                  <Box sx={{
                                    minWidth: 18, height: 18, borderRadius: '9px',
                                    bgcolor: SB.badge,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    px: 0.5,
                                  }}>
                                    <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                                      {b}
                                    </Typography>
                                  </Box>
                                ) : null;
                              })()}
                            </>
                          )}

                          {!open && (item.badge ?? dynamicBadges[item.path] ?? 0) > 0 && (
                            <Box sx={{
                              position: 'absolute', top: 4, right: 4,
                              width: 6, height: 6, borderRadius: '50%',
                              bgcolor: SB.badge,
                              boxShadow: '0 0 6px #EF4444',
                            }} />
                          )}
                        </ListItemButton>
                      </Tooltip>
                    );
                  })}
                </List>
              </Box>
            ))}
          </Box>

          {/* ─── EXPAND BUTTON ─── */}
          {!open && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
              <Tooltip title="Développer" placement="right">
                <IconButton size="small" onClick={() => setOpen(true)}
                  sx={{ color: SB.sectionLabel, borderRadius: '8px', '&:hover': { color: '#F1F5F9', bgcolor: SB.hoverBg } }}>
                  <ChevronRight fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* ─── USER ─── */}
          <Box sx={{ borderTop: `1px solid ${SB.border}`, p: 1.5 }}>
            {open ? (
              <Box
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1, borderRadius: '9px', cursor: 'pointer',
                  '&:hover': { bgcolor: SB.hoverBg },
                  transition: 'background 150ms',
                }}
              >
                <Avatar src={user?.employee?.photo_url ?? undefined} sx={{
                  width: 32, height: 32,
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
                }}>
                  {userInitials}
                </Avatar>
                <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#F1F5F9', lineHeight: 1.3 }} noWrap>
                    {user?.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: SB.sectionLabel, lineHeight: 1.3 }} noWrap>
                    {userRole === user?.name ? (user?.email ?? userRole) : userRole}
                  </Typography>
                </Box>
                <KeyboardArrowDown sx={{ fontSize: 16, color: SB.sectionLabel }} />
              </Box>
            ) : (
              <Tooltip title={user?.name ?? 'Profil'} placement="right">
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5, mx: 'auto', display: 'flex' }}>
                  <Avatar src={user?.employee?.photo_url ?? undefined} sx={{
                    width: 32, height: 32,
                    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                    fontSize: 12, fontWeight: 800,
                  }}>
                    {userInitials}
                  </Avatar>
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Drawer>
      </Box>

      {/* ══════════════════════ MAIN AREA ══════════════════════ */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ─── TOP BAR ─── */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            background: 'linear-gradient(180deg,#FFFFFF 0%,#F8FAFD 100%)',
            borderBottom: '1px solid #E2E8F0',
            color: 'text.primary',
            backgroundImage: 'none',
            boxShadow: '0 1px 12px rgba(15,23,42,0.06)',
          }}
        >
          <Toolbar sx={{ minHeight: '66px !important', px: { xs: 2, md: 3 }, gap: 2 }}>

            {/* ════ GAUCHE : Badge ANASER + Titre ════ */}
            <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}>

              {/* Badge ANASER */}
              <Box sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center', gap: 0.75, flexShrink: 0,
                px: 1.25, py: 0.55,
                borderRadius: '9px',
                background: 'linear-gradient(135deg,#1E40AF 0%,#4F46E5 100%)',
                boxShadow: '0 3px 10px rgba(37,99,235,0.28)',
              }}>
                <Box sx={{
                  width: 14, height: 14, borderRadius: '3px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Box sx={{ width: 7, height: 2, bgcolor: '#fff', borderRadius: 1 }} />
                </Box>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#fff', letterSpacing: '0.06em', fontStyle: 'italic', lineHeight: 1, whiteSpace: 'nowrap' }}>
                  {companyName}
                </Typography>
              </Box>

              {/* Séparateur */}
              <Box sx={{ display: { xs: 'none', sm: 'block' }, width: 1, height: 24, bgcolor: '#E2E8F0', flexShrink: 0 }} />

              {/* Titre de la page */}
              <Typography sx={{
                fontWeight: 800, fontSize: 15, color: '#0F172A',
                letterSpacing: '-0.3px', lineHeight: 1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                minWidth: 0,
              }}>
                {currentLabel}
              </Typography>
            </Box>

            {/* ════ CENTRE-DROITE : Date ════ */}
            <Box sx={{
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center', gap: 0.75,
              px: 1.5, py: 0.6,
              borderRadius: '9px',
              bgcolor: '#F1F5F9',
              border: '1px solid #E2E8F0',
              flexShrink: 0,
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#3B82F6', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11.5, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </Typography>
            </Box>

            {/* ════ Système en ligne ════ */}
            <Tooltip title="Système opérationnel" arrow>
              <Box sx={{
                display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.7,
                px: 1.25, py: 0.55,
                borderRadius: '9px',
                bgcolor: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.20)',
                cursor: 'default',
                flexShrink: 0,
              }}>
                <Box sx={{
                  width: 7, height: 7, borderRadius: '50%', bgcolor: '#10B981',
                  boxShadow: '0 0 0 3px rgba(16,185,129,0.25)',
                  animation: 'blink 2.5s ease-in-out infinite',
                  '@keyframes blink': {
                    '0%,100%': { boxShadow: '0 0 0 3px rgba(16,185,129,0.25)' },
                    '50%':     { boxShadow: '0 0 0 5px rgba(16,185,129,0.08)' },
                  },
                }} />
                <Typography sx={{ fontSize: 11.5, color: '#059669', fontWeight: 700, letterSpacing: '0.01em' }}>
                  En ligne
                </Typography>
              </Box>
            </Tooltip>

            {/* ════ Séparateur vertical ════ */}
            <Box sx={{ width: 1, height: 32, bgcolor: '#E2E8F0', mx: 0.25 }} />

            {/* ════ DROITE : Cloche + Profil (groupés) ════ */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>

              {/* ── Cloche ── */}
              <Tooltip title={notifOpen ? '' : (totalBadges > 0 ? `${totalBadges} alertes en attente` : 'Aucune notification')} arrow>
                <IconButton
                  ref={bellButtonRef}
                  size="small"
                  onClick={(e) => setNotifAnchorEl(e.currentTarget)}
                  sx={{
                    width: 40, height: 40, borderRadius: '11px',
                    color:   totalBadges > 0 ? '#2563EB' : '#64748B',
                    bgcolor: totalBadges > 0 ? '#EFF6FF'  : '#F1F5F9',
                    border: `1.5px solid ${totalBadges > 0 ? '#BFDBFE' : '#E2E8F0'}`,
                    boxShadow: totalBadges > 0 ? '0 2px 10px rgba(37,99,235,0.15)' : 'none',
                    '&:hover': {
                      bgcolor: totalBadges > 0 ? '#DBEAFE' : '#E2E8F0',
                      transform: 'translateY(-1px)',
                      boxShadow: totalBadges > 0 ? '0 4px 16px rgba(37,99,235,0.22)' : '0 2px 8px rgba(0,0,0,0.08)',
                    },
                    transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
                    animation: totalBadges > 0 ? 'bellShake 4s ease-in-out infinite' : 'none',
                    '@keyframes bellShake': {
                      '0%,90%,100%': { transform: 'rotate(0deg)' },
                      '92%':         { transform: 'rotate(-12deg)' },
                      '94%':         { transform: 'rotate(12deg)' },
                      '96%':         { transform: 'rotate(-8deg)' },
                      '98%':         { transform: 'rotate(8deg)' },
                    },
                  }}
                >
                  <Badge
                    badgeContent={totalBadges}
                    sx={{
                      '& .MuiBadge-badge': {
                        background: 'linear-gradient(135deg,#EF4444,#DC2626)',
                        color: '#fff', fontSize: 9, fontWeight: 800,
                        minWidth: 17, height: 17, padding: '0 4px',
                        boxShadow: '0 0 0 2px #fff, 0 2px 6px rgba(239,68,68,0.4)',
                      },
                    }}
                  >
                    <NotificationsNone sx={{ fontSize: 21 }} />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* ── Profil utilisateur avec photo ── */}
              <Box
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  pl: 0.75, pr: 1.5, py: 0.5,
                  borderRadius: '12px', cursor: 'pointer',
                  border: '1.5px solid #E2E8F0',
                  background: 'linear-gradient(135deg,#FAFBFF 0%,#F1F5F9 100%)',
                  '&:hover': {
                    borderColor: '#A5B4FC',
                    background: 'linear-gradient(135deg,#EEF2FF 0%,#E0E7FF 100%)',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.12)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
                }}
              >
                {/* Avatar avec anneau coloré + point vert */}
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '11px',
                    background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
                    p: '2px',
                    boxShadow: '0 3px 10px rgba(37,99,235,0.30)',
                  }}>
                    <Avatar
                      src={user?.employee?.photo_url ?? undefined}
                      sx={{
                        width: 32, height: 32, borderRadius: '9px',
                        background: 'linear-gradient(135deg,#2563EB 0%,#7C3AED 100%)',
                        fontSize: 12, fontWeight: 800, color: '#fff',
                        border: '1.5px solid rgba(255,255,255,0.9)',
                      }}
                    >
                      {userInitials}
                    </Avatar>
                  </Box>
                  {/* Point de présence en ligne */}
                  <Box sx={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 10, height: 10, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#10B981,#059669)',
                    border: '2px solid #fff',
                    boxShadow: '0 0 6px rgba(16,185,129,0.5)',
                  }} />
                </Box>

                {/* Nom + rôle */}
                <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0 }}>
                  <Typography sx={{
                    fontSize: 13, fontWeight: 700, lineHeight: 1.25,
                    color: '#0F172A', whiteSpace: 'nowrap', letterSpacing: '-0.1px',
                  }}>
                    {user?.name}
                  </Typography>
                  <Typography sx={{
                    fontSize: 10.5, color: '#64748B', lineHeight: 1.2,
                    whiteSpace: 'nowrap', fontWeight: 500,
                  }}>
                    {userRole === user?.name ? (user?.email ?? userRole) : userRole}
                  </Typography>
                </Box>

                <KeyboardArrowDown sx={{
                  fontSize: 17, color: '#94A3B8',
                  display: { xs: 'none', sm: 'block' }, flexShrink: 0,
                  transition: 'transform 0.2s',
                }} />
              </Box>
            </Box>

          </Toolbar>
        </AppBar>

        {/* ─── PAGE CONTENT ─── */}
        <Box
          component="main"
          sx={{
            flexGrow: 1, overflow: 'auto',
            p: { xs: 2, md: 3 },
            bgcolor: 'background.default',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* ══════════════════════ USER DROPDOWN ══════════════════════ */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1, minWidth: 210, borderRadius: '14px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.13)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2, py: 1.75,
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}
        >
          <Avatar src={user?.employee?.photo_url ?? undefined} sx={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            fontSize: 13, fontWeight: 800,
            boxShadow: '0 3px 8px rgba(37,99,235,0.4)',
          }}>
            {userInitials}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#F1F5F9' }}>{user?.name}</Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>{user?.email}</Typography>
          </Box>
        </Box>

        <Box sx={{ p: 0.75 }}>
          <MenuItem onClick={() => { navigate('/profile'); setAnchorEl(null); }}
            sx={{ fontSize: 13, py: 1, borderRadius: '8px', gap: 1 }}>
            <Person fontSize="small" sx={{ color: '#64748B' }} />
            Mon profil
          </MenuItem>
          <MenuItem onClick={() => { navigate('/configuration'); setAnchorEl(null); }}
            sx={{ fontSize: 13, py: 1, borderRadius: '8px', gap: 1 }}>
            <Settings fontSize="small" sx={{ color: '#64748B' }} />
            Configuration
          </MenuItem>
          <Divider sx={{ my: 0.5, borderColor: '#F1F5F9' }} />
          <MenuItem onClick={handleLogout}
            sx={{ fontSize: 13, py: 1, borderRadius: '8px', gap: 1, color: '#DC2626' }}>
            <Logout fontSize="small" sx={{ color: '#DC2626' }} />
            Déconnexion
          </MenuItem>
        </Box>
      </Menu>

      {/* ══════════════════════ POPOVER NOTIFICATIONS ══════════════════════ */}
      <Popover
        open={notifOpen}
        anchorEl={notifAnchorEl}
        onClose={() => setNotifAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, width: 400, borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '1px solid #E2E8F0', overflow: 'hidden' } } }}
      >
        {/* ─── En-tête ─── */}
        <Box sx={{ px: 2.5, py: 1.75, background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <NotificationsNone sx={{ color: '#94A3B8', fontSize: 19 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#F1F5F9', letterSpacing: '-0.2px' }}>Notifications</Typography>
            {totalBadges > 0 && (
              <Box sx={{ px: 0.9, py: 0.2, borderRadius: '20px', background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{totalBadges}</Typography>
              </Box>
            )}
          </Box>
          <IconButton size="small" onClick={() => setNotifAnchorEl(null)} sx={{ color: '#475569', borderRadius: '8px', '&:hover': { color: '#F1F5F9', bgcolor: 'rgba(255,255,255,0.1)' } }}>
            <Close sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>

        {/* ─── Corps ─── */}
        {totalBadges === 0 ? (
          <Box sx={{ py: 5.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <NotificationsNone sx={{ color: '#CBD5E1', fontSize: 28 }} />
            </Box>
            <Typography sx={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>Aucune notification en attente</Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 500, overflowY: 'auto', '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 4 } }}>

            {/* ── Congés & absences ── */}
            {pendingLeaves.length > 0 && (
              <Box>
                <Box sx={{ px: 2.25, pt: 1.5, pb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '6px', bgcolor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BeachAccess sx={{ fontSize: 12, color: '#D97706' }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Congés & absences
                  </Typography>
                  <Box sx={{ ml: 'auto', px: 0.75, py: 0.1, borderRadius: '10px', bgcolor: '#FEF9C3' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#D97706', lineHeight: 1 }}>{pendingLeaves.length}</Typography>
                  </Box>
                </Box>
                {pendingLeaves.slice(0, 4).map((leave, idx) => {
                  const empName   = leave.employee ? `${leave.employee.first_name} ${leave.employee.last_name}` : `Agent #${leave.employee_id}`;
                  const typeName  = leave.leaveType?.name ?? 'Congé';
                  const typeColor = leave.leaveType?.color ?? '#F59E0B';
                  const isAbsence = leave.leaveType?.category === 'absence';
                  const startFmt  = new Date(leave.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                  const endFmt    = new Date(leave.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                  return (
                    <Box key={leave.id}>
                      {idx > 0 && <Divider sx={{ borderColor: '#F8FAFC', mx: 2.25 }} />}
                      <Box sx={{ px: 2.25, py: 1.25, display: 'flex', gap: 1.25, alignItems: 'flex-start', '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 130ms' }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: `${typeColor}18`, border: `1px solid ${typeColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isAbsence ? <EventBusy sx={{ fontSize: 16, color: typeColor }} /> : <BeachAccess sx={{ fontSize: 16, color: typeColor }} />}
                        </Box>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{empName}</Typography>
                            <Typography sx={{ fontSize: 9.5, color: '#94A3B8', ml: 1, flexShrink: 0 }}>il y a {notifTimeAgo(leave.created_at)}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: 11, color: '#475569' }} noWrap>
                            {typeName} · {startFmt} → {endFmt} <Box component="span" sx={{ fontWeight: 700 }}>({leave.days_count}j)</Box>
                          </Typography>
                        </Box>
                        <Button size="small" variant="contained" onClick={() => { navigate('/leaves'); setNotifAnchorEl(null); }}
                          sx={{ fontSize: 10, fontWeight: 700, py: 0.25, px: 1.25, borderRadius: '6px', minWidth: 'unset', height: 20, background: 'linear-gradient(135deg,#2563EB,#4F46E5)', boxShadow: 'none', textTransform: 'none', flexShrink: 0, '&:hover': { boxShadow: '0 4px 10px rgba(37,99,235,0.35)' } }}>
                          Voir
                        </Button>
                      </Box>
                    </Box>
                  );
                })}
                {pendingLeaves.length > 4 && (
                  <Box sx={{ px: 2.25, pb: 1, textAlign: 'right' }}>
                    <Typography component="span" onClick={() => { navigate('/leaves'); setNotifAnchorEl(null); }}
                      sx={{ fontSize: 11, color: '#2563EB', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                      +{pendingLeaves.length - 4} autres →
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ borderColor: '#F1F5F9' }} />
              </Box>
            )}

            {/* ── Justifications d'absence ── */}
            {pendingJustifications.length > 0 && (
              <Box>
                <Box sx={{ px: 2.25, pt: 1.5, pb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '6px', bgcolor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AssignmentLate sx={{ fontSize: 12, color: '#7C3AED' }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Justifications</Typography>
                  <Box sx={{ ml: 'auto', px: 0.75, py: 0.1, borderRadius: '10px', bgcolor: '#EDE9FE' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#7C3AED', lineHeight: 1 }}>{pendingJustifications.length}</Typography>
                  </Box>
                </Box>
                {pendingJustifications.slice(0, 3).map((j, idx) => {
                  const empName = j.employee ? `${j.employee.first_name} ${j.employee.last_name}` : `Agent #${j.employee_id}`;
                  const dateFmt = new Date(j.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                  return (
                    <Box key={j.id}>
                      {idx > 0 && <Divider sx={{ borderColor: '#F8FAFC', mx: 2.25 }} />}
                      <Box sx={{ px: 2.25, py: 1.25, display: 'flex', gap: 1.25, alignItems: 'center', '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 130ms' }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#EDE9FE', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AssignmentLate sx={{ fontSize: 16, color: '#7C3AED' }} />
                        </Box>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{empName}</Typography>
                            <Typography sx={{ fontSize: 9.5, color: '#94A3B8', ml: 1, flexShrink: 0 }}>il y a {notifTimeAgo(j.created_at)}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: 11, color: '#475569' }} noWrap>
                            {j.absence_type ?? 'Absence'} · {dateFmt}
                          </Typography>
                        </Box>
                        <Button size="small" variant="contained" onClick={() => { navigate('/justifications'); setNotifAnchorEl(null); }}
                          sx={{ fontSize: 10, fontWeight: 700, py: 0.25, px: 1.25, borderRadius: '6px', minWidth: 'unset', height: 20, background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', boxShadow: 'none', textTransform: 'none', flexShrink: 0, '&:hover': { boxShadow: '0 4px 10px rgba(124,58,237,0.35)' } }}>
                          Voir
                        </Button>
                      </Box>
                    </Box>
                  );
                })}
                {pendingJustifications.length > 3 && (
                  <Box sx={{ px: 2.25, pb: 1, textAlign: 'right' }}>
                    <Typography component="span" onClick={() => { navigate('/justifications'); setNotifAnchorEl(null); }}
                      sx={{ fontSize: 11, color: '#7C3AED', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                      +{pendingJustifications.length - 3} autres →
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ borderColor: '#F1F5F9' }} />
              </Box>
            )}

            {/* ── Enrôlements ── */}
            {pendingEnrollCount > 0 && (
              <Box>
                <Box sx={{ px: 2.25, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 130ms', cursor: 'default' }}>
                  <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Person sx={{ fontSize: 16, color: '#059669' }} />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>Enrôlements en attente</Typography>
                    <Typography sx={{ fontSize: 11, color: '#475569' }}>
                      {pendingEnrollCount} demande{pendingEnrollCount > 1 ? 's' : ''} à valider
                    </Typography>
                  </Box>
                  <Button size="small" variant="contained" onClick={() => { navigate('/employees'); setNotifAnchorEl(null); }}
                    sx={{ fontSize: 10, fontWeight: 700, py: 0.25, px: 1.25, borderRadius: '6px', minWidth: 'unset', height: 20, background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: 'none', textTransform: 'none', flexShrink: 0, '&:hover': { boxShadow: '0 4px 10px rgba(5,150,105,0.35)' } }}>
                    Voir
                  </Button>
                </Box>
                <Divider sx={{ borderColor: '#F1F5F9' }} />
              </Box>
            )}

            {/* ── Formations ── */}
            {pendingTrainings.length > 0 && (
              <Box>
                <Box sx={{ px: 2.25, pt: 1.5, pb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '6px', bgcolor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <School sx={{ fontSize: 12, color: '#8B5CF6' }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Formations</Typography>
                  <Box sx={{ ml: 'auto', px: 0.75, py: 0.1, borderRadius: '10px', bgcolor: '#EDE9FE' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#8B5CF6', lineHeight: 1 }}>{pendingTrainings.length}</Typography>
                  </Box>
                </Box>
                {pendingTrainings.slice(0, 3).map((tr, idx) => (
                  <Box key={tr.id}>
                    {idx > 0 && <Divider sx={{ borderColor: '#F8FAFC', mx: 2.25 }} />}
                    <Box sx={{ px: 2.25, py: 1.25, display: 'flex', gap: 1.25, alignItems: 'center', '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 130ms' }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#EDE9FE', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <School sx={{ fontSize: 16, color: '#8B5CF6' }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{tr.title}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#475569' }} noWrap>
                          {tr.trainingType?.name ?? 'Formation'} · {tr.duration_days}j
                        </Typography>
                      </Box>
                      <Button size="small" variant="contained" onClick={() => { navigate('/trainings'); setNotifAnchorEl(null); }}
                        sx={{ fontSize: 10, fontWeight: 700, py: 0.25, px: 1.25, borderRadius: '6px', minWidth: 'unset', height: 20, background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', boxShadow: 'none', textTransform: 'none', flexShrink: 0, '&:hover': { boxShadow: '0 4px 10px rgba(139,92,246,0.35)' } }}>
                        Voir
                      </Button>
                    </Box>
                  </Box>
                ))}
                {pendingTrainings.length > 3 && (
                  <Box sx={{ px: 2.25, pb: 1, textAlign: 'right' }}>
                    <Typography component="span" onClick={() => { navigate('/trainings'); setNotifAnchorEl(null); }}
                      sx={{ fontSize: 11, color: '#8B5CF6', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                      +{pendingTrainings.length - 3} autres →
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ borderColor: '#F1F5F9' }} />
              </Box>
            )}

            {/* ── Recrutements ── */}
            {pendingRecruitCount > 0 && (
              <Box>
                <Box sx={{ px: 2.25, pt: 1.5, pb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '6px', bgcolor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PersonSearch sx={{ fontSize: 12, color: '#0284C7' }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recrutements</Typography>
                  <Box sx={{ ml: 'auto', px: 0.75, py: 0.1, borderRadius: '10px', bgcolor: '#E0F2FE' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#0284C7', lineHeight: 1 }}>{pendingRecruitCount}</Typography>
                  </Box>
                </Box>
                {pendingRecruitItems.slice(0, 3).map((rq, idx) => (
                  <Box key={rq.id}>
                    {idx > 0 && <Divider sx={{ borderColor: '#F8FAFC', mx: 2.25 }} />}
                    <Box sx={{ px: 2.25, py: 1.25, display: 'flex', gap: 1.25, alignItems: 'center', '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 130ms' }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#E0F2FE', border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <PersonSearch sx={{ fontSize: 16, color: '#0284C7' }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{rq.position_title}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#475569' }} noWrap>
                          {rq.department?.name ?? '—'} · {rq.number_of_positions} poste{rq.number_of_positions > 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      <Button size="small" variant="contained" onClick={() => { navigate('/recruitment'); setNotifAnchorEl(null); }}
                        sx={{ fontSize: 10, fontWeight: 700, py: 0.25, px: 1.25, borderRadius: '6px', minWidth: 'unset', height: 20, background: 'linear-gradient(135deg,#0284C7,#0369A1)', boxShadow: 'none', textTransform: 'none', flexShrink: 0, '&:hover': { boxShadow: '0 4px 10px rgba(2,132,199,0.35)' } }}>
                        Voir
                      </Button>
                    </Box>
                  </Box>
                ))}
                {pendingRecruitCount > 3 && (
                  <Box sx={{ px: 2.25, pb: 1, textAlign: 'right' }}>
                    <Typography component="span" onClick={() => { navigate('/recruitment'); setNotifAnchorEl(null); }}
                      sx={{ fontSize: 11, color: '#0284C7', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                      +{pendingRecruitCount - 3} autres →
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ borderColor: '#F1F5F9' }} />
              </Box>
            )}

            {/* ── Reprises imminentes ── */}
            {endingSoon.length > 0 && (
              <Box>
                <Box sx={{ px: 2.25, pt: 1.5, pb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '6px', bgcolor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AssignmentReturn sx={{ fontSize: 12, color: '#DC2626' }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Reprises imminentes
                  </Typography>
                  <Box sx={{ ml: 'auto', px: 0.75, py: 0.1, borderRadius: '10px', bgcolor: '#FEF2F2' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#DC2626', lineHeight: 1 }}>{endingSoon.length}</Typography>
                  </Box>
                </Box>
                {endingSoon.map((l, idx) => {
                  const emp       = l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : `Agent #${l.employee_id}`;
                  const endFmt    = new Date(l.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                  const repriseFmt= new Date(new Date(l.end_date).getTime() + 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                  const urgency   = l.days_until_return === 0
                    ? { label: "Aujourd'hui", bg: '#FEF2F2', color: '#DC2626' }
                    : l.days_until_return === 1
                    ? { label: 'Demain',      bg: '#FFF7ED', color: '#EA580C' }
                    : { label: `J-${l.days_until_return}`, bg: '#FFFBEB', color: '#D97706' };
                  return (
                    <Box key={l.id}>
                      {idx > 0 && <Divider sx={{ borderColor: '#F8FAFC', mx: 2.25 }} />}
                      <Box sx={{ px: 2.25, py: 1.25, display: 'flex', gap: 1.25, alignItems: 'flex-start', '&:hover': { bgcolor: '#FFF5F5' }, transition: 'background 130ms' }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AssignmentReturn sx={{ fontSize: 17, color: '#DC2626' }} />
                        </Box>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{emp}</Typography>
                            <Box sx={{ px: 0.75, py: 0.15, borderRadius: '5px', bgcolor: urgency.bg, flexShrink: 0 }}>
                              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: urgency.color, lineHeight: 1 }}>{urgency.label}</Typography>
                            </Box>
                          </Box>
                          <Typography sx={{ fontSize: 11, color: '#475569' }} noWrap>
                            {l.leaveType?.name ?? 'Congé'} · fin le {endFmt}
                          </Typography>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: '#DC2626' }}>
                            Reprise prévue le {repriseFmt}
                          </Typography>
                        </Box>
                        <Button size="small" variant="outlined" onClick={() => { navigate('/leaves'); setNotifAnchorEl(null); }}
                          sx={{ fontSize: 9.5, fontWeight: 700, py: 0.25, px: 1, borderRadius: '6px', minWidth: 'unset', height: 22, color: '#DC2626', borderColor: '#FECACA', textTransform: 'none', flexShrink: 0, '&:hover': { bgcolor: '#FEF2F2', borderColor: '#DC2626' } }}>
                          Préparer
                        </Button>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* ── Départs planifiés imminents ── */}
            {planningDepartures.length > 0 && (
              <Box>
                <Box sx={{ px: 2.25, pt: 1.5, pb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '6px', bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FlightTakeoff sx={{ fontSize: 12, color: '#2563EB' }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Départs planifiés
                  </Typography>
                  <Box sx={{ ml: 'auto', px: 0.75, py: 0.1, borderRadius: '10px', bgcolor: '#EFF6FF' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#2563EB', lineHeight: 1 }}>{planningDepartures.length}</Typography>
                  </Box>
                </Box>
                {planningDepartures.slice(0, 4).map((p, idx) => {
                  const emp       = p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : `Agent #${p.employee_id}`;
                  const departFmt = new Date(p.date_depart_prevu!).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                  const du        = p.days_until_depart ?? 0;
                  const urgency   = du === 0
                    ? { label: "Auj.",    bg: '#FEF2F2', color: '#DC2626' }
                    : du === 1
                    ? { label: 'Demain',  bg: '#FFF7ED', color: '#EA580C' }
                    : du <= 7
                    ? { label: `J-${du}`, bg: '#FFFBEB', color: '#D97706' }
                    : { label: `J-${du}`, bg: '#EFF6FF', color: '#2563EB' };
                  return (
                    <Box key={p.id}>
                      {idx > 0 && <Divider sx={{ borderColor: '#F8FAFC', mx: 2.25 }} />}
                      <Box sx={{ px: 2.25, py: 1.25, display: 'flex', gap: 1.25, alignItems: 'flex-start', '&:hover': { bgcolor: '#F0F9FF' }, transition: 'background 130ms' }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FlightTakeoff sx={{ fontSize: 17, color: '#2563EB' }} />
                        </Box>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{emp}</Typography>
                            <Box sx={{ px: 0.75, py: 0.15, borderRadius: '5px', bgcolor: urgency.bg, flexShrink: 0 }}>
                              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: urgency.color, lineHeight: 1 }}>{urgency.label}</Typography>
                            </Box>
                          </Box>
                          <Typography sx={{ fontSize: 11, color: '#475569' }} noWrap>
                            Départ le {departFmt} · {p.nbre_jours_programme ?? '?'}j programmés
                          </Typography>
                          <Typography sx={{ fontSize: 10.5, color: '#64748B' }}>
                            {p.employee?.department?.name ?? '—'}
                          </Typography>
                        </Box>
                        <Button size="small" variant="outlined" onClick={() => { navigate('/leaves'); setNotifAnchorEl(null); }}
                          sx={{ fontSize: 9.5, fontWeight: 700, py: 0.25, px: 1, borderRadius: '6px', minWidth: 'unset', height: 22, color: '#2563EB', borderColor: '#BFDBFE', textTransform: 'none', flexShrink: 0, '&:hover': { bgcolor: '#EFF6FF', borderColor: '#2563EB' } }}>
                          Planning
                        </Button>
                      </Box>
                    </Box>
                  );
                })}
                {planningDepartures.length > 4 && (
                  <Box sx={{ px: 2.25, pb: 1, textAlign: 'right' }}>
                    <Typography component="span" onClick={() => { navigate('/leaves'); setNotifAnchorEl(null); }}
                      sx={{ fontSize: 11, color: '#2563EB', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                      +{planningDepartures.length - 4} autres →
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* ─── Pied de page ─── */}
        {totalBadges > 0 && (
          <Box sx={{ px: 2, py: 1.25, borderTop: '1px solid #F1F5F9' }}>
            <Button fullWidth size="small" endIcon={<ArrowForward sx={{ fontSize: '14px !important' }} />}
              onClick={() => { navigate('/dashboard'); setNotifAnchorEl(null); }}
              sx={{ fontSize: 12, fontWeight: 600, color: '#2563EB', borderRadius: '9px', py: 0.75, textTransform: 'none', '&:hover': { bgcolor: '#EFF6FF' } }}>
              Tableau de bord — vue d'ensemble
            </Button>
          </Box>
        )}
      </Popover>

      {/* ══════════════════════ TOAST NOUVELLE NOTIFICATION ══════════════════════ */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={7000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ top: '80px !important', right: '16px !important' }}
      >
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 2, py: 1.5,
            borderRadius: '14px',
            background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 100%)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.09)',
            minWidth: 300, maxWidth: 400,
          }}
        >
          {/* Icône animée */}
          <Box sx={{
            width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
            background: 'linear-gradient(135deg,#EF4444,#DC2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(239,68,68,0.45)',
            animation: 'bellShakeToast 0.8s ease-in-out',
            '@keyframes bellShakeToast': {
              '0%,100%': { transform: 'rotate(0deg)' },
              '20%':     { transform: 'rotate(-18deg)' },
              '40%':     { transform: 'rotate(18deg)' },
              '60%':     { transform: 'rotate(-12deg)' },
              '80%':     { transform: 'rotate(12deg)' },
            },
          }}>
            <NotificationsNone sx={{ color: '#fff', fontSize: 20 }} />
          </Box>

          {/* Texte */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.3 }}>
              Nouvelle notification
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }} noWrap>
              {snackMsg}
            </Typography>
          </Box>

          {/* Bouton Voir */}
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setSnackOpen(false);
              if (bellButtonRef.current) setNotifAnchorEl(bellButtonRef.current);
            }}
            sx={{
              fontSize: 10.5, fontWeight: 700, py: 0.4, px: 1.25,
              borderRadius: '7px', minWidth: 'unset', height: 24,
              background: 'linear-gradient(135deg,#2563EB,#4F46E5)',
              boxShadow: 'none', textTransform: 'none', flexShrink: 0,
              '&:hover': { boxShadow: '0 4px 12px rgba(37,99,235,0.4)' },
            }}
          >
            Voir
          </Button>

          {/* Fermer */}
          <IconButton
            size="small"
            onClick={() => setSnackOpen(false)}
            sx={{ color: '#475569', borderRadius: '7px', ml: 0.25, flexShrink: 0, '&:hover': { color: '#F1F5F9', bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            <Close sx={{ fontSize: 15 }} />
          </IconButton>
        </Box>
      </Snackbar>
    </Box>
  );
}
