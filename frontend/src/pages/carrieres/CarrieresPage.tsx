import { useState, type ReactElement } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import { Assessment, TrendingUp, WorkspacePremium, LibraryBooks, SwapHoriz } from '@mui/icons-material';
import EvaluationsAnnuellesTab from './tabs/EvaluationsAnnuellesTab';
import AvancementsTab from './tabs/AvancementsTab';
import PromotionsTab from './tabs/PromotionsTab';
import PDITab from './tabs/PDITab';
import MobiliteTab from './tabs/MobiliteTab';

interface TabConfig {
  label: string;
  icon: ReactElement;
  component: React.ReactNode;
}

const TABS: TabConfig[] = [
  { label: 'Évaluations annuelles', icon: <Assessment sx={{ fontSize: 18 }} />,     component: <EvaluationsAnnuellesTab /> },
  { label: 'Avancements',           icon: <TrendingUp sx={{ fontSize: 18 }} />,      component: <AvancementsTab /> },
  { label: 'Promotions',            icon: <WorkspacePremium sx={{ fontSize: 18 }} />, component: <PromotionsTab /> },
  { label: 'PDI',                   icon: <LibraryBooks sx={{ fontSize: 18 }} />,    component: <PDITab /> },
  { label: 'Mobilité interne',      icon: <SwapHoriz sx={{ fontSize: 18 }} />,       component: <MobiliteTab /> },
];

export default function CarrieresPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
          Gestion des Carrières
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.5 }}>
          Évaluations annuelles · Avancements · Promotions · PDI · Mobilité interne
        </Typography>
      </Box>

      {/* Onglets */}
      <Box sx={{
        bgcolor: '#fff',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}>
        <Box sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: 13,
                fontWeight: 600,
                minHeight: 52,
                color: '#64748B',
                '&.Mui-selected': { color: '#002f59', fontWeight: 700 },
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#ff7631',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            {TABS.map((t, i) => (
              <Tab
                key={i}
                icon={t.icon}
                iconPosition="start"
                label={t.label}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {TABS[tab].component}
        </Box>
      </Box>
    </Box>
  );
}
