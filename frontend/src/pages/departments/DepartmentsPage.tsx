import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Typography, IconButton, Tooltip, Button, Skeleton,
  Chip, Collapse, InputAdornment, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, FormControl, InputLabel, Select,
} from '@mui/material';
import {
  Add, Edit, Delete, People, ExpandMore, ChevronRight,
  Search, AccountTree, Hub, UnfoldMore, UnfoldLess,
} from '@mui/icons-material';
import { organisationUnitApi, type OrgUnit } from '../../api/organisationUnits';
import PageHeader from '../../components/common/PageHeader';
import OrganigrammePage from '../organigramme/OrganigrammePage';

// ── Types ─────────────────────────────────────────────────────────────────────

type OrgNode = OrgUnit & { children: OrgNode[] };

// ── Palette par type d'entité ─────────────────────────────────────────────────

const TYPE_CFG: Record<OrgUnit['type'], { label: string; color: string; bg: string; border: string }> = {
  gouvernance: { label: 'Gouvernance', color: '#fff',    bg: '#002f59', border: '#002f59' },
  direction:   { label: 'Direction',   color: '#1B4B8A', bg: '#EFF6FF', border: '#BFDBFE' },
  appui:       { label: 'Appui',       color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
  cellule:     { label: 'Cellule',     color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  division:    { label: 'Division',    color: '#059669', bg: '#F0FDF4', border: '#A7F3D0' },
};

// ── Construction de l'arbre ───────────────────────────────────────────────────

function buildOrgTree(flat: OrgUnit[]): OrgNode[] {
  const byId = new Map<number, OrgNode>(
    flat.map(u => [u.id, { ...u, children: [] }])
  );
  const roots: OrgNode[] = [];
  byId.forEach(node => {
    if (!node.parent_id) {
      roots.push(node);
    } else {
      const parent = byId.get(node.parent_id);
      if (parent) parent.children.push(node);
    }
  });
  const sort = (arr: OrgNode[]) => {
    arr.sort((a, b) => a.ordre - b.ordre);
    arr.forEach(n => sort(n.children));
    return arr;
  };
  return sort(roots);
}

// ── Ligne de l'arbre ──────────────────────────────────────────────────────────

interface OrgRowProps {
  node: OrgNode;
  level: number;
  expanded: Set<number>;
  toggle: (id: number) => void;
  onEdit: (u: OrgUnit) => void;
  onDelete: (id: number) => void;
}

function OrgRow({ node, level, expanded, toggle, onEdit, onDelete }: OrgRowProps) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const cfg = TYPE_CFG[node.type] ?? TYPE_CFG.division;

  // Niveau 0 = ligne de rupture principale (bandeau plein)
  const isRupturePrinc = node.niveau === 0;
  // Niveau 1 = ligne de rupture secondaire (fond clair + bordure gauche colorée)
  const isRuptureSecond = node.niveau === 1;

  return (
    <>
      <Box
        onClick={() => hasChildren && toggle(node.id)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: isRupturePrinc ? 1.5 : 1.25,
          gap: 1,
          cursor: hasChildren ? 'pointer' : 'default',
          borderBottom: '1px solid',
          borderBottomColor: isRupturePrinc ? '#001a35' : '#F1F5F9',
          bgcolor: isRupturePrinc ? '#002f59' : isRuptureSecond ? cfg.bg : '#fff',
          borderLeft: isRuptureSecond
            ? `4px solid ${cfg.border}`
            : isRupturePrinc
              ? 'none'
              : '4px solid transparent',
          '&:hover': {
            bgcolor: isRupturePrinc
              ? '#00336e'
              : isRuptureSecond
                ? `${cfg.bg}`
                : '#F8FAFC',
          },
          '&:hover .org-actions': { opacity: 1 },
          transition: 'background 0.12s',
        }}
      >
        {/* Indentation */}
        <Box sx={{ width: level * 20, flexShrink: 0 }} />

        {/* Icône expand/dot */}
        <Box sx={{ width: 22, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          {hasChildren ? (
            isOpen
              ? <ExpandMore sx={{ fontSize: 17, color: isRupturePrinc ? '#93C5FD' : '#64748B' }} />
              : <ChevronRight sx={{ fontSize: 17, color: isRupturePrinc ? '#93C5FD' : '#64748B' }} />
          ) : (
            <Box sx={{
              width: 7, height: 7, borderRadius: '50%',
              bgcolor: isRupturePrinc ? 'rgba(255,255,255,0.35)' : cfg.border,
              mx: 'auto',
            }} />
          )}
        </Box>

        {/* Badge code */}
        <Chip
          label={node.code}
          size="small"
          sx={{
            height: isRupturePrinc ? 22 : 18,
            fontSize: isRupturePrinc ? 11 : 9.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            bgcolor: isRupturePrinc ? 'rgba(255,255,255,0.12)' : '#fff',
            color: isRupturePrinc ? '#fff' : cfg.color,
            border: `1px solid ${isRupturePrinc ? 'rgba(255,255,255,0.25)' : cfg.border}`,
            flexShrink: 0,
          }}
        />

        {/* Libellé */}
        <Typography sx={{
          flexGrow: 1,
          fontSize: isRupturePrinc ? 14 : isRuptureSecond ? 13.5 : 12.5,
          fontWeight: isRupturePrinc ? 800 : isRuptureSecond ? 700 : 500,
          color: isRupturePrinc ? '#fff' : '#0F172A',
          letterSpacing: isRupturePrinc ? '0.02em' : '-0.1px',
        }} noWrap>
          {node.libelle}
        </Typography>

        {/* Badge type */}
        <Chip
          label={cfg.label}
          size="small"
          sx={{
            height: 20,
            fontSize: 10,
            fontWeight: 600,
            bgcolor: isRupturePrinc ? 'rgba(255,255,255,0.15)' : cfg.bg,
            color: isRupturePrinc ? '#fff' : cfg.color,
            border: `1px solid ${isRupturePrinc ? 'rgba(255,255,255,0.25)' : cfg.border}`,
            flexShrink: 0,
            display: { xs: 'none', sm: 'flex' },
          }}
        />

        {/* Compteur agents */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 48, justifyContent: 'flex-end', flexShrink: 0 }}>
          <People sx={{ fontSize: 12, color: isRupturePrinc ? '#93C5FD' : '#94A3B8' }} />
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: isRupturePrinc ? '#93C5FD' : '#64748B' }}>
            {node.nb_agents ?? 0}
          </Typography>
        </Box>

        {/* Actions (hover) */}
        <Box
          className="org-actions"
          sx={{ display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.12s', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <Tooltip title="Modifier">
            <IconButton size="small" onClick={() => onEdit(node)} sx={{ p: 0.5 }}>
              <Edit sx={{ fontSize: 14, color: isRupturePrinc ? '#93C5FD' : '#64748B' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton size="small" onClick={() => onDelete(node.id)} sx={{ p: 0.5 }}>
              <Delete sx={{ fontSize: 14, color: isRupturePrinc ? '#FCA5A5' : '#EF4444' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Enfants pliables */}
      {hasChildren && (
        <Collapse in={isOpen} unmountOnExit>
          {/* Trait séparateur avant chaque bloc niveau 1 */}
          {node.children.map((child, idx) => (
            <Box key={child.id}>
              {isRupturePrinc && idx > 0 && (
                <Box sx={{ height: 1, bgcolor: '#E2E8F0', mx: 0 }} />
              )}
              <OrgRow
                node={child}
                level={level + 1}
                expanded={expanded}
                toggle={toggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </Box>
          ))}
        </Collapse>
      )}
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

const NAV = '#0D2137';
const ACT = '#818CF8';

type FormData = {
  code: string;
  libelle: string;
  type: OrgUnit['type'];
  niveau: number;
  parent_id: string;
  ordre: number;
};

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab]   = useState(0);
  const [search, setSearch]         = useState('');
  const [expanded, setExpanded]     = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgUnit | null>(null);

  const { data: flatList = [], isLoading } = useQuery<OrgUnit[]>({
    queryKey: ['org-units'],
    queryFn: () =>
      organisationUnitApi.list().then(r => {
        const raw = r.data as unknown;
        const list = (Array.isArray(raw)
          ? raw
          : ((raw as { data?: OrgUnit[] }).data ?? [])
        ) as OrgUnit[];
        setExpanded(prev =>
          prev.size === 0
            ? new Set(list.filter(u => u.niveau === 0).map(u => u.id))
            : prev
        );
        return list;
      }),
  });

  const tree = useMemo(() => {
    if (!search.trim()) return buildOrgTree(flatList);
    const q = search.toLowerCase();
    const filtered = flatList.filter(
      u => u.libelle.toLowerCase().includes(q) || u.code.toLowerCase().includes(q)
    );
    return buildOrgTree(filtered);
  }, [flatList, search]);

  const toggleExpand = (id: number) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const expandAll  = () => setExpanded(new Set(flatList.map(u => u.id)));
  const collapseAll = () => setExpanded(new Set());

  // CRUD
  const createMut = useMutation({
    mutationFn: (data: Partial<OrgUnit>) => organisationUnitApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-units'] }); closeDialog(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OrgUnit> }) =>
      organisationUnitApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-units'] }); closeDialog(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => organisationUnitApi.destroy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-units'] }),
  });

  const { register, handleSubmit, reset, control } = useForm<FormData>();

  const openCreate = () => {
    reset({ code: '', libelle: '', type: 'division', niveau: 2, parent_id: '', ordre: 100 });
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (u: OrgUnit) => {
    setEditTarget(u);
    reset({
      code:      u.code,
      libelle:   u.libelle,
      type:      u.type,
      niveau:    u.niveau,
      parent_id: u.parent_id ? String(u.parent_id) : '',
      ordre:     u.ordre,
    });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditTarget(null); };

  const onSubmit = (form: FormData) => {
    const payload: Partial<OrgUnit> = {
      code:      form.code.toUpperCase(),
      libelle:   form.libelle,
      type:      form.type,
      niveau:    Number(form.niveau),
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      ordre:     Number(form.ordre),
    };
    if (editTarget) updateMut.mutate({ id: editTarget.id, data: payload });
    else createMut.mutate(payload);
  };

  // Stats
  const nbDirections = flatList.filter(u => u.type === 'direction').length;
  const nbDivisions  = flatList.filter(u => u.type === 'division').length;
  const nbAgents     = flatList.reduce((s, u) => s + (u.nb_agents ?? 0), 0);

  return (
    <Box>
      <PageHeader
        title="Directions & Services"
        subtitle={`${flatList.length} entités · ${nbDirections} directions · ${nbDivisions} divisions · ${nbAgents} agents`}
        action={activeTab === 0 ? { label: 'Nouvelle entité', icon: <Add />, onClick: openCreate } : undefined}
      />

      {/* ── Onglets ── */}
      <Box sx={{ bgcolor: '#F1F5F9', px: 2, pt: 1.5, pb: 0, display: 'flex', gap: 1, borderBottom: `2px solid ${NAV}`, mb: 2 }}>
        {[
          { label: 'Structure organisationnelle', icon: <AccountTree sx={{ fontSize: 15 }} /> },
          { label: 'Organigramme',                icon: <Hub         sx={{ fontSize: 15 }} /> },
        ].map((cfg, i) => {
          const active = i === activeTab;
          return (
            <Box key={i} onClick={() => setActiveTab(i)} sx={{
              px: 2, py: 1, cursor: 'pointer', borderRadius: '8px 8px 0 0',
              fontWeight: 700, fontSize: 13, userSelect: 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
              bgcolor: active ? ACT : '#fff',
              color:   active ? '#fff' : NAV,
              border:  `1.5px solid ${active ? ACT : '#C7D2FE'}`,
              borderBottom: 'none',
              boxShadow: active ? '0 -2px 8px rgba(129,140,248,0.30)' : 'none',
              transition: 'all 0.15s',
              '&:hover': { bgcolor: active ? ACT : '#EEF2FF' },
            }}>
              {cfg.icon}{cfg.label}
            </Box>
          );
        })}
      </Box>

      {/* ── Organigramme ── */}
      {activeTab === 1 && <OrganigrammePage embeddedMode />}

      {/* ── Structure organisationnelle ── */}
      {activeTab === 0 && (<>

        {/* Barre d'outils */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Rechercher une direction, division…"
            size="small"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ flexGrow: 1, maxWidth: 360 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: '#94A3B8' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button size="small" variant="outlined" startIcon={<UnfoldMore />} onClick={expandAll}
            sx={{ borderRadius: '8px', fontSize: 12, textTransform: 'none', display: { xs: 'none', sm: 'flex' } }}>
            Tout ouvrir
          </Button>
          <Button size="small" variant="outlined" startIcon={<UnfoldLess />} onClick={collapseAll}
            sx={{ borderRadius: '8px', fontSize: 12, textTransform: 'none', display: { xs: 'none', sm: 'flex' } }}>
            Tout réduire
          </Button>
        </Box>

        {/* Statistiques */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          {[
            { label: 'Total entités',       value: flatList.length, color: '#002f59' },
            { label: 'Directions',          value: nbDirections,    color: '#1B4B8A' },
            { label: 'Divisions',           value: nbDivisions,     color: '#059669' },
            { label: 'Agents référencés',   value: nbAgents,        color: '#ff7631' },
          ].map(s => (
            <Box key={s.label} sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 1.5, py: 0.75,
              bgcolor: `${s.color}10`,
              border: `1px solid ${s.color}28`,
              borderRadius: '8px',
            }}>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                {s.value}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#64748B' }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>

        {/* Légende types */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_CFG).map(([key, cfg]) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: key === 'gouvernance' ? cfg.bg : cfg.color }} />
              <Typography sx={{ fontSize: 11, color: '#64748B' }}>{cfg.label}</Typography>
            </Box>
          ))}
        </Box>

        {/* Tableau de rupture */}
        <Box sx={{
          bgcolor: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
        }}>
          {/* En-tête colonnes */}
          <Box sx={{
            display: 'flex', alignItems: 'center',
            px: 2, py: 1,
            bgcolor: '#F8FAFC',
            borderBottom: '2px solid #E2E8F0',
            gap: 1,
          }}>
            <Box sx={{ width: 50, flexShrink: 0 }} />
            <Typography sx={{ flexGrow: 1, fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Intitulé
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 90, display: { xs: 'none', sm: 'block' } }}>
              Type
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 56, textAlign: 'right' }}>
              Agents
            </Typography>
            <Box sx={{ width: 64, flexShrink: 0 }} />
          </Box>

          {/* Lignes */}
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <Box key={i} sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F1F5F9' }}>
                  <Skeleton height={22} width={`${55 + (i % 4) * 10}%`} />
                </Box>
              ))
            : tree.length === 0
              ? (
                <Box sx={{ py: 7, textAlign: 'center' }}>
                  <AccountTree sx={{ fontSize: 36, color: '#CBD5E1', mb: 1 }} />
                  <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>
                    {search
                      ? 'Aucun résultat pour cette recherche'
                      : 'Aucune entité — initialisez l\'organigramme dans Configuration'}
                  </Typography>
                </Box>
              )
              : tree.map((root, idx) => (
                  <Box key={root.id}>
                    {/* Séparateur entre blocs racine */}
                    {idx > 0 && (
                      <Box sx={{ height: 3, bgcolor: '#E2E8F0' }} />
                    )}
                    <OrgRow
                      node={root}
                      level={0}
                      expanded={expanded}
                      toggle={toggleExpand}
                      onEdit={openEdit}
                      onDelete={id => deleteMut.mutate(id)}
                    />
                  </Box>
                ))
          }
        </Box>

        {/* ── Dialog Créer / Modifier ── */}
        <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth
          PaperProps={{ sx: { borderRadius: '14px' } }}>
          <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 1 }}>
            {editTarget ? 'Modifier l\'entité' : 'Nouvelle entité'}
          </DialogTitle>
          <DialogContent>
            <Box
              component="form"
              id="org-form"
              onSubmit={handleSubmit(onSubmit)}
              sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  {...register('code', { required: true })}
                  label="Code / Sigle *"
                  sx={{ flexGrow: 1 }}
                  size="small"
                  autoFocus
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
                <TextField
                  {...register('ordre', { valueAsNumber: true })}
                  label="Ordre"
                  type="number"
                  sx={{ width: 100 }}
                  size="small"
                />
              </Box>

              <TextField
                {...register('libelle', { required: true })}
                label="Intitulé complet *"
                fullWidth
                size="small"
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="Type">
                        {Object.entries(TYPE_CFG).map(([key, cfg]) => (
                          <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
                <TextField
                  {...register('niveau', { valueAsNumber: true })}
                  label="Niveau"
                  type="number"
                  sx={{ width: 110 }}
                  size="small"
                  inputProps={{ min: 0, max: 5 }}
                  helperText="0 = racine"
                />
              </Box>

              <FormControl size="small" fullWidth>
                <InputLabel>Entité parente</InputLabel>
                <Controller
                  name="parent_id"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} label="Entité parente">
                      <MenuItem value="">— Aucune (entité racine) —</MenuItem>
                      {flatList
                        .filter(u => !editTarget || u.id !== editTarget.id)
                        .sort((a, b) => a.niveau - b.niveau || a.ordre - b.ordre)
                        .map(u => (
                          <MenuItem key={u.id} value={String(u.id)}>
                            {'· '.repeat(u.niveau)}[{u.code}] {u.libelle}
                          </MenuItem>
                        ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
            <Button size="small" onClick={closeDialog} sx={{ borderRadius: '8px' }}>
              Annuler
            </Button>
            <Button
              form="org-form"
              type="submit"
              variant="contained"
              size="small"
              disabled={createMut.isPending || updateMut.isPending}
              sx={{ borderRadius: '8px', px: 2.5 }}
            >
              {editTarget ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogActions>
        </Dialog>
      </>)}
    </Box>
  );
}
