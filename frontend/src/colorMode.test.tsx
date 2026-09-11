import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ColorModeProvider } from './ColorModeProvider'
import { COLOR_MODE_KEY, useColorMode } from './colorMode'
import { ColorModeChoice, ColorModeToggle } from './components/ColorModeToggle'

type MediaListener = (event: MediaQueryListEvent) => void

/** jsdom ships no matchMedia, so every test says what the system prefers. */
function stubSystem(prefersDark: boolean) {
  const listeners = new Set<MediaListener>()

  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: prefersDark,
    media: query,
    addEventListener: (_type: string, listener: MediaListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: MediaListener) => listeners.delete(listener),
  }))

  return {
    change(nowPrefersDark: boolean) {
      act(() => {
        listeners.forEach((listener) => listener({ matches: nowPrefersDark } as MediaQueryListEvent))
      })
    },
  }
}

function Probe() {
  const { mode, preference } = useColorMode()
  return <p>{`${preference} / ${mode}`}</p>
}

function view() {
  return render(
    <ColorModeProvider>
      <Probe />
      <ColorModeToggle />
      <ColorModeChoice />
    </ColorModeProvider>,
  )
}

describe('colour mode', () => {
  beforeEach(() => {
    window.localStorage.clear()
    stubSystem(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('follows the system until the user picks a side', () => {
    stubSystem(true)
    view()

    expect(screen.getByText('system / dark')).toBeInTheDocument()
    expect(document.documentElement.dataset.colorMode).toBe('dark')
  })

  it('restores the choice a previous visit stored', () => {
    window.localStorage.setItem(COLOR_MODE_KEY, 'dark')
    view()

    expect(screen.getByText('dark / dark')).toBeInTheDocument()
  })

  it('ignores a stored value it does not recognise', () => {
    window.localStorage.setItem(COLOR_MODE_KEY, 'neon')
    view()

    expect(screen.getByText('system / light')).toBeInTheDocument()
  })

  it('remembers the theme the quick switch turns on', () => {
    view()

    fireEvent.click(screen.getByRole('button', { name: 'Switch to the dark theme' }))

    expect(screen.getByText('dark / dark')).toBeInTheDocument()
    expect(window.localStorage.getItem(COLOR_MODE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to the light theme' })).toBeInTheDocument()
  })

  it('hands the choice back to the system', () => {
    window.localStorage.setItem(COLOR_MODE_KEY, 'dark')
    view()

    fireEvent.click(screen.getByRole('button', { name: 'System' }))

    expect(screen.getByText('system / light')).toBeInTheDocument()
    expect(window.localStorage.getItem(COLOR_MODE_KEY)).toBe('system')
  })

  it('moves with the system while no side is picked', () => {
    const system = stubSystem(false)
    view()

    expect(screen.getByText('system / light')).toBeInTheDocument()
    system.change(true)

    expect(screen.getByText('system / dark')).toBeInTheDocument()
  })

  it('leaves a picked theme alone when the system changes', () => {
    const system = stubSystem(false)
    view()

    fireEvent.click(screen.getByRole('button', { name: 'Switch to the dark theme' }))
    system.change(false)

    expect(screen.getByText('dark / dark')).toBeInTheDocument()
  })

  it('still themes the app when the browser refuses storage', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    view()

    fireEvent.click(screen.getByRole('button', { name: 'Switch to the dark theme' }))

    expect(screen.getByText('dark / dark')).toBeInTheDocument()
    getItem.mockRestore()
    setItem.mockRestore()
  })
})
