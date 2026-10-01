# Remote Workspaces betreiben

Die erste Iteration läuft im vorhandenen Docker-Environment. Das Feature bleibt standardmäßig ausgeschaltet. Änderungen an diesem Branch deployen nichts auf den Produktionsserver.

## Bestandteile und Daten

- Backend: persönliche Workspace-/Profilmetadaten in PostgreSQL, aktuelle Projektberechtigungen, Lebenszyklus und Terminaltickets.
- Runner: private HTTP-Steuerung, Docker-Daemonzugriff, Ressourcenverwaltung und Terminal-Transport. Nur dieser Dienst erhält den Docker-Socket; dadurch ist er ein privilegierter Teil der Host-Verwaltung.
- Arbeitscontainer: UID/GID 1000, schreibgeschütztes Root-Dateisystem, keine Linux-Capabilities, kein Docker-Socket, keine veröffentlichten Ports. Ein eigener interner Netzwerkbereich pro Workspace.
- Egress-Proxy: Internet über HTTP(S)-Proxy; private, Loopback- und Metadaten-Adressen sowie zusätzliche Ports werden gesperrt. Tools müssen den Proxy unterstützen. Direkter ausgehender Netzwerkzugriff ist nicht vorgesehen.
- Named Volumes: devhub-repo-{workspaceId}, devhub-home-{workspaceId} und devhub-profiles-user-{internalUserId}. Das letzte Volume enthält claude/{profileId} und codex/{profileId}; es wird ausschließlich in Container dieses Nutzers eingebunden.
- runner-state hält servergenerierte IDs, Generationen, Initialisierungsstand und Sitzungsmetadaten. Es enthält keine Git-PATs oder KI-Login-Dateien. Der kurzlebige Credential-Broker nutzt einen Unix-Socket unter /run/dev-hub-brokers/{workspaceId}.

Die Profile setzen das Datenlayout der Roadmap als eigene Docker-Volumes um; ein manuell angelegter Hostbaum /data/users ist dafür nicht erforderlich. Verzeichnisse haben 0700, Profil-Shells verwenden umask 077. Login-Dateien bleiben beim Stoppen und beim Löschen eines Checkouts erhalten.

## Aktivieren

1. CPU/RAM, freien Docker-Speicher und laufende App-Dienste prüfen. Standard: höchstens zwei aktive Workspaces insgesamt (WORKSPACE_MAX_RUNNING), pro Nutzer zwei gleichzeitig laufende (WORKSPACE_MAX_RUNNING_PER_USER) und drei aufbewahrte, laufend oder gestoppt (WORKSPACE_MAX_PER_USER), je zwei CPU und 4 GiB RAM. Bei mehreren Nutzern WORKSPACE_MAX_RUNNING entsprechend erhöhen. Diese Werte an den vorhandenen Server anpassen.
2. Eigenen zufälligen Schlüssel erzeugen: openssl rand -hex 32. Als DEVHUB_RUNNER_TOKEN in der lokalen beziehungsweise produktiven .env speichern. Dieselbe Variable geht an Backend und Runner. .env und Backups gehören nur den zuständigen Serveradministratoren.
3. DEVHUB_WORKSPACE_ENABLED=true und COMPOSE_PROFILES=workspaces setzen. Die übrigen Einstellungen stehen in deploy/.env.example. Ohne aktives Compose-Profil starten keine Runner-/Workspace-Dienste.
4. Im bereits bestehenden Keycloak-Realm dev-hub die Realm-Rolle devhub-workspace anlegen und ausgewählten Nutzern zusätzlich zu devhub-user zuweisen. Das aktualisierte Import-JSON ist für frische Realms; bestehende Realms werden dadurch nicht automatisch geändert. Danach Token erneuern beziehungsweise neu anmelden.
5. Produktionsimages kommen aus GHCR über den erweiterten Buildworkflow. Lokal: docker compose --profile workspaces up -d --build. Produktion: nach Veröffentlichung der Images docker compose pull und docker compose up -d mit der vorbereiteten .env. Die workspace-image-Hilfsservice sorgt dafür, dass das Arbeitsimage verfügbar ist.
6. Im Projekt Remote workspace öffnen, Branch und Git-Commitidentität wählen und starten. GitHub und gitlab.com über HTTPS werden unterstützt. Ein Nutzer braucht eigene Repository-Berechtigungen; Projektmitgliedschaft ersetzt diese nicht.
7. In Settings persönliche Claude-/Codex-Profile anlegen. Beim Terminalstart einen Anbieter und ein eigenes Profil wählen. Es öffnet sich eine Shell mit dessen Konfiguration. Claude: claude starten und /login nutzen. Codex: codex login --device-auth, anschließend codex. Die Anmeldung erfolgt vollständig in der jeweiligen CLI. Ein Profil kann beliebig viele Terminals gleichzeitig bedienen, auch in verschiedenen Workspaces. Mehrere Agenten im selben Workspace arbeiten allerdings im selben Checkout; für parallele Änderungen eigene Branches per git worktree anlegen.
8. WebSocket, Stop/Resume und Löschprüfung auf der tatsächlichen Domain mit zwei Nutzern abnehmen. Der Runner-Port 8090 wird nie öffentlich veröffentlicht.

Die Produktions-Compose-Datei bleibt im bestehenden Deploymentpfad. Der Runner besitzt ein eigenes internes Netzwerk mit dem Backend; er hängt nicht im Traefik-edge- oder Datenbanknetz. Das Broker-Verzeichnis muss auf Host und Runner unter demselben absoluten Pfad /run/dev-hub-brokers liegen. Es wird beim Start angelegt; Login-Daten liegen dort nicht.

## Verhalten und Grenzen

- Owner/Editor mit Workspace-Realmrolle starten ihre eigene Umgebung, pro Projekt eine. Die Seite Workspaces in der Seitenleiste zeigt alle eigenen Workspaces projektübergreifend; dort lassen sich Terminals anpinnen, in einem Raster mit ein bis drei Spalten anordnen und einzeln maximieren. Viewer starten keine Terminals. Projektowner erhalten keinen Zugriff auf fremde Workspaces oder KI-Profile.
- Browser schließen beziehungsweise Panel ausblenden trennt nur die Verbindung. tmux erhält Shells und Prozesse im laufenden Container; Reconnect benötigt ein neues Ticket.
- Terminalzugriff wird mit frischem JWT erneuert; bei Tokenablauf oder Entzug der Projektberechtigung wird er gesperrt. Änderungen an Keycloak-Rollen wirken spätestens mit dem Ablauf des bisherigen Tokens (derzeit fünf Minuten). Projektentzug stoppt Compute über die nächste Lifecycle-Prüfung.
- Stoppen beendet Prozesse und hält Repo/Home-Volumes vor. Fortsetzen erstellt einen Container mit denselben Dateien. Die vorherigen Prozesse und tmux-Sitzungen werden dabei nicht fortgesetzt.
- Profile werden beim normalen Checkout-Abschluss nicht gelöscht. Vor explizitem Profil-Löschen müssen alle eigenen Workspaces gestoppt sein; dies schützt auch CLIs, die direkt in einer Shell gestartet wurden.
- Commit und Push erfolgen mit Git im Terminal. PATs werden nicht in URLs, persistenten Git-Config-Dateien oder Terminal-History hinterlegt. Der lokale Credential-Helper fordert sie über einen Unix-Socket bei Bedarf an; der Broker prüft genau den Repositorypfad und das Backend aktuelle Nutzer-/Projektrechte. Git-Zugang nach Ablauf der Autorisierung benötigt ein erneutes Öffnen des Workspace-Bereichs.
- GitHub fine-grained PATs brauchen für Push Contents write; GitLab zusätzlich write_repository. Lesezugriff allein erlaubt Clone, aber keinen Push.
- Vor Löschen werden sämtliche Workspace-Prozesse beendet und Git erneut geprüft: Arbeitsbaum, untracked/ignored Dateien, Stashes, alle lokalen Branches, detached/reflog Commits, Tags und zusätzliche lokale Refs. Origin-Änderung, fehlende Metadaten, Netzwerkfehler oder unprüfbarer Zustand blockieren normale Löschung. Scratch-Dateien außerhalb des Checkouts werden ebenfalls berücksichtigt.
- Ignorierte Builddateien können die sichere Freigabe blockieren; nach eigener Prüfung können Dateien bewusst verworfen werden. Dafür verlangt die Oberfläche die exakte Workspace-ID. Diese Aktion entfernt auch das Workspace-Home.
- Idle-Timeout (30 Minuten) und maximale Laufzeit (4 Stunden) stoppen Compute, löschen jedoch keine Arbeitsdateien. Aktive Prozesse/Verbindungen werden berücksichtigt; die maximale Laufzeit gilt dennoch. Aufbewahrte Checkouts werden ausschließlich nach einer Nutzerentscheidung gelöscht.
- Das Dateibudget (standardmäßig 5 GiB) wird alle 30 Sekunden gemessen. Bei Überschreitung wird Compute gestoppt. Starten wird unterhalb der freien Reserve (10 GiB) blockiert. Das sind Softwaregrenzen, keine harte Disk-Quote; schnelle Schreiblast kann das Budget zwischen Prüfungen überschreiten. Für eine harte Quote muss der Server eine geeignete Volume-/Dateisystemlösung bereitstellen.
- Container teilen den Host-Kernel. Diese Konfiguration ersetzt keine VM-Isolation für beliebige untrusted Nutzer. Das Feature zunächst nur für ausdrücklich berechtigte Konten freigeben.
- Änderungen im Git-Metadatenverzeichnis durch den ausführenden Nutzer sind möglich. Der Löschschutz schützt vor versehentlichem Datenverlust, er ist kein Backup und kein Beweis gegen absichtlich manipulierte Git-Daten.
- Öffentliche Previewports, beliebige Images/Devcontainer, SSH-Keys und parallele Agent-Worktrees gehören nicht zu dieser Iteration.

Projektlöschung verlangt, dass alle zugehörigen Checkouts abgeschlossen sind. Auch ein entfernter Editor kann noch aufbewahrte Dateien haben. Diese werden nicht durch Rollenentzug gelöscht: zum kontrollierten Abschluss den Zugang gezielt wiederherstellen oder administrativ die Daten sichern und bereinigen. Owner-Rechte erlauben keine Einsicht in fremde Profile.

## Betrieb, Backup und Wiederherstellung

PostgreSQL, runner-state und sämtliche genannten Named Volumes gemeinsam sichern. Workspaces vor konsistenten Backups stoppen. Profil-Backups enthalten OAuth-/CLI-Geheimnisse und müssen entsprechend geschützt und bei Ablage verschlüsselt werden; Docker verschlüsselt Volumes nicht automatisch. Die bestehende DEVHUB_ENCRYPTION_KEY für Git-PATs muss ebenfalls erhalten bleiben.

Runner-/Backend-Neustarts gleichen gewünschte Zustände und Docker-Ressourcen ab. Unterbrochene Operationen sind wiederholbar; unbekannter Zustand führt zu Aufbewahrung, nicht automatischer Datenlöschung. Verwaiste Compute-Container werden beim Runnerstart entfernt, ohne ihre Volumes zu löschen. Generationen verhindern, dass eine verspätete Startoperation einen neueren Stop überholt.

Rollback: neue Starts abschalten, laufende Workspaces kontrolliert stoppen und Anwendung zurücksetzen. Repo/Home/Profile-Volumes und runner-state behalten. Ein normales Deployment löscht keine Workspace-Volumes. Ein Runner-Update trennt Browserverbindungen; laufende tmux-Sitzungen bleiben erhalten. Ein Egress-Proxy-Neustart kann Verbindungen unterbrechen; vor Proxy-Upgrades Workspaces kontrolliert stoppen und anschließend fortsetzen.

Traefik routet /api direkt zum Backend. nginx und Vite unterstützen WebSocket-Upgrades ebenfalls. Tickets reisen im Sec-WebSocket-Protocol-Header; nur devhub-terminal wird als Protokoll zurückgegeben. In Traefik/Diagnostik keine Authorization-, X-Runner-Token- oder Sec-WebSocket-Protocol-Header protokollieren. Terminalein-/ausgabe wird nicht als App-Log gespeichert.

## Verifikation

CI baut Backend, Frontend und alle drei Images. Backendtests prüfen Nutzerisolation, Realmrolle, Ticket-Replay/Expiry, Rollenentzug, persönliche Credentials und Lifecycle-Rennen. Frontendtests prüfen Start/Stop, Profile und explizites Verwerfen.

Runner-Tests verwenden echte Git-Repositories einschließlich ungepushter anderer Branches, Stashes, Tags und Offline-Origin. Die Dockerprüfung verifiziert Clone, Limits, Proxy-Isolation, persönliche Profile, PTY-Reconnect, Dateierhalt, Laufzeitende und Löschschutz. Ein zusätzlicher End-to-End-Test verbindet PostgreSQL, den echten Spring-Server, Runner-HTTP und WebSocket/PTY inklusive Ticket-Erneuerung.

Persönliche Claude-/ChatGPT-Anmeldung, private Provider-Pushs und die tatsächliche Traefik-/Keycloak-Konfiguration brauchen ergänzend eine manuelle Serverabnahme. CI enthält keine persönlichen Git- oder KI-Tokens.
