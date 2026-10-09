# Named AI profiles and automatic terminal startup

Date: 2026-10-08. Branch: `concept/unified-ai-profiles`, based on `main` at `af9f1ab`.
Status: approved and implemented on `feature/unified-ai-profiles`. The concept branch itself changes documentation only. Deployment and migration notes are in [deploy/REMOTE_WORKSPACES.md](deploy/REMOTE_WORKSPACES.md).

## 1. Intended experience

Create a profile once, give it a name, and choose Claude, Codex, or both. When opening a terminal, choose the profile and the program to start in one menu. Choosing **Work · Claude** opens the terminal directly in Claude; choosing **Work · Codex** does the same for Codex. No initial `claude` or `codex` command needs to be typed.

The plain **Work** entry: open a normal shell with Work's enabled profile configuration available. Keep a separate **Shell** entry for a terminal without a selected profile.

These defaults were adopted with the request to implement this concept.

## 2. Profile settings

Replace the provider dropdown in **Settings → Personal AI profiles** with:

```text
Profile name   [ Work                         ]
Use with       [x] Claude    [x] Codex
               [ Save profile ]
```

- Require a nonblank name and at least one selected provider.
- Support creating, renaming, and editing the enabled providers of a profile.
- Show saved profiles as `Work` with separate `Claude` and `Codex` badges.
- Profile names are unique per user after trimming and case normalization. Retain the current 120-character name limit and maximum of 20 profiles per user.
- Selecting a provider enables its persistent configuration. It does **not** authenticate the user or mean “signed in.” Explain this next to the checkboxes: “Sign in when you first open this profile's CLI. Your login is kept for other workspaces.”
- Authentication stays in the provider's native terminal flow. Dev Hub does not add a separate token/password form or store a guessed login-status flag.
- Profile removal retains the existing confirmation explaining that saved login/configuration files will be deleted.

A user can therefore configure both providers without having a running workspace. Their first Claude and first Codex terminal each complete the provider's own login flow. Returning to either CLI uses the saved profile configuration.

## 3. One terminal menu in both workspace views

Use the same selector component in the project workspace and the global Workspaces view. Replace the project's separate “Terminal type” and “AI profile” dropdowns.

For a profile named Work with both providers enabled:

| Menu entry | Starts | Profile configuration |
| --- | --- | --- |
| Shell | Interactive shell | No selected AI profile |
| Work | Interactive shell | Work's enabled providers |
| Work · Claude | Claude CLI automatically | Work's enabled providers |
| Work · Codex | Codex CLI automatically | Work's enabled providers |

A Claude-only profile named Personal has **Personal** and **Personal · Claude**, with no Codex option. The equivalent applies to Codex-only profiles. Group entries by profile; put **Shell** first and **Manage profiles…** last. Use a “Shell” secondary label on the plain profile entry so its behavior is clear.

Use these labels consistently on terminal tabs, grid cards, and accessibility labels. Add a session number only to distinguish multiple terminals with the same profile and launch choice. The profile label should reflect a later rename without changing the running process.

Keep the existing terminal limit and personal ownership checks. Multiple terminals may use the same profile, including across workspaces. The existing settings sentence “Each profile can have one active terminal” is outdated: migration V9 already removed that restriction.

## 4. Startup, login, exit, and reconnect behavior

1. The backend validates the requested profile, workspace access, and enabled provider before asking the runner to create a terminal.
2. The runner initializes the enabled provider directories, sets that profile's environment, and creates the tmux session.
3. The interactive shell initializes its normal environment and starts the selected CLI exactly once. The browser attaches to that existing session and receives its output.
4. If authentication is needed, the user completes the provider's native onboarding/login interaction in this terminal. Enabling both providers does not start two login processes in one terminal.
5. Exiting the CLI returns to an interactive shell in the same terminal, with the same profile environment and working directory. A missing CLI or startup error prints a useful message and also leaves a usable shell.
6. Refreshing the page, reconnecting, pinning, maximizing, or moving a terminal reattaches to the same tmux session. None of these actions starts the CLI again.
7. Closing a browser connection leaves processes alive. Ending a terminal stops that terminal and its processes. Stopping a workspace ends its terminals; opening a new terminal after Resume performs a new startup using the current profile settings.

The displayed `Work · Claude` label records the terminal's launch choice; it is not a live process detector after the user exits Claude or runs another program.

Keep native CLI confirmations and trust prompts. Validate the first-run and device-login behavior against the CLI versions pinned in the workspace image during implementation; do not assume that a configuration directory proves successful authentication. No automatic restart or login retry loop.

### Working directory

Preserve the workspace's established terminal directory. On current `main` this is `/workspace/repo`. If the multiple-repository feature is merged, inherit its rule: `/workspace` for several checkouts, `/workspace/repo` for one. The profile feature does not introduce another directory rule.

## 5. Current implementation and required changes

| Area | Current behavior | Proposed change |
| --- | --- | --- |
| [AiProfilesPanel](frontend/src/components/AiProfilesPanel.tsx) | One provider per named profile | Name plus provider checkboxes, edit support, provider badges |
| [RemoteWorkspacePanel](frontend/src/components/RemoteWorkspacePanel.tsx) | Select type, then profile | Shared profile/launch menu |
| [WorkspacesView](frontend/src/components/WorkspacesView.tsx) | One menu entry per provider-bound profile | Shell and CLI entries per named profile; shared labeling |
| [WorkspaceModels](backend/src/main/java/com/devhub/backend/workspace/WorkspaceModels.java) | `Profile.provider`; terminal `provider` also selects configuration | Profile provider collection and explicit terminal launch mode |
| [WorkspaceService](backend/src/main/java/com/devhub/backend/workspace/WorkspaceService.java) | Profile must match one provider; Shell discards profile ID | Validate profile-backed shells and selected CLI against enabled providers |
| [WorkspaceRepository](backend/src/main/java/com/devhub/backend/workspace/WorkspaceRepository.java) | One provider column per profile | Provider membership table and terminal configuration snapshots |
| [Runner manager](runner/src/manager.mjs) | Sets one provider variable and always opens a shell | Bind enabled providers and pass a validated startup mode |
| [Profile shell](runner/workspace/profile-shell.sh) and [bash initialization](runner/workspace/devhub-bashrc) | Interactive shell only | One-time CLI startup after shell initialization, then shell fallback |
| [Profile initialization](runner/workspace/profile-init.sh) | Creates one provider/profile directory | Reuse once for each enabled provider |

## 6. Data model and API

Separate profile identity, enabled providers, and the terminal's launch choice.

### Profile

```json
{
  "id": "<profile-uuid>",
  "name": "Work",
  "providers": ["CLAUDE", "CODEX"],
  "createdAt": "<timestamp>"
}
```

- `ai_profiles`: retain ID, owner, name, and creation time; replace provider-scoped name uniqueness with a normalized name unique per owner.
- Add `ai_profile_providers(profile_id, provider, enabled)` with a primary key on `(profile_id, provider)` and validated provider values.
- API `providers` contains enabled providers. Retain disabled provider rows internally so their existing configuration can be reused if re-enabled.
- `POST /api/ai-profiles`: `{ "name": "Work", "providers": ["CLAUDE", "CODEX"] }`.
- Add `PATCH /api/ai-profiles/{id}` for name and/or enabled providers. Omitted fields retain their current value; an empty provider list is rejected.
- `GET` returns only the executing user's profiles. Existing `DELETE` removes the entire profile and all its provider configuration, including disabled providers.

### Terminal

```json
{
  "profileId": "<profile-uuid>",
  "launchMode": "CLAUDE"
}
```

`launchMode` is one of `SHELL`, `CLAUDE`, or `CODEX`. A null profile ID is valid only for `SHELL`. A non-null profile ID must belong to the workspace's executing user. A CLI launch additionally requires that provider to be enabled on the profile.

Persist the launch mode and profile ID on `workspace_terminals`. Store the enabled provider set actually bound at creation in a child table such as `workspace_terminal_providers(terminal_id, provider)`. Use this snapshot for lifecycle validation; subsequent profile edits must not redefine an existing terminal's environment.

The backend supplies the runner with the validated launch mode, profile ID, and provider snapshot. The runner independently validates enum values, UUIDs, and the consistency of the requested launch mode. The browser never sends executable command strings or filesystem paths.

During a coordinated frontend/backend/runner rollout, accept the old single-provider profile creation input as a one-provider list. Likewise, normalize old terminal requests using `provider` to the new launch mode; reject contradictory old and new fields. Keep the terminal response's old `provider` as a temporary alias for `launchMode` if old clients need it. The new UI uses the new fields.

Legacy profile responses cannot faithfully represent “both” with one scalar provider. Roll out the new UI with the backend, and require stale clients to reload before editing profiles; do not present a dual-provider profile as an arbitrary single provider.

## 7. Runner and configuration storage

Retain the current per-user profile volume and provider-specific directory layout:

```text
/profiles/claude/<profile-id>
/profiles/codex/<profile-id>
```

One logical profile can have both directories with the same UUID. No combined credential file, directory moves, or new volume layout are needed.

Every profile-backed terminal sets the environment for all of that profile's enabled providers. The Claude binding uses the existing `CLAUDE_CONFIG_DIR` convention; the Codex binding uses the existing `CODEX_HOME` convention. A plain profile shell and a shell reached after leaving a CLI therefore use the same selected profile. Providers that are not enabled are not configured by this feature; these settings are not a restriction on which programs a user can manually execute.

Extend the existing shell launcher with an allowlisted mode argument. After the normal shell initialization, consume and clear a one-time startup marker before invoking the fixed `claude` or `codex` executable. Ensure the marker cannot reach child shells and cause repeated startup. Handle a nonzero exit without killing the fallback shell. Test this with fake executables before exercising the real pinned CLIs.

Do not emulate startup by sending terminal keystrokes from the browser or by interpolating profile names into shell commands. Keep the existing idempotent terminal-ID check so a retried runner operation does not spawn another CLI in the same terminal.

Backend terminal persistence and runner startup also need failure handling: if the runner creates a session but database persistence fails, clean up that session or retain a recoverable pending record. A failed create operation must not leave an untracked process using a profile that the backend thinks is unused.

## 8. Editing and removing profiles

- Renaming is allowed while terminals run; IDs and directories remain stable.
- Enabling another provider affects newly created terminals. Existing terminals retain their saved bindings; reopening is required to pick up the change.
- Disabling a provider hides its launch option and stops binding it in new terminals. Preserve its files so re-enabling does not force another login.
- Block disabling a provider while any terminal snapshot for that profile includes it, including a plain profile shell. Explain which terminals must be ended first. Merely disconnecting the browser is insufficient.
- Profile deletion keeps the existing requirement to stop the user's workspaces and clear terminals using the profile. Delete both provider directories, including disabled ones, before deleting metadata.
- Serialize profile updates, terminal creation, and deletion under the existing per-user lifecycle lock. Runner-side checks must cover the operation as well, so another workspace cannot start using the profile during cleanup.
- Multi-directory cleanup is idempotent. If only one directory was removed before a failure, retain the profile metadata, show the failure, and allow retry. Do not report successful deletion while another directory remains.

Profiles remain personal. Project ownership or membership does not grant access to another member's profile. Claude and Codex authenticate separately even when their configurations belong to the same named profile.

## 9. Migration and rollout

Use the next available Flyway migration number at implementation time. `main` currently ends at V9; the multiple-repository branch already reserves V10. Avoid numbering a competing migration in this concept branch.

1. Add provider membership and terminal snapshot tables plus the new launch-mode field.
2. Backfill each existing profile with its current provider enabled. Preserve its profile UUID, owner, creation time, and provider directory path. Existing login files remain usable.
3. Do not automatically merge profiles with the same name across providers: the name alone does not establish that the user wants those accounts combined. Resolve per-user normalized name collisions deterministically, for example `Work (Claude)` and `Work (Codex)`, adding a stable ID suffix if necessary. Respect the name length limit and show the migrated names in settings.
4. Backfill every existing profile terminal with its previous provider binding and `launchMode: SHELL`, because the current implementation actually starts a shell. Preserve terminal IDs and connections; an upgrade must not inject a CLI into an already running shell.
5. Normalize old runner metadata the same way when loading it: legacy terminals stay shell sessions with their original single provider binding. New terminal records carry the explicit launch mode and provider snapshot.
6. Deploy matching backend, frontend, runner, and rebuilt workspace image. Old running containers may keep their current terminals, but require Stop/Resume before allowing new launch-mode terminals in an image that lacks the new launcher. Use a launcher capability/version check rather than silently ignoring the new mode.
7. Remove transitional request/response compatibility only after the supported client rollout window.

Users with two older provider-specific profiles can keep both, or enable the second provider on one chosen profile and sign in there. Automatic account merging and moving saved login directories are outside the first implementation.

## 10. Implementation sequence

1. **Backend and migration:** profile memberships, validation, edit endpoint, terminal snapshots, migration compatibility, and ownership/lifecycle tests.
2. **Runner:** initialize both provider directories, supply the profile environment, add one-time startup and shell fallback, normalize legacy metadata, and clean up all provider directories.
3. **Frontend:** profile checkboxes/editing, shared terminal menu and labels, removal of manual CLI-start instructions and the outdated one-terminal restriction.
4. **Integration and documentation:** validate the pinned CLIs' native login behavior in the actual workspace image; cover reconnect, concurrent sessions, migration, and deployment from an older image.

## 11. Acceptance criteria

- Creating Work with both checkboxes produces one profile usable for both CLIs; no second named profile is required.
- The two workspace views offer identical profile/launch options. Unsupported choices cannot be submitted successfully through the API either.
- Work opens a profile-configured shell; Work · Claude and Work · Codex launch the respective CLI exactly once without typing its command.
- The two provider logins survive terminal closure, workspace Stop/Resume, and use in another workspace belonging to the same user.
- A reconnect or browser refresh neither repeats CLI startup nor performs another login automatically.
- Exiting a CLI or encountering a launch failure leaves an interactive shell with the correct profile environment.
- Multiple terminals can use the same profile concurrently, including across workspaces; existing workspace and terminal limits still apply.
- Rename, enable, disable, and delete obey the lifecycle rules above. A profile shell counts as using every provider bound to it.
- Migration preserves every existing profile's login directory and never merges accounts by name. Existing live terminals continue as shells.
- A new CLI terminal cannot silently start as a shell because an older workspace image ignored its launch mode.
- Existing single-repository and pending multiple-repository working-directory behavior both remain correct.

Verification should include backend HTTP/service and migration tests, UI interaction tests for both selectors, runner tests using fake CLIs to inspect arguments/environment and launch counts, and real Docker terminal tests for startup, exit, reconnect, and retained login configuration. Native device/browser login still needs an interactive acceptance check; fixture credentials must not be reported as proof of a real provider login.
