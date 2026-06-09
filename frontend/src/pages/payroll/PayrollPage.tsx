import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Button, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, Avatar, TextField,
  MenuItem, Divider, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, FormControl, InputLabel,
  Select, Switch, FormControlLabel, CircularProgress,
} from '@mui/material';
import {
  Add, Edit, Delete, Download, Print, PlayArrow, CheckCircle,
  Visibility, FilterList, BarChart, Search,
  ReceiptLong, Payments, AccountBalance, Description,
  TableChart, Tune,
} from '@mui/icons-material';
import { recruitmentApi } from '../../api/recruitment';
import type {
  RecruitmentIndice, RecruitmentHierarchy,
  RecruitmentAugmentation, RecruitmentBareme,
} from '../../types';

// ─── Palette cohérente avec LeavesPage ───────────────────────────
const NAV = '#0D2137';
const ACT = '#E85D04';
const TH  = '#1A3A5C';

// ─── Composant onglet ─────────────────────────────────────────────
function NavTab({
  label, icon, active, onClick, badge,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: '6px',
        px: 2, py: 1, cursor: 'pointer', borderRadius: '8px 8px 0 0',
        fontWeight: 700, fontSize: 13, userSelect: 'none',
        bgcolor:      active ? ACT : '#fff',
        color:        active ? '#fff' : TH,
        border:       `1.5px solid ${active ? ACT : '#93C5FD'}`,
        borderBottom: 'none',
        boxShadow:    active ? '0 -2px 8px rgba(232,93,4,0.25)' : 'none',
        transition:   'all 0.15s',
        '&:hover':    { bgcolor: active ? ACT : '#EFF6FF' },
        whiteSpace: 'nowrap',
      }}
    >
      <Box sx={{ '& svg': { fontSize: 15 } }}>{icon}</Box>
      {label}
      {badge !== undefined && badge > 0 && (
        <Box sx={{
          px: 0.9, borderRadius: '10px', fontSize: 11, fontWeight: 800,
          lineHeight: '20px', minWidth: 20, textAlign: 'center',
          bgcolor: active ? 'rgba(255,255,255,0.28)' : '#E2E8F0',
          color:   active ? '#fff' : '#64748B',
        }}>
          {badge}
        </Box>
      )}
    </Box>
  );
}

// ─── Carte stat mini ──────────────────────────────────────────────
function MiniStat({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 140, bgcolor: bg, border: `1.5px solid ${color}25`, borderRadius: '10px', p: 1.75 }}>
      <Typography sx={{ fontSize: 11, color: '#64748B', mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color }}>{value}</Typography>
    </Box>
  );
}

// ─── Placeholder vide ─────────────────────────────────────────────
function EmptySlot({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ color: '#CBD5E1', mb: 1.5, '& svg': { fontSize: 52 } }}>{icon}</Box>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#94A3B8', mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: 12.5, color: '#CBD5E1' }}>{subtitle}</Typography>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 0 — Modèle Fiche de Paie
// ═══════════════════════════════════════════════════════════════════
function ModeleFicheTab() {
  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: TH }}>Modèles disponibles</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Add />}
            sx={{ borderRadius: '7px', fontSize: 12, borderColor: TH, color: TH }}>
            Nouveau modèle
          </Button>
        </Stack>
      </Box>

      <Box sx={{ p: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Ajouter modèle */}
        <Box sx={{
          width: 280, border: '2px dashed #CBD5E1', borderRadius: '10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          py: 5, cursor: 'pointer', color: '#94A3B8',
          '&:hover': { borderColor: ACT, color: ACT, bgcolor: '#FFF7F0' },
          transition: 'all 0.15s',
        }}>
          <Add sx={{ fontSize: 32, mb: 0.75 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Nouveau modèle</Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 1 — Bulletin de Paie
// ═══════════════════════════════════════════════════════════════════
function BulletinPaieTab() {
  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const now = new Date();

  const rows: { num: string; nom: string; dept: string; brut: string; emp: string; pat: string; net: string; statut: string }[] = [];

  const statusColor: Record<string, { color: string; bg: string }> = {
    brouillon: { color: '#D97706', bg: '#FFFBEB' },
    validé:    { color: '#2563EB', bg: '#EFF6FF' },
    payé:      { color: '#059669', bg: '#ECFDF5' },
  };

  return (
    <Box>
      {/* Filtres + génération */}
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField select label="Mois" size="small" defaultValue={now.getMonth() + 1} sx={{ width: 140, bgcolor: '#fff' }}>
          {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
        </TextField>
        <TextField type="number" label="Année" size="small" defaultValue={now.getFullYear()} sx={{ width: 100, bgcolor: '#fff' }} />
        <TextField select label="Direction" size="small" defaultValue="" sx={{ width: 180, bgcolor: '#fff' }}>
          <MenuItem value="">Toutes</MenuItem>
          {['DG','SG','DEP','DAC','DPSRC','DDC','DAF'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
        <Button variant="contained" size="small" startIcon={<PlayArrow />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Générer la paie
        </Button>
        <Button variant="outlined" size="small" startIcon={<Download />}
          sx={{ borderRadius: '7px', fontSize: 12, borderColor: '#CBD5E1', color: '#64748B' }}>
          Exporter
        </Button>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 1.5, p: 2.5, flexWrap: 'wrap' }}>
        <MiniStat label="Bulletins"         value="0"      color="#2563EB" bg="#EFF6FF" />
        <MiniStat label="Masse brute"       value="0 F"    color="#059669" bg="#ECFDF5" />
        <MiniStat label="Masse nette"       value="0 F"    color="#7C3AED" bg="#F5F3FF" />
        <MiniStat label="Charges patronales"value="0 F"    color="#D97706" bg="#FFFBEB" />
        <MiniStat label="Validés"           value="0"      color="#059669" bg="#ECFDF5" />
        <MiniStat label="En attente"        value="0"      color="#DC2626" bg="#FEF2F2" />
      </Box>

      {/* Table */}
      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none', mx: 0 }}>
        <Box sx={{ bgcolor: '#334155', px: 2, py: 0.75 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Bulletins de paie — {MONTHS[now.getMonth()]} {now.getFullYear()}
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                {['Matricule','Agent','Direction','Salaire Brut','Retenues Emp.','Charges Pat.','Net à Payer','Statut','Actions'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ border: 'none', p: 0 }}>
                      <EmptySlot icon={<ReceiptLong />} title="Aucun bulletin généré" subtitle="Sélectionnez un mois et cliquez sur « Générer la paie »" />
                    </TableCell>
                  </TableRow>
                )
                : rows.map((row, i) => {
                  const sc = statusColor[row.statut] ?? { color: '#64748B', bg: '#F1F5F9' };
                  return (
                    <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: '#1E3A5F' }}>{row.num}</TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 26, height: 26, fontSize: 9, fontWeight: 700, bgcolor: '#1E3A5F' }}>
                            {row.nom.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </Avatar>
                          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{row.nom}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={row.dept} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA' }} /></TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{row.brut} F</TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#DC2626' }}>{row.emp} F</TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#D97706' }}>{row.pat} F</TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{row.net} F</TableCell>
                      <TableCell>
                        <Chip label={row.statut} size="small" sx={{ fontSize: 10, height: 20, fontWeight: 700, bgcolor: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.25}>
                          <Tooltip title="Voir le bulletin"><IconButton size="small"><Visibility sx={{ fontSize: 14, color: '#64748B' }} /></IconButton></Tooltip>
                          <Tooltip title="Valider"><IconButton size="small"><CheckCircle sx={{ fontSize: 14, color: '#059669' }} /></IconButton></Tooltip>
                          <Tooltip title="Imprimer"><IconButton size="small"><Print sx={{ fontSize: 14, color: '#2563EB' }} /></IconButton></Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 2 — Gestion des Indemnités
// ═══════════════════════════════════════════════════════════════════
function GestionIndemnitesTab() {
  const rows: { code: string; libelle: string; mode: string; valeur: string; impose: string; statut: string }[] = [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: TH }}>Types d'indemnités ({rows.length})</Typography>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Nouvelle indemnité
        </Button>
      </Box>

      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                {['Code','Libellé','Mode de calcul','Valeur','Imposable','Statut','Actions'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ border: 'none', p: 0 }}>
                      <EmptySlot icon={<Payments />} title="Aucune indemnité configurée" subtitle="Cliquez sur « Nouvelle indemnité » pour en ajouter une" />
                    </TableCell>
                  </TableRow>
                )
                : rows.map((row, i) => (
                  <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' }}>{row.code}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{row.libelle}</TableCell>
                    <TableCell>
                      <Chip label={row.mode} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{row.valeur}</TableCell>
                    <TableCell>
                      <Chip label={row.impose} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700,
                        bgcolor: row.impose === 'Oui' ? '#FEF2F2' : '#ECFDF5',
                        color:   row.impose === 'Oui' ? '#DC2626'  : '#059669',
                      }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={row.statut} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700,
                        bgcolor: row.statut === 'actif' ? '#ECFDF5' : '#F1F5F9',
                        color:   row.statut === 'actif' ? '#059669'  : '#94A3B8',
                      }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.25}>
                        <Tooltip title="Modifier"><IconButton size="small"><Edit sx={{ fontSize: 14, color: '#2563EB' }} /></IconButton></Tooltip>
                        <Tooltip title="Supprimer"><IconButton size="small"><Delete sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 3 — Rapport des États
// ═══════════════════════════════════════════════════════════════════
function RapportEtatsTab() {
  return (
    <Box>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField select label="Période" size="small" defaultValue="mensuel" sx={{ width: 140, bgcolor: '#fff' }}>
          {['mensuel','trimestriel','annuel'].map((v) => <MenuItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</MenuItem>)}
        </TextField>
        <TextField select label="Mois" size="small" defaultValue="6" sx={{ width: 130, bgcolor: '#fff' }}>
          {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
            .map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
        </TextField>
        <TextField type="number" label="Année" size="small" defaultValue={2026} sx={{ width: 100, bgcolor: '#fff' }} />
        <Button size="small" variant="contained" startIcon={<FilterList />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Générer rapport
        </Button>
        <Button size="small" variant="outlined" startIcon={<Download />}
          sx={{ borderRadius: '7px', fontSize: 12, borderColor: '#CBD5E1', color: '#64748B', ml: 'auto' }}>
          Exporter CSV
        </Button>
      </Box>

      {/* Cards résumé */}
      <Box sx={{ display: 'flex', gap: 1.5, p: 2.5, flexWrap: 'wrap' }}>
        <MiniStat label="Total agents payés"    value="0"    color="#2563EB" bg="#EFF6FF" />
        <MiniStat label="Masse salariale brute" value="0 F"  color="#059669" bg="#ECFDF5" />
        <MiniStat label="Total retenues"        value="0 F"  color="#DC2626" bg="#FEF2F2" />
        <MiniStat label="Total charges pat."    value="0 F"  color="#D97706" bg="#FFFBEB" />
        <MiniStat label="Masse nette versée"    value="0 F"  color="#7C3AED" bg="#F5F3FF" />
      </Box>

      {/* Tableau par direction */}
      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
        <Box sx={{ bgcolor: '#334155', px: 2, py: 0.75 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Récapitulatif par Direction
          </Typography>
        </Box>
        <EmptySlot icon={<BarChart />} title="Aucun rapport disponible" subtitle="Générez la paie du mois puis cliquez sur « Générer rapport »" />
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 4 — États de Paiement
// ═══════════════════════════════════════════════════════════════════
function EtatsPaiementTab() {
  const rows: { num: string; nom: string; net: string; mode: string; statut: string; date: string }[] = [];

  return (
    <Box>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: TH }}>Paiements du mois en cours</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button size="small" variant="contained"
            startIcon={<CheckCircle />}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
            Confirmer tous les paiements
          </Button>
          <Button size="small" variant="outlined" startIcon={<Download />}
            sx={{ borderRadius: '7px', fontSize: 12, borderColor: '#CBD5E1', color: '#64748B' }}>
            Ordre de virement
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, px: 2.5, py: 2, flexWrap: 'wrap' }}>
        <MiniStat label="Total à payer"  value="0 F" color="#2563EB" bg="#EFF6FF" />
        <MiniStat label="Payés"          value="0 F" color="#059669" bg="#ECFDF5" />
        <MiniStat label="En attente"     value="0 F" color="#D97706" bg="#FFFBEB" />
      </Box>

      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                {['Matricule','Agent','Net à Payer','Mode de Paiement','Statut','Date Paiement','Action'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ border: 'none', p: 0 }}>
                      <EmptySlot icon={<AccountBalance />} title="Aucun paiement à traiter" subtitle="Générez et validez les bulletins pour voir les états de paiement" />
                    </TableCell>
                  </TableRow>
                )
                : rows.map((row, i) => (
                  <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' }}>{row.num}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{row.nom}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{row.net}</TableCell>
                    <TableCell>
                      <Chip label={row.mode} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={row.statut} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700,
                        bgcolor: row.statut === 'payé' ? '#ECFDF5' : '#FFFBEB',
                        color:   row.statut === 'payé' ? '#059669'  : '#D97706',
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{row.date}</TableCell>
                    <TableCell>
                      {row.statut !== 'payé' && (
                        <Button size="small" variant="contained"
                          sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, borderRadius: '6px', fontSize: 10, fontWeight: 700, py: 0.25, px: 1 }}>
                          Confirmer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 5 — Paramètres (connectés à l'API)
// ═══════════════════════════════════════════════════════════════════

function SubTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Box onClick={onClick} sx={{
      px: 2, py: 0.75, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
      borderBottom: `2.5px solid ${active ? '#2563EB' : 'transparent'}`,
      color: active ? '#2563EB' : '#64748B',
      '&:hover': { color: '#2563EB' },
      transition: 'all 0.15s',
      userSelect: 'none',
    }}>
      {label}
    </Box>
  );
}

function ParametresTab() {
  const qc = useQueryClient();
  const [sub, setSub] = useState(0);

  // ── Queries ──
  const { data: indices = [], isLoading: li } = useQuery({
    queryKey: ['payroll', 'params', 'indices'],
    queryFn: () => recruitmentApi.getIndices().then((r) => r.data),
  });
  const { data: hierarchies = [], isLoading: lh } = useQuery({
    queryKey: ['payroll', 'params', 'hierarchies'],
    queryFn: () => recruitmentApi.getHierarchies().then((r) => r.data),
  });
  const { data: augmentations = [], isLoading: la } = useQuery({
    queryKey: ['payroll', 'params', 'augmentations'],
    queryFn: () => recruitmentApi.getAugmentations().then((r) => r.data),
  });
  const { data: baremes = [], isLoading: lb } = useQuery({
    queryKey: ['payroll', 'params', 'baremes'],
    queryFn: () => recruitmentApi.getBaremes().then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['payroll', 'params'] });

  // ── Dialog + form state ──
  const [dlg, setDlg] = useState<{ type: 'indice' | 'hier' | 'aug' | 'bareme' | null; item: unknown }>({ type: null, item: null });
  const [indF, setIndF]   = useState({ code: '', hierarchy_id: '', classe: '', echelon_label: '', valeur_point: '', valeur: '', solde_mensuelle: '', garde: '', description: '', is_active: true, augmentation_ids: [] as number[] });
  const [herF, setHerF]   = useState({ code: '', libelle: '', description: '', ordre: '0', is_active: true });
  const [augF, setAugF]   = useState({ libelle: '', type: 'indiciaire', taux: '', unite: 'pourcentage', date_effet: '', description: '', is_active: true });
  const [barF, setBarF]   = useState({ revenu_brut: '', trimf_pers: '300', part_1: '0', part_1_5: '0', part_2: '0', part_2_5: '0', part_3: '0', part_3_5: '0', part_4: '0', part_4_5: '0', part_5: '0', id_bareme: '' });
  const [augSearch, setAugSearch] = useState('');
  const [indF2, setIndF2] = useState({ hier: '', grade: '', numero: '' });

  const openDlg = (type: typeof dlg['type'], item?: unknown) => {
    setDlg({ type, item: item ?? null });
    if (type === 'indice') {
      const v = item as RecruitmentIndice | undefined;
      setIndF(v ? {
        code: v.code,
        hierarchy_id: v.hierarchy_id ? String(v.hierarchy_id) : '',
        classe: v.classe ?? '',
        echelon_label: v.echelon_label ?? '',
        valeur_point: v.valeur_point ? String(v.valeur_point) : '',
        valeur: String(v.valeur),
        solde_mensuelle: v.solde_mensuelle ? String(v.solde_mensuelle) : '',
        garde: v.garde ?? '',
        description: v.description ?? '',
        is_active: v.is_active,
        augmentation_ids: v.augmentations?.map((a) => a.id) ?? [],
      } : { code: '', hierarchy_id: '', classe: '', echelon_label: '', valeur_point: '', valeur: '', solde_mensuelle: '', garde: '', description: '', is_active: true, augmentation_ids: [] });
    } else if (type === 'hier') {
      const v = item as RecruitmentHierarchy | undefined;
      setHerF(v ? { code: v.code, libelle: v.libelle, description: v.description ?? '', ordre: String(v.ordre), is_active: v.is_active } : { code: '', libelle: '', description: '', ordre: '0', is_active: true });
    } else if (type === 'aug') {
      const v = item as RecruitmentAugmentation | undefined;
      setAugF(v ? { libelle: v.libelle, type: v.type, taux: String(v.taux), unite: v.unite, date_effet: v.date_effet ?? '', description: v.description ?? '', is_active: v.is_active } : { libelle: '', type: 'indiciaire', taux: '', unite: 'pourcentage', date_effet: '', description: '', is_active: true });
    } else if (type === 'bareme') {
      const v = item as RecruitmentBareme | undefined;
      setBarF(v ? {
        revenu_brut: String(v.revenu_brut ?? v.salaire_base ?? ''),
        trimf_pers: String(v.trimf_pers ?? 300),
        part_1: String(v.part_1 ?? 0),
        part_1_5: String(v.part_1_5 ?? 0),
        part_2: String(v.part_2 ?? 0),
        part_2_5: String(v.part_2_5 ?? 0),
        part_3: String(v.part_3 ?? 0),
        part_3_5: String(v.part_3_5 ?? 0),
        part_4: String(v.part_4 ?? 0),
        part_4_5: String(v.part_4_5 ?? 0),
        part_5: String(v.part_5 ?? 0),
        id_bareme: v.id_bareme ?? '',
      } : { revenu_brut: '', trimf_pers: '300', part_1: '0', part_1_5: '0', part_2: '0', part_2_5: '0', part_3: '0', part_3_5: '0', part_4: '0', part_4_5: '0', part_5: '0', id_bareme: String(Date.now()) });
    }
  };
  const closeDlg = () => setDlg({ type: null, item: null });

  // ── Mutations ──
  const saveInd = useMutation({
    mutationFn: () => {
      const d = {
        code: indF.code,
        hierarchy_id: indF.hierarchy_id ? Number(indF.hierarchy_id) : null,
        classe: indF.classe || null,
        echelon_label: indF.echelon_label || null,
        valeur_point: indF.valeur_point ? Number(indF.valeur_point) : null,
        valeur: Number(indF.valeur),
        solde_mensuelle: indF.solde_mensuelle ? Number(indF.solde_mensuelle) : null,
        garde: indF.garde || null,
        description: indF.description || null,
        is_active: indF.is_active,
        augmentation_ids: indF.augmentation_ids,
      };
      return (dlg.item as RecruitmentIndice | null)?.id
        ? recruitmentApi.updateIndice((dlg.item as RecruitmentIndice).id, d as never)
        : recruitmentApi.createIndice(d as never);
    },
    onSuccess: () => { invalidate(); closeDlg(); },
  });
  const delInd = useMutation({ mutationFn: (id: number) => recruitmentApi.deleteIndice(id), onSuccess: invalidate });

  const saveHer = useMutation({
    mutationFn: () => {
      const d = { ...herF, ordre: Number(herF.ordre) };
      return (dlg.item as RecruitmentHierarchy | null)?.id
        ? recruitmentApi.updateHierarchy((dlg.item as RecruitmentHierarchy).id, d)
        : recruitmentApi.createHierarchy(d);
    },
    onSuccess: () => { invalidate(); closeDlg(); },
  });
  const delHer = useMutation({ mutationFn: (id: number) => recruitmentApi.deleteHierarchy(id), onSuccess: invalidate });

  const saveAug = useMutation({
    mutationFn: () => {
      const d = { ...augF, taux: Number(augF.taux) };
      return (dlg.item as RecruitmentAugmentation | null)?.id
        ? recruitmentApi.updateAugmentation((dlg.item as RecruitmentAugmentation).id, d)
        : recruitmentApi.createAugmentation(d);
    },
    onSuccess: () => { invalidate(); closeDlg(); },
  });
  const delAug = useMutation({ mutationFn: (id: number) => recruitmentApi.deleteAugmentation(id), onSuccess: invalidate });

  const saveBar = useMutation({
    mutationFn: () => {
      const d = {
        revenu_brut: Number(barF.revenu_brut) || 0,
        salaire_base: Number(barF.revenu_brut) || 0,
        trimf_pers: Number(barF.trimf_pers) || 0,
        part_1: Number(barF.part_1) || 0,
        part_1_5: Number(barF.part_1_5) || 0,
        part_2: Number(barF.part_2) || 0,
        part_2_5: Number(barF.part_2_5) || 0,
        part_3: Number(barF.part_3) || 0,
        part_3_5: Number(barF.part_3_5) || 0,
        part_4: Number(barF.part_4) || 0,
        part_4_5: Number(barF.part_4_5) || 0,
        part_5: Number(barF.part_5) || 0,
        id_bareme: barF.id_bareme || String(Date.now()),
      };
      return (dlg.item as RecruitmentBareme | null)?.id
        ? recruitmentApi.updateBareme((dlg.item as RecruitmentBareme).id, d as never)
        : recruitmentApi.createBareme(d as never);
    },
    onSuccess: () => { invalidate(); closeDlg(); },
  });
  const delBar = useMutation({ mutationFn: (id: number) => recruitmentApi.deleteBareme(id), onSuccess: invalidate });

  const TH_CELL = { color: '#fff', fontWeight: 700, fontSize: 11, py: 1 };
  const subTabs = ['Indice', 'Augmentation', 'Hiérarchies', 'Barème', 'Rapports'];

  const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const now2 = new Date();
  const [rapF, setRapF] = useState({ annee: String(now2.getFullYear()), mois: String(now2.getMonth() + 1), matricule: '' });
  const [barF2, setBarF2] = useState({ revenu_brut: '', trimf_pers: '', parts: '' });

  return (
    <Box>
      {/* Sous-onglets */}
      <Box sx={{ display: 'flex', px: 2.5, pt: 1.5, gap: 0, borderBottom: '2px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
        {subTabs.map((s, i) => (
          <SubTab key={i} label={s} active={sub === i} onClick={() => setSub(i)} />
        ))}
      </Box>

      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>

        {/* ─── Indice ─── */}
        {sub === 0 && (() => {
          const filtered = indices.filter((r: RecruitmentIndice) => {
            const hierMatch = !indF2.hier || (r.hierarchy?.code ?? '').toLowerCase().includes(indF2.hier.toLowerCase());
            const gradeMatch = !indF2.grade || (r.garde ?? '').toLowerCase().includes(indF2.grade.toLowerCase());
            const numMatch   = !indF2.numero || String(r.valeur).includes(indF2.numero);
            return hierMatch && gradeMatch && numMatch;
          });
          return (
            <Box>
              {/* Titre */}
              <Box sx={{ bgcolor: '#0D2137', px: 2.5, py: 1.2 }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Liste des Indices</Typography>
              </Box>

              {/* Filtres */}
              <Box sx={{ m: 2, border: '1.5px solid #CBD5E1', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, px: 2.5, py: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Hiérarchie</Typography>
                    <TextField size="small" fullWidth value={indF2.hier}
                      onChange={(e) => setIndF2((f) => ({ ...f, hier: e.target.value }))}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Grade</Typography>
                    <TextField size="small" fullWidth value={indF2.grade}
                      onChange={(e) => setIndF2((f) => ({ ...f, grade: e.target.value }))}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Numéro Indice</Typography>
                    <TextField size="small" fullWidth value={indF2.numero}
                      onChange={(e) => setIndF2((f) => ({ ...f, numero: e.target.value }))}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pb: 0.25 }}>
                    <Button variant="outlined" size="small"
                      sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 90, color: '#2563EB', borderColor: '#2563EB' }}>
                      Chercher
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => setIndF2({ hier: '', grade: '', numero: '' })}
                      sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 90, color: '#E85D04', borderColor: '#E85D04' }}>
                      Effacer
                    </Button>
                  </Box>
                </Box>
              </Box>

              {/* Boutons + corbeille */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, mb: 0.5, gap: 0.5 }}>
                <Tooltip title="Ajouter">
                  <IconButton size="small" onClick={() => openDlg('indice')}
                    sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#0D2A40' } }}>
                    <Add sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Supprimer sélection">
                  <IconButton size="small"
                    sx={{ bgcolor: '#EF4444', color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#DC2626' } }}>
                    <Delete sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Tableau */}
              <Box sx={{ px: 2, pb: 2 }}>
                {li ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
                ) : (
                  <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#0D2137' }}>
                          {['N° Sr','Hiérarchie','Classe','Échelon','Grade','Numéro Indice','Valeur Indicaire','Solde','Statut','Détail',''].map((h) => (
                            <TableCell key={h} sx={{ ...TH_CELL, textAlign: ['Numéro Indice','Valeur Indicaire','Solde'].includes(h) ? 'right' : 'center' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.length === 0 ? (
                          <TableRow><TableCell colSpan={11} sx={{ textAlign: 'center', color: '#94A3B8', py: 3, fontSize: 12 }}>
                            {Object.values(indF2).some(Boolean) ? 'Aucun résultat pour ces critères' : 'Aucun indice configuré — cliquez sur + pour en ajouter un'}
                          </TableCell></TableRow>
                        ) : filtered.map((r: RecruitmentIndice, i: number) => (
                          <TableRow key={r.id} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC', '&:hover': { bgcolor: '#EEF2FF' } }}>
                            <TableCell sx={{ fontSize: 12, color: '#64748B', textAlign: 'center', width: 50 }}>{i + 1}</TableCell>
                            <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', textAlign: 'center' }}>{r.hierarchy?.code ?? '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{r.classe ?? '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{r.echelon_label ?? '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{r.garde ?? r.code}</TableCell>
                            <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#1E3A5F', textAlign: 'right', fontFamily: 'monospace' }}>{r.valeur}</TableCell>
                            <TableCell sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>
                              {r.valeur_point ? Number(r.valeur_point).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#059669', textAlign: 'right', fontFamily: 'monospace' }}>
                              {r.solde_mensuelle ? Number(r.solde_mensuelle).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box component="span" sx={{
                                display: 'inline-block', width: 14, height: 14,
                                border: '2px solid #475569', borderRadius: '3px',
                                bgcolor: r.is_active ? '#1E3A5F' : 'transparent',
                                position: 'relative',
                                '&::after': r.is_active ? { content: '"✓"', position: 'absolute', top: -3, left: 0, fontSize: 11, color: '#fff', fontWeight: 900 } : {},
                              }} />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Tooltip title="Modifier">
                                <IconButton size="small" onClick={() => openDlg('indice', r)}>
                                  <Edit sx={{ fontSize: 15, color: '#E85D04' }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Tooltip title="Supprimer">
                                <IconButton size="small" onClick={() => delInd.mutate(r.id)}>
                                  <Delete sx={{ fontSize: 14, color: '#94A3B8' }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          );
        })()}

        {/* ─── Augmentation ─── */}
        {sub === 1 && (() => {
          const filtered = augmentations.filter((r: RecruitmentAugmentation) =>
            r.libelle.toLowerCase().includes(augSearch.toLowerCase())
          );
          return (
            <Box>
              {/* Barre de recherche */}
              <Box sx={{ m: 2, border: '1.5px solid #CBD5E1', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ bgcolor: '#EAF0F6', px: 2, py: 1, borderBottom: '1px solid #CBD5E1' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>Nom Augmentation</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5 }}>
                  <TextField
                    size="small" fullWidth
                    value={augSearch}
                    onChange={(e) => setAugSearch(e.target.value)}
                    sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }}
                  />
                  <Button variant="outlined" size="small" onClick={() => {}}
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 90, color: '#2563EB', borderColor: '#2563EB', whiteSpace: 'nowrap' }}>
                    Chercher
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => setAugSearch('')}
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 80, color: '#E85D04', borderColor: '#E85D04', whiteSpace: 'nowrap' }}>
                    Effacer
                  </Button>
                </Box>
              </Box>

              {/* Tableau */}
              <Box sx={{ px: 2, pb: 2 }}>
                {/* Boutons + corbeille au-dessus du tableau */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5, gap: 0.5 }}>
                  <Tooltip title="Ajouter">
                    <IconButton size="small" onClick={() => openDlg('aug')}
                      sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#0D2A40' } }}>
                      <Add sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer sélection">
                    <IconButton size="small"
                      sx={{ bgcolor: '#EF4444', color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#DC2626' } }}>
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {la ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
                ) : filtered.length === 0 ? (
                  <EmptySlot icon={<Payments />} title="Aucune augmentation" subtitle={augSearch ? `Aucun résultat pour « ${augSearch} »` : 'Cliquez sur + pour en ajouter une'} />
                ) : (
                  <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#0D2137' }}>
                          <TableCell sx={{ ...TH_CELL, width: 60, textAlign: 'center' }}>N° Sr</TableCell>
                          <TableCell sx={TH_CELL}>Nom Libellé</TableCell>
                          <TableCell sx={{ ...TH_CELL, textAlign: 'right' }}>valeur</TableCell>
                          <TableCell sx={{ ...TH_CELL, textAlign: 'center', width: 80 }}>Statut</TableCell>
                          <TableCell sx={{ ...TH_CELL, textAlign: 'center', width: 70 }}>Voir</TableCell>
                          <TableCell sx={{ ...TH_CELL, width: 40 }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.map((r: RecruitmentAugmentation, i: number) => (
                          <TableRow key={r.id} hover sx={{ bgcolor: '#fff', '&:hover': { bgcolor: '#F0F4F8' } }}>
                            <TableCell sx={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>{i + 1}</TableCell>
                            <TableCell sx={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>{r.libelle}</TableCell>
                            <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#1E293B', textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.taux).toLocaleString('fr-FR')}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box component="span" sx={{
                                display: 'inline-block', width: 16, height: 16,
                                border: '2px solid #475569', borderRadius: '3px',
                                bgcolor: r.is_active ? '#1E3A5F' : 'transparent',
                                position: 'relative', cursor: 'default',
                                '&::after': r.is_active ? {
                                  content: '"✓"', position: 'absolute', top: -3, left: 1,
                                  fontSize: 12, color: '#fff', fontWeight: 900,
                                } : {},
                              }} />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Tooltip title="Modifier">
                                <IconButton size="small" onClick={() => openDlg('aug', r)}>
                                  <Edit sx={{ fontSize: 15, color: '#E85D04' }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Supprimer">
                                <IconButton size="small" onClick={() => delAug.mutate(r.id)}>
                                  <Delete sx={{ fontSize: 14, color: '#94A3B8' }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          );
        })()}

        {/* ─── Hiérarchies ─── */}
        {sub === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1, borderBottom: '1px solid #E2E8F0' }}>
              <Button size="small" variant="contained" startIcon={<Add />}
                onClick={() => openDlg('hier')}
                sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
                Nouvelle hiérarchie
              </Button>
            </Box>
            {lh ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box> :
              hierarchies.length === 0 ? <EmptySlot icon={<Tune />} title="Aucune hiérarchie configurée" subtitle="Cliquez sur « Nouvelle hiérarchie » pour en ajouter une" /> : (
              <TableContainer><Table size="small">
                <TableHead><TableRow sx={{ bgcolor: '#1E3A5F' }}>
                  {['Ordre', 'Code', 'Libellé', 'Description', 'Statut', 'Actions'].map((h) => <TableCell key={h} sx={TH_CELL}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {hierarchies.map((r: RecruitmentHierarchy, i: number) => (
                    <TableRow key={r.id} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                      <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textAlign: 'center', width: 50 }}>{r.ordre}</TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' }}>{r.code}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{r.libelle}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{r.description ?? '—'}</TableCell>
                      <TableCell><Chip label={r.is_active ? 'Actif' : 'Inactif'} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: r.is_active ? '#ECFDF5' : '#F1F5F9', color: r.is_active ? '#059669' : '#94A3B8' }} /></TableCell>
                      <TableCell><Stack direction="row" spacing={0.25}>
                        <Tooltip title="Modifier"><IconButton size="small" onClick={() => openDlg('hier', r)}><Edit sx={{ fontSize: 14, color: '#2563EB' }} /></IconButton></Tooltip>
                        <Tooltip title="Supprimer"><IconButton size="small" onClick={() => delHer.mutate(r.id)}><Delete sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton></Tooltip>
                      </Stack></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></TableContainer>
            )}
          </Box>
        )}

        {/* ─── Barème ─── */}
        {sub === 3 && (() => {
          const PARTS = ['1 part','1,5 parts','2 parts','2,5 parts','3 parts','3,5 parts','4 parts','4,5 parts','5 Parts'];
          const filtered = baremes.filter((r: RecruitmentBareme) => {
            const rbMatch = !barF2.revenu_brut || String(r.salaire_base).includes(barF2.revenu_brut);
            return rbMatch;
          });
          return (
            <Box>
              {/* Titre + boutons */}
              <Box sx={{ bgcolor: '#0D2137', px: 2.5, py: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.2px', textTransform: 'uppercase' }}>
                  Bareme Mensuel des Retenues a la Source sur Salaires
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" size="small"
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, color: '#fff', borderColor: '#fff', whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: '#fff' } }}>
                    Importer depuis Excel
                  </Button>
                  <Button variant="outlined" size="small"
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, color: '#fff', borderColor: '#fff',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: '#fff' } }}>
                    Fermer
                  </Button>
                </Stack>
              </Box>

              {/* Filtres */}
              <Box sx={{ m: 2, border: '1.5px solid #CBD5E1', borderRadius: 2, p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Revenu brut</Typography>
                    <TextField size="small" fullWidth type="number" placeholder="0,00"
                      value={barF2.revenu_brut}
                      onChange={(e) => setBarF2((f) => ({ ...f, revenu_brut: e.target.value }))}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 }, '& input': { textAlign: 'right' } }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Trimf/pers</Typography>
                    <TextField size="small" fullWidth type="number" placeholder="0,00"
                      value={barF2.trimf_pers}
                      onChange={(e) => setBarF2((f) => ({ ...f, trimf_pers: e.target.value }))}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 }, '& input': { textAlign: 'right' } }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Parts</Typography>
                    <TextField size="small" fullWidth
                      value={barF2.parts}
                      onChange={(e) => setBarF2((f) => ({ ...f, parts: e.target.value }))}
                      sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pb: 0.25 }}>
                    <Button variant="outlined" size="small"
                      sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 100, color: '#1E3A5F', borderColor: '#1E3A5F' }}>
                      Chercher
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => setBarF2({ revenu_brut: '', trimf_pers: '', parts: '' })}
                      sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 100, color: '#1E3A5F', borderColor: '#1E3A5F' }}>
                      Effacer
                    </Button>
                  </Box>
                </Box>
              </Box>

              {/* Barre d'action */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 0.75, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton size="small" sx={{ border: '1px solid #CBD5E1', borderRadius: '6px', p: 0.5 }}>
                    <Delete sx={{ fontSize: 16, color: '#1E3A5F' }} />
                  </IconButton>
                  <Typography sx={{ fontSize: 12, color: '#1E3A5F', fontWeight: 500 }}>supprimer tous</Typography>
                </Box>
                <Stack direction="row" spacing={0.75}>
                  <Tooltip title="Supprimer sélection">
                    <IconButton size="small" sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#1A3A5C' } }}>
                      <Delete sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ajouter">
                    <IconButton size="small" onClick={() => openDlg('bareme')} sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#1A3A5C' } }}>
                      <Add sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifier sélection">
                    <IconButton size="small" sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#1A3A5C' } }}>
                      <Edit sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Tableau */}
              <Box sx={{ px: 2, pb: 2, pt: 1 }}>
                {lb ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
                ) : (
                  <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1, maxHeight: 420 }}>
                    <Table size="small" stickyHeader sx={{ minWidth: 1100 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ ...TH_CELL, bgcolor: '#0D2137', textAlign: 'center', width: 55 }}>N° Sr</TableCell>
                          <TableCell sx={{ ...TH_CELL, bgcolor: '#0D2137', textAlign: 'right', whiteSpace: 'nowrap' }}>Revenu brut</TableCell>
                          <TableCell sx={{ ...TH_CELL, bgcolor: '#0D2137', textAlign: 'right', whiteSpace: 'nowrap' }}>TRIMF/Pers</TableCell>
                          {PARTS.map((p, i) => (
                            <TableCell key={p} sx={{ ...TH_CELL, bgcolor: '#0D2137', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.4 }}>
                                {p}
                                {i >= 3 && <Search sx={{ fontSize: 11, opacity: 0.65 }} />}
                              </Box>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.length === 0 ? (
                          <TableRow><TableCell colSpan={12} sx={{ textAlign: 'center', color: '#94A3B8', py: 3, fontSize: 12 }}>
                            Aucune donnée — cliquez sur + pour ajouter ou importez depuis Excel
                          </TableCell></TableRow>
                        ) : filtered.map((r: RecruitmentBareme, i: number) => {
                          const sel = i === 0;
                          return (
                            <TableRow key={r.id} hover sx={{
                              bgcolor: sel ? '#1E3A5F' : (i % 2 === 0 ? '#fff' : '#F8FAFC'),
                              cursor: 'pointer',
                              '&:hover': { bgcolor: sel ? '#1E3A5F' : '#EEF2FF' },
                            }}>
                              <TableCell sx={{ fontSize: 12, textAlign: 'center', color: sel ? '#fff' : '#64748B' }}>{i + 1}</TableCell>
                              <TableCell sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: sel ? '#fff' : '#1E293B' }}>
                                {Number(r.salaire_base).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: sel ? '#fff' : '#1E293B' }}>300,00</TableCell>
                              {PARTS.map((p) => (
                                <TableCell key={p} sx={{ fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: sel ? '#fff' : '#1E293B' }}>0,00</TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          );
        })()}

        {/* ─── Rapports ─── */}
        {sub === 4 && (
          <Box>
            {/* Titre */}
            <Box sx={{ bgcolor: '#0D2137', px: 2.5, py: 1.2 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Les rapports (Journal de paie)</Typography>
            </Box>

            {/* Filtres */}
            <Box sx={{ m: 2, border: '1.5px solid #CBD5E1', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, px: 2.5, py: 1.5, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Annee</Typography>
                  <TextField select size="small" value={rapF.annee}
                    onChange={(e) => setRapF((f) => ({ ...f, annee: e.target.value }))}
                    sx={{ width: 120, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }}>
                    {[2024,2025,2026,2027].map((y) => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
                  </TextField>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Mois</Typography>
                  <TextField select size="small" value={rapF.mois}
                    onChange={(e) => setRapF((f) => ({ ...f, mois: e.target.value }))}
                    sx={{ width: 150, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }}>
                    {MONTHS_FR.map((m, i) => <MenuItem key={i} value={String(i + 1)}>{m}</MenuItem>)}
                  </TextField>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>Matricule</Typography>
                  <TextField size="small" fullWidth
                    placeholder="Rechercher un agent  par matricule ici"
                    value={rapF.matricule}
                    onChange={(e) => setRapF((f) => ({ ...f, matricule: e.target.value }))}
                    sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pb: 0.25 }}>
                  <Button variant="outlined" size="small"
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 100, color: '#E85D04', borderColor: '#E85D04' }}>
                    Chercher
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => setRapF((f) => ({ ...f, matricule: '' }))}
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 100, color: '#E85D04', borderColor: '#E85D04' }}>
                    Effacer
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Tableau */}
            <Box sx={{ px: 2, pb: 2 }}>
              {/* Bouton Imprimer */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.75 }}>
                <Button variant="contained" size="small" startIcon={<Print />}
                  sx={{ bgcolor: '#0D2137', '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '20px', fontWeight: 700, fontSize: 12, px: 2.5 }}>
                  Imprimer
                </Button>
              </Box>

              <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1 }}>
                <Table size="small" sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#0D2137' }}>
                      {[
                        'N° Sr',
                        'Agent(Employé)',
                        'RETENUE AVANCE TABASKI',
                        'IPRES TRAVAILLEUR',
                        'TRIMF',
                        'CHECK OFF',
                        'IR',
                        'CSS',
                        'TOTAL RETENUE',
                        'MONTANT NET A PAYER',
                      ].map((h) => (
                        <TableCell key={h} sx={{ ...TH_CELL, textAlign: ['N° Sr'].includes(h) ? 'center' : 'left', whiteSpace: 'nowrap', fontSize: 10.5 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Lignes vides simulées (à connecter à une API future) */}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC', height: 32 }}>
                        {Array.from({ length: 10 }).map((__, j) => (
                          <TableCell key={j} sx={{ fontSize: 12, py: 0.5, borderBottom: '1px solid #E2E8F0' }} />
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                  {/* Ligne Somme */}
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC', borderTop: '2px solid #CBD5E1' }}>
                      <TableCell colSpan={2} sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', py: 0.75 }}>Somme</TableCell>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <TableCell key={i} sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', py: 0.75 }} />
                      ))}
                    </TableRow>
                  </TableHead>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        )}

      </Box>

      {/* ════ DIALOGS ════ */}

      {/* Indice */}
      <Dialog open={dlg.type === 'indice'} onClose={closeDlg} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          {(dlg.item as RecruitmentIndice | null)?.id ? 'Modifier l\'indice' : 'Nouvel indice'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, px: 3 }}>
          {/* Champs du formulaire */}
          <Box sx={{ border: '1.5px solid #CBD5E1', borderRadius: 2, p: 2, mb: 2.5 }}>
            <Grid container spacing={2}>
              {/* Ligne 1 */}
              <Grid item xs={3}>
                <TextField fullWidth size="small" label="ID indice *"
                  value={indF.code}
                  onChange={(e) => setIndF((f) => ({ ...f, code: e.target.value }))}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                />
              </Grid>
              <Grid item xs={3}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 700, fontSize: 11, color: '#0D2137' }}>Hiérarchie</InputLabel>
                  <Select label="Hiérarchie" value={indF.hierarchy_id}
                    onChange={(e) => {
                      const hid = String(e.target.value);
                      const h = hierarchies.find((h: RecruitmentHierarchy) => String(h.id) === hid);
                      setIndF((f) => ({ ...f, hierarchy_id: hid, garde: h ? `${h.code} ${f.classe} ${f.echelon_label}`.trim() : f.garde }));
                    }}>
                    <MenuItem value=""><em>—</em></MenuItem>
                    {hierarchies.map((h: RecruitmentHierarchy) => <MenuItem key={h.id} value={h.id}>{h.code}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={3}>
                <TextField fullWidth size="small" label="Classe"
                  value={indF.classe}
                  onChange={(e) => setIndF((f) => {
                    const h = hierarchies.find((h: RecruitmentHierarchy) => String(h.id) === f.hierarchy_id);
                    return { ...f, classe: e.target.value, garde: `${h?.code ?? ''} ${e.target.value} ${f.echelon_label}`.trim() };
                  })}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField fullWidth size="small" label="Échelon"
                  value={indF.echelon_label}
                  onChange={(e) => setIndF((f) => {
                    const h = hierarchies.find((h: RecruitmentHierarchy) => String(h.id) === f.hierarchy_id);
                    return { ...f, echelon_label: e.target.value, garde: `${h?.code ?? ''} ${f.classe} ${e.target.value}`.trim() };
                  })}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                />
              </Grid>

              {/* Ligne 2 */}
              <Grid item xs={4}>
                <TextField fullWidth size="small" label="VALEUR INDICE" type="number"
                  value={indF.valeur_point}
                  onChange={(e) => setIndF((f) => ({
                    ...f, valeur_point: e.target.value,
                    solde_mensuelle: f.valeur && e.target.value ? String((Number(e.target.value) * Number(f.valeur)).toFixed(2)) : f.solde_mensuelle,
                  }))}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                  inputProps={{ step: '0.01' }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth size="small" label="INDICE *" type="number"
                  value={indF.valeur}
                  onChange={(e) => setIndF((f) => ({
                    ...f, valeur: e.target.value,
                    solde_mensuelle: f.valeur_point && e.target.value ? String((Number(f.valeur_point) * Number(e.target.value)).toFixed(2)) : f.solde_mensuelle,
                  }))}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth size="small" label="Solde mensuelle indiciaire assimilés" type="number"
                  value={indF.solde_mensuelle}
                  onChange={(e) => setIndF((f) => ({ ...f, solde_mensuelle: e.target.value }))}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                  inputProps={{ step: '0.01' }}
                />
              </Grid>

              {/* Ligne 3 */}
              <Grid item xs={8}>
                <TextField fullWidth size="small" label="GARDE"
                  value={indF.garde}
                  onChange={(e) => setIndF((f) => ({ ...f, garde: e.target.value }))}
                  InputLabelProps={{ sx: { fontWeight: 700, fontSize: 11, color: '#0D2137' } }}
                />
              </Grid>
              <Grid item xs={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={<Switch checked={indF.is_active} onChange={(e) => setIndF((f) => ({ ...f, is_active: e.target.checked }))} />}
                  label={<Typography sx={{ fontWeight: 700, fontSize: 13 }}>Actif</Typography>}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Liste des augmentations */}
          <Box>
            <Box sx={{ bgcolor: '#0D2137', px: 2, py: 1, borderRadius: '6px 6px 0 0' }}>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>les augmentations</Typography>
            </Box>
            <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none', borderRadius: '0 0 6px 6px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                    <TableCell sx={{ ...TH_CELL, width: 50, textAlign: 'center' }}>N° Sr</TableCell>
                    <TableCell sx={{ ...TH_CELL, width: 60, textAlign: 'center' }}>
                      <Box
                        component="span"
                        onClick={() => {
                          const allIds = augmentations.map((a: RecruitmentAugmentation) => a.id);
                          const allChecked = allIds.every((id: number) => indF.augmentation_ids.includes(id));
                          setIndF((f) => ({ ...f, augmentation_ids: allChecked ? [] : allIds }));
                        }}
                        sx={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #94A3B8', borderRadius: '3px', bgcolor: 'transparent', cursor: 'pointer' }}
                      />
                      &nbsp;Choix
                    </TableCell>
                    <TableCell sx={TH_CELL}>Nom Augmentation</TableCell>
                    <TableCell sx={{ ...TH_CELL, textAlign: 'right' }}>Montant</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {augmentations.length === 0 ? (
                    <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', color: '#94A3B8', py: 2, fontSize: 12 }}>Aucune augmentation disponible</TableCell></TableRow>
                  ) : augmentations.map((a: RecruitmentAugmentation, i: number) => {
                    const checked = indF.augmentation_ids.includes(a.id);
                    return (
                      <TableRow key={a.id} hover
                        onClick={() => setIndF((f) => ({
                          ...f,
                          augmentation_ids: checked ? f.augmentation_ids.filter((id) => id !== a.id) : [...f.augmentation_ids, a.id],
                        }))}
                        sx={{ cursor: 'pointer', bgcolor: checked ? '#EEF2FF' : (i % 2 === 0 ? '#fff' : '#F8FAFC') }}>
                        <TableCell sx={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>{i + 1}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Box component="span" sx={{
                            display: 'inline-block', width: 14, height: 14,
                            border: '2px solid #475569', borderRadius: '3px',
                            bgcolor: checked ? '#1E3A5F' : 'transparent',
                            position: 'relative',
                            '&::after': checked ? { content: '"✓"', position: 'absolute', top: -3, left: 0, fontSize: 11, color: '#fff', fontWeight: 900 } : {},
                          }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, color: '#1E293B' }}>{a.libelle}</TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                          {Number(a.taux).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1, borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
          <Button variant="outlined" onClick={closeDlg} sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained" disabled={saveInd.isPending || !indF.code || !indF.valeur} onClick={() => saveInd.mutate()}
            sx={{ bgcolor: NAV, borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            {(dlg.item as RecruitmentIndice | null)?.id ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hiérarchie */}
      <Dialog open={dlg.type === 'hier'} onClose={closeDlg} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{(dlg.item as RecruitmentHierarchy | null)?.id ? 'Modifier la hiérarchie' : 'Nouvelle hiérarchie'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={4}><TextField fullWidth size="small" label="Code *" value={herF.code} onChange={(e) => setHerF((f) => ({ ...f, code: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Libellé *" value={herF.libelle} onChange={(e) => setHerF((f) => ({ ...f, libelle: e.target.value }))} /></Grid>
            <Grid item xs={2}><TextField fullWidth size="small" label="Ordre" type="number" value={herF.ordre} onChange={(e) => setHerF((f) => ({ ...f, ordre: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Description" multiline rows={2} value={herF.description} onChange={(e) => setHerF((f) => ({ ...f, description: e.target.value }))} /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Switch checked={herF.is_active} onChange={(e) => setHerF((f) => ({ ...f, is_active: e.target.checked }))} />} label="Actif" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={closeDlg} sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained" disabled={saveHer.isPending || !herF.code || !herF.libelle} onClick={() => saveHer.mutate()}
            sx={{ bgcolor: NAV, borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            {(dlg.item as RecruitmentHierarchy | null)?.id ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Augmentation */}
      <Dialog open={dlg.type === 'aug'} onClose={closeDlg} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{(dlg.item as RecruitmentAugmentation | null)?.id ? 'Modifier l\'augmentation' : 'Nouvelle augmentation'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Libellé *" value={augF.libelle} onChange={(e) => setAugF((f) => ({ ...f, libelle: e.target.value }))} /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small"><InputLabel>Type *</InputLabel>
                <Select label="Type *" value={augF.type} onChange={(e) => setAugF((f) => ({ ...f, type: e.target.value }))}>
                  {['indiciaire','indemnitaire','prime','autre'].map((v) => <MenuItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small"><InputLabel>Unité *</InputLabel>
                <Select label="Unité *" value={augF.unite} onChange={(e) => setAugF((f) => ({ ...f, unite: e.target.value }))}>
                  <MenuItem value="pourcentage">Pourcentage (%)</MenuItem>
                  <MenuItem value="montant">Montant (FCFA)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label={augF.unite === 'pourcentage' ? 'Taux (%) *' : 'Montant (FCFA) *'} type="number" value={augF.taux} onChange={(e) => setAugF((f) => ({ ...f, taux: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Date d'effet" type="date" InputLabelProps={{ shrink: true }} value={augF.date_effet} onChange={(e) => setAugF((f) => ({ ...f, date_effet: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Description" multiline rows={2} value={augF.description} onChange={(e) => setAugF((f) => ({ ...f, description: e.target.value }))} /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Switch checked={augF.is_active} onChange={(e) => setAugF((f) => ({ ...f, is_active: e.target.checked }))} />} label="Actif" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={closeDlg} sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained" disabled={saveAug.isPending || !augF.libelle || !augF.taux} onClick={() => saveAug.mutate()}
            sx={{ bgcolor: '#059669', borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            {(dlg.item as RecruitmentAugmentation | null)?.id ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barème */}
      {(() => {
        const isEdit = !!(dlg.item as RecruitmentBareme | null)?.id;
        const numField = (label: string, key: keyof typeof barF) => (
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>{label}</Typography>
            <TextField size="small" fullWidth type="number"
              value={barF[key]}
              onChange={(e) => setBarF((f) => ({ ...f, [key]: e.target.value }))}
              sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '4px', fontSize: 13 }, '& input': { textAlign: 'right' } }}
              inputProps={{ step: '0.01' }}
            />
          </Box>
        );
        return (
          <Dialog open={dlg.type === 'bareme'} onClose={closeDlg} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
            {/* Barre titre style screenshot */}
            <Box sx={{ bgcolor: '#0D2137', px: 2.5, py: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>
                {isEdit ? 'Modifier le Bareme' : 'Ajout de Bareme'}
              </Typography>
              <Stack direction="row" spacing={0.75}>
                <Button variant="outlined" size="small" disabled={saveBar.isPending || !barF.revenu_brut} onClick={() => saveBar.mutate()}
                  sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 11, color: '#fff', borderColor: '#fff', whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.3)' } }}>
                  Sauvegarder
                </Button>
                <Button variant="outlined" size="small" disabled={saveBar.isPending || !barF.revenu_brut}
                  onClick={() => saveBar.mutate().then(() => closeDlg())}
                  sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 11, color: '#fff', borderColor: '#fff', whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.3)' } }}>
                  Sauvegarder&amp;Fermer
                </Button>
                <Button variant="outlined" size="small" onClick={closeDlg}
                  sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 11, color: '#fff', borderColor: '#fff',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                  Fermer
                </Button>
              </Stack>
            </Box>

            <DialogContent sx={{ pt: 2.5, px: 3, pb: 3 }}>
              <Grid container spacing={2.5}>
                <Grid item xs={6}>{numField('Revenu brut', 'revenu_brut')}</Grid>
                <Grid item xs={6}>{numField('TRIMF/Pers', 'trimf_pers')}</Grid>
                <Grid item xs={6}>{numField('1 Part', 'part_1')}</Grid>
                <Grid item xs={6}>{numField('1.5 Part', 'part_1_5')}</Grid>
                <Grid item xs={6}>{numField('2 Part', 'part_2')}</Grid>
                <Grid item xs={6}>{numField('2.5 Parts', 'part_2_5')}</Grid>
                <Grid item xs={6}>{numField('3 Parts', 'part_3')}</Grid>
                <Grid item xs={6}>{numField('3.5 Parts', 'part_3_5')}</Grid>
                <Grid item xs={6}>{numField('4 Parts', 'part_4')}</Grid>
                <Grid item xs={6}>{numField('4.5 Parts', 'part_4_5')}</Grid>
                <Grid item xs={6}>{numField('5 Parts', 'part_5')}</Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', mb: 0.5 }}>ID barème</Typography>
                  <Box sx={{ border: '1px solid #CBD5E1', borderRadius: '4px', px: 1.5, py: 1, bgcolor: '#F8FAFC', minHeight: 40, display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#E85D04', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {barF.id_bareme}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
          </Dialog>
        );
      })()}

    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════
export default function PayrollPage() {
  const [tab, setTab] = useState(1);

  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const now = new Date();

  const tabs = [
    { label: 'Modèle fiche de paie',   icon: <Description />,   comp: <ModeleFicheTab /> },
    { label: 'Bulletin de Paie',        icon: <ReceiptLong />,   comp: <BulletinPaieTab /> },
    { label: 'Gestion des Indemnités',  icon: <Payments />,      comp: <GestionIndemnitesTab /> },
    { label: 'Rapport des États',       icon: <BarChart />,      comp: <RapportEtatsTab /> },
    { label: 'États de Paiement',       icon: <AccountBalance />,comp: <EtatsPaiementTab /> },
    { label: 'Paramètres',              icon: <Tune />,          comp: <ParametresTab /> },
  ];

  return (
    <Box>
      {/* ══ En-tête ══ */}
      <Box sx={{
        bgcolor: NAV, px: 3, py: 1.5,
        borderRadius: '12px 12px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>
            Gestion de la Paie
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11.5, mt: 0.1 }}>
            {MONTHS[now.getMonth()]} {now.getFullYear()} · ANASER
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          {[
            { label: 'Bulletins',   count: 0, color: '#93C5FD' },
            { label: 'Validés',     count: 0, color: '#6EE7B7' },
            { label: 'En attente',  count: 0, color: '#FCD34D' },
            { label: 'Payés',       count: 0, color: '#C4B5FD' },
          ].map(({ label, count, color }) => (
            <Stack key={label} direction="row" alignItems="center" spacing={0.75}>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</Typography>
              <Box sx={{ px: 1, py: 0.1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.12)', minWidth: 24, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color }}>{count}</Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* ══ Onglets ══ */}
      <Box sx={{
        bgcolor: '#F1F5F9', px: 2.5, pt: 2, pb: 0,
        display: 'flex', gap: 1, flexWrap: 'wrap',
        borderBottom: `2px solid ${NAV}`,
      }}>
        {tabs.map((t, i) => (
          <NavTab
            key={i}
            label={t.label}
            icon={t.icon}
            active={tab === i}
            onClick={() => setTab(i)}
            badge={t.badge}
          />
        ))}
      </Box>

      {/* ══ Contenu ══ */}
      <Box sx={{
        bgcolor: '#fff',
        border: '1px solid #CBD5E1',
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden',
      }}>
        {tabs[tab].comp}
      </Box>
    </Box>
  );
}
