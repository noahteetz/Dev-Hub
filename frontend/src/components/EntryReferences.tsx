import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { CommandPalette } from './CommandPalette'
import { entityLabels } from '../utils/searchDisplay'
import type { EntityType, ReferenceGroup } from '../types'

interface EntryReferencesProps {
  type: EntityType
  id: number
}

/** Outgoing links and backlinks of one entry. Links to deleted entries disappear on their own. */
export function EntryReferences({ type, id }: EntryReferencesProps) {
  const navigate = useNavigate()
  const [group, setGroup] = useState<ReferenceGroup>({ outgoing: [], incoming: [] })
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setGroup(await api.references.list(type, id))
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'References could not be loaded.')
    }
  }, [id, type])

  // Reference data comes from the server, so loading it in an effect is the point.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function link(targetType: EntityType, targetId: number) {
    try {
      await api.references.create(type, id, targetType, targetId)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The entries could not be linked.')
    }
  }

  async function unlink(referenceId: number) {
    try {
      await api.references.remove(referenceId)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The link could not be removed.')
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontWeight: 800 }}>Linked entries</Typography>
        <Button size="small" startIcon={<LinkRoundedIcon />} onClick={() => setPickerOpen(true)}>
          Link to entry
        </Button>
      </Stack>
      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}
      {group.outgoing.length ? (
        <Stack spacing={0.5}>
          {group.outgoing.map((reference) => (
            <Stack direction="row" key={reference.id} spacing={1} sx={{ alignItems: 'center' }}>
              <Chip label={entityLabels[reference.targetType]} size="small" />
              <Button size="small" sx={{ flex: 1, justifyContent: 'flex-start' }} onClick={() => navigate(reference.targetUrl)}>
                {reference.targetTitle}
              </Button>
              <IconButton aria-label={`Remove link to ${reference.targetTitle}`} size="small" onClick={() => void unlink(reference.id)}>
                <LinkOffRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary" variant="body2">
          No links yet.
        </Typography>
      )}

      <Typography sx={{ fontWeight: 800, mb: 1, mt: 2.5 }}>Referenced by</Typography>
      {group.incoming.length ? (
        <Stack spacing={0.5}>
          {group.incoming.map((reference) => (
            <Stack direction="row" key={reference.id} spacing={1} sx={{ alignItems: 'center' }}>
              <Chip label={entityLabels[reference.sourceType]} size="small" />
              <Button size="small" sx={{ flex: 1, justifyContent: 'flex-start' }} onClick={() => navigate(reference.sourceUrl)}>
                {reference.sourceTitle}
              </Button>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary" variant="body2">
          Nothing points here yet.
        </Typography>
      )}

      <CommandPalette
        open={pickerOpen}
        title="Link to entry"
        onClose={() => setPickerOpen(false)}
        onSelect={(result) => void link(result.type, result.id)}
      />
    </Box>
  )
}
