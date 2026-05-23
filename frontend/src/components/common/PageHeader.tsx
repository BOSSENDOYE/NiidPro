import { Box, Typography, Button } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  action?: { label: string; icon?: ReactNode; onClick: () => void };
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary">{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}
      </Box>
      {action && (
        <Button
          variant="contained"
          startIcon={action.icon}
          onClick={action.onClick}
          sx={{ ml: 2 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
