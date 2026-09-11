import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined'
import { IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import { useColorMode } from '../colorMode'
import type { ColorPreference } from '../colorMode'

/**
 * The quick switch in the sidebar. It picks a side outright rather than
 * cycling through `system` as well, because a button whose next state cannot
 * be guessed is worse than one more control in the settings.
 */
export function ColorModeToggle() {
  const { mode, setPreference } = useColorMode()
  const target = mode === 'dark' ? 'light' : 'dark'
  const label = target === 'dark' ? 'Switch to the dark theme' : 'Switch to the light theme'

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} size="small" onClick={() => setPreference(target)}>
        {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  )
}

const choices: { value: ColorPreference; label: string; icon: typeof LightModeOutlinedIcon }[] = [
  { value: 'light', label: 'Light', icon: LightModeOutlinedIcon },
  { value: 'system', label: 'System', icon: SettingsBrightnessOutlinedIcon },
  { value: 'dark', label: 'Dark', icon: DarkModeOutlinedIcon },
]

/** The full choice, including letting the operating system decide. */
export function ColorModeChoice() {
  const { preference, setPreference } = useColorMode()

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={preference}
      onChange={(_event, next: ColorPreference | null) => {
        // A second click on the active button reports null; keep the choice.
        if (next) {
          setPreference(next)
        }
      }}
    >
      {choices.map((choice) => (
        <ToggleButton key={choice.value} sx={{ gap: 0.75, px: 2 }} value={choice.value}>
          <choice.icon fontSize="small" />
          {choice.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
