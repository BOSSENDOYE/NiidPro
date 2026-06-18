import { Box, Typography } from '@mui/material';

export default function SectionCard({ icon, title, subtitle, action, children }: {
  icon: React.ReactNode; title: string; subtitle?: string;
  action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '10px',
          background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', flexShrink: 0,
        }}>
          {icon}
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: 'text.primary' }}>{title}</Typography>
          {subtitle && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{subtitle}</Typography>}
        </Box>
        {action}
      </Box>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Box>
  );
}
