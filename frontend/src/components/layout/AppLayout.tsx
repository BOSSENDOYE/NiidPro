import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Avatar, Menu, MenuItem, Divider, Tooltip,
  useTheme, alpha, Chip,
} from '@mui/material';
import {
  Dashboard, People, Business, Assignment, EventAvailable, BeachAccess,
  Menu as MenuIcon, ChevronLeft, Logout, Person, Settings, Notifications,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth';

const DRAWER_WIDTH = 260;

const navItems = [
  { path: '/dashboard', label: 'Tableau de bord', icon: <Dashboard /> },
  { path: '/employees', label: 'Employés', icon: <People /> },
  { path: '/departments', label: 'Directions', icon: <Business /> },
  { path: '/contracts', label: 'Contrats', icon: <Assignment /> },
  { path: '/attendances', label: 'Pointage', icon: <EventAvailable /> },
  { path: '/leaves', label: 'Congés', icon: <BeachAccess /> },
];

export default function AppLayout() {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: open ? DRAWER_WIDTH : 72,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? DRAWER_WIDTH : 72,
            transition: theme.transitions.create('width', { duration: 200 }),
            overflow: 'hidden',
            bgcolor: '#1E1B4B',
            color: 'white',
            border: 'none',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2.5, minHeight: 64 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2, bgcolor: '#6366F1',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 16 }}>N</Typography>
          </Box>
          {open && (
            <Typography sx={{ ml: 1.5, fontWeight: 700, fontSize: 18, color: 'white', letterSpacing: '-0.5px' }}>
              NiidPro
            </Typography>
          )}
          <Box sx={{ flexGrow: 1 }} />
          {open && (
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: alpha('#fff', 0.5) }}>
              <ChevronLeft fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

        {/* Nav */}
        <List sx={{ px: 1, mt: 1, flexGrow: 1 }}>
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Tooltip key={item.path} title={!open ? item.label : ''} placement="right">
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2, mb: 0.5, px: open ? 2 : 1.5,
                    bgcolor: active ? alpha('#6366F1', 0.3) : 'transparent',
                    '&:hover': { bgcolor: alpha('#fff', 0.08) },
                    justifyContent: open ? 'flex-start' : 'center',
                  }}
                >
                  <ListItemIcon sx={{
                    color: active ? '#A5B4FC' : alpha('#fff', 0.6),
                    minWidth: open ? 40 : 'unset',
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 14, fontWeight: active ? 600 : 400,
                        color: active ? 'white' : alpha('#fff', 0.75),
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>

        <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

        {/* User */}
        <Box sx={{ p: 1.5 }}>
          <ListItemButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ borderRadius: 2, px: open ? 1.5 : 1, justifyContent: open ? 'flex-start' : 'center' }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366F1', fontSize: 14, flexShrink: 0 }}>
              {user?.name?.[0]}
            </Avatar>
            {open && (
              <Box sx={{ ml: 1.5, overflow: 'hidden' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'white', lineHeight: 1.2 }} noWrap>
                  {user?.name}
                </Typography>
                <Typography sx={{ fontSize: 11, color: alpha('#fff', 0.5) }} noWrap>
                  {roleLabel[user?.roles?.[0] ?? ''] ?? user?.roles?.[0]}
                </Typography>
              </Box>
            )}
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Main */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <AppBar position="static" elevation={0} sx={{
          bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Toolbar sx={{ minHeight: '64px !important' }}>
            {!open && (
              <IconButton size="small" onClick={() => setOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Notifications">
              <IconButton size="small" sx={{ mr: 1 }}>
                <Notifications fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Profil">
              <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366F1', fontSize: 14 }}>
                  {user?.name?.[0]}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          <Outlet />
        </Box>
      </Box>

      {/* User menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography fontWeight={600}>{user?.name}</Typography>
          <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
          {user?.roles?.[0] && (
            <Chip label={roleLabel[user.roles[0]] ?? user.roles[0]} size="small" sx={{ mt: 0.5 }} />
          )}
        </Box>
        <Divider />
        <MenuItem onClick={() => { navigate('/profile'); setAnchorEl(null); }}>
          <ListItemIcon><Person fontSize="small" /></ListItemIcon>Mon profil
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ListItemIcon><Settings fontSize="small" /></ListItemIcon>Paramètres
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>Déconnexion
        </MenuItem>
      </Menu>
    </Box>
  );
}
