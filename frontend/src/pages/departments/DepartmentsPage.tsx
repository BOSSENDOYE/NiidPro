import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Button, Skeleton,
  Chip, Collapse, Avatar, InputAdornment,
} from '@mui/material';
import {
  Add, Edit, Delete, People, ExpandMore, ChevronRight,
  Search, AccountTree, ViewList,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { departmentsApi } from '../../api/departments';
import PageHeader from '../../components/common/PageHeader';
import type { Department } from '../../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Compute visual depth of a dept in the flat list (0 = root) */
function depth(dept: Department, all: Department[]): number {
  if (!dept.parent_id) return 0;
  const parent = all.find((d) => d.id === dept.parent_id);
  return parent ? depth(parent, all) + 1 : 0;
}

/** Build a tree from a flat list */
function buildTree(flat: Department[]): Department[] {
  const byId = new Map(flat.map((d) => [d.id, { ...d, children: [] as Department[] }]));
  const roots: Department[] = [];
  byId.forEach((node) => {
    if (!node.parent_id) {
      roots.push(node);
    } else {
      const parent = byId.get(node.parent_id);
      if (parent) parent.children!.push(node);
    }
  });
  return roots;
}

function typeLabel(dept: Department): { label: string; color: string; bg: string } {
  const d = (dept.description ?? '').toLowerCase();
  if (d.includes('division')) return { label: 'Division', color: '#0284C7', bg: '#EFF6FF' };
  if (dept.parent_id === null || dept.parent_id === undefined) {
    if (dept.code === 'CS') return { label: 'Conseil', color: '#6366F1', bg: '#F5F3FF' };
    return { label: 'Direction', color: '#1B4B8A', bg: '#EEF2FF' };
  }
  return { label: 'Direction', color: dept.color ?? '#64748B', bg: `${dept.color ?? '#64748B'}14` };
}

// ─── Row component ────────────────────────────────────────────────────────────

interface RowProps {
  node: Department;
  level: number;
  expanded: Set<number>;
  toggle: (id: number) => void;
  onEdit: (d: Department) => void;
  onDelete: (id: number) => void;
}

function DeptRow({ node, level, expanded, toggle, onEdit, onDelete }: RowProps) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isOpen = expanded.has(node.id);
  const indent = level * 28;
  const type = typeLabel(node);

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.25,
          borderBottom: '1px solid #F1F5F9',
          '&:hover': { bgcolor: '#F8FAFC' },
          '&:hover .dept-actions': { opacity: 1 },
          transition: 'background 0.12s',
          gap: 1,
        }}
      >
        {/* Indent + expand toggle */}
        <Box sx={{ width: indent, flexShrink: 0 }} />

        <Box sx={{ width: 24, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          {hasChildren ? (
            <IconButton size="small" onClick={() => toggle(node.id)} sx={{ p: 0.25, borderRadius: '6px' }}>
              {isOpen
                ? <ExpandMore sx={{ fontSize: 16, color: '#64748B' }} />
                : <ChevronRight sx={{ fontSize: 16, color: '#64748B' }} />
              }
            </IconButton>
          ) : (
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: `${node.color ?? '#94A3B8'}40`, mt: '3px', mx: 'auto', flexShrink: 0, transform: 'scale(0.65)' }} />
          )}
        </Box>

        {/* Color dot */}
        <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: node.color ?? '#94A3B8', flexShrink: 0 }} />

        {/* Name + code */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{
              fontSize: level === 0 ? 14 : level === 1 ? 13.5 : 12.5,
              fontWeight: level <= 1 ? 700 : 500,
              color: '#0F172A',
              letterSpacing: '-0.1px',
            }} noWrap>
              {node.name}
            </Typography>
            {node.code && (
              <Chip
                label={node.code}
                size="small"
                sx={{
                  height: 18,
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  bgcolor: type.bg,
                  color: type.color,
                  border: `1px solid ${type.color}30`,
                  flexShrink: 0,
                }}
              />
            )}
          </Box>
          {node.description && node.description.toLowerCase() !== 'division' && (
            <Typography sx={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.3 }} noWrap>
              {node.description}
            </Typography>
          )}
        </Box>

        {/* Type badge */}
        <Chip
          label={type.label}
          size="small"
          sx={{
            height: 20,
            fontSize: 10,
            fontWeight: 600,
            bgcolor: type.bg,
            color: type.color,
            border: `1px solid ${type.color}25`,
            flexShrink: 0,
            display: { xs: 'none', md: 'flex' },
          }}
        />

        {/* Employees count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 56, justifyContent: 'flex-end', flexShrink: 0 }}>
          <People sx={{ fontSize: 13, color: '#94A3B8' }} />
          <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
            {node.employees_count ?? 0}
          </Typography>
        </Box>

        {/* Actions */}
        <Box
          className="dept-actions"
          sx={{ display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.12s', flexShrink: 0 }}
        >
          <Tooltip title="Modifier">
            <IconButton size="small" onClick={() => onEdit(node)} sx={{ p: 0.5 }}>
              <Edit sx={{ fontSize: 14, color: '#64748B' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton size="small" onClick={() => onDelete(node.id)} sx={{ p: 0.5 }}>
              <Delete sx={{ fontSize: 14, color: '#EF4444' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Children */}
      {hasChildren && (
        <Collapse in={isOpen} unmountOnExit>
          {node.children!.map((child) => (
            <DeptRow
              key={child.id}
              node={child}
              level={level + 1}
              expanded={expanded}
              toggle={toggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </Collapse>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type FormData = { name: string; code: string; description: string; color: string; parent_id: string };

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const { data: flatList = [], isLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => {
      const d = r.data as unknown;
      const list = (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Department[];
      // Auto-expand root nodes on first load
      setExpanded((prev) => prev.size === 0
        ? new Set(list.filter((x) => !x.parent_id).map((x) => x.id))
        : prev
      );
      return list;
    }),
  });

  const tree = useMemo(() => {
    if (!search.trim()) return buildTree(flatList);
    const q = search.toLowerCase();
    const filtered = flatList.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.code ?? '').toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q)
    );
    return buildTree(filtered);
  }, [flatList, search]);

  const { register, handleSubmit, reset, control, setValue } = useForm<FormData>();

  const createMutation = useMutation({
    mutationFn: (data: Partial<Department>) => departmentsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Department> }) => departmentsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });

  const openCreate = () => {
    reset({ name: '', code: '', description: '', color: '#0284C7', parent_id: '' });
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    reset({
      name: dept.name,
      code: dept.code ?? '',
      description: dept.description ?? '',
      color: dept.color ?? '#0284C7',
      parent_id: dept.parent_id ? String(dept.parent_id) : '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditTarget(null); };

  const onSubmit = (form: FormData) => {
    const payload: Partial<Department> = {
      name: form.name,
      code: form.code || undefined,
      description: form.description || undefined,
      color: form.color,
      parent_id: form.parent_id ? Number(form.parent_id) : undefined,
    };
    if (editTarget) updateMutation.mutate({ id: editTarget.id, data: payload });
    else createMutation.mutate(payload);
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(flatList.map((d) => d.id)));
  const collapseAll = () => setExpanded(new Set());

  const totalActive = flatList.reduce((s, d) => s + (d.employees_count ?? 0), 0);
  const roots = flatList.filter((d) => !d.parent_id);

  return (
    <Box>
      <PageHeader
        title="Directions & Services"
        subtitle={`${flatList.length} entités · ${roots.length} directions principales · ${totalActive} agents actifs`}
        action={{ label: 'Nouvelle entité', icon: <Add />, onClick: openCreate }}
      />

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Rechercher une direction, un service…"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: '#94A3B8' }} />
              </InputAdornment>
            ),
          }}
        />
        <Tooltip title="Tout développer">
          <Button size="small" variant="outlined" startIcon={<AccountTree />} onClick={expandAll}
            sx={{ borderRadius: '8px', fontSize: 12, textTransform: 'none', display: { xs: 'none', sm: 'flex' } }}>
            Tout ouvrir
          </Button>
        </Tooltip>
        <Tooltip title="Tout réduire">
          <Button size="small" variant="outlined" startIcon={<ViewList />} onClick={collapseAll}
            sx={{ borderRadius: '8px', fontSize: 12, textTransform: 'none', display: { xs: 'none', sm: 'flex' } }}>
            Tout réduire
          </Button>
        </Tooltip>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {[
          { label: 'Conseil / DG', color: '#1B4B8A' },
          { label: 'DEP', color: '#0284C7' },
          { label: 'DAC', color: '#7C3AED' },
          { label: 'DPSRC', color: '#059669' },
          { label: 'DDC', color: '#D97706' },
          { label: 'DAF', color: '#DC2626' },
        ].map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: item.color }} />
            <Typography sx={{ fontSize: 11, color: '#64748B' }}>{item.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Tree table */}
      <Box sx={{
        bgcolor: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      }}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          bgcolor: '#F8FAFC',
          borderBottom: '2px solid #E2E8F0',
          gap: 1,
        }}>
          <Box sx={{ width: 50, flexShrink: 0 }} />
          <Typography sx={{ flexGrow: 1, fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Intitulé
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 90, display: { xs: 'none', md: 'block' } }}>
            Type
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 56, textAlign: 'right' }}>
            Agents
          </Typography>
          <Box sx={{ width: 64, flexShrink: 0 }} />
        </Box>

        {/* Rows */}
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Box key={i} sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F1F5F9' }}>
                <Skeleton height={24} width={`${60 + i * 5}%`} />
              </Box>
            ))
          : tree.length === 0
            ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>
                  {search ? 'Aucun résultat pour cette recherche' : 'Aucune entité'}
                </Typography>
              </Box>
            )
            : tree.map((root) => (
              <DeptRow
                key={root.id}
                node={root}
                level={0}
                expanded={expanded}
                toggle={toggleExpand}
                onEdit={openEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))
        }
      </Box>

      {/* ─── Create / Edit dialog ─── */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 1 }}>
          {editTarget ? 'Modifier l\'entité' : 'Nouvelle entité'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" id="dept-form" onSubmit={handleSubmit(onSubmit)} sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              {...register('name', { required: true })}
              label="Intitulé *"
              fullWidth
              size="small"
              autoFocus
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                {...register('code')}
                label="Code / Sigle"
                fullWidth
                size="small"
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                  Couleur
                </Typography>
                <input
                  type="color"
                  {...register('color')}
                  style={{ width: 48, height: 36, cursor: 'pointer', border: 'none', borderRadius: 6 }}
                />
              </Box>
            </Box>
            <TextField
              {...register('description')}
              label="Description"
              fullWidth
              size="small"
              multiline
              rows={2}
            />
            <TextField
              select
              {...register('parent_id')}
              label="Direction parente"
              fullWidth
              size="small"
              SelectProps={{ native: true }}
            >
              <option value="">— Aucune (entité racine) —</option>
              {flatList
                .filter((d) => !editTarget || d.id !== editTarget.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code ? `[${d.code}] ` : ''}{d.name}
                  </option>
                ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button size="small" onClick={closeDialog} sx={{ borderRadius: '8px' }}>Annuler</Button>
          <Button
            form="dept-form"
            type="submit"
            variant="contained"
            size="small"
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ borderRadius: '8px', px: 2.5 }}
          >
            {editTarget ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
