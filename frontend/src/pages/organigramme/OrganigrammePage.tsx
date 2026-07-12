import { useState, useCallback } from 'react';
import {
  Box, Typography, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, TextField, Tooltip,
} from '@mui/material';
import { GlobalStyles } from '@mui/material';
import { Edit, Restore, ExpandMore, ExpandLess, Print } from '@mui/icons-material';
import PageHeader from '../../components/common/PageHeader';
import { useCompany } from '../../hooks/useCompany';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrgNode {
  id: string;
  code?: string;
  label: string;
  type: 'root' | 'conseil' | 'dg' | 'sg' | 'direction' | 'division';
  color: string;
  children?: OrgNode[];
  sideItems?: string[];
}

interface EditTarget {
  node: OrgNode;
  sideIdx?: number;
}

// ─── Default ANASER structure ─────────────────────────────────────────────────
const DEFAULT_ORG: OrgNode = {
  id: 'anaser',
  code: 'ANASER',
  label: 'Agence Nationale de Sécurité Routière',
  type: 'root',
  color: '#1B4B8A',
  children: [
    {
      id: 'cs',
      code: 'CS',
      label: 'Conseil de Surveillance',
      type: 'conseil',
      color: '#1B4B8A',
      sideItems: ['Assistante de direction'],
    },
    {
      id: 'dg',
      label: 'Direction Générale',
      type: 'dg',
      color: '#1B4B8A',
      sideItems: [
        'Agence Comptable',
        'Conseillers techniques',
        'Contrôleur de gestion',
        'Assistantes de direction',
      ],
      children: [
        {
          id: 'sg',
          label: 'Secrétariat Général',
          type: 'sg',
          color: '#1B4B8A',
          sideItems: [
            'Cellule Passation des Marchés',
            'Cellule Post-Accidentologie',
            'Cellule de Législation des Affaires Juridiques',
            'Cellule Régulation des comportements',
            'Cellule Contrôle Interne',
            'Cellule Suivi-évaluation',
            'Cellule Informatique et Innovation',
            'Cellule Qualité Hygiène Sécurité et Environnement',
            'Assistante de Direction',
          ],
          children: [
            {
              id: 'dep',
              code: 'DEP',
              label: 'Direction des Études et la Planification',
              type: 'direction',
              color: '#0284C7',
              children: [
                { id: 'dep-1', label: 'Observatoire de la sécurité routière', type: 'division', color: '#0284C7' },
                { id: 'dep-2', label: 'Études et planification', type: 'division', color: '#0284C7' },
              ],
            },
            {
              id: 'dac',
              code: 'DAC',
              label: "Direction de l'Audit et de la Conformité",
              type: 'direction',
              color: '#7C3AED',
              children: [
                { id: 'dac-1', label: 'Audit et Homologation des Infrastructures (DAHI)', type: 'division', color: '#7C3AED' },
                { id: 'dac-2', label: 'Conformité et Homologations', type: 'division', color: '#7C3AED' },
              ],
            },
            {
              id: 'dpsrc',
              code: 'DPSRC',
              label: 'Direction de la Promotion Sécurité Routière et Communication',
              type: 'direction',
              color: '#059669',
              children: [
                { id: 'dpsrc-1', label: "Communication de la Sensibilisation et de l'événementiel", type: 'division', color: '#059669' },
                { id: 'dpsrc-2', label: 'Éducation et Prévention routière', type: 'division', color: '#059669' },
              ],
            },
            {
              id: 'ddc',
              code: 'DDC',
              label: 'Direction du Développement et de la Coopération',
              type: 'direction',
              color: '#D97706',
              children: [
                { id: 'ddc-1', label: 'Coopération', type: 'division', color: '#D97706' },
                { id: 'ddc-2', label: 'Déploiement territorial', type: 'division', color: '#D97706' },
              ],
            },
            {
              id: 'daf',
              code: 'DAF',
              label: 'Direction Administrative et Financière',
              type: 'direction',
              color: '#DC2626',
              children: [
                { id: 'daf-1', label: 'Finances', type: 'division', color: '#DC2626' },
                { id: 'daf-2', label: 'Ressources humaines', type: 'division', color: '#DC2626' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// ─── Persistence ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'niidpro-orgchart-v1';

function loadOrg(): OrgNode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OrgNode;
  } catch { /* ignore */ }
  return structuredClone(DEFAULT_ORG);
}

function saveOrg(node: OrgNode) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(node));
}

// ─── Tree update helpers ──────────────────────────────────────────────────────
function updateNode(root: OrgNode, id: string, patch: Partial<OrgNode>): OrgNode {
  if (root.id === id) return { ...root, ...patch };
  return { ...root, children: root.children?.map((c) => updateNode(c, id, patch)) };
}

function updateSideItem(root: OrgNode, nodeId: string, idx: number, val: string): OrgNode {
  if (root.id === nodeId) {
    const si = [...(root.sideItems ?? [])];
    si[idx] = val;
    return { ...root, sideItems: si };
  }
  return { ...root, children: root.children?.map((c) => updateSideItem(c, nodeId, idx, val)) };
}

// ─── Connector CSS (classic CSS org-chart tree) ───────────────────────────────
const CONN_COLOR = '#94A3B8';

const connectorStyles = `
  .oc-ul {
    display: flex;
    flex-direction: row;
    justify-content: center;
    padding-top: 30px !important;
    padding-left: 0 !important;
    position: relative;
    list-style: none;
    margin: 0;
  }
  .oc-ul::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    border-left: 2px solid ${CONN_COLOR};
    height: 30px;
    width: 0;
  }
  .oc-li {
    display: flex;
    flex-direction: column;
    align-items: center;
    list-style: none;
    position: relative;
    padding: 30px 14px 0 14px;
  }
  .oc-li::before,
  .oc-li::after {
    content: '';
    position: absolute;
    top: 0;
    right: 50%;
    border-top: 2px solid ${CONN_COLOR};
    width: 50%;
    height: 30px;
  }
  .oc-li::after {
    right: auto;
    left: 50%;
    border-left: 2px solid ${CONN_COLOR};
  }
  .oc-li:only-child { padding-top: 0; }
  .oc-li:only-child::before,
  .oc-li:only-child::after { display: none; }
  .oc-li:first-child::before,
  .oc-li:last-child::after { border: 0 none; }
  .oc-li:last-child::before {
    border-right: 2px solid ${CONN_COLOR};
    border-radius: 0 6px 0 0;
  }
  .oc-li:first-child::after {
    border-radius: 6px 0 0 0;
  }
  @media print {
    .oc-no-print { display: none !important; }
    .oc-chart-area { box-shadow: none !important; border: none !important; }
  }
`;

// ─── NodeCard ─────────────────────────────────────────────────────────────────
function NodeCard({ node, onEdit }: { node: OrgNode; onEdit: (t: EditTarget) => void }) {
  const [sideOpen, setSideOpen] = useState(node.type !== 'sg');
  const isDivision = node.type === 'division';
  const isRoot = node.type === 'root';
  const hasSide = (node.sideItems?.length ?? 0) > 0;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        border: `2px solid ${node.color}`,
        borderRadius: isDivision ? '7px' : '11px',
        bgcolor: isRoot ? node.color : `${node.color}12`,
        minWidth: isDivision ? 115 : 155,
        maxWidth: isDivision ? 165 : 205,
        transition: 'box-shadow 0.15s, transform 0.15s',
        '&:hover': { boxShadow: `0 4px 18px ${node.color}35`, transform: 'translateY(-1px)' },
        '&:hover .oc-edit-btn': { opacity: 1 },
      }}
    >
      {/* Main label section */}
      <Box sx={{ px: 1.75, pt: isDivision ? 0.85 : 1.25, pb: hasSide ? 0.5 : isDivision ? 0.85 : 1.25, textAlign: 'center' }}>
        {node.code && (
          <Box sx={{
            display: 'inline-block',
            fontSize: 9,
            fontWeight: 800,
            color: isRoot ? 'rgba(255,255,255,0.9)' : node.color,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            bgcolor: isRoot ? 'rgba(255,255,255,0.18)' : `${node.color}22`,
            px: 0.75,
            py: 0.1,
            borderRadius: '3px',
            mb: 0.5,
          }}>
            {node.code}
          </Box>
        )}
        <Typography sx={{
          fontSize: isDivision ? 10.5 : 11.5,
          fontWeight: isDivision ? 500 : 700,
          color: isRoot ? '#fff' : '#1E293B',
          lineHeight: 1.35,
          display: 'block',
        }}>
          {node.label}
        </Typography>
      </Box>

      {/* Side items section */}
      {hasSide && (
        <Box sx={{ borderTop: `1px solid ${node.color}30` }}>
          <Box
            onClick={() => setSideOpen((o) => !o)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.25,
              py: 0.35,
              cursor: 'pointer',
              bgcolor: `${node.color}08`,
              '&:hover': { bgcolor: `${node.color}16` },
              borderRadius: sideOpen ? '0' : '0 0 9px 9px',
            }}
          >
            <Typography sx={{ fontSize: 9, color: node.color, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {node.sideItems!.length} rattaché{node.sideItems!.length > 1 ? 's' : ''}
            </Typography>
            {sideOpen
              ? <ExpandLess sx={{ fontSize: 13, color: node.color }} />
              : <ExpandMore sx={{ fontSize: 13, color: node.color }} />
            }
          </Box>
          {sideOpen && (
            <Box sx={{ px: 1.25, py: 0.75, borderRadius: '0 0 9px 9px' }}>
              {node.sideItems!.map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 0.5,
                    py: 0.25,
                    '&:hover .side-edit-btn': { opacity: 1 },
                  }}
                >
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: node.color, flexShrink: 0, mt: '4px' }} />
                  <Typography sx={{ fontSize: 10, color: '#475569', flexGrow: 1, lineHeight: 1.35 }}>
                    {item}
                  </Typography>
                  <IconButton
                    className="side-edit-btn"
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onEdit({ node, sideIdx: i }); }}
                    sx={{ opacity: 0, transition: 'opacity 0.15s', p: 0.1, width: 14, height: 14, flexShrink: 0 }}
                  >
                    <Edit sx={{ fontSize: 9, color: node.color }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Hover edit button */}
      <Tooltip title="Modifier" placement="top">
        <IconButton
          className="oc-edit-btn"
          size="small"
          onClick={(e) => { e.stopPropagation(); onEdit({ node }); }}
          sx={{
            position: 'absolute',
            top: 3,
            right: 3,
            opacity: 0,
            transition: 'opacity 0.15s',
            p: 0.3,
            bgcolor: 'rgba(255,255,255,0.92)',
            '&:hover': { bgcolor: '#fff' },
            width: 20,
            height: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          }}
        >
          <Edit sx={{ fontSize: 11, color: node.color }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ─── Recursive tree node ──────────────────────────────────────────────────────
function OcNode({ node, onEdit }: { node: OrgNode; onEdit: (t: EditTarget) => void }) {
  return (
    <li className="oc-li">
      <NodeCard node={node} onEdit={onEdit} />
      {node.children && node.children.length > 0 && (
        <ul className="oc-ul">
          {node.children.map((child) => (
            <OcNode key={child.id} node={child} onEdit={onEdit} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Legend item ──────────────────────────────────────────────────────────────
const LEGEND = [
  { label: 'Structure centrale', color: '#1B4B8A' },
  { label: 'DEP', color: '#0284C7' },
  { label: 'DAC', color: '#7C3AED' },
  { label: 'DPSRC', color: '#059669' },
  { label: 'DDC', color: '#D97706' },
  { label: 'DAF', color: '#DC2626' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OrganigrammePage({ embeddedMode = false }: { embeddedMode?: boolean }) {
  const { name: companyName } = useCompany();
  const [org, setOrg] = useState<OrgNode>(loadOrg);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editSideVal, setEditSideVal] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleEdit = useCallback((t: EditTarget) => {
    setEditTarget(t);
    if (t.sideIdx !== undefined) {
      setEditSideVal(t.node.sideItems![t.sideIdx]);
    } else {
      setEditLabel(t.node.label);
      setEditCode(t.node.code ?? '');
    }
  }, []);

  const handleSave = () => {
    if (!editTarget) return;
    let updated: OrgNode;
    if (editTarget.sideIdx !== undefined) {
      updated = updateSideItem(org, editTarget.node.id, editTarget.sideIdx, editSideVal);
    } else {
      updated = updateNode(org, editTarget.node.id, {
        label: editLabel,
        ...(editTarget.node.code !== undefined ? { code: editCode || undefined } : {}),
      });
    }
    setOrg(updated);
    saveOrg(updated);
    setEditTarget(null);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setOrg(structuredClone(DEFAULT_ORG));
    setResetConfirm(false);
  };

  const isEditingSide = editTarget?.sideIdx !== undefined;

  return (
    <Box>
      <GlobalStyles styles={connectorStyles} />

      {!embeddedMode && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3.5, gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
              Organigramme {companyName}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.5 }}>
              Survolez un nœud et cliquez sur <Edit sx={{ fontSize: 11, verticalAlign: 'middle' }} /> pour modifier son intitulé
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }} className="oc-no-print">
            <Tooltip title="Imprimer / Exporter PDF">
              <Button
                variant="outlined"
                size="small"
                startIcon={<Print />}
                onClick={() => window.print()}
                sx={{ borderRadius: '9px', fontSize: 12, textTransform: 'none' }}
              >
                Imprimer
              </Button>
            </Tooltip>
            <Tooltip title="Remettre les intitulés par défaut">
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<Restore />}
                onClick={() => setResetConfirm(true)}
                sx={{ borderRadius: '9px', fontSize: 12, textTransform: 'none' }}
              >
                Réinitialiser
              </Button>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* Chart area */}
      <Box
        className="oc-chart-area"
        sx={{
          overflow: 'auto',
          bgcolor: '#FAFCFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          p: { xs: 2, md: 4 },
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <Box sx={{ minWidth: 1100, display: 'flex', justifyContent: 'center', pb: 2 }}>
          <ul className="oc-ul">
            <OcNode node={org} onEdit={handleEdit} />
          </ul>
        </Box>
      </Box>

      {/* Legend */}
      <Box
        className="oc-no-print"
        sx={{
          display: 'flex',
          gap: 2,
          mt: 2,
          flexWrap: 'wrap',
          px: 0.5,
        }}
      >
        {LEGEND.map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: item.color }} />
            <Typography sx={{ fontSize: 11, color: '#64748B' }}>{item.label}</Typography>
          </Box>
        ))}
        <Typography sx={{ fontSize: 11, color: '#94A3B8', ml: 'auto' }}>
          Les modifications sont sauvegardées localement
        </Typography>
      </Box>

      {/* ─── Edit node / side item dialog ─── */}
      <Dialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 1 }}>
          {isEditingSide ? 'Modifier le rattaché' : 'Modifier le nœud'}
        </DialogTitle>
        <DialogContent>
          {isEditingSide ? (
            <TextField
              label="Intitulé"
              value={editSideVal}
              onChange={(e) => setEditSideVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              fullWidth
              size="small"
              sx={{ mt: 1 }}
              autoFocus
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {editTarget?.node.code !== undefined && (
                <TextField
                  label="Code / Sigle"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  fullWidth
                  size="small"
                  inputProps={{ style: { textTransform: 'uppercase', letterSpacing: '0.08em' } }}
                />
              )}
              <TextField
                label="Intitulé complet"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                fullWidth
                size="small"
                multiline
                rows={2}
                autoFocus={editTarget?.node.code === undefined}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setEditTarget(null)} sx={{ borderRadius: '8px' }}>
            Annuler
          </Button>
          <Button size="small" variant="contained" onClick={handleSave} sx={{ borderRadius: '8px', px: 2 }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Reset confirmation dialog ─── */}
      <Dialog
        open={resetConfirm}
        onClose={() => setResetConfirm(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Réinitialiser l'organigramme ?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: '#64748B' }}>
            Toutes vos modifications seront perdues. L'organigramme sera remis aux intitulés d'origine.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setResetConfirm(false)} sx={{ borderRadius: '8px' }}>
            Annuler
          </Button>
          <Button size="small" variant="contained" color="error" onClick={handleReset} sx={{ borderRadius: '8px', px: 2 }}>
            Réinitialiser
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
