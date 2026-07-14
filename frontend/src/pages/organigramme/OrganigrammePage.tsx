import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, TextField, Tooltip, GlobalStyles, Chip,
  MenuItem, Select, FormControl, InputLabel, Alert, CircularProgress,
  Paper, Stack,
} from '@mui/material';
import {
  Edit, Delete, Add, Print, Restore, ExpandMore, ExpandLess,
  DeleteForever,
} from '@mui/icons-material';
import { organisationUnitApi, type OrgUnit } from '../../api/organisationUnits';
import { useCompany } from '../../hooks/useCompany';

// ─── Couleurs par type ────────────────────────────────────────────────────────
const TYPE_COLOR: Record<OrgUnit['type'], string> = {
  gouvernance: '#002f59',
  appui:       '#64748B',
  cellule:     '#0891B2',
  direction:   '#7C3AED',
  division:    '#059669',
};

// Couleur spécifique par code de direction
const DIR_COLOR: Record<string, string> = {
  DEP:   '#0284C7',
  DAC:   '#7C3AED',
  DPSRC: '#059669',
  DDC:   '#D97706',
  DAF:   '#DC2626',
};

function unitColor(u: OrgUnit): string {
  if (DIR_COLOR[u.code]) return DIR_COLOR[u.code];
  if (u.parent_id) {
    // hérite de la couleur de la direction parente
    const parentCode = u.code.split('-')[0];
    if (DIR_COLOR[parentCode]) return DIR_COLOR[parentCode];
  }
  return TYPE_COLOR[u.type] ?? '#002f59';
}

const TYPE_LABELS: Record<OrgUnit['type'], string> = {
  gouvernance: 'Gouvernance',
  appui:       'Appui / Staff',
  cellule:     'Cellule',
  direction:   'Direction',
  division:    'Division',
};

// ─── CSS connecteurs arbre ────────────────────────────────────────────────────
const CONN_COLOR = '#94A3B8';
const connectorStyles = `
  .oc-ul { display:flex; flex-direction:row; justify-content:center; padding-top:30px !important; padding-left:0 !important; position:relative; list-style:none; margin:0; }
  .oc-ul::before { content:''; position:absolute; top:0; left:50%; transform:translateX(-50%); border-left:2px solid ${CONN_COLOR}; height:30px; width:0; }
  .oc-li { display:flex; flex-direction:column; align-items:center; list-style:none; position:relative; padding:30px 12px 0 12px; }
  .oc-li::before,.oc-li::after { content:''; position:absolute; top:0; right:50%; border-top:2px solid ${CONN_COLOR}; width:50%; height:30px; }
  .oc-li::after { right:auto; left:50%; border-left:2px solid ${CONN_COLOR}; }
  .oc-li:only-child { padding-top:0; }
  .oc-li:only-child::before,.oc-li:only-child::after { display:none; }
  .oc-li:first-child::before,.oc-li:last-child::after { border:0 none; }
  .oc-li:last-child::before { border-right:2px solid ${CONN_COLOR}; border-radius:0 6px 0 0; }
  .oc-li:first-child::after { border-radius:6px 0 0 0; }
  @media print { .oc-no-print { display:none !important; } .oc-chart-area { box-shadow:none !important; border:none !important; } }
`;

// ─── Construction de l'arbre depuis la liste plate ────────────────────────────
interface TreeNode extends OrgUnit { children: TreeNode[] }

function buildTree(units: OrgUnit[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  units.forEach(u => map.set(u.id, { ...u, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  // tri par ordre
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.ordre - b.ordre);
    nodes.forEach(n => sort(n.children));
  };
  sort(roots);
  return roots;
}

// ─── Carte nœud ──────────────────────────────────────────────────────────────
function NodeCard({ node, onEdit, onDelete, onAdd }: {
  node: TreeNode;
  onEdit: (n: TreeNode) => void;
  onDelete: (n: TreeNode) => void;
  onAdd: (parent: TreeNode) => void;
}) {
  const color = unitColor(node);
  const isGov = node.type === 'gouvernance';
  const isDivision = node.type === 'division';
  const canDelete = node.children.length === 0;

  return (
    <Box sx={{
      position: 'relative',
      display: 'inline-block',
      border: `2px solid ${color}`,
      borderRadius: isDivision ? '8px' : '12px',
      bgcolor: isGov ? color : `${color}12`,
      minWidth: isDivision ? 120 : 150,
      maxWidth: isDivision ? 170 : 210,
      transition: 'box-shadow .15s, transform .15s',
      '&:hover': { boxShadow: `0 4px 18px ${color}35`, transform: 'translateY(-1px)' },
      '&:hover .oc-actions': { opacity: 1 },
    }}>
      {/* Corps */}
      <Box sx={{ px: 1.5, pt: isDivision ? 0.85 : 1.2, pb: 0.85, textAlign: 'center' }}>
        <Box sx={{
          display: 'inline-block', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', px: 0.75, py: 0.1, borderRadius: '3px', mb: 0.5,
          color: isGov ? 'rgba(255,255,255,.9)' : color,
          bgcolor: isGov ? 'rgba(255,255,255,.18)' : `${color}22`,
        }}>
          {node.code}
        </Box>
        <Typography sx={{
          fontSize: isDivision ? 10 : 11.5, fontWeight: isDivision ? 500 : 700,
          color: isGov ? '#fff' : '#1E293B', lineHeight: 1.35, display: 'block',
        }}>
          {node.libelle}
        </Typography>
        {node.nb_agents != null && node.nb_agents > 0 && (
          <Chip label={`${node.nb_agents} agent${node.nb_agents > 1 ? 's' : ''}`} size="small"
            sx={{ mt: 0.5, fontSize: 9, height: 16, bgcolor: isGov ? 'rgba(255,255,255,.2)' : `${color}18`, color: isGov ? '#fff' : color }} />
        )}
        <Chip label={TYPE_LABELS[node.type]} size="small"
          sx={{ mt: 0.5, ml: 0.5, fontSize: 9, height: 16, bgcolor: isGov ? 'rgba(255,255,255,.15)' : '#F1F5F9', color: isGov ? 'rgba(255,255,255,.8)' : '#64748B' }} />
      </Box>

      {/* Boutons actions au hover */}
      <Stack direction="row" spacing={0.25} className="oc-actions"
        sx={{ position: 'absolute', top: 3, right: 3, opacity: 0, transition: 'opacity .15s' }}>
        <Tooltip title="Ajouter un enfant">
          <IconButton size="small" onClick={e => { e.stopPropagation(); onAdd(node); }}
            sx={{ p: 0.3, width: 20, height: 20, bgcolor: 'rgba(255,255,255,.9)', '&:hover': { bgcolor: '#fff' }, boxShadow: '0 1px 4px rgba(0,0,0,.12)' }}>
            <Add sx={{ fontSize: 11, color: color }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Modifier">
          <IconButton size="small" onClick={e => { e.stopPropagation(); onEdit(node); }}
            sx={{ p: 0.3, width: 20, height: 20, bgcolor: 'rgba(255,255,255,.9)', '&:hover': { bgcolor: '#fff' }, boxShadow: '0 1px 4px rgba(0,0,0,.12)' }}>
            <Edit sx={{ fontSize: 11, color: color }} />
          </IconButton>
        </Tooltip>
        {canDelete && (
          <Tooltip title="Supprimer">
            <IconButton size="small" onClick={e => { e.stopPropagation(); onDelete(node); }}
              sx={{ p: 0.3, width: 20, height: 20, bgcolor: 'rgba(255,255,255,.9)', '&:hover': { bgcolor: '#fff' }, boxShadow: '0 1px 4px rgba(0,0,0,.12)' }}>
              <Delete sx={{ fontSize: 11, color: '#DC2626' }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

// ─── Nœud récursif ───────────────────────────────────────────────────────────
function OcNode({ node, onEdit, onDelete, onAdd }: {
  node: TreeNode;
  onEdit: (n: TreeNode) => void;
  onDelete: (n: TreeNode) => void;
  onAdd: (parent: TreeNode) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <li className="oc-li">
      <Box sx={{ position: 'relative' }}>
        <NodeCard node={node} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />
        {node.children.length > 0 && (
          <Tooltip title={open ? 'Réduire' : 'Déployer'}>
            <IconButton size="small" onClick={() => setOpen(o => !o)}
              sx={{ position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)', zIndex: 2, bgcolor: '#fff', border: '1px solid #E2E8F0', width: 22, height: 22, boxShadow: '0 1px 4px rgba(0,0,0,.1)' }}>
              {open ? <ExpandLess sx={{ fontSize: 13, color: '#64748B' }} /> : <ExpandMore sx={{ fontSize: 13, color: '#64748B' }} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {open && node.children.length > 0 && (
        <ul className="oc-ul">
          {node.children.map(child => (
            <OcNode key={child.id} node={child} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Légende ─────────────────────────────────────────────────────────────────
const LEGEND = [
  { label: 'Gouvernance',   color: '#002f59' },
  { label: 'Appui / Staff', color: '#64748B' },
  { label: 'Cellule',       color: '#0891B2' },
  { label: 'Direction',     color: '#7C3AED' },
  { label: 'Division',      color: '#059669' },
];

// ─── Formulaire vide ──────────────────────────────────────────────────────────
const EMPTY_FORM = { code: '', libelle: '', type: 'direction' as OrgUnit['type'], niveau: 1, parent_id: null as number | null };

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OrganigrammePage({ embeddedMode = false }: { embeddedMode?: boolean }) {
  const { name: companyName } = useCompany();
  const qc = useQueryClient();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['organisation-units'],
    queryFn: () => organisationUnitApi.list().then(r => r.data),
  });

  const tree = useMemo(() => buildTree(units), [units]);

  // ── États dialogs ──
  const [editTarget, setEditTarget]   = useState<TreeNode | null>(null);
  const [addParent, setAddParent]     = useState<TreeNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TreeNode | null>(null);
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);

  // ── Mutations ──
  const invalidate = () => qc.invalidateQueries({ queryKey: ['organisation-units'] });

  const createMut = useMutation({
    mutationFn: (d: typeof EMPTY_FORM) => organisationUnitApi.create({ ...d, code: d.code.toUpperCase() }),
    onSuccess: () => { invalidate(); setAddParent(null); setForm(EMPTY_FORM); },
  });

  const updateMut = useMutation({
    mutationFn: (d: typeof EMPTY_FORM) => organisationUnitApi.update(editTarget!.id, { ...d, code: d.code.toUpperCase() }),
    onSuccess: () => { invalidate(); setEditTarget(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => organisationUnitApi.destroy(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const seedMut = useMutation({
    mutationFn: () => organisationUnitApi.seed(),
    onSuccess: () => { invalidate(); setSeedConfirm(false); },
  });

  const openEdit = (node: TreeNode) => {
    setEditTarget(node);
    setForm({ code: node.code, libelle: node.libelle, type: node.type, niveau: node.niveau, parent_id: node.parent_id });
  };

  const openAdd = (parent: TreeNode) => {
    setAddParent(parent);
    setForm({ ...EMPTY_FORM, parent_id: parent.id, niveau: parent.niveau + 1,
      type: parent.type === 'direction' ? 'division' : parent.type === 'gouvernance' ? 'direction' : 'cellule' });
  };

  if (isLoading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress /></Box>
  );

  return (
    <Box>
      <GlobalStyles styles={connectorStyles} />

      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2.5, gap: 2, flexWrap: 'wrap' }}>
        {!embeddedMode && (
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
              Organigramme {companyName}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.5 }}>
              Survolez un nœud pour modifier, ajouter ou supprimer une entité
            </Typography>
          </Box>
        )}
        {embeddedMode && (
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#002f59', flexGrow: 1 }}>
            Organigramme officiel ANASER
          </Typography>
        )}
        <Stack direction="row" spacing={1} className="oc-no-print">
          <Button variant="outlined" size="small" startIcon={<Add />}
            onClick={() => { setAddParent(null); setForm(EMPTY_FORM); }}
            sx={{ borderRadius: '9px', fontSize: 12, textTransform: 'none', borderColor: '#002f59', color: '#002f59' }}>
            Ajouter
          </Button>
          <Button variant="outlined" size="small" startIcon={<Print />}
            onClick={() => window.print()}
            sx={{ borderRadius: '9px', fontSize: 12, textTransform: 'none' }}>
            Imprimer
          </Button>
          <Button variant="outlined" color="warning" size="small" startIcon={<Restore />}
            onClick={() => setSeedConfirm(true)}
            sx={{ borderRadius: '9px', fontSize: 12, textTransform: 'none' }}>
            Réinitialiser
          </Button>
        </Stack>
      </Box>

      {/* Zone graphique */}
      <Box className="oc-chart-area" sx={{
        overflow: 'auto', bgcolor: '#FAFCFF', border: '1px solid #E2E8F0',
        borderRadius: '14px', p: { xs: 2, md: 4 }, boxShadow: '0 2px 12px rgba(0,0,0,.04)',
      }}>
        {tree.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary" mb={2}>Aucune entité organisationnelle. Initialisez avec les données officielles.</Typography>
            <Button variant="contained" onClick={() => setSeedConfirm(true)}
              sx={{ bgcolor: '#002f59', borderRadius: 2, textTransform: 'none' }}>
              Charger la structure ANASER
            </Button>
          </Box>
        ) : (
          <Box sx={{ minWidth: 1100, display: 'flex', justifyContent: 'center', pb: 2 }}>
            <ul className="oc-ul">
              {tree.map(node => (
                <OcNode key={node.id} node={node} onEdit={openEdit} onDelete={setDeleteTarget} onAdd={openAdd} />
              ))}
            </ul>
          </Box>
        )}
      </Box>

      {/* Légende */}
      <Stack direction="row" spacing={2} mt={2} flexWrap="wrap" px={0.5} className="oc-no-print">
        {LEGEND.map(item => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: item.color }} />
            <Typography sx={{ fontSize: 11, color: '#64748B' }}>{item.label}</Typography>
          </Box>
        ))}
        <Typography sx={{ fontSize: 11, color: '#94A3B8', ml: 'auto' }}>
          {units.length} entités · données sauvegardées en base
        </Typography>
      </Stack>

      {/* ── Dialog Ajouter ── */}
      <Dialog open={addParent !== null || (addParent === null && form.code !== '' && !editTarget)} onClose={() => { setAddParent(null); setForm(EMPTY_FORM); }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 15 }}>
          {addParent ? `Ajouter sous "${addParent.libelle}"` : 'Nouvelle entité organisationnelle'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Code / Sigle *" value={form.code} size="small" fullWidth
              inputProps={{ style: { textTransform: 'uppercase', letterSpacing: '0.08em' } }}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            <TextField label="Intitulé complet *" value={form.libelle} size="small" fullWidth multiline rows={2}
              onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
            <FormControl size="small" fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={form.type} label="Type" onChange={e => setForm(f => ({ ...f, type: e.target.value as OrgUnit['type'] }))}>
                {(Object.entries(TYPE_LABELS) as [OrgUnit['type'], string][]).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {addParent === null && (
              <FormControl size="small" fullWidth>
                <InputLabel>Unité parente</InputLabel>
                <Select value={form.parent_id ?? ''} label="Unité parente"
                  onChange={e => setForm(f => ({ ...f, parent_id: e.target.value === '' ? null : +e.target.value }))}>
                  <MenuItem value="">Aucune (racine)</MenuItem>
                  {units.map(u => <MenuItem key={u.id} value={u.id}>{u.code} — {u.libelle}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {createMut.isError && <Alert severity="error">Erreur lors de la création.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button size="small" onClick={() => { setAddParent(null); setForm(EMPTY_FORM); }}>Annuler</Button>
          <Button size="small" variant="contained" disabled={createMut.isPending || !form.code || !form.libelle}
            onClick={() => createMut.mutate(form)}
            sx={{ bgcolor: '#002f59', borderRadius: '8px', px: 2 }}>
            {createMut.isPending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Modifier ── */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 15 }}>Modifier l'entité</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Code / Sigle *" value={form.code} size="small" fullWidth
              inputProps={{ style: { textTransform: 'uppercase', letterSpacing: '0.08em' } }}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            <TextField label="Intitulé complet *" value={form.libelle} size="small" fullWidth multiline rows={2}
              onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
            <FormControl size="small" fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={form.type} label="Type" onChange={e => setForm(f => ({ ...f, type: e.target.value as OrgUnit['type'] }))}>
                {(Object.entries(TYPE_LABELS) as [OrgUnit['type'], string][]).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Unité parente</InputLabel>
              <Select value={form.parent_id ?? ''} label="Unité parente"
                onChange={e => setForm(f => ({ ...f, parent_id: e.target.value === '' ? null : +e.target.value }))}>
                <MenuItem value="">Aucune (racine)</MenuItem>
                {units.filter(u => u.id !== editTarget?.id).map(u => (
                  <MenuItem key={u.id} value={u.id}>{u.code} — {u.libelle}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {updateMut.isError && <Alert severity="error">Erreur lors de la modification.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button size="small" onClick={() => setEditTarget(null)}>Annuler</Button>
          <Button size="small" variant="contained" disabled={updateMut.isPending || !form.code || !form.libelle}
            onClick={() => updateMut.mutate(form)}
            sx={{ bgcolor: '#002f59', borderRadius: '8px', px: 2 }}>
            {updateMut.isPending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Supprimer ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DeleteForever sx={{ color: '#DC2626', fontSize: 26 }} />
          <Typography fontWeight={800} fontSize={16}>Supprimer l'entité</Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            L'entité <strong>{deleteTarget?.libelle}</strong> ({deleteTarget?.code}) sera supprimée définitivement.
          </Alert>
          {deleteMut.isError && <Alert severity="error" sx={{ mt: 1 }}>
            {(deleteMut.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur'}
          </Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button size="small" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button size="small" variant="contained" color="error" disabled={deleteMut.isPending}
            onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            sx={{ borderRadius: '8px', px: 2 }}>
            {deleteMut.isPending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Réinitialiser ── */}
      <Dialog open={seedConfirm} onClose={() => setSeedConfirm(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 15 }}>Réinitialiser la structure ANASER ?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: '#64748B' }}>
            Toutes les entités actuelles seront supprimées et remplacées par la structure officielle ANASER (32 entités).
          </Typography>
          {seedMut.isError && <Alert severity="error" sx={{ mt: 1 }}>Erreur lors de la réinitialisation.</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button size="small" onClick={() => setSeedConfirm(false)}>Annuler</Button>
          <Button size="small" variant="contained" color="warning" disabled={seedMut.isPending}
            onClick={() => seedMut.mutate()}
            sx={{ borderRadius: '8px', px: 2 }}>
            {seedMut.isPending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Réinitialiser'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
