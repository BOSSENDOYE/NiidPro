import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Avatar, Menu, MenuItem, Divider, Tooltip, Badge,
  Chip,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Logout, Person, Settings,
  NotificationsNone, Dashboard, Groups, Description, AccessTime,
  CameraAlt, BeachAccess, AssignmentLate, AccountTree, CheckBox,
  Payments, BarChart, Storage, PhoneAndroid, KeyboardArrowDown,
  Circle,
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
}
interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    label: 'VUE D\'ENSEMBLE',
    items: [
      { path: '/dashboard',         label: 'Tableau de bord',   icon: <Dashboard />,      color: '#60A5FA' },
    ],
  },
  {
    label: 'GESTION RH',
    items: [
      { path: '/employees',         label: 'Agents',            icon: <Groups />,         color: '#F97316' },
      { path: '/contracts',         label: 'Contrats',          icon: <Description />,    color: '#A78BFA', badge: 3 },
      { path: '/attendances',       label: 'Pointage',          icon: <AccessTime />,     color: '#34D399' },
      { path: '/attendance-visual', label: 'Pointage visuel',   icon: <CameraAlt />,      color: '#67E8F9' },
      { path: '/leaves',            label: 'Congés & Absences', icon: <BeachAccess />,    color: '#FCD34D', badge: 4 },
      { path: '/justifications',    label: 'Justifications',    icon: <AssignmentLate />, color: '#F87171', badge: 2 },
    ],
  },
  {
    label: 'ORGANISATION',
    items: [
      { path: '/departments',  label: 'Organigramme',   icon: <AccountTree />, color: '#818CF8' },
      { path: '/tasks',        label: 'Tâches',         icon: <CheckBox />,    color: '#4ADE80' },
      { path: '/payroll',      label: 'Paie & Bulletins', icon: <Payments />, color: '#FBBF24' },
      { path: '/social-report', label: 'Bilan social',  icon: <BarChart />,   color: '#38BDF8' },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { path: '/schema', label: 'Schéma SQL', icon: <Storage />, color: '#94A3B8' },
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
  '/contracts':         'Contrats & Alertes',
  '/attendances':       'Pointage',
  '/attendance-visual': 'Pointage Visuel',
  '/leaves':            'Congés & Absences',
  '/justifications':    'Justifications',
  '/departments':       'Organigramme',
  '/tasks':             'Gestion des Tâches',
  '/payroll':           'Paie & Bulletins',
  '/social-report':     'Bilan Social',
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
    return 'NiidPro';
  })();

  const totalBadges = NAV.flatMap((s) => s.items).reduce((acc, i) => acc + (i.badge ?? 0), 0);

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
                    NiidPro
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
                      : location.pathname.startsWith(item.path);

                    return (
                      <Tooltip key={item.path} title={!open ? item.label : ''} placement="right" arrow>
                        <ListItemButton
                          onClick={() => navigate(item.path)}
                          sx={{
                            borderRadius: '9px', mb: 0.5,
                            px: open ? 1.5 : 0, py: '7px',
                            justifyContent: open ? 'flex-start' : 'center',
                            position: 'relative',
                            bgcolor: active ? SB.activeBg : 'transparent',
                            borderLeft: active ? `2px solid ${SB.activeBorder}` : '2px solid transparent',
                            '&:hover': { bgcolor: active ? SB.activeBg : SB.hoverBg },
                            transition: 'all 150ms ease',
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: open ? 34 : 'unset',
                              justifyContent: 'center',
                              '& svg': {
                                fontSize: 18,
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
                                  fontSize: 13, fontWeight: active ? 600 : 400,
                                  color: active ? SB.itemTextActive : SB.itemText,
                                  noWrap: true, letterSpacing: '-0.1px',
                                }}
                              />
                              {item.badge !== undefined && (
                                <Box sx={{
                                  minWidth: 18, height: 18, borderRadius: '9px',
                                  bgcolor: SB.badge,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  px: 0.5,
                                }}>
                                  <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                                    {item.badge}
                                  </Typography>
                                </Box>
                              )}
                            </>
                          )}

                          {!open && item.badge !== undefined && (
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
                    {userRole}
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
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #E8EDF2',
            color: 'text.primary',
            backgroundImage: 'none',
          }}
        >
          <Toolbar sx={{ minHeight: '58px !important', px: { xs: 2, md: 3 }, gap: 2 }}>
            {/* Page title */}
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontSize: 16, color: '#0F172A', letterSpacing: '-0.3px', lineHeight: 1.2 }}
              >
                {currentLabel}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 11 }}>
                NiidPro · Ressources Humaines
              </Typography>
            </Box>

            {/* Notification */}
            <Tooltip title="Notifications">
              <IconButton size="small"
                sx={{
                  color: '#64748B', bgcolor: '#F8FAFC',
                  border: '1px solid #E2E8F0', borderRadius: '9px',
                  width: 36, height: 36,
                  '&:hover': { bgcolor: '#F1F5F9', color: '#0F172A' },
                  transition: 'all 0.15s',
                }}
              >
                <Badge
                  badgeContent={totalBadges}
                  sx={{ '& .MuiBadge-badge': { bgcolor: '#EF4444', color: '#fff', fontSize: 9, minWidth: 15, height: 15, padding: '0 3px' } }}
                >
                  <NotificationsNone sx={{ fontSize: 19 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Status dot */}
            <Tooltip title="Système opérationnel">
              <Chip
                icon={<Circle sx={{ fontSize: '8px !important', color: '#10B981 !important' }} />}
                label="En ligne"
                size="small"
                sx={{
                  bgcolor: 'rgba(16,185,129,0.08)', color: '#059669',
                  border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: 11, fontWeight: 600, height: 26,
                  display: { xs: 'none', sm: 'flex' },
                }}
              />
            </Tooltip>

            <Box sx={{ width: 1, height: 22, bgcolor: '#E8EDF2' }} />

            {/* User profile */}
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.25,
                px: 1.25, py: 0.625, borderRadius: '10px', cursor: 'pointer',
                border: '1px solid #E8EDF2',
                '&:hover': { bgcolor: '#F8FAFC', borderColor: '#CBD5E1' },
                transition: 'all 0.15s',
              }}
            >
              <Avatar sx={{
                width: 30, height: 30,
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                fontSize: 11, fontWeight: 800,
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
              }}>
                {userInitials}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2, color: '#0F172A' }}>
                  {user?.name}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: '#64748B', lineHeight: 1.2 }}>
                  {userRole}
                </Typography>
              </Box>
              <KeyboardArrowDown sx={{ fontSize: 15, color: '#94A3B8', display: { xs: 'none', sm: 'block' } }} />
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
        PaperProps={{
          sx: {
            mt: 1, minWidth: 210, borderRadius: '14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.13)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
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
