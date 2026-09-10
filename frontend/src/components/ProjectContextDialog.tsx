import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import type { Project, ProjectContextInput } from '../types'

interface ProjectContextDialogProps {
  open: boolean
  project: Project
  saving: boolean
  onClose: () => void
  onSubmit: (input: ProjectContextInput) => Promise<void>
}

export function ProjectContextDialog({
  open,
  project,
  saving,
  onClose,
  onSubmit,
}: ProjectContextDialogProps) {
  const [progressSummary, setProgressSummary] = useState(project.progressSummary)
  const [nextStep, setNextStep] = useState(project.nextStep)
  const [blockers, setBlockers] = useState(project.blockers)
  const [startCommand, setStartCommand] = useState(project.startCommand)
  const [buildCommand, setBuildCommand] = useState(project.buildCommand)
  const [technicalDecisions, setTechnicalDecisions] = useState(project.technicalDecisions)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({ progressSummary, nextStep, blockers, startCommand, buildCommand, technicalDecisions })
  }

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={saving ? undefined : onClose}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Resume context</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              autoFocus
              fullWidth
              label="What is already done?"
              minRows={3}
              multiline
              value={progressSummary}
              onChange={(event) => setProgressSummary(event.target.value)}
            />
            <TextField
              fullWidth
              label="Next step"
              minRows={2}
              multiline
              required
              value={nextStep}
              onChange={(event) => setNextStep(event.target.value)}
            />
            <TextField
              fullWidth
              label="Blockers"
              minRows={2}
              multiline
              value={blockers}
              onChange={(event) => setBlockers(event.target.value)}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                label="Start command"
                placeholder="npm run dev"
                value={startCommand}
                onChange={(event) => setStartCommand(event.target.value)}
              />
              <TextField
                fullWidth
                label="Build command"
                placeholder="npm run build"
                value={buildCommand}
                onChange={(event) => setBuildCommand(event.target.value)}
              />
            </Stack>
            <TextField
              fullWidth
              label="Technical decisions"
              minRows={3}
              multiline
              value={technicalDecisions}
              onChange={(event) => setTechnicalDecisions(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button disabled={saving} onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving || !nextStep.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : null}
            type="submit"
            variant="contained"
          >
            Save context
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}