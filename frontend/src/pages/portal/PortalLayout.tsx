import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, Avatar, IconButton, Tooltip,
  BottomNavigation, BottomNavigationAction, Paper,
} from '@mui/material';
import {
  Home, BeachAccess, Fingerprint, Assignment, Person, Logout,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth';
import { useCompany } from '../../hooks/useCompany';

const NAV = [
  { label: 'Accueil',  icon: <Home />,        path: '/portail' },
  { label: 'Pointage', icon: <Fingerprint />, path: '/portail/pointage' },
  { label: 'Congés',   icon: <BeachAccess />, path: '/portail/conges' },
  { label: 'Tâches',   icon: <Assignment />,  path: '/portail/taches' },
  { label: 'Profil',   icon: <Person />,      path: '/portail/profil' },
];

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { name: companyName, logoUrl } = useCompany();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const currentIndex = (() => {
    const p = location.pathname;
    // match the most specific
    const idx = NAV.map((n) => n.path).reduce((best, path, i) => {
      if (path === '/portail' ? p === '/portail' : p.startsWith(path)) return i;
      return best;
    }, 0);
    return idx;
  })();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      {/* ── Barre supérieure ── */}
      <AppBar position="sticky" elevation={0}
        sx={{ background: 'linear-gradient(135deg, #002f59 0%, #014a8f 100%)', color: '#fff' }}>
        <Toolbar sx={{ gap: 1.5, minHeight: '60px !important' }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '9px', bgcolor: '#fff', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', p: logoUrl ? '3px' : 0, flexShrink: 0,
          }}>
            {logoUrl
              ? <img src={logoUrl} alt={companyName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : <Typography sx={{ color: '#002f59', fontWeight: 900, fontSize: 16 }}>{companyName[0]}</Typography>}
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15, lineHeight: 1.1 }} noWrap>{companyName}</Typography>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }} noWrap>Espace agent</Typography>
          </Box>
          <Avatar src={user?.employee?.photo_url ?? undefined}
            sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 800, bgcolor: '#ff7631' }}>
            {initials}
          </Avatar>
          <Tooltip title="Se déconnecter">
            <IconButton onClick={handleLogout} sx={{ color: 'rgba(255,255,255,0.85)' }}>
              <Logout fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* ── Contenu ── */}
      <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', pb: 9 }}>
        <Box sx={{ maxWidth: 760, mx: 'auto', p: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
      </Box>

      {/* ── Navigation basse ── */}
      <Paper elevation={8} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100, borderTop: '1px solid', borderColor: 'divider' }}>
        <BottomNavigation showLabels value={currentIndex}
          onChange={(_, v) => navigate(NAV[v].path)}
          sx={{ maxWidth: 760, mx: 'auto', '& .Mui-selected': { color: '#002f59 !important' } }}>
          {NAV.map((n) => (
            <BottomNavigationAction key={n.path} label={n.label} icon={n.icon}
              sx={{ '& .MuiBottomNavigationAction-label': { fontSize: 11 } }} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
