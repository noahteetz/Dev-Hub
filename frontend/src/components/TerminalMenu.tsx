import { Box, Divider, Menu, MenuItem, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import type { AiProfile, TerminalLaunchMode } from '../types'

export function TerminalMenu({ profiles, onChoose, onManage, anchorEl, onClose }: {
  profiles: AiProfile[]
  onChoose: (mode: TerminalLaunchMode, profileId: string | null) => void
  onManage: () => void
  anchorEl: HTMLElement | null
  onClose: () => void
}) {
  return <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
    <MenuItem onClick={() => onChoose('SHELL', null)}>Shell</MenuItem>
    {profiles.flatMap(profile => [
      <Divider key={profile.id + ':divider'} />,
      <MenuItem key={profile.id + ':shell'} aria-label={profile.name + ' Shell'} onClick={() => onChoose('SHELL', profile.id)}>
        <Box>{profile.name}<Typography component="span" color="text.secondary" variant="caption" sx={{ ml: 1 }}>Shell</Typography></Box>
      </MenuItem>,
      ...profile.providers.map(provider => <MenuItem key={profile.id + ':' + provider} onClick={() => onChoose(provider, profile.id)}>
        {profile.name} · {provider === 'CLAUDE' ? 'Claude' : 'Codex'}
      </MenuItem>),
    ])}
    <Divider />
    <MenuItem component={Link} to="/settings" onClick={onManage}>Manage profiles…</MenuItem>
  </Menu>
}
