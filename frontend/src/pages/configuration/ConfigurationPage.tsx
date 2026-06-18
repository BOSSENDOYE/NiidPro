import { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import {
  Business, Group, Security, Email, Tune,
} from '@mui/icons-material';
import CompanyTab from './tabs/CompanyTab';
import UsersTab from './tabs/UsersTab';
import RolesTab from './tabs/RolesTab';
import MailingTab from './tabs/MailingTab';
import PreferencesTab from './tabs/PreferencesTab';

const TABS = [
  { label: 'Entreprise',       icon: <Business sx={{ fontSize: 18 }} />,  comp: <CompanyTab /> },
  { label: 'Utilisateurs',     icon: <Group sx={{ fontSize: 18 }} />,     comp: <UsersTab /> },
  { label: 'Profils & droits', icon: <Security sx={{ fontSize: 18 }} />,  comp: <RolesTab /> },
  { label: 'Paramètre mailing',icon: <Email sx={{ fontSize: 18 }} />,     comp: <MailingTab /> },
  { label: 'Préférences',      icon: <Tune sx={{ fontSize: 18 }} />,      comp: <PreferencesTab /> },
];

export default function ConfigurationPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', letterSpacing: '-0.4px' }}>
          Configuration
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
          Entreprise, utilisateurs, droits, messagerie et préférences d'affichage
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TABS.map((t, i) => (
            <Tab key={i} icon={t.icon} iconPosition="start" label={t.label}
              sx={{ minHeight: 48, fontWeight: 600, textTransform: 'none' }} />
          ))}
        </Tabs>
      </Box>

      {TABS[tab].comp}
    </Box>
  );
}
