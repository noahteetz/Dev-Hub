import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import './index.css'
import { configureAuth } from './api'
import { DevHub, Shell, StartupError } from './AppRoot'
import { AuthGate } from './auth/AuthGate'
import { fetchAuthSettings } from './auth/authSettings'
import { cleanUpRedirect, createUserManager, currentAccessToken } from './auth/userManager'
import { rememberReturnPath } from './auth/returnPath'

const root = createRoot(document.getElementById('root')!)

/**
 * The app asks the backend whether a login is required before it renders
 * anything. A backend that cannot be reached stops the start up instead of
 * quietly loading an app whose every request would fail.
 */
async function start() {
  let settings

  try {
    settings = await fetchAuthSettings()
  } catch (error) {
    root.render(
      <Shell>
        <StartupError message={error instanceof Error ? error.message : 'Dev Hub could not reach its server.'} />
      </Shell>,
    )
    return
  }

  if (!settings.enabled) {
    root.render(
      <Shell>
        <DevHub />
      </Shell>,
    )
    return
  }

  const userManager = createUserManager(settings)
  let signingIn = false

  configureAuth({
    accessToken: () => currentAccessToken(userManager),
    onSessionExpired: () => {
      // One redirect per expiry — a failed renewal must not turn into a loop.
      if (signingIn) return
      signingIn = true
      rememberReturnPath()
      void userManager.signinRedirect()
    },
  })

  root.render(
    <Shell>
      <AuthProvider userManager={userManager} onSigninCallback={cleanUpRedirect}>
        <AuthGate>
          <DevHub />
        </AuthGate>
      </AuthProvider>
    </Shell>,
  )
}

void start()
