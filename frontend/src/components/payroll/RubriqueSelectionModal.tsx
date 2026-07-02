import {
  Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { type RubriqueOption, type TemplateLineType, getRubriquesForType } from '../../api/payrollTemplates';

const TYPE_LABELS: Record<TemplateLineType, string> = {
  base:         'Éléments de base',
  augmentation: 'Augmentations',
  ipress:       'Cotisations IPRESS — Retraite',
  ipm:          'Cotisations IPM',
  css:          'Cotisations CSS',
  ir:           'Impôt sur le Revenu (IR)',
  trimf:        'TRIMF',
  retenue:      'Retenues diverses',
};

interface Props {
  open: boolean;
  type: TemplateLineType;
  alreadySelected: number[];
  onConfirm: (selected: RubriqueOption[]) => void;
  onClose: () => void;
}

export default function RubriqueSelectionModal({ open, type, alreadySelected, onConfirm, onClose }: Props) {
  const [checked, setChecked] = useState<number[]>([]);

  const { data: rubriques = [], isLoading } = useQuery({
    queryKey: ['rubriques', type],
    queryFn:  () => getRubriquesForType(type),
    enabled:  open,
  });

  // Rubriques sélectionnables (pas encore dans le tableau)
  const selectable = rubriques.filter(r => !alreadySelected.includes(r.id));
  const allChecked = selectable.length > 0 && selectable.every(r => checked.includes(r.id));
  const someChecked = selectable.some(r => checked.includes(r.id));

  const toggle = (id: number) =>
    setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () => {
    if (allChecked) {
      setChecked([]);
    } else {
      setChecked(selectable.map(r => r.id));
    }
  };

  const handleConfirm = () => {
    const selected = rubriques.filter(r => checked.includes(r.id));
    onConfirm(selected);
    setChecked([]);
  };

  const handleClose = () => { setChecked([]); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{
        bgcolor: '#002f59', color: '#fff', fontWeight: 700, fontSize: 15, py: 1.5,
      }}>
        Sélectionner — {TYPE_LABELS[type]}
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : rubriques.length === 0 ? (
          <Typography sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            Aucune rubrique disponible pour ce type.
          </Typography>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"
                  sx={{ bgcolor: '#f1f5f9', fontWeight: 700 }}>
                  <Checkbox
                    size="small"
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onChange={toggleAll}
                    disabled={selectable.length === 0}
                    title="Tout sélectionner"
                    sx={{ '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#002f59' } }}
                  />
                </TableCell>
                <TableCell sx={{ bgcolor: '#f1f5f9', fontWeight: 700, fontSize: 12 }}>Code</TableCell>
                <TableCell sx={{ bgcolor: '#f1f5f9', fontWeight: 700, fontSize: 12 }}>Libellé</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#f1f5f9', fontWeight: 700, fontSize: 12 }}>
                  {type === 'retenue' ? 'Montant (FCFA)' : 'Taux Salarial (%)'}
                </TableCell>
                {type !== 'retenue' && (
                  <TableCell align="right" sx={{ bgcolor: '#f1f5f9', fontWeight: 700, fontSize: 12 }}>
                    Taux Patronal (%)
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {rubriques.map(r => {
                const isAlready = alreadySelected.includes(r.id);
                const isChecked = checked.includes(r.id);
                return (
                  <TableRow key={r.id}
                    hover={!isAlready}
                    selected={isChecked}
                    sx={{ opacity: isAlready ? 0.45 : 1, cursor: isAlready ? 'default' : 'pointer' }}
                    onClick={() => !isAlready && toggle(r.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={isChecked || isAlready}
                        disabled={isAlready}
                        onChange={() => !isAlready && toggle(r.id)}
                        onClick={e => e.stopPropagation()}
                        sx={{ '&.Mui-checked': { color: '#002f59' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{r.code || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.libelle}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 12 }}>
                      {type === 'retenue'
                        ? new Intl.NumberFormat('fr-FR').format(r.valeur ?? 0)
                        : r.taux_salarial.toFixed(2)}
                    </TableCell>
                    {type !== 'retenue' && (
                      <TableCell align="right" sx={{ fontSize: 12 }}>{r.taux_patronal.toFixed(2)}</TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #E2E8F0', gap: 1 }}>
        <Typography variant="caption" sx={{ flex: 1, color: 'text.secondary' }}>
          {checked.length} rubrique(s) sélectionnée(s)
          {selectable.length > 0 && (
            <Box component="span" sx={{ ml: 1, color: '#002f59', cursor: 'pointer', fontWeight: 600 }}
              onClick={toggleAll}>
              {allChecked ? '— Tout désélectionner' : '— Tout sélectionner'}
            </Box>
          )}
        </Typography>
        <Button onClick={handleClose} size="small" variant="outlined" color="inherit">
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          size="small"
          variant="contained"
          disabled={checked.length === 0}
          sx={{ bgcolor: '#002f59', '&:hover': { bgcolor: '#003f7a' } }}>
          Ajouter ({checked.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
}
