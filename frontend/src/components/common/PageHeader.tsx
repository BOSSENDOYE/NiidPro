import { Box, Typography, Button } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  action?: { label: string; icon?: ReactNode; onClick: () => void };
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3.5 }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Button
          variant="contained"
          startIcon={action.icon}
          onClick={action.onClick}
          sx={{
            px: 2.5, py: 1,
            borderRadius: '10px',
            fontSize: 13,
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
          }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
