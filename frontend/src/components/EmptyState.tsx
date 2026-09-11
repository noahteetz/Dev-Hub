import type { ReactNode } from 'react'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import { Button, Stack, Typography } from '@mui/material'
import { tint, tintShadow } from '../theme'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <Stack
      spacing={1.5}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 280,
        px: 3,
        py: 6,
        textAlign: 'center',
      }}
    >
      {icon ?? (
        <AutoAwesomeOutlinedIcon
          sx={{ color: 'primary.main', fontSize: 36, mb: 0.5 }}
        />
      )}
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
      {actionLabel && onAction ? (
        <Button
          sx={(theme) => ({
            bgcolor: tint(theme, 0.08),
            borderRadius: 1,
            color: 'primary.main',
            mt: 1,
            transition: 'background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
            '&:hover': {
              bgcolor: tint(theme, 0.14),
              boxShadow: tintShadow(theme),
              transform: 'translateY(-1px)',
            },
          })}
          variant="text"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  )
}
