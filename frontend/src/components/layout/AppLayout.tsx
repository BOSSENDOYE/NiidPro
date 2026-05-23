import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Avatar, Menu, MenuItem, Divider, Tooltip, Badge,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon, KeyboardArrowLeft, Logout, Person, Settings,
  NotificationsNone,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth';

const DRAWER_WIDTH = 256;
const COLLAPSED_WIDTH = 64;

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'VUE D\'ENSEMBLE',
    items: [
      { path: '/dashboard', label: 'Tableau de bord', icon: '◻' },
    ],
  },
  {
    label: 'GESTION RH',
    items: [
      { path: '/employees', label: 'Agents', icon: '👤' },
      { path: '/contracts', label: 'Contrats & Alertes', icon: '⏳', badge: 3 },
      { path: '/attendances', label: 'Pointage', icon: '🕐' },
      { path: '/attendance-visual', label: 'Pointage visuel', icon: '📷' },
      { path: '/leaves', label: 'Congés & Absences', icon: '📅', badge: 4 },
      { path: '/justifications', label: 'Justifications', icon: '📋', badge: 2 },
    ],
  },
  {
    label: 'ORGANISATION',
    items: [
      { path: '/departments', label: 'Organigramme', icon: '🏢' },
      { path: '/tasks', label: 'Gestion des Tâches', icon: '✅' },
      { path: '/payroll', label: 'Paie & Bulletins', icon: '💰' },
      { path: '/social-report', label: 'Bilan social', icon: '📘' },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { path: '/schema', label: 'Schéma SQL', icon: '🗄️' },
    ],
  },
  {
    label: 'ESPACE AGENT',
    items: [
      { path: '/agent-portal', label: 'Portail Agent', icon: '📱' },
    ],
  },
];

// Sidebar color tokens
const SB = {
  bg: '#0F172A',
  border: 'rgba(255,255,255,0.06)',
  sectionLabel: '#475569',
  itemText: '#94A3B8',
  itemTextActive: '#F8FAFC',
  itemIcon: '#64748B',
  itemIconActive: '#60A5FA',
  activeBg: 'rgba(37, 99, 235, 0.18)',
  activeBorder: '#3B82F6',
  hoverBg: 'rgba(255,255,255,0.05)',
  badge: '#EF4444',
};

export default function AppLayout() {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin_rh: 'Admin RH',
    manager: 'Manager',
    employe: 'Employé',
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const userRole = roleLabel[user?.roles?.[0] ?? ''] ?? user?.roles?.[0] ?? '';

  const drawerWidth = open ? DRAWER_WIDTH : COLLAPSED_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <Drawer
          variant="permanent"
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
              overflowX: 'hidden',
              bgcolor: SB.bg,
              borderRight: `1px solid ${SB.border}`,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {/* Brand */}
          <Box sx={{
            display: 'flex', alignItems: 'center',
            px: open ? 2 : 1, py: 0,
            height: 64, flexShrink: 0,
            borderBottom: `1px solid ${SB.border}`,
          }}>
            {/* Logo mark */}
            <Box sx={{
              width: 34, height: 34, borderRadius: '9px',
              background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
            }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '-0.5px' }}>
                N
              </Typography>
            </Box>
            {open && (
              <>
                <Box sx={{ ml: 1.5, overflow: 'hidden', flexGrow: 1 }}>
                  <Typography sx={{
                    color: '#F8FAFC', fontWeight: 700, fontSize: 15,
                    letterSpacing: '-0.3px', lineHeight: 1.2,
                  }}>
                    NiidPro
                  </Typography>
                  <Typography sx={{ color: SB.sectionLabel, fontSize: 10, letterSpacing: '0.06em' }}>
                    RESSOURCES HUMAINES
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setOpen(false)}
                  sx={{ color: SB.sectionLabel, '&:hover': { color: '#F8FAFC' } }}
                >
                  <KeyboardArrowLeft fontSize="small" />
                </IconButton>
              </>
            )}
            {!open && (
              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }} />
            )}
          </Box>

          {/* Navigation */}
          <Box sx={{
            flexGrow: 1, overflowY: 'auto', overflowX: 'hidden',
            py: 1.5,
            '&::-webkit-scrollbar': { width: 3 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
          }}>
            {navSections.map((section, si) => (
              <Box key={section.label} sx={{ mb: si < navSections.length - 1 ? 0.5 : 0 }}>
                {/* Section label */}
                {open && (
                  <Typography sx={{
                    px: 2.5, pt: si === 0 ? 0.5 : 2, pb: 0.75,
                    fontSize: 10, fontWeight: 700,
                    color: SB.sectionLabel,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    userSelect: 'none',
                  }}>
                    {section.label}
                  </Typography>
                )}
                {!open && si > 0 && (
                  <Divider sx={{ borderColor: SB.border, mx: 1.5, my: 0.75 }} />
                )}

                <List dense disablePadding sx={{ px: 1 }}>
                  {section.items.map((item) => {
                    const active = item.path === '/dashboard'
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path);

                    return (
                      <Tooltip
                        key={item.path}
                        title={!open ? item.label : ''}
                        placement="right"
                        arrow
                      >
                        <ListItemButton
                          onClick={() => navigate(item.path)}
                          sx={{
                            borderRadius: '8px',
                            mb: 0.5,
                            px: open ? 1.5 : 'auto',
                            py: '7px',
                            justifyContent: open ? 'flex-start' : 'center',
                            position: 'relative',
                            bgcolor: active ? SB.activeBg : 'transparent',
                            borderLeft: active
                              ? `2px solid ${SB.activeBorder}`
                              : '2px solid transparent',
                            '&:hover': {
                              bgcolor: active ? SB.activeBg : SB.hoverBg,
                            },
                            transition: 'background 150ms, border 150ms',
                          }}
                        >
                          <ListItemIcon sx={{
                            minWidth: open ? 34 : 'unset',
                            justifyContent: 'center',
                          }}>
                            <Typography sx={{
                              fontSize: item.icon === '◻' ? 16 : 17,
                              lineHeight: 1,
                              filter: active ? 'none' : 'grayscale(0.3) brightness(0.8)',
                              transition: 'filter 150ms',
                            }}>
                              {item.icon}
                            </Typography>
                          </ListItemIcon>

                          {open && (
                            <>
                              <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{
                                  fontSize: 13,
                                  fontWeight: active ? 600 : 400,
                                  color: active ? SB.itemTextActive : SB.itemText,
                                  noWrap: true,
                                  letterSpacing: '-0.1px',
                                }}
                              />
                              {item.badge !== undefined && (
                                <Box sx={{
                                  minWidth: 18, height: 18, borderRadius: '9px',
                                  bgcolor: SB.badge,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  px: 0.5,
                                }}>
                                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                                    {item.badge}
                                  </Typography>
                                </Box>
                              )}
                            </>
                          )}

                          {/* Badge dot when collapsed */}
                          {!open && item.badge !== undefined && (
                            <Box sx={{
                              position: 'absolute', top: 5, right: 5,
                              width: 6, height: 6, borderRadius: '50%',
                              bgcolor: SB.badge,
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

          {/* Expand button when collapsed */}
          {!open && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
              <Tooltip title="Agrandir" placement="right">
                <IconButton
                  size="small"
                  onClick={() => setOpen(true)}
                  sx={{ color: SB.sectionLabel, '&:hover': { color: '#F8FAFC' } }}
                >
                  <MenuIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* User section */}
          <Box sx={{ borderTop: `1px solid ${SB.border}`, p: 1.5 }}>
            {open ? (
              <Box
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1, borderRadius: '8px', cursor: 'pointer',
                  '&:hover': { bgcolor: SB.hoverBg },
                  transition: 'background 150ms',
                }}
              >
                <Avatar sx={{
                  width: 30, height: 30,
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {userInitials}
                </Avatar>
                <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9', lineHeight: 1.3 }} noWrap>
                    {user?.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: SB.sectionLabel, lineHeight: 1.3 }} noWrap>
                    {userRole}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Tooltip title={user?.name ?? 'Profil'} placement="right">
                <IconButton
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{ p: 0.5 }}
                >
                  <Avatar sx={{
                    width: 30, height: 30,
                    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {userInitials}
                  </Avatar>
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Drawer>
      </Box>

      {/* Main area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top bar */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ minHeight: '56px !important', px: 3 }}>
            {/* Page breadcrumb placeholder */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="Notifications">
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <Badge
                    badgeContent={4}
                    sx={{
                      '& .MuiBadge-badge': {
                        bgcolor: '#EF4444', color: '#fff',
                        fontSize: 10, minWidth: 16, height: 16, padding: '0 4px',
                      },
                    }}
                  >
                    <NotificationsNone sx={{ fontSize: 20 }} />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Box sx={{ width: 1, height: 20, bgcolor: '#E2E8F0', mx: 1 }} />

              <Tooltip title="Mon profil">
                <Box
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 1, py: 0.5, borderRadius: '8px', cursor: 'pointer',
                    '&:hover': { bgcolor: '#F8FAFC' },
                    transition: 'background 150ms',
                  }}
                >
                  <Avatar sx={{
                    width: 28, height: 28,
                    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {userInitials}
                  </Avatar>
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: '#0F172A' }}>
                      {user?.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748B', lineHeight: 1.2 }}>
                      {userRole}
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>

      {/* User dropdown menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1, minWidth: 200, borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            border: '1px solid #E2E8F0',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{user?.name}</Typography>
          <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Divider sx={{ borderColor: '#F1F5F9' }} />
        <MenuItem
          onClick={() => { navigate('/profile'); setAnchorEl(null); }}
          sx={{ fontSize: 14, py: 1 }}
        >
          <ListItemIcon><Person fontSize="small" sx={{ color: '#64748B' }} /></ListItemIcon>
          Mon profil
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)} sx={{ fontSize: 14, py: 1 }}>
          <ListItemIcon><Settings fontSize="small" sx={{ color: '#64748B' }} /></ListItemIcon>
          Paramètres
        </MenuItem>
        <Divider sx={{ borderColor: '#F1F5F9' }} />
        <MenuItem onClick={handleLogout} sx={{ color: '#DC2626', fontSize: 14, py: 1 }}>
          <ListItemIcon><Logout fontSize="small" sx={{ color: '#DC2626' }} /></ListItemIcon>
          Déconnexion
        </MenuItem>
      </Menu>
    </Box>
  );
}
