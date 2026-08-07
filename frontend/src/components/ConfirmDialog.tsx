import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog maxWidth="xs" fullWidth open={open} onClose={loading ? undefined : onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button disabled={loading} onClick={onClose}>
          Cancel
        </Button>
        <Button
          color="error"
          disabled={loading}
          startIcon={loading ? <CircularProgress color="inherit" size={16} /> : null}
          variant="contained"
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
