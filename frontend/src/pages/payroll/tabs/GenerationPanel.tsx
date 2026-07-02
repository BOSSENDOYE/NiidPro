import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Button, TextField, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Chip, Avatar, IconButton, Tooltip, Dialog, DialogContent, CircularProgress,
} from '@mui/material';
import {
  PlayArrow, Visibility, Print, Download, CheckCircle,
  ReceiptLong, Groups, AttachMoney, AccountBalance, Warning, Add,
} from '@mui/icons-material';
import { employeesApi } from '../../../api/employees';
import { recruitmentApi } from '../../../api/recruitment';
import type { Employee } from '../../../types';
import BulletinViewer, { type BulletinDePaie } from './BulletinViewer';
import NouveauBulletinForm from './NouveauBulletinForm';

// ─── Constantes ───────────────────────────────────────────────────────────────

const NAV = '#0D2137';
const ACT = '#E85D04';
const TH_CELL = { color: '#fff', fontWeight: 700, fontSize: 11, py: 0.9, px: 1.25 } as const;
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color, bg }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <Box sx={{
      flex: '1 1 160px', bgcolor: bg, border: `1.5px solid ${color}22`,
      borderRadius: 2.5, p: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5,
    }}>
      <Box sx={{ bgcolor: color, borderRadius: 1.5, p: 0.9, display: 'flex', color: '#fff', mt: 0.25 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1.2 }}>{value}</Typography>
        {sub && <Typography sx={{ fontSize: 10.5, color: '#94A3B8', mt: 0.25 }}>{sub}</Typography>}
      </Box>
    </Box>
  );
}

// ─── Sous-onglet interne ──────────────────────────────────────────────────────

function SubTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Box onClick={onClick} sx={{
      px: 2.5, py: 0.9, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
      borderBottom: `2.5px solid ${active ? NAV : 'transparent'}`,
      color: active ? NAV : '#64748B',
      bgcolor: active ? '#fff' : 'transparent',
      mb: '-2px',
      '&:hover': { color: NAV },
      transition: 'all 0.15s',
    }}>
      {label}
    </Box>
  );
}

// ─── Tableau de bord ──────────────────────────────────────────────────────────

function DashboardSubTab() {
  const now = new Date();
  const mois = now.getMonth() + 1;
  const annee = now.getFullYear();

  return (
    <Box sx={{ p: 2.5 }}>
      {/* Période en cours */}
      <Stack direction="row" alignItems="center" gap={1} mb={2.5}>
        <Box sx={{ bgcolor: NAV, borderRadius: 1.5, px: 1.5, py: 0.5 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12.5 }}>
            {MONTHS_FR[mois - 1]} {annee}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 12, color: '#64748B' }}>— Période en cours</Typography>
      </Stack>

      {/* KPIs */}
      <Stack direction="row" gap={2} flexWrap="wrap" mb={3}>
        <KpiCard label="Bulletins générés"   value="0"     icon={<ReceiptLong sx={{ fontSize: 18 }} />} color="#2563EB" bg="#EFF6FF" />
        <KpiCard label="Employés traités"    value="0"     sub="sur 0 actifs" icon={<Groups sx={{ fontSize: 18 }} />} color="#7C3AED" bg="#F5F3FF" />
        <KpiCard label="Masse brute"         value="0 F"   icon={<AttachMoney sx={{ fontSize: 18 }} />} color="#059669" bg="#ECFDF5" />
        <KpiCard label="Masse nette"         value="0 F"   icon={<AccountBalance sx={{ fontSize: 18 }} />} color="#0284C7" bg="#F0F9FF" />
        <KpiCard label="Charges patronales"  value="0 F"   icon={<AttachMoney sx={{ fontSize: 18 }} />} color="#D97706" bg="#FFFBEB" />
        <KpiCard label="Sans modèle"         value="0"     sub="Nécessite attention" icon={<Warning sx={{ fontSize: 18 }} />} color="#DC2626" bg="#FEF2F2" />
      </Stack>

      {/* Message d'information */}
      <Box sx={{
        border: '1.5px dashed #CBD5E1', borderRadius: 2.5, p: 3,
        textAlign: 'center', color: '#94A3B8',
      }}>
        <ReceiptLong sx={{ fontSize: 48, mb: 1, opacity: 0.35 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
          Aucun bulletin généré pour {MONTHS_FR[mois - 1]} {annee}
        </Typography>
        <Typography sx={{ fontSize: 11.5, mt: 0.5 }}>
          Rendez-vous dans l'onglet <strong>Générer</strong> pour lancer la génération de la paie
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Générer ──────────────────────────────────────────────────────────────────

function GenererSubTab({ onPreview }: { onPreview: (b: BulletinDePaie) => void }) {
  const now = new Date();
  const [mois,  setMois]  = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);

  const { data: employeesRaw = [], isLoading } = useQuery({
    queryKey: ['employees', 1, '', 'all'],
    queryFn: () => employeesApi.list({ page: 1, per_page: 500 }).then((r) => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Employee[];
    }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['payroll-templates'],
    queryFn: () => import('../../../api/payrollTemplates').then(m => m.getPayrollTemplates()),
  });

  const { data: indices = [] } = useQuery({
    queryKey: ['payroll', 'params', 'indices'],
    queryFn: () => recruitmentApi.getIndices().then(r => r.data),
  });

  const employees = useMemo(() => {
    return employeesRaw.filter((e: Employee) =>
      !search || `${e.first_name} ${e.last_name} ${e.employee_number}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [employeesRaw, search]);

  const toggleAll = () => {
    if (selected.length === employees.length) setSelected([]);
    else setSelected(employees.map((e: Employee) => e.id));
  };

  const toggle = (id: number) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const readyCount = employees.filter((e: Employee) =>
    (e as Employee & { payroll_template_id?: number }).payroll_template_id
  ).length;

  // Mock: preview d'un bulletin de démonstration pour visualiser l'interface
  const handlePreview = (emp: Employee) => {
    const mockBulletin: BulletinDePaie = {
      employee_id: emp.id,
      matricule: emp.employee_number,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      mois,
      annee,
      modele_name: (emp as Employee & { payroll_template_id?: number }).payroll_template_id
        ? `Modèle #${(emp as Employee & { payroll_template_id?: number }).payroll_template_id}`
        : '—',
      indice_code: '—',
      montant_coupure: 0,
      heures_non_travaillees: 0,
      lignes: [
        { rubrique: 'solde mensuelle indiciaire', gain: 102985, bold: true },
        { rubrique: 'complément spécial de solde', nombre: 20, base_calcul: 20, gain: 20596 },
        { rubrique: 'indemnité de résidence', nombre: 14, base_calcul: 14, gain: 14417 },
        { rubrique: 'augmentation 04-94', gain: 15500 },
        { rubrique: 'augmentation 01-2000', gain: 6294 },
        { rubrique: 'augmentation 01-2002', gain: 5000 },
        { rubrique: 'augmentation salaire 10-2004', gain: 7500 },
        { rubrique: 'augmentation 10-2005', gain: 10000 },
        { rubrique: 'augmentation salaire 07-89', gain: 3515 },
        { rubrique: 'augmentation solde 07-82 et 01/85', gain: 3000 },
        { rubrique: 'augmentation 07/83', gain: 2000 },
        { rubrique: 'Prime de sujétion', gain: null },
        { rubrique: 'Prime de risque', gain: 50000 },
        { rubrique: 'Rappel d\'avancement', gain: null },
        { rubrique: 'Prime transport', gain: null },
        { rubrique: 'Sursalaire', bold: true },
        { rubrique: 'Heure supplémentaire', bold: true },
        { rubrique: 'SALAIRE BRUT SOCIAL', is_section: true },
        { rubrique: 'IPRES', is_section: true },
        { rubrique: 'IPRES Régime Général', base_calcul: 190809, taux_salarial: 5, montant_salarial: 10685, taux_patronal: 8, montant_patronal: 16028 },
        { rubrique: 'IPRES Régime Complémentaire', taux_salarial: 2.4, taux_patronal: 3 },
        { rubrique: 'IPM Cotisation' },
        { rubrique: 'C.S.S', is_section: true, base_calcul: 63000, taux_patronal: 8, montant_patronal: 5040 },
        { rubrique: 'CFCE', base_calcul: 240809, taux_patronal: 3, montant_patronal: 7224 },
        { rubrique: 'IR', base_calcul: 190809 },
        { rubrique: 'TRIMF', montant_salarial: 500 },
        { rubrique: 'Check off' },
        { rubrique: 'Avance tabaski', base_calcul: 100000 },
        { rubrique: 'Retenue tabaski', montant_salarial: 10000 },
        { rubrique: 'TOTAL COTISATIONS', is_total: true, gain: 340809, montant_salarial: 21185, montant_patronal: 28292 },
      ],
      salaire_base: 138000,
      charges_salariales: 21185,
      charges_patronales: 28292,
      net_imposable: 240809,
      salaire_reference: 102985,
      salaire_total: 269101,
      net_a_payer: 266352,
      status: 'draft',
    };
    onPreview(mockBulletin);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    // Simulation : sera remplacée par l'appel API réel
    await new Promise(r => setTimeout(r, 1500));
    setGenerating(false);
  };

  return (
    <Box>
      {/* Barre de filtres + génération */}
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
          <Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', mb: 0.4 }}>Mois</Typography>
            <TextField select size="small" value={mois} onChange={e => setMois(Number(e.target.value))}
              sx={{ width: 130, bgcolor: '#fff' }}>
              {MONTHS_FR.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
            </TextField>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', mb: 0.4 }}>Année</Typography>
            <TextField type="number" size="small" value={annee} onChange={e => setAnnee(Number(e.target.value))}
              sx={{ width: 90, bgcolor: '#fff' }} inputProps={{ min: 2020, max: 2030 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', mb: 0.4 }}>Rechercher</Typography>
            <TextField size="small" fullWidth placeholder="Matricule ou nom…" value={search}
              onChange={e => setSearch(e.target.value)} sx={{ bgcolor: '#fff' }} />
          </Box>
          <Stack direction="row" gap={1} pb={0.2}>
            <Button
              variant="contained" size="small" startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <PlayArrow />}
              onClick={handleGenerate}
              disabled={selected.length === 0 || generating}
              sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#162032' }, borderRadius: '7px', fontWeight: 700, fontSize: 12, px: 2 }}>
              {generating ? 'Génération…' : `Générer (${selected.length})`}
            </Button>
            <Button variant="outlined" size="small" startIcon={<Download />}
              sx={{ borderRadius: '7px', fontSize: 12, borderColor: '#CBD5E1', color: '#64748B' }}>
              Exporter
            </Button>
          </Stack>
        </Stack>

        {/* Infos rapides */}
        <Stack direction="row" gap={2} mt={1}>
          <Typography sx={{ fontSize: 11, color: '#64748B' }}>
            <strong style={{ color: '#059669' }}>{readyCount}</strong> employés prêts ·{' '}
            <strong style={{ color: '#DC2626' }}>{employees.length - readyCount}</strong> sans modèle ·{' '}
            <strong style={{ color: NAV }}>{employees.length}</strong> au total
          </Typography>
          {selected.length > 0 && (
            <Typography sx={{ fontSize: 11, color: ACT, fontWeight: 700 }}>
              {selected.length} sélectionné(s)
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Tableau employés */}
      {isLoading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: NAV }}>
                <TableCell padding="checkbox" sx={{ ...TH_CELL, pl: 1.5 }}>
                  <Box
                    component="input" type="checkbox"
                    checked={selected.length === employees.length && employees.length > 0}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer', width: 14, height: 14, accentColor: ACT }}
                  />
                </TableCell>
                {['N°','Matricule','Agent','Direction','Modèle','Indice','Statut','Action'].map(h => (
                  <TableCell key={h} sx={TH_CELL}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', color: '#94A3B8', py: 3 }}>
                    Aucun employé trouvé
                  </TableCell>
                </TableRow>
              ) : employees.map((e: Employee, i: number) => {
                const hasModel = !!(e as Employee & { payroll_template_id?: number }).payroll_template_id;
                const isSel    = selected.includes(e.id);
                return (
                  <TableRow key={e.id} hover sx={{ bgcolor: isSel ? '#EFF6FF' : i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    <TableCell padding="checkbox" sx={{ pl: 1.5 }}>
                      <Box
                        component="input" type="checkbox"
                        checked={isSel}
                        onChange={() => toggle(e.id)}
                        style={{ cursor: 'pointer', width: 14, height: 14, accentColor: ACT }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: '#64748B', textAlign: 'center' }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontFamily: 'monospace', fontWeight: 600, color: NAV }}>
                      {e.employee_number}
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 26, height: 26, fontSize: 9, fontWeight: 700, bgcolor: NAV }}>
                          {`${e.first_name?.[0] ?? ''}${e.last_name?.[0] ?? ''}`}
                        </Avatar>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                          {e.first_name} {e.last_name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {(e as Employee & { department?: { name: string } }).department?.name
                        ? <Chip label={(e as Employee & { department?: { name: string } }).department!.name} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 700 }} />
                        : <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>—</Typography>}
                    </TableCell>
                    <TableCell>
                      {hasModel
                        ? <Chip label="Affecté" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#ECFDF5', color: '#059669', fontWeight: 700 }} />
                        : <Chip label="Non affecté" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 700 }} />}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>—</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label="En attente" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#FFFBEB', color: '#D97706', fontWeight: 700, border: '1px solid #D9770630' }} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Aperçu bulletin">
                        <IconButton size="small" onClick={() => handlePreview(e)}>
                          <Visibility sx={{ fontSize: 15, color: '#2563EB' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// ─── Historique ───────────────────────────────────────────────────────────────

function HistoriqueSubTab({ onPreview }: { onPreview: (b: BulletinDePaie) => void }) {
  const now = new Date();
  const [mois,     setMois]     = useState(now.getMonth() + 1);
  const [annee,    setAnnee]    = useState(now.getFullYear());
  const [search,   setSearch]   = useState('');
  const [nouveau,  setNouveau]  = useState(false);

  // Placeholder — sera remplacé par une vraie query API
  const bulletins: BulletinDePaie[] = [];

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    draft:     { label: 'Brouillon', color: '#D97706', bg: '#FFFBEB' },
    validated: { label: 'Validé',    color: '#2563EB', bg: '#EFF6FF' },
    paid:      { label: 'Payé',      color: '#059669', bg: '#ECFDF5' },
  };

  return (
    <Box>
      {/* Barre actions */}
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
          <Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', mb: 0.4 }}>Mois</Typography>
            <TextField select size="small" value={mois} onChange={e => setMois(Number(e.target.value))} sx={{ width: 130, bgcolor: '#fff' }}>
              {MONTHS_FR.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
            </TextField>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', mb: 0.4 }}>Année</Typography>
            <TextField type="number" size="small" value={annee} onChange={e => setAnnee(Number(e.target.value))} sx={{ width: 90, bgcolor: '#fff' }} inputProps={{ min: 2020, max: 2030 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', mb: 0.4 }}>Rechercher</Typography>
            <TextField size="small" fullWidth placeholder="Matricule ou nom…" value={search} onChange={e => setSearch(e.target.value)} sx={{ bgcolor: '#fff' }} />
          </Box>
          <Stack direction="row" gap={1} pb={0.2}>
            <Button variant="outlined" size="small" startIcon={<Download />}
              sx={{ borderRadius: '7px', fontSize: 12, borderColor: '#059669', color: '#059669' }}>
              Exporter ZIP
            </Button>
            <Button variant="outlined" size="small" startIcon={<Print />}
              sx={{ borderRadius: '7px', fontSize: 12, borderColor: NAV, color: NAV }}>
              Imprimer tout
            </Button>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setNouveau(true)}
              sx={{ borderRadius: '7px', fontSize: 12, fontWeight: 700, bgcolor: ACT, '&:hover': { bgcolor: '#C2410C' } }}>
              Nouveau bulletin
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Tableau / état vide */}
      {bulletins.length === 0 ? (
        <Box sx={{ p: 5, textAlign: 'center', color: '#94A3B8' }}>
          <ReceiptLong sx={{ fontSize: 52, mb: 1.5, opacity: 0.3 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
            Aucun bulletin pour {MONTHS_FR[mois - 1]} {annee}
          </Typography>
          <Typography sx={{ fontSize: 11.5, mt: 0.5, mb: 2 }}>
            Créez un bulletin individuel ou générez la paie depuis l'onglet <strong>Générer</strong>
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setNouveau(true)}
            sx={{ bgcolor: ACT, '&:hover': { bgcolor: '#C2410C' }, fontWeight: 700, textTransform: 'none' }}>
            Nouveau bulletin
          </Button>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: NAV }}>
                {['N°','Matricule','Agent','Direction','Salaire Brut','Retenues','Charges Pat.','Net à Payer','Statut','Actions'].map(h => (
                  <TableCell key={h} sx={TH_CELL}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {bulletins.map((b, i) => {
                const sc = statusConfig[b.status ?? 'draft'];
                return (
                  <TableRow key={b.id ?? i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    <TableCell sx={{ fontSize: 11.5, color: '#64748B', textAlign: 'center' }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontFamily: 'monospace', fontWeight: 600, color: NAV }}>{b.matricule}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{b.employee_name}</TableCell>
                    <TableCell>
                      <Chip label={b.department ?? '—'} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                      {new Intl.NumberFormat('fr-FR').format(b.salaire_base)} F
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#DC2626' }}>
                      {new Intl.NumberFormat('fr-FR').format(b.charges_salariales)} F
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#D97706' }}>
                      {new Intl.NumberFormat('fr-FR').format(b.charges_patronales)} F
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#059669' }}>
                      {new Intl.NumberFormat('fr-FR').format(b.net_a_payer)} F
                    </TableCell>
                    <TableCell>
                      <Chip label={sc.label} size="small" sx={{ fontSize: 10, height: 20, fontWeight: 700, bgcolor: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.25}>
                        <Tooltip title="Voir le bulletin">
                          <IconButton size="small" onClick={() => onPreview(b)}>
                            <Visibility sx={{ fontSize: 15, color: '#2563EB' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Valider">
                          <IconButton size="small"><CheckCircle sx={{ fontSize: 15, color: '#059669' }} /></IconButton>
                        </Tooltip>
                        <Tooltip title="Imprimer">
                          <IconButton size="small"><Print sx={{ fontSize: 15, color: NAV }} /></IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Formulaire nouveau bulletin */}
      <NouveauBulletinForm open={nouveau} onClose={() => setNouveau(false)} />
    </Box>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export default function GenerationPanel() {
  const [sub, setSub] = useState(1);
  const [bulletin, setBulletin] = useState<BulletinDePaie | null>(null);

  const SUB_TABS = ['Tableau de bord', 'Générer', 'Historique'];

  return (
    <Box>
      {/* Sous-onglets */}
      <Box sx={{
        display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0', bgcolor: '#F8FAFC',
      }}>
        {SUB_TABS.map((label, i) => (
          <SubTab key={i} label={label} active={sub === i} onClick={() => setSub(i)} />
        ))}
      </Box>

      {/* Contenu */}
      {sub === 0 && <DashboardSubTab />}
      {sub === 1 && <GenererSubTab onPreview={setBulletin} />}
      {sub === 2 && <HistoriqueSubTab onPreview={setBulletin} />}

      {/* Dialog visualisation bulletin */}
      <Dialog
        open={bulletin !== null}
        onClose={() => setBulletin(null)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden', p: 0, maxHeight: '95vh' } }}
      >
        <DialogContent sx={{ p: 0, overflow: 'auto' }}>
          {bulletin && (
            <BulletinViewer
              bulletin={bulletin}
              onClose={() => setBulletin(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
