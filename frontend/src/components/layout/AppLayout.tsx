import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leavesApi } from '../../api/leaves';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Avatar, Menu, MenuItem, Divider, Tooltip, Badge,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Logout, Person, Settings,
  NotificationsNone, Dashboard, Groups, Description, AccessTime,
  CameraAlt, BeachAccess, AssignmentLate, AccountTree, CheckBox,
  Payments, BarChart, Hub, PhoneAndroid, KeyboardArrowDown,
  Article, QrCodeScanner, Archive, School,
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
      { path: '/contracts/archives', label: 'Archive contrat',  icon: <Archive />,     color: '#C4B5FD', sub: true },
      { path: '/leaves',        label: 'Congés & Absences', icon: <BeachAccess />,    color: '#FCD34D' },
      { path: '/trainings',     label: 'Gestion Formation', icon: <School />,         color: '#8B5CF6' },
      { path: '/justifications',label: 'Justifications',    icon: <AssignmentLate />, color: '#F87171' },
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
      { path: '/organigramme',  label: 'Organigramme',          icon: <Hub />,         color: '#38BDF8' },
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
];

// Page labels for top bar
const PAGE_LABELS: Record<string, string> = {
  '/dashboard':         'Tableau de bord',
  '/employees':         'Gestion des Agents',
  '/contracts':          'Contrats & Alertes',
  '/contracts/archives': 'Archives Contrats',
  '/attendances':        'Pointage — Tableau de bord',
  '/attendance-scanner': 'Terminal de Badgeage QR',
  '/attendance-visual':  'Pointage — Calendrier',
  '/leaves':            'Congés & Absences',
  '/trainings':         'Gestion des Formations',
  '/justifications':    'Justifications',
  '/organigramme':      'Organigramme ANASER',
  '/departments':       'Directions',
  '/tasks':             'Gestion des Tâches',
  '/payroll':           'Paie & Bulletins',
  '/social-report':     'Bilan Social',
  '/documents':         'Documents de Service',
  '/schema':            'Schéma SQL',
  '/agent-portal':      'Portail Agent',
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
  const [open, setOpen]         = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout }        = useAuthStore();
  const navigate                = useNavigate();
  const location                = useLocation();

  const { data: pendingLeaves = [] } = useQuery({
    queryKey: ['leaves', 'pending'],
    queryFn: () => leavesApi.pending().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const dynamicBadges: Record<string, number> = {
    '/leaves': pendingLeaves.length,
  };

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

  const totalBadges = NAV.flatMap((s) => s.items).reduce(
    (acc, i) => acc + (i.badge ?? dynamicBadges[i.path] ?? 0), 0
  );

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
                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37,99,235,0.5)',
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 16, letterSpacing: '-1px' }}>N</Typography>
            </Box>

            {open && (
              <>
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  <Typography sx={{ color: '#F1F5F9', fontWeight: 800, fontSize: 15, letterSpacing: '-0.4px', lineHeight: 1.2 }}>
                    RH+PAIE
                  </Typography>
                  <Typography sx={{ color: SB.sectionLabel, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Ressources Humaines
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
                <Avatar sx={{
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
                  <Avatar sx={{
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
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#fff', letterSpacing: '0.06em', fontStyle: 'italic', lineHeight: 1 }}>
                  ANASER
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
              <Tooltip title={totalBadges > 0 ? `${totalBadges} alertes en attente` : 'Aucune notification'} arrow>
                <IconButton
                  size="small"
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
            background: 'linear-gradient(180deg, #EEF2F7 0%, #F1F5F9 100%)',
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
          <Avatar sx={{
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
          <MenuItem onClick={() => setAnchorEl(null)}
            sx={{ fontSize: 13, py: 1, borderRadius: '8px', gap: 1 }}>
            <Settings fontSize="small" sx={{ color: '#64748B' }} />
            Paramètres
          </MenuItem>
          <Divider sx={{ my: 0.5, borderColor: '#F1F5F9' }} />
          <MenuItem onClick={handleLogout}
            sx={{ fontSize: 13, py: 1, borderRadius: '8px', gap: 1, color: '#DC2626' }}>
            <Logout fontSize="small" sx={{ color: '#DC2626' }} />
            Déconnexion
          </MenuItem>
        </Box>
      </Menu>
    </Box>
  );
}
