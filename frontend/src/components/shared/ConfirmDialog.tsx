import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography } from '@mui/material';
import { WarningAmber } from '@mui/icons-material';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title = 'Confirmation de suppression',
  message,
  confirmLabel = 'Supprimer',
  onConfirm,
  onClose,
}: Props) {
  const handleConfirm = () => { onConfirm(); onClose(); };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 0.5 }}>
        <WarningAmber sx={{ color: '#E85D04', fontSize: 22 }} />
        <Typography fontWeight={700} fontSize={15}>{title}</Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography fontSize={13} color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          size="small"
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          size="small"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontSize: 13,
            bgcolor: '#DC2626',
            '&:hover': { bgcolor: '#B91C1C' },
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
