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

      {/* Aperçu bulletin — maquette visuelle */}
      <Box sx={{ p: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>

        {/* Miniature modèle 1 */}
        {['Modèle Standard ANASER', 'Modèle Simplifié'].map((nom, i) => (
          <Box key={i} sx={{
            width: 280, border: `2px solid ${i === 0 ? ACT : '#E2E8F0'}`,
            borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
            boxShadow: i === 0 ? `0 4px 16px ${ACT}30` : '0 2px 8px rgba(0,0,0,0.06)',
            '&:hover': { borderColor: ACT },
            transition: 'border-color 0.15s',
          }}>
            {/* Header miniature */}
            <Box sx={{ bgcolor: NAV, px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{nom}</Typography>
              {i === 0 && <Chip label="Actif" size="small" sx={{ bgcolor: '#059669', color: '#fff', fontSize: 9, height: 16, fontWeight: 700 }} />}
            </Box>

            {/* Corps miniature */}
            <Box sx={{ p: 1.5, bgcolor: '#fff' }}>
              {/* En-tête bulletin maquette */}
              <Box sx={{ bgcolor: '#F1F5F9', borderRadius: '6px', p: 1, mb: 1 }}>
                <Box sx={{ width: '60%', height: 6, bgcolor: '#CBD5E1', borderRadius: 2, mb: 0.5 }} />
                <Box sx={{ width: '40%', height: 4, bgcolor: '#E2E8F0', borderRadius: 2 }} />
              </Box>
              {/* Lignes paie maquette */}
              {Array.from({ length: 6 }).map((_, j) => (
                <Box key={j} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: j < 5 ? '1px solid #F8FAFC' : 'none' }}>
                  <Box sx={{ width: `${45 + j * 5}%`, height: 5, bgcolor: '#E2E8F0', borderRadius: 2 }} />
                  <Box sx={{ width: '18%', height: 5, bgcolor: '#CBD5E1', borderRadius: 2 }} />
                </Box>
              ))}
              {/* Total maquette */}
              <Box sx={{ mt: 1, bgcolor: NAV, borderRadius: '5px', p: 0.75, display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ width: '35%', height: 6, bgcolor: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
                <Box sx={{ width: '22%', height: 6, bgcolor: 'rgba(255,255,255,0.6)', borderRadius: 2 }} />
              </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 0.5, px: 1.5, py: 1, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
              <Tooltip title="Aperçu"><IconButton size="small"><Visibility sx={{ fontSize: 15, color: '#64748B' }} /></IconButton></Tooltip>
              <Tooltip title="Modifier"><IconButton size="small"><Edit sx={{ fontSize: 15, color: '#2563EB' }} /></IconButton></Tooltip>
              <Tooltip title="Imprimer"><IconButton size="small"><Print sx={{ fontSize: 15, color: '#64748B' }} /></IconButton></Tooltip>
            </Box>
          </Box>
        ))}

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

  const mockRows = [
    { num: 'EMP0001', nom: 'Moussa Diallo',   dept: 'DG',  brut: '900 000', emp: '− 90 000', pat: '108 000', net: '810 000', statut: 'validé' },
    { num: 'EMP0002', nom: 'Aminata Ndiaye',  dept: 'DG',  brut: '250 000', emp: '− 25 000', pat: '30 000',  net: '225 000', statut: 'brouillon' },
    { num: 'EMP0003', nom: 'Ibrahima Sow',    dept: 'SG',  brut: '700 000', emp: '− 70 000', pat: '84 000',  net: '630 000', statut: 'payé' },
    { num: 'EMP0004', nom: 'Fatou Diop',      dept: 'DEP', brut: '580 000', emp: '− 58 000', pat: '69 600',  net: '522 000', statut: 'validé' },
    { num: 'EMP0005', nom: 'Cheikh Fall',     dept: 'DEP', brut: '320 000', emp: '− 32 000', pat: '38 400',  net: '288 000', statut: 'brouillon' },
  ];

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
        <MiniStat label="Bulletins"         value="18"           color="#2563EB" bg="#EFF6FF" />
        <MiniStat label="Masse brute"       value="8 450 000 F"  color="#059669" bg="#ECFDF5" />
        <MiniStat label="Masse nette"       value="7 605 000 F"  color="#7C3AED" bg="#F5F3FF" />
        <MiniStat label="Charges patronales"value="1 014 000 F"  color="#D97706" bg="#FFFBEB" />
        <MiniStat label="Validés"           value="12"           color="#059669" bg="#ECFDF5" />
        <MiniStat label="En attente"        value="6"            color="#DC2626" bg="#FEF2F2" />
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
              {mockRows.map((row, i) => {
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
              })}
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
  const mock = [
    { code: 'IND-TRP', libelle: 'Indemnité de Transport',        mode: 'Montant fixe',  valeur: '35 000 F',  impose: 'Non', statut: 'actif' },
    { code: 'IND-LOG', libelle: 'Indemnité de Logement',          mode: 'Montant fixe',  valeur: '75 000 F',  impose: 'Oui', statut: 'actif' },
    { code: 'IND-REP', libelle: 'Indemnité de Représentation',    mode: '% salaire',     valeur: '10 %',      impose: 'Oui', statut: 'actif' },
    { code: 'IND-SUJ', libelle: 'Indemnité de Sujétion',          mode: 'Montant fixe',  valeur: '25 000 F',  impose: 'Non', statut: 'actif' },
    { code: 'IND-RES', libelle: 'Indemnité de Responsabilité',    mode: '% salaire',     valeur: '15 %',      impose: 'Oui', statut: 'inactif' },
    { code: 'IND-DOC', libelle: 'Indemnité de Documentation',     mode: 'Montant fixe',  valeur: '15 000 F',  impose: 'Non', statut: 'actif' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: TH }}>Types d'indemnités ({mock.length})</Typography>
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
              {mock.map((row, i) => (
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
              ))}
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
        <MiniStat label="Total agents payés"    value="18"           color="#2563EB" bg="#EFF6FF" />
        <MiniStat label="Masse salariale brute" value="8 450 000 F"  color="#059669" bg="#ECFDF5" />
        <MiniStat label="Total retenues"        value="845 000 F"    color="#DC2626" bg="#FEF2F2" />
        <MiniStat label="Total charges pat."    value="1 014 000 F"  color="#D97706" bg="#FFFBEB" />
        <MiniStat label="Masse nette versée"    value="7 605 000 F"  color="#7C3AED" bg="#F5F3FF" />
      </Box>

      {/* Tableau par direction */}
      <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
        <Box sx={{ bgcolor: '#334155', px: 2, py: 0.75 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Récapitulatif par Direction
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                {['Direction','Nb Agents','Brut Total','Retenues','Charges Pat.','Net Total','% Masse'].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ['DG',    '2', '1 150 000 F', '115 000 F', '138 000 F', '1 035 000 F', '13,6 %'],
                ['SG',    '1', '700 000 F',   '70 000 F',  '84 000 F',  '630 000 F',   '8,3 %'],
                ['DEP',   '3', '1 220 000 F', '122 000 F', '146 400 F', '1 098 000 F', '14,4 %'],
                ['DAC',   '2', '1 000 000 F', '100 000 F', '120 000 F', '900 000 F',   '11,8 %'],
                ['DPSRC', '2', '890 000 F',   '89 000 F',  '106 800 F', '801 000 F',   '10,5 %'],
                ['DDC',   '2', '940 000 F',   '94 000 F',  '112 800 F', '846 000 F',   '11,1 %'],
                ['DAF',   '3', '1 550 000 F', '155 000 F', '186 000 F', '1 395 000 F', '18,3 %'],
              ].map(([dir, nb, brut, ret, ch, net, pct], i) => (
                <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                  <TableCell><Chip label={dir} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA' }} /></TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', fontWeight: 600 }}>{nb}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{brut}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#DC2626' }}>{ret}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#D97706' }}>{ch}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{net}</TableCell>
                  <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{pct}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TAB 4 — États de Paiement
// ═══════════════════════════════════════════════════════════════════
function EtatsPaiementTab() {
  const mock = [
    { num: 'EMP0001', nom: 'Moussa Diallo',   net: '810 000 F', mode: 'Virement',  statut: 'payé',      date: '31/05/2026' },
    { num: 'EMP0002', nom: 'Aminata Ndiaye',  net: '225 000 F', mode: 'Virement',  statut: 'en attente',date: '—' },
    { num: 'EMP0003', nom: 'Ibrahima Sow',    net: '630 000 F', mode: 'Virement',  statut: 'payé',      date: '31/05/2026' },
    { num: 'EMP0004', nom: 'Fatou Diop',      net: '522 000 F', mode: 'Chèque',    statut: 'en attente',date: '—' },
    { num: 'EMP0005', nom: 'Cheikh Fall',     net: '288 000 F', mode: 'Virement',  statut: 'en attente',date: '—' },
  ];

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
        <MiniStat label="Total à payer"  value="7 605 000 F" color="#2563EB" bg="#EFF6FF" />
        <MiniStat label="Payés"          value="4 050 000 F" color="#059669" bg="#ECFDF5" />
        <MiniStat label="En attente"     value="3 555 000 F" color="#D97706" bg="#FFFBEB" />
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
              {mock.map((row, i) => (
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
              ))}
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
  const rows = [
    { indice: 100, valeur: '50 000 F',  categorie: 'C1', desc: 'Agents d\'exécution' },
    { indice: 150, valeur: '75 000 F',  categorie: 'C2', desc: 'Agents qualifiés' },
    { indice: 200, valeur: '100 000 F', categorie: 'B1', desc: 'Agents de maîtrise' },
    { indice: 250, valeur: '125 000 F', categorie: 'B2', desc: 'Techniciens' },
    { indice: 300, valeur: '150 000 F', categorie: 'A1', desc: 'Cadres' },
    { indice: 400, valeur: '200 000 F', categorie: 'A2', desc: 'Cadres supérieurs' },
    { indice: 500, valeur: '250 000 F', categorie: 'A3', desc: 'Cadres dirigeants' },
  ];
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Nouvel indice
        </Button>
      </Box>
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
    </Box>
  );
}

function BaremeTab() {
  const rows = [
    { categorie: 'A3', echelon: 1, indice: 500, salaire: '250 000 F', prime: '50 000 F', brut: '300 000 F' },
    { categorie: 'A2', echelon: 1, indice: 400, salaire: '200 000 F', prime: '40 000 F', brut: '240 000 F' },
    { categorie: 'A1', echelon: 1, indice: 300, salaire: '150 000 F', prime: '30 000 F', brut: '180 000 F' },
    { categorie: 'A1', echelon: 2, indice: 320, salaire: '160 000 F', prime: '32 000 F', brut: '192 000 F' },
    { categorie: 'B2', echelon: 1, indice: 250, salaire: '125 000 F', prime: '25 000 F', brut: '150 000 F' },
    { categorie: 'B1', echelon: 1, indice: 200, salaire: '100 000 F', prime: '20 000 F', brut: '120 000 F' },
  ];
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Nouvelle ligne barème
        </Button>
      </Box>
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
    </Box>
  );
}

function HierarchieTab() {
  const rows = [
    { code: 'DG',   libelle: 'Directeur Général',                      niveau: 1, categorie: 'A3', indice: 500 },
    { code: 'SG',   libelle: 'Secrétaire Général',                     niveau: 2, categorie: 'A3', indice: 480 },
    { code: 'DIR',  libelle: 'Directeur de service',                    niveau: 3, categorie: 'A2', indice: 400 },
    { code: 'CDIV', libelle: 'Chef de Division',                       niveau: 4, categorie: 'A1', indice: 320 },
    { code: 'CAGD', libelle: 'Chargé d\'études / Chargé de mission',   niveau: 5, categorie: 'A1', indice: 300 },
    { code: 'TECH', libelle: 'Technicien spécialisé',                  niveau: 6, categorie: 'B2', indice: 250 },
    { code: 'AGEX', libelle: 'Agent d\'exécution',                     niveau: 7, categorie: 'C1', indice: 150 },
  ];
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '7px', fontWeight: 700, fontSize: 12 }}>
          Nouveau niveau
        </Button>
      </Box>
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
    { label: 'Bulletin de Paie',        icon: <ReceiptLong />,   comp: <BulletinPaieTab />,    badge: 6 },
    { label: 'Gestion des Indemnités',  icon: <Payments />,      comp: <GestionIndemnitesTab /> },
    { label: 'Rapport des États',       icon: <BarChart />,      comp: <RapportEtatsTab /> },
    { label: 'États de Paiement',       icon: <AccountBalance />,comp: <EtatsPaiementTab />, badge: 3 },
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
            { label: 'Bulletins',   count: 18, color: '#93C5FD' },
            { label: 'Validés',     count: 12, color: '#6EE7B7' },
            { label: 'En attente',  count: 6,  color: '#FCD34D' },
            { label: 'Payés',       count: 9,  color: '#C4B5FD' },
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
