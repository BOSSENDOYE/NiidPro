import { useState } from 'react';
import {
  Box, Typography, Stack, Button, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, Avatar, TextField,
  MenuItem, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
  Add, Edit, Delete, Download, Print, PlayArrow, CheckCircle,
  Visibility, FilterList, Search, Settings, BarChart,
  ReceiptLong, Payments, AccountBalance, Description,
  TableChart, Tune,
} from '@mui/icons-material';

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
//  TAB 5 — Paramètres (avec sous-onglets)
// ═══════════════════════════════════════════════════════════════════
function SubTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Box onClick={onClick} sx={{
      px: 2, py: 0.75, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
      borderBottom: `2.5px solid ${active ? '#2563EB' : 'transparent'}`,
      color:  active ? '#2563EB' : '#64748B',
      '&:hover': { color: '#2563EB' },
      transition: 'all 0.15s',
      userSelect: 'none',
    }}>
      {label}
    </Box>
  );
}

function IndiceTab() {
  const rows: { indice: number; valeur: string; categorie: string; desc: string }[] = [];
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Nouvel indice
        </Button>
      </Box>
      {rows.length === 0
        ? <EmptySlot icon={<TableChart />} title="Aucun indice configuré" subtitle="Cliquez sur « Nouvel indice » pour en ajouter un" />
        : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                {['Indice','Valeur de base','Catégorie','Description','Actions'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                  <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#1E3A5F' }}>{r.indice}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{r.valeur}</TableCell>
                  <TableCell><Chip label={r.categorie} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA' }} /></TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#475569' }}>{r.desc}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.25}>
                      <Tooltip title="Modifier"><IconButton size="small"><Edit sx={{ fontSize: 14, color: '#2563EB' }} /></IconButton></Tooltip>
                      <Tooltip title="Supprimer"><IconButton size="small"><Delete sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        )}
    </Box>
  );
}

function BaremeTab() {
  const rows: { categorie: string; echelon: number; indice: number; salaire: string; prime: string; brut: string }[] = [];
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Nouvelle ligne barème
        </Button>
      </Box>
      {rows.length === 0
        ? <EmptySlot icon={<TableChart />} title="Aucun barème configuré" subtitle="Cliquez sur « Nouvelle ligne barème » pour en ajouter une" />
        : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                {['Catégorie','Échelon','Indice','Salaire de base','Prime de catégorie','Salaire Brut','Actions'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                  <TableCell><Chip label={r.categorie} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA' }} /></TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', fontWeight: 600 }}>{r.echelon}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>{r.indice}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{r.salaire}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#7C3AED' }}>{r.prime}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{r.brut}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.25}>
                      <Tooltip title="Modifier"><IconButton size="small"><Edit sx={{ fontSize: 14, color: '#2563EB' }} /></IconButton></Tooltip>
                      <Tooltip title="Supprimer"><IconButton size="small"><Delete sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        )}
    </Box>
  );
}

function HierarchieTab() {
  const rows: { code: string; libelle: string; niveau: number; categorie: string; indice: number }[] = [];
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Nouveau niveau
        </Button>
      </Box>
      {rows.length === 0
        ? <EmptySlot icon={<Tune />} title="Aucune hiérarchie configurée" subtitle="Cliquez sur « Nouveau niveau » pour en ajouter un" />
        : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                {['Ordre','Code','Libellé','Catégorie','Indice de référence','Actions'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                  <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textAlign: 'center', width: 50 }}>{r.niveau}</TableCell>
                  <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' }}>{r.code}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{r.libelle}</TableCell>
                  <TableCell><Chip label={r.categorie} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA' }} /></TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{r.indice}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.25}>
                      <Tooltip title="Modifier"><IconButton size="small"><Edit sx={{ fontSize: 14, color: '#2563EB' }} /></IconButton></Tooltip>
                      <Tooltip title="Supprimer"><IconButton size="small"><Delete sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        )}
    </Box>
  );
}

function ParametresTab() {
  const [sub, setSub] = useState(0);
  const subTabs = [
    { label: '📊 Indice',      comp: <IndiceTab /> },
    { label: '📋 Barème',      comp: <BaremeTab /> },
    { label: '🏛 Hiérarchie',   comp: <HierarchieTab /> },
  ];
  return (
    <Box>
      {/* Sous-onglets */}
      <Box sx={{ display: 'flex', px: 2.5, pt: 1.5, gap: 0, borderBottom: '2px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
        {subTabs.map((s, i) => (
          <SubTab key={i} label={s.label} active={sub === i} onClick={() => setSub(i)} />
        ))}
      </Box>
      {/* Contenu */}
      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
        {subTabs[sub].comp}
      </Box>
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
