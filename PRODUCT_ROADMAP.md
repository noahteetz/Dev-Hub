# Dev Hub: Produktkonzept und Roadmap

## Produktvision

Dev Hub ist eine persoenliche Projektzentrale fuer private Coding-Projekte. Das Tool soll mit moeglichst wenig manueller Pflege drei Fragen beantworten:

1. Welche Projekte habe ich?
2. Was ist gerade relevant oder lange liegen geblieben?
3. Wo kann ich konkret weiterarbeiten?

Der Kern ist nicht klassisches Projektmanagement. Dev Hub verbindet den aktuellen Arbeitsstand, Git-Aktivitaet, Ideen, Todos und Wissen so, dass der Wiedereinstieg in ein Projekt schnell gelingt.

## Produktprinzipien

- **Wenig Pflege:** Informationen wie letzte Aktivitaet und Repository-Status werden soweit moeglich automatisch ermittelt.
- **Schneller Wiedereinstieg:** Der letzte Stand, Blocker und naechste Schritt sind sofort sichtbar.
- **Lose Gedanken bleiben leichtgewichtig:** Ideen sind keine verpflichtenden Aufgaben.
- **Alles bleibt auffindbar:** Projektbezogene und globale Inhalte koennen zentral gesucht werden.
- **Lokale Kontrolle:** Daten sind exportierbar, sicherbar und selbst hostbar.
- **Komplexitaet folgt dem Nutzen:** Remote-Agenten werden erst gebaut, wenn der lokale Produktkern im Alltag funktioniert.

## Funktionsumfang

### 1. Projektzentrale

Die Startansicht bildet die Entscheidung ab, woran als Naechstes gearbeitet werden soll.

- Projekte erstellen, bearbeiten, archivieren und wiederherstellen
- Status: aktiv, pausiert, geplant und archiviert
- Manuelle Prioritaet und Favoriten
- Letzte lokale oder aus Git abgeleitete Aktivitaet
- Sortierung und Filter nach Aktivitaet, Prioritaet, Status und Tags
- Sichtbare Trennung zwischen aktuellen und laenger ungenutzten Projekten
- Pro Projekt ein kurzer letzter Stand, Blocker und naechster Schritt
- Optional spaeter eine begruendete Empfehlung fuer das naechste Projekt

### 2. Repository-Anbindung

- Ein Git-Repository mit einem Projekt verbinden
- Provider und Repository aus einer GitHub-, GitLab- oder allgemeinen Git-URL erkennen
- Standard-Branch, letzter Commit, Zeitpunkt der letzten Aktivitaet und verwendete Sprachen anzeigen
- README und grundlegenden Repository-Status anzeigen
- Links zu Branches, Issues und Pull Requests anbieten
- Repository-Daten manuell und spaeter regelmaessig aktualisieren
- Spaeter mehrere Repositories pro Projekt ermoeglichen

Die erste Integration liest nur Metadaten. Schreibzugriffe und das Speichern von Zugangsdaten werden erst eingefuehrt, wenn sie fuer Remote-Workspaces erforderlich sind.

### 3. Arbeitskontext pro Projekt

Jedes Projekt erhaelt einen kleinen, hervorgehobenen Wiedereinstiegsbereich:

- Letzter Arbeitsstand
- Naechster konkreter Schritt
- Aktuelle Blocker
- Lokale Start- und Build-Kommandos
- Wichtige technische Entscheidungen
- Zeitstempel der letzten bewussten Aktualisierung

Der naechste Schritt soll bewusst kurz bleiben und ohne einen vollstaendigen Todo-Workflow gepflegt werden koennen.

### 4. Ideen und Todos

Projektbezogene Ideen bleiben eine lockere Post-it-Ablage.

- Ideen schnell erfassen, bearbeiten, taggen und sortieren
- Ideen bei Bedarf in Todos umwandeln
- Umgewandelte Ideen als Historie behalten
- Todos oeffnen, abschliessen und erneut oeffnen
- Todos priorisieren und optional mit einem Termin versehen
- Ideen und Todos mit Notizen oder Codestellen verknuepfen

Komplexe Boards, Sprints, Zeiterfassung und Team-Workflows gehoeren nicht zum Kern.

### 5. Notizen und Editor

- Projektbezogene Notizen
- Projektunabhaengige Notizen
- Markdown-Editor mit Vorschau
- Codebloecke mit Sprache und Syntaxhervorhebung
- Ueberschriften, Listen, Checkboxen, Links und Tabellen
- Automatisches Speichern oder klar sichtbarer Speicherstatus
- Snippets langfristig als Codeblock oder referenzierter Inhalt in Notizen nutzbar machen
- Zentrale Ansicht aller Notizen mit Filterung nach Projekt und Tags

Bilder und beliebige Dateianhaenge sind eine spaetere Erweiterung.

### 6. Globaler Eingang

Ein unabhaengiger Bereich nimmt Inhalte auf, die noch zu keinem Projekt gehoeren:

- Ideen fuer neue Projekte
- Allgemeine Notizen und technische Erkenntnisse
- Links und Code-Snippets
- Schnelle Erfassung ohne vorherige Kategorisierung
- Spaetere Zuordnung zu einem bestehenden Projekt
- Aus einer Idee direkt ein neues Projekt anlegen

### 7. Suche und Verknuepfungen

- Globale Volltextsuche ueber Projekte, Ideen, Todos und Notizen
- Filter nach Typ, Projekt, Status und Tags
- Direkte Navigation zwischen verknuepften Inhalten
- Eindeutige, dauerhafte Links auf Eintraege innerhalb von Dev Hub
- Spaeter Suche ueber Repository-Dateien und Code

### 8. Repository-Dateien und Codenotizen

- Dateibaum eines verbundenen Repositories anzeigen
- Dateien mit Syntaxhervorhebung lesen
- Branch oder Commit fuer die Ansicht auswaehlen
- Notiz an eine Datei oder einen Zeilenbereich anhaengen
- Referenz mit Repository, Commit, Dateipfad und Zeilenbereich speichern
- Von der zentralen Notiz direkt zur Codestelle springen
- Erkennbar anzeigen, wenn eine Referenz durch spaetere Aenderungen veraltet sein koennte

Die erste Version verwendet commitgebundene Referenzen. Eine automatische Verschiebung von Referenzen bei Codeaenderungen ist optional und kein MVP-Bestandteil.

### 9. Archiv, Export und Datensicherheit

- Projekte archivieren statt loeschen
- Beim Archivieren optional einen Grund oder Abschlussstand festhalten
- Inhalte als Markdown und strukturierte Daten exportieren
- Datenbank sichern und wiederherstellen
- Dokumentierte Backup-Strategie fuer Self-Hosting
- Keine Bindung wichtiger Inhalte an ein ausschliesslich internes Format

### 10. Temporaere Remote-Workspaces

Remote-Workspaces sind ein eigenstaendiger Ausbau nach dem lokalen Produktkern.

- Repository temporaer auf einem eigenen Server klonen
- Isolierten Workspace pro Arbeitssitzung erstellen
- Browser-Terminal im Projektbereich oeffnen
- Claude CLI, Codex CLI und normale Shell-Prozesse starten
- Jeder Nutzer meldet sich mit seinem eigenen Claude- bzw. ChatGPT-Account im Terminal an; der Login bleibt ueber Sessions hinweg erhalten
- Pro Nutzer mehrere Accounts (Profile) je Anbieter verwalten und beim Terminalstart waehlen
- Laufende Prozesse, Status und Ressourcenverbrauch anzeigen
- Aenderungen pruefen, committen und pushen
- Workspace bewusst beenden
- Repository und temporaere Daten nach erfolgreichem Abschluss entfernen
- Vor dem Loeschen vor uncommitteten oder nicht gepushten Aenderungen warnen
- Verwaiste Sitzungen nach einer konfigurierbaren Frist bereinigen

Erforderliche technische Leitplanken:

- Prozess- oder Container-Isolation
- Authentifizierung und Autorisierung
- Feature nur mit Realm-Rolle `devhub-workspace`, geprueft in REST und WebSocket-Handshake (kurzlebiges Ticket, da Browser-WebSockets keinen `Authorization`-Header setzen)
- KI-Logins pro Nutzer und Profil in einem persistenten Volume unter `/data/users/{userId}/{provider}/{profileId}`, Zugriff `0600`, nie in der Datenbank
- `CLAUDE_CONFIG_DIR` bzw. `CODEX_HOME` beim Terminalstart auf das gewaehlte Profil setzen; in den Container wird nur das Profil des eigenen Nutzers gemountet
- Ein Container pro Arbeitssitzung; das Profil-Volume ueberlebt den Container, ein neuer Container mountet dasselbe Profil und der Login bleibt bestehen
- Ein Accountwechsel waehlt ein anderes Profilverzeichnis, es werden keine Dateien getauscht oder ueberschrieben
- Login laeuft im Terminal selbst (`claude`/`/login`, `codex login --device-auth`); das Backend proxied keinen OAuth-Flow und sammelt keine Token ein
- Kein gemeinsames Server-Abo fuer mehrere Nutzer (Nutzungsbedingungen, Rate-Limits)
- Sichere SSH-Key- und Secret-Verwaltung
- CPU-, Arbeitsspeicher-, Laufzeit- und Speicherlimits
- Nachvollziehbare Lebenszyklen fuer Sessions
- WebSocket-Verbindung fuer interaktive Terminals

### 11. Mehrere Agents und Worktrees

- Mehrere Agents fuer dasselbe Projekt starten
- Eigener Branch, Git-Worktree und Terminal pro Agent
- Uebersicht ueber Agent, Branch, Status und letzte Aktivitaet
- Agents einzeln beenden
- Aenderungen vor dem Aufraeumen pruefen und zusammenfuehren
- Alle Sessions eines Projekts kontrolliert abschliessen
- Worktrees, Branches und temporaere Repository-Daten verlaesslich bereinigen

### 12. Geteilte Projekte

Ein Projekt kann mit anderen Dev-Hub-Nutzern geteilt werden. Der Owner vergibt pro Mitglied eine Rolle.

- Mitglieder mit der Rolle `VIEWER` oder `EDITOR` hinzufuegen, Rolle aendern und entfernen
- `VIEWER` sehen das Projekt mit allen Inhalten, aendern aber nichts
- `EDITOR` pflegen Inhalte und Arbeitskontext, aber keine Stammdaten
- Archivieren, Loeschen, Stammdaten, Repository und Mitglieder bleiben beim Owner
- Mitglieder koennen ein Projekt selbst verlassen
- Favoriten sind pro Nutzer, nicht pro Projekt
- Geteilte Projekte sind im Dashboard, in der Seitenleiste und in der Suche erkennbar
- Bei Inhalten ist sichtbar, wer sie erstellt hat

## Implementierungsreihenfolge

### Phase 0: Bestehenden Kern stabilisieren

Ziel: Die vorhandenen CRUD-Funktionen sind eine belastbare Ausgangsbasis.

- Bestehende Projekte, Notizen, Snippets, Ideen, Todos und Tags absichern
- Integrationstests fuer zentrale Benutzerablaeufe vervollstaendigen
- Fehler-, Lade- und Leerzustaende pruefen
- Datenbankschema und Migrationen fuer weitere Entwicklung vorbereiten

**Fertig, wenn:** Ein Projekt mit allen vorhandenen Inhaltstypen ohne Datenverlust erstellt, bearbeitet und wieder geladen werden kann.

### Phase 1: Orientierung und Wiedereinstieg

Ziel: Dev Hub beantwortet erstmals die zentrale Frage, woran weitergearbeitet werden soll.

- Projektstatus, manuelle Prioritaet, Favorit und Archivierung einfuehren
- Letzten Stand, naechsten Schritt und Blocker pro Projekt speichern
- Dashboard mit aktiven, priorisierten und lange ungenutzten Projekten bauen
- Sortierung und Filterung nach Status, Prioritaet und Aktualitaet ergaenzen
- Archivansicht und Wiederherstellung bereitstellen

**Fertig, wenn:** Innerhalb einer Minute ein relevantes Projekt und dessen naechster Arbeitsschritt gefunden werden kann.

### Phase 2: Repository-Metadaten

Ziel: Projektaktivitaet muss nicht mehr vollstaendig manuell gepflegt werden.

- Git-URL validieren und Provider erkennen
- Repository-Metadaten laden und zwischenspeichern
- Letzten Commit und letzte Aktivitaet im Dashboard verwenden
- README, Standard-Branch, Sprachen und Provider-Links anzeigen
- Aktualisierung manuell ausloesen; Fehler und private Repositories klar behandeln

**Fertig, wenn:** Ein verbundenes Repository seine wichtigsten Metadaten liefert und die Projektaktivitaet sichtbar beeinflusst.

## Konkreter Implementierungsplan fuer Phase 1 und 2

### Gemeinsame technische Entscheidungen

- Das bestehende Spring-JDBC- und React/MUI-Setup bleibt bestehen.
- Vor fachlichen Schemaaenderungen wird Flyway eingefuehrt. Das aktuelle Schema wird als Baseline `V1` erfasst; neue und bestehende Installationen muessen denselben Stand erreichen. `schema.sql` wird danach nicht mehr fuer fortlaufende Migrationen verwendet.
- API-Erweiterungen bleiben fuer bestehende Clients kompatibel. Neue Felder erhalten Datenbank-Defaults und werden zunaechst optional angenommen.
- Systembereiche wie "General notes" werden weder im Projekt-Dashboard noch im Archiv angezeigt und koennen weiterhin nicht bearbeitet oder archiviert werden.
- `updatedAt` beschreibt eine Datenaenderung, nicht automatisch echte Projektaktivitaet. Fuer Sortierung und Inaktivitaet wird ein eigenes `effectiveActivityAt` verwendet.
- Ein Projekt gilt standardmaessig nach 30 Tagen ohne Aktivitaet als lange ungenutzt. Der Wert wird ueber `DEVHUB_STALE_PROJECT_DAYS` konfigurierbar.

### Phase 1: Orientierung und Wiedereinstieg

#### P1.1 - Migrationen und Projektmodell vorbereiten (1-2 Tage)

**Datenmodell**

- `status`: `PLANNED`, `ACTIVE`, `PAUSED` oder `ARCHIVED`, Standard `PLANNED`
- `priority`: Ganzzahl von `0` bis `3`, Standard `0`
- `favorite`: Boolean, Standard `false`
- `status_before_archive`: letzter nicht archivierter Status fuer die Wiederherstellung
- `archived_at` und `archive_reason`: Zeitpunkt und optionale Begruendung
- `progress_summary`: letzter Arbeitsstand
- `next_step`: genau ein kurzer, konkreter naechster Schritt
- `blockers`: aktuelle Blocker als Freitext
- `start_command` und `build_command`: lokale Kommandos
- `technical_decisions`: knappe, wichtige Entscheidungen als Freitext
- `context_updated_at`: Zeitpunkt der letzten bewussten Aktualisierung des Arbeitskontexts

`effectiveActivityAt` wird in Phase 1 aus `context_updated_at` und `created_at` berechnet. Reine Aenderungen an Name, Links oder Beschreibung beeinflussen diesen Wert nicht.

**Ergebnis und Tests**

- Flyway-Migrationen laufen auf einer leeren PostgreSQL- und H2-Testdatenbank.
- Bestehende Projekte werden ohne Datenverlust mit Defaults uebernommen.
- Datenbank-Constraints verhindern ungueltige Status- und Prioritaetswerte.

#### P1.2 - Backend-API fuer Organisation und Arbeitskontext (2 Tage)

Das bestehende Projektobjekt wird um die neuen Felder sowie `effectiveActivityAt` und `stale` erweitert. Die vorhandenen Create-/Update-Aufrufe bleiben nutzbar.

**Neue Aktionen**

- `PATCH /api/projects/{id}/organization` mit `status`, `priority` und `favorite`
- `PUT /api/projects/{id}/context` fuer Arbeitsstand, naechsten Schritt, Blocker, Kommandos und Entscheidungen
- `POST /api/projects/{id}/archive` mit optionalem `reason`
- `POST /api/projects/{id}/restore`, setzt den vorherigen Status oder ersatzweise `PAUSED`
- `GET /api/projects?archived=false` als Standardliste
- `GET /api/projects?archived=true` fuer die Archivansicht

Archivieren ersetzt das bisherige Loeschen im normalen UI. Der bestehende `DELETE`-Endpunkt bleibt vorerst fuer Kompatibilitaet erhalten, wird aber nicht mehr prominent angeboten.

**Backend-Regeln**

- Archivierte Projekte behalten Notizen, Ideen, Todos, Snippets und Links unveraendert.
- Nur eine Aenderung des Arbeitskontexts aktualisiert `context_updated_at`.
- Archivieren und Wiederherstellen sind idempotent oder liefern einen eindeutigen `409`-Fehler.
- Validierungsfehler liefern weiterhin das vorhandene strukturierte Fehlerformat.

**Tests**

- Integrationstest fuer Erstellen, Organisieren, Kontext aktualisieren, Archivieren und Wiederherstellen
- Regressionstest, dass alle bestehenden Inhaltstypen nach Archivierung und Wiederherstellung vorhanden sind
- Tests fuer Systembereiche, ungueltige Statuswerte und unbekannte Projekt-IDs

#### P1.3 - Dashboard als neue Startansicht (3 Tage)

Nach dem Laden oeffnet Dev Hub das Dashboard statt automatisch das erste Projekt. Die bestehende Seitenleiste bleibt fuer direkte Navigation erhalten.

**Dashboard-Bereiche**

- `Favoriten`: nicht archivierte favorisierte Projekte
- `Jetzt relevant`: aktive Projekte, sortiert nach Prioritaet und Aktivitaet
- `Geplant oder pausiert`: getrennt von aktiver Arbeit
- `Lange ungenutzt`: Projekte mit `stale = true`

Jeder Projekteindruck zeigt Name, Status, Prioritaet, letzte Aktivitaet, letzten Stand, naechsten Schritt und Blocker. Ein Klick oeffnet den bestehenden Projektarbeitsbereich.

**Steuerung**

- Filter: Status, Prioritaet, nur Favoriten, nur lange ungenutzte Projekte
- Sortierung: Prioritaet, letzte Aktivitaet, Name
- Leerer Zustand pro Bereich sowie globaler Lade- und Fehlerzustand
- Filter und Sortierung werden in `localStorage` gespeichert

Die Filterung erfolgt in Phase 1 im Frontend, da die persoenliche Projektmenge klein ist. Die API liefert dennoch bereits archivierte und nicht archivierte Projekte getrennt.

#### P1.4 - Arbeitskontext im Projektbereich (2 Tage)

- Oberhalb der bestehenden Tabs erscheint ein kompakter Wiedereinstiegsbereich.
- `Naechster Schritt` und `Blocker` sind ohne Wechsel in den allgemeinen Projektdialog bearbeitbar.
- Ein erweiterter Dialog pflegt letzten Stand, Start-/Build-Kommando und technische Entscheidungen.
- Nach dem Speichern wird der Dashboard-Eintrag im lokalen Zustand aktualisiert.
- Fehlgeschlagene Speicherungen behalten die Eingaben und zeigen den vorhandenen Fehlerhinweis.

#### P1.5 - Archivansicht und Abschluss (1-2 Tage)

- Eigene Ansicht fuer archivierte Projekte mit Archivdatum und Begruendung
- Wiederherstellen als primaere Aktion, dauerhaftes Loeschen nur hinter einer zweiten, deutlichen Bestaetigung
- Responsive Pruefung fuer Dashboard, Filter und Arbeitskontext
- Frontend-Tests mit Vitest und React Testing Library fuer Gruppierung, Filterung und Wiederherstellung
- Backend-Gesamttest und Frontend-Build als Release-Gate

**Abnahme Phase 1**

1. Ein bestehendes Projekt kann ohne Datenverlust priorisiert, pausiert, archiviert und wiederhergestellt werden.
2. Ein Nutzer findet auf dem Dashboard in hoechstens drei Interaktionen ein aktives oder lange ungenutztes Projekt.
3. Letzter Stand, naechster Schritt und Blocker sind ohne Oeffnen eines Todo-Workflows sichtbar.
4. Die Sortierung nach Aktivitaet reagiert nur auf bewusste Kontextaktualisierungen.
5. Alle Backend-Tests, Frontend-Tests, Lint und Produktions-Build laufen erfolgreich.

### Phase 2: Repository-Metadaten

#### P2.1 - Repository-Verbindung und URL-Erkennung (2 Tage)

Die vorhandene `repositoryUrl` bleibt die vom Nutzer eingegebene Quelle. Ein Parser normalisiert HTTPS- und SSH-Adressen, entfernt ein abschliessendes `.git` und erkennt anhand des Hosts:

- `GITHUB` fuer `github.com`
- `GITLAB` fuer `gitlab.com`
- `GENERIC` fuer andere gueltige Git-URLs

Allgemeine Git-URLs werden validiert und verlinkt, aber in Phase 2 nicht von Dev Hub abgerufen. Damit werden unkontrollierte Serverzugriffe auf beliebige Hosts und SSRF-Risiken vermieden. Self-hosted GitHub-/GitLab-Instanzen und Zugangsdaten bleiben ausserhalb dieses Umfangs.

**Tests**

- HTTPS-, SSH-, `.git`-, Untergruppen- und ungueltige URL-Varianten
- Exakte Hostpruefung, damit aehnliche oder manipulierte Domains nicht als Provider gelten
- Aktualisierung und Entfernen einer bestehenden Repository-URL

#### P2.2 - Cache-Modell und Provider-Adapter (3 Tage)

Eine Tabelle `repository_metadata` speichert pro Projekt hoechstens einen Cache-Eintrag:

- Provider, Owner/Namespace, Repository-Name und kanonische Web-URL
- Standard-Branch
- letzter Commit mit SHA, Nachricht, Autor und Zeitpunkt
- README-Inhalt und erkannter Dateiname
- Sprachen mit prozentualem Anteil als JSON-Text
- `sync_status`: `NEVER_SYNCED`, `SYNCING`, `READY`, `PRIVATE_OR_NOT_FOUND`, `RATE_LIMITED`, `FAILED` oder `UNSUPPORTED`
- `last_attempt_at`, `last_successful_sync_at`, Fehlercode und nutzerlesbare Fehlermeldung

Ein gemeinsames `RepositoryMetadataProvider`-Interface wird durch GitHub- und GitLab-Adapter implementiert. Spring `RestClient` erhaelt feste Verbindungs- und Lese-Timeouts sowie einen eindeutigen User-Agent.

**Abrufumfang**

- GitHub: Repository, letzter Commit des Standard-Branches, Sprachen und README ueber die REST-API
- GitLab: Projekt, letzter Commit, Sprachen und README ueber die REST-API
- Kein Token und kein Schreibzugriff in Phase 2

Ein fehlgeschlagener Abruf behaelt den letzten erfolgreichen Cache. Nur Status und Fehlerdetails werden aktualisiert.

#### P2.3 - Synchronisierungsservice und API (2 Tage)

**Endpunkte**

- `GET /api/projects/{id}/repository` liefert Verbindung, Cache, Status und Provider-Links
- `POST /api/projects/{id}/repository/refresh` fuehrt den Abruf synchron aus und liefert den aktualisierten Stand

Der synchrone Abruf ist fuer den ersten Meilenstein ausreichend und vereinfacht Fehlerbehandlung und Betrieb. Timeouts begrenzen die Wartezeit.

Die regelmaessige Hintergrundaktualisierung ist inzwischen ergaenzt: ein Scheduler synchronisiert jedes verbundene Repository stuendlich ueber denselben Weg, damit `effectiveActivityAt` und die Aktivitaetssortierung ohne manuelles Zutun aktuell bleiben. Unveraenderte Repositories antworten dank ETag mit `304` und kosten damit kaum Kontingent. Einstellbar ueber `devhub.repository.sync.*`.

**Fehlerabbildung**

- `400`: ungueltige Repository-URL
- `PRIVATE_OR_NOT_FOUND`: Provider antwortet mit `401`, `403` oder `404`; die UI erklaert, dass private Repositories noch nicht unterstuetzt werden
- `RATE_LIMITED`: Rate Limit mit moeglichem Retry-Zeitpunkt
- `FAILED`: Timeout, Netzwerk- oder unerwarteter Providerfehler
- `UNSUPPORTED`: gueltige allgemeine Git-URL ohne Metadatenadapter

Provider-Antworten werden in Tests mit WireMock simuliert; Tests greifen nie auf echte GitHub- oder GitLab-Endpunkte zu.

#### P2.4 - Repository-Bereich im Frontend (2-3 Tage)

- Neuer Bereich im Projektkopf fuer Provider, Standard-Branch, letzte Synchronisierung und letzten Commit
- Manuelle Aktualisierung mit eindeutigem Ladezustand; parallele Aktualisierungen werden verhindert
- Sprachen als kompakte Anteile und README als schreibgeschuetzte Vorschau
- Provider-spezifische Links zu Repository, Branches, Issues und Pull/Merge Requests
- Klare Leer-, Fehler-, Rate-Limit-, Privat- und Nicht-unterstuetzt-Zustaende
- Beim Aendern der Repository-URL wird alter Cache als veraltet markiert und erst nach erfolgreicher Aktualisierung ersetzt

#### P2.5 - Aktivitaet ins Dashboard integrieren (1-2 Tage)

`effectiveActivityAt` wird nun als Maximum aus `context_updated_at`, letztem Repository-Commit und `created_at` berechnet. Das Dashboard zeigt die Quelle als `Git-Aktivitaet` oder `Kontext aktualisiert` an.

- Nach manueller Repository-Aktualisierung wird das betroffene Projekt im Dashboardzustand aktualisiert.
- Sortierung und `stale` werden serverseitig konsistent berechnet.
- Ein alter oder fehlgeschlagener Cache bleibt sichtbar und wird als solcher gekennzeichnet.
- Commits auf Nicht-Standard-Branches und lokale, noch nicht gepushte Commits sind in Phase 2 bewusst nicht erfassbar.

**Abnahme Phase 2**

1. Eine oeffentliche GitHub- und eine oeffentliche GitLab-URL liefern Standard-Branch, letzten Commit, Sprachen und README aus simulierten Provider-Antworten.
2. Der letzte Commit beeinflusst Dashboard-Sortierung und Inaktivitaetsstatus nachvollziehbar.
3. Ein Providerfehler vernichtet keine zuvor erfolgreich geladenen Metadaten.
4. Private und allgemeine Repositories zeigen einen konkreten Zustand statt eines generischen Fehlers.
5. Es werden keine Tokens gespeichert und keine beliebigen Hosts serverseitig abgerufen.
6. Alle Backend-Tests, Frontend-Tests, Lint und Produktions-Build laufen erfolgreich.

### Empfohlene Reihenfolge und Meilensteine

1. `M1 Datenbasis`: P1.1 und P1.2
2. `M2 Nutzbarer Wiedereinstieg`: P1.3 bis P1.5; Phase 1 im Alltag testen
3. `M3 Repository-Grundlage`: P2.1 bis P2.3
4. `M4 Integrierte Aktivitaet`: P2.4 und P2.5; erster empfohlener Produktmeilenstein abgeschlossen

Bei einer einzelnen entwickelnden Person sind fuer Phase 1 etwa 9-11 und fuer Phase 2 etwa 10-12 konzentrierte Entwicklungstage realistisch. Provider-Rate-Limits, H2-/PostgreSQL-Unterschiede und das Einfuehren der ersten Frontend-Testinfrastruktur sind die groessten Unsicherheiten.

### Phase 3: Globaler Eingang und Wissensbereich

Ziel: Auch noch nicht zugeordnete Gedanken haben einen festen Ort.

- Projektunabhaengige Eintraege modellieren
- Schnelle Inbox-Erfassung bauen
- Eintraege einem Projekt zuordnen oder in ein Projekt umwandeln
- Zentrale Ansichten fuer Ideen und Notizen einfuehren
- Archivierte und erledigte Inhalte sinnvoll filtern

**Fertig, wenn:** Ein Gedanke ohne Vorentscheidung erfasst und spaeter verlustfrei einsortiert werden kann.

### Phase 4: Markdown-Notizen und Suche

Ziel: Dev Hub wird zum durchsuchbaren persoenlichen Wissensspeicher.

- Markdown-Editor mit Vorschau und Syntaxhervorhebung integrieren
- Speicherstatus und Schutz vor unbeabsichtigtem Inhaltsverlust umsetzen
- Bestehende Snippets sinnvoll in den Notiz-Workflow integrieren
- Globale Volltextsuche und kombinierbare Filter bauen
- Dauerhafte Links zwischen Eintraegen ermoeglichen

**Fertig, wenn:** Notizen mit formatiertem Text und Code angenehm geschrieben und innerhalb weniger Sekunden wiedergefunden werden koennen.

### Phase 5: Repository-Browser und Codenotizen

Ziel: Wissen kann direkt an den zugehoerigen Code gebunden werden.

- Dateibaum und Dateiinhalt fuer Branch oder Commit laden
- Codeansicht mit Syntaxhervorhebung bauen
- Commitgebundene Datei- und Zeilenreferenzen modellieren
- Notizen an Codestellen erstellen und zentral anzeigen
- Ruecksprung zur referenzierten Stelle und Veraltet-Hinweis umsetzen

**Fertig, wenn:** Eine Notiz an einen Zeilenbereich geheftet und spaeter aus der Notizansicht exakt am gespeicherten Commit geoeffnet werden kann.

### Phase 6: Portabilitaet und Betrieb

Ziel: Die persoenlichen Daten bleiben langfristig unter eigener Kontrolle.

- Markdown- und JSON-Export bereitstellen
- Backup- und Restore-Ablauf dokumentieren und testen
- Self-Hosting absichern
- Aufbewahrung und Loeschung sensibler Daten definieren

**Fertig, wenn:** Alle wichtigen Inhalte exportiert und eine leere Installation aus einem Backup wiederhergestellt werden koennen.

### Phase 7: Einzelner Remote-Workspace

Ziel: Ein Projekt kann temporaer und sicher ueber den Browser bearbeitet werden.

- Server-Agent fuer Workspace-Lebenszyklen entwickeln
- Isolierte Arbeitsumgebung und Browser-Terminal bereitstellen
- Git-Credentials und Secrets sicher handhaben
- Persistente KI-Profile pro Nutzer (Claude, Codex) einbinden; Profilwechsel per Auswahl beim Terminalstart
- Commit- und Push-Ablauf integrieren
- Loeschschutz und kontrolliertes Aufraeumen umsetzen
- Ressourcenlimits und automatische Bereinigung einfuehren

**Fertig, wenn:** Ein Repository temporaer geklont, bearbeitet, gepusht und anschliessend ohne Datenverlust vom Server entfernt werden kann.

### Phase 8: Multi-Agent- und Worktree-Verwaltung

Ziel: Mehrere isolierte Arbeitsstroeme koennen sicher parallel laufen.

- Worktree und Branch pro Agent automatisch erstellen
- Agent-Sessions und Terminals zentral anzeigen
- Konflikte und nicht gesicherte Aenderungen vor dem Aufraeumen erkennen
- Einzelnes und gemeinsames Beenden implementieren
- Vollstaendige Bereinigung automatisiert testen

**Fertig, wenn:** Mehrere Agents parallel arbeiten koennen und alle erzeugten Ressourcen nachvollziehbar zusammengefuehrt oder sicher entfernt werden.

### Erweiterung: Geteilte Projekte

Ziel: Ein Projekt kann gezielt mit anderen Nutzern gelesen oder gemeinsam gepflegt werden, ohne die Isolation aller uebrigen Daten aufzuweichen.

Die Erweiterung haengt nicht von Phase 5 bis 8 ab. Sie baut auf der Mehrbenutzer-Grundlage aus `V6__multi_user.sql` auf. Details stehen im Abschnitt "Konkreter Implementierungsplan fuer geteilte Projekte".

**Fertig, wenn:** Ein Owner ein Projekt mit einem zweiten Nutzer als `VIEWER` oder `EDITOR` teilen kann, beide Rollen genau die vereinbarten Rechte haben und fuer Nicht-Mitglieder nichts sichtbar wird.

**Stand:** Umgesetzt mit Migration `V7__shared_projects.sql`, `ProjectAccessService`, der Mitglieder-API und der Rechtematrix in `SharedProjectsHttpTests`. Das Rollenmodell steht im README.

## Konkreter Implementierungsplan fuer Phase 3 und 4

### Ausgangslage

Phase 1 und 2 sind funktional umgesetzt: Flyway mit `V1__initial_schema.sql`, Projektstatus, Prioritaet, Favorit, Archiv, Arbeitskontext, `effectiveActivityAt`, `stale`, Repository-Parser, Metadaten-Cache und die Adapter fuer GitHub und GitLab.

Zwei geplante Punkte fehlen noch und werden zu Beginn von Phase 3 nachgezogen:

- Im Frontend gibt es weder Vitest noch React Testing Library und kein `test`-Skript.
- Im Backend gibt es keine WireMock-Abhaengigkeit und keine Tests fuer `RepositoryUrlParser`, `RepositoryMetadataService` und die Provider-Adapter.

Ausserdem loesen Phase 3 und 4 eine bewusste Zwischenloesung ab: projektunabhaengige Inhalte liegen heute in den Systemprojekten `General notes` und `Future project ideas`. Diese Konstruktion traegt keine echte Inbox, keine zentrale Filterung und keine saubere Zuordnung.

### Gemeinsame technische Entscheidungen

- **Systemprojekte entfallen.** `project_id` wird auf `notes`, `code_snippets`, `ideas` und `todos` nullable. Ein Eintrag ohne Projekt ist ein Eintrag im globalen Eingang. Die Inhalte der beiden Systembereiche werden per Migration auf `project_id = NULL` gesetzt, danach werden die Systemprojekte und die Spalte `is_system` entfernt. Damit ist "einem Projekt zuordnen" nur noch ein Feldwechsel und kein Umkopieren.
- **Flache Ressourcenrouten.** Neben den bestehenden verschachtelten Routen entstehen `/api/notes`, `/api/snippets`, `/api/ideas` und `/api/todos` mit Filtern. Die verschachtelten Routen bleiben bestehen und delegieren an denselben Service, damit der vorhandene Projektarbeitsbereich unveraendert weiterlaeuft.
- **Routing im Frontend kommt in Phase 3.** Ohne adressierbare Ansichten sind weder Eingang noch zentrale Listen noch die dauerhaften Links aus Phase 4 sinnvoll. Eingefuehrt wird `react-router` mit echten Pfaden statt des heutigen reinen Zustandswechsels in `App.tsx`.
- **Tags werden zum Querschnitt.** `notes` und `code_snippets` erhalten dieselbe Tag-Verknuepfung, die `ideas` und `todos` bereits haben. Ohne das bleiben zentrale Ansichten und Suchfilter lueckenhaft.
- **Suche bleibt portabel.** Die Suche verwendet portables SQL mit `LOWER(...) LIKE`, damit Tests weiterhin auf H2 und die Produktion auf PostgreSQL laufen. Die persoenliche Datenmenge ist klein. Ein Wechsel auf `tsvector` und GIN bleibt hinter dem `SearchRepository`-Interface moeglich, ohne API oder Frontend zu aendern.
- **Markdown wird sanitisiert gerendert.** Kein rohes HTML im Notizinhalt, auch bei einem Einzelnutzer nicht. Das Rendern erfolgt an genau einer Stelle im Frontend.
- **Kein Datenverlust beim Verschieben.** Zuordnung, Umwandlung in ein Projekt und Archivierung aendern nie den Inhalt eines Eintrags, sondern nur seine Zuordnung oder seinen Zustand.

### Phase 3: Globaler Eingang und Wissensbereich

#### P3.0 - Fehlende Testinfrastruktur nachziehen (1 Tag)

- Vitest, React Testing Library, jsdom und ein `test`-Skript im Frontend einrichten
- Einen Smoke-Test fuer das Dashboard und einen fuer die Gruppierung der Projekte schreiben
- WireMock im Backend ergaenzen und die in Phase 2 vorgesehenen Provider-Tests nachholen
- Beide Testlaeufe als Release-Gate fuer alle weiteren Pakete festlegen

**Fertig, wenn:** Frontend- und Backend-Testlauf lokal gruen sind und mindestens ein Provider-Fehlerfall simuliert getestet ist.

#### P3.1 - Routing und Navigationsgeruest (2 Tage)

Der heutige Zustandswechsel in `App.tsx` wird durch echte Routen ersetzt:

- `/` leitet auf `/dashboard`
- `/dashboard` und `/archive`
- `/projects/:projectId` mit `?tab=notes|snippets|ideas|todos`
- `/inbox`
- `/notes` und `/ideas` als zentrale Ansichten
- `/search`

Regeln:

- Unbekannte Routen zeigen eine klare Nicht-gefunden-Ansicht statt eines leeren Bildschirms.
- Filter und Sortierung wandern von `localStorage` in Query-Parameter, damit ein Zustand teilbar ist. `localStorage` bleibt nur noch fuer den Startzustand ohne Parameter.
- `App.tsx` wird dabei entlastet: Daten werden pro Route geladen statt in einem gemeinsamen Zustandsbaum fuer alles.

**Risiko:** Das ist der groesste Umbau in Phase 3, weil `App.tsx` heute alle Dialoge, Ladezustaende und Listen haelt. Der Umbau erfolgt vor den neuen Ansichten, nicht parallel dazu.

#### P3.2 - Datenmodell fuer projektunabhaengige Eintraege (2 Tage)

Migration `V2` mit folgenden Schritten in fester Reihenfolge:

1. `project_id` auf `notes`, `code_snippets`, `ideas` und `todos` nullable machen und die Fremdschluessel auf `ON DELETE CASCADE` belassen.
2. Neue Spalten ergaenzen:
   - `source_url` auf `notes` und `ideas` als Freitext-URL, damit Links ohne eigene Entitaet erfassbar sind
   - `archived` und `archived_at` auf `notes`, `code_snippets` und `ideas`; `todos` nutzen weiterhin `completed`
   - `filed_at` auf allen vier Tabellen: Zeitpunkt der Zuordnung zu einem Projekt, `NULL` solange der Eintrag im Eingang liegt
3. `note_tags` und `snippet_tags` analog zu `idea_tags` und `todo_tags` anlegen.
4. Inhalte der Systemprojekte auf `project_id = NULL` setzen.
5. Die beiden Systemprojekte loeschen und die Spalte `is_system` entfernen.

**Ergebnis und Tests**

- Migration laeuft auf leerer und auf befuellter Datenbank sowie auf H2 und PostgreSQL.
- Ein Test mit Bestandsdaten belegt, dass jeder Eintrag aus einem Systembereich danach unveraendert im Eingang liegt.
- Ein Test belegt, dass Eintraege mit Projektbezug unveraendert bleiben.
- Das Loeschen eines Projekts loescht weiterhin dessen Inhalte, aber nie Eingangs-Eintraege.

**Bewusste Entscheidung:** Links werden nicht als eigene Entitaet modelliert. Ein erfasster Link ist eine Notiz oder Idee mit `source_url`. Eine eigene Bookmark-Entitaet lohnt erst, wenn Linksammlungen im Alltag tatsaechlich getrennt gepflegt werden.

#### P3.3 - Flache Inhalts-API und Zuordnung (2 Tage)

**Listen mit Filtern**

- `GET /api/notes`, `/api/snippets`, `/api/ideas`, `/api/todos`
- Parameter: `scope=all|inbox|project`, `projectId`, `tags`, `archived`, `completed`, `converted`, `sort`, `limit`, `offset`
- `scope=inbox` bedeutet `project_id IS NULL`

**Zuordnung und Umwandlung**

- `PATCH /api/notes/{id}/assignment` mit `projectId` oder `null`; analog fuer die anderen drei Typen
- `POST /api/inbox/{type}/{id}/promote` legt ein neues Projekt aus dem Eintrag an, uebernimmt Titel und Beschreibung und ordnet den Eintrag dem neuen Projekt zu
- `PATCH /api/notes/{id}/archive` mit `archived` als Boolean; analog fuer Snippets und Ideen

**Backend-Regeln**

- Eine Zuordnung setzt `filed_at`, eine Rueckgabe in den Eingang setzt sie auf `NULL`.
- Zuordnung an ein archiviertes Projekt ist erlaubt, wird aber im Ergebnis gekennzeichnet.
- Zuordnung an eine unbekannte Projekt-ID liefert `404`, Zuordnung an dasselbe Projekt ist idempotent.
- `promote` ist nicht idempotent und liefert bei einem bereits zugeordneten Eintrag `409`.
- Die verschachtelten Routen liefern unveraenderte Antworten.

**Tests**

- Integrationstests fuer alle vier Typen: erfassen, zuordnen, zurueck in den Eingang, archivieren
- Test, dass `promote` Projekt und Eintrag in einer Transaktion erzeugt und bei einem Fehler nichts zurueckbleibt
- Regressionstest fuer die bestehenden verschachtelten Routen

#### P3.4 - Schnellerfassung (2 Tage)

- `POST /api/inbox` mit `type` von `NOTE`, `IDEA`, `SNIPPET` oder `TODO`, `title`, `content`, optional `tags`, `sourceUrl`, `language`
- Nur `title` ist verpflichtend; alles andere darf leer bleiben, damit Erfassen nie an einem Pflichtfeld scheitert
- Frontend: globaler Erfassungsdialog, erreichbar ueber ein Tastenkuerzel und einen dauerhaften Knopf in der Kopfzeile
- Der Typ ist im Dialog umschaltbar, ohne dass eingegebener Text verloren geht
- Eine erkannte URL im Inhalt wird als `sourceUrl` vorgeschlagen, aber nicht erzwungen
- Nach dem Speichern bleibt der Dialog optional offen, um mehrere Gedanken hintereinander zu erfassen
- Ein fehlgeschlagenes Speichern behaelt die Eingaben vollstaendig

#### P3.5 - Eingangsansicht (2 Tage)

- Route `/inbox` listet alle Eintraege ohne Projekt, typuebergreifend und nach Erfassungszeitpunkt sortiert
- Filter nach Typ, Tag und Zustand; Umschalter fuer erledigte und archivierte Inhalte
- Pro Eintrag: bearbeiten, Projekt zuordnen, in ein Projekt umwandeln, archivieren, loeschen
- Zuordnung ueber eine Projektauswahl mit Suche; zuletzt genutzte Projekte stehen oben
- Mehrfachauswahl fuer die Zuordnung mehrerer Eintraege an dasselbe Projekt
- Der leere Zustand erklaert die Schnellerfassung, statt nur "Keine Eintraege" zu zeigen
- Ein zugeordneter Eintrag verschwindet sichtbar aus dem Eingang und ist ueber eine Rueckmeldung sofort wieder erreichbar

#### P3.6 - Zentrale Ideen- und Notizansichten (2 Tage)

- Die Routen `/notes` und `/ideas` zeigen projektbezogene und projektunabhaengige Eintraege gemeinsam
- Spalte oder Kennzeichnung fuer das zugehoerige Projekt beziehungsweise "Eingang"
- Filter nach Projekt, Tag, Zustand und Zeitraum; Sortierung nach Aktualisierung, Erstellung und Titel
- Archivierte und erledigte Inhalte sind standardmaessig ausgeblendet und ueber genau einen sichtbaren Umschalter einblendbar
- Die Zaehler in den Ansichten beziehen sich immer auf den aktiven Filter, nicht auf den Gesamtbestand

#### P3.7 - Abschluss Phase 3 (1-2 Tage)

- Der Projektarbeitsbereich verliert die Sonderbehandlung fuer Systembereiche vollstaendig
- Responsive Pruefung fuer Eingang, zentrale Ansichten und Erfassungsdialog
- Frontend-Tests fuer Erfassung, Zuordnung, Umwandlung und Zustandsfilter
- Backend-Gesamttest, Lint und Produktions-Build als Release-Gate

**Abnahme Phase 3**

1. Ein Gedanke laesst sich in hoechstens zwei Interaktionen erfassen, ohne vorher ein Projekt zu waehlen.
2. Ein Eingangs-Eintrag laesst sich einem Projekt zuordnen, wieder loesen und in ein neues Projekt umwandeln, ohne dass Inhalt oder Tags verloren gehen.
3. Die frueheren Systembereiche existieren nicht mehr, ihre Inhalte sind vollstaendig im Eingang vorhanden.
4. Zentrale Ideen- und Notizansichten zeigen projektbezogene und projektunabhaengige Eintraege zusammen und lassen erledigte sowie archivierte Inhalte gezielt aus.
5. Jede Ansicht hat eine eigene URL, die nach einem Neuladen denselben Zustand herstellt.
6. Alle Backend-Tests, Frontend-Tests, Lint und Produktions-Build laufen erfolgreich.

### Phase 4: Markdown-Notizen und Suche

#### P4.1 - Markdown-Grundlage (1-2 Tage)

- Eine gemeinsame Komponente rendert Markdown mit `react-markdown`, `remark-gfm`, `rehype-sanitize` und Syntaxhervorhebung fuer Codebloecke
- Unterstuetzt werden Ueberschriften, Listen, Checkboxen, Links, Tabellen, Zitate und Codebloecke mit Sprache
- Externe Links oeffnen in einem neuen Tab mit `rel="noreferrer"`; interne Dev-Hub-Links navigieren ohne Neuladen
- Die vorhandene README-Vorschau aus Phase 2 verwendet ab hier dieselbe Komponente
- Tests: das sanitisierte Rendern belegt, dass eingebettetes HTML und `javascript:`-Links nicht ausgefuehrt werden

#### P4.2 - Editor mit Vorschau und Speicherstatus (3 Tage)

Der bisherige Notizdialog wird durch eine eigene Editoransicht unter `/notes/:noteId` ersetzt. Der Dialog bleibt nur fuer das schnelle Anlegen bestehen.

- Zweispaltige Ansicht mit umschaltbarer Vorschau; auf schmalen Bildschirmen umschaltbar statt nebeneinander
- Kleine Werkzeugleiste fuer Ueberschrift, Fett, Liste, Checkbox, Link, Tabelle und Codeblock
- Automatisches Speichern nach kurzer Eingabepause und zusaetzlich beim Verlassen des Feldes
- Sichtbarer Speicherstatus mit den Zustaenden "Nicht gespeichert", "Speichert", "Gespeichert um ..." und "Fehler"
- Ein lokaler Entwurf im Browser sichert den Inhalt gegen Absturz oder Verbindungsverlust und wird beim erneuten Oeffnen zur Wiederherstellung angeboten
- Verlassen mit ungespeicherten Aenderungen fragt sowohl bei interner Navigation als auch beim Schliessen des Browsers nach
- Konfliktschutz: der Client sendet das bekannte `updatedAt` mit; ein abweichender Serverstand liefert `409`, und die Oberflaeche bietet Vergleich und Uebernahme an, ohne den eigenen Text zu verwerfen

**Tests**

- Automatisches Speichern loest genau einmal pro Eingabepause aus
- Ein fehlgeschlagenes Speichern behaelt den Text und zeigt den Fehlerzustand
- Ein Konflikt verwirft niemals den lokalen Text ohne ausdrueckliche Entscheidung

#### P4.3 - Snippets im Notiz-Workflow (2 Tage)

- Die Aktion "Snippet einfuegen" oeffnet eine Auswahl und fuegt den Code als Codeblock mit Sprache in die Notiz ein
- Die Aktion "Aus Auswahl ein Snippet erstellen" legt aus einem markierten Codeblock ein Snippet an und verknuepft es
- Zusaetzlich eine referenzierte Form: ein Platzhalter im Text wird beim Rendern aus dem aktuellen Snippet gefuellt
- Ein geloeschtes referenziertes Snippet erzeugt einen sichtbaren Hinweis im Rendering, aber keinen Fehler und keinen Textverlust
- Beide Formen bleiben nebeneinander gueltig: die eingefuegte Kopie ist stabil, die Referenz bleibt aktuell

#### P4.4 - Globale Suche im Backend (2-3 Tage)

- `GET /api/search` mit `q`, `types`, `projectId`, `tags`, `includeArchived`, `includeCompleted`, `limit` und `offset`
- Durchsucht Projekte inklusive Arbeitskontext, Notizen, Snippets, Ideen und Todos
- Ergebnis pro Treffer: Typ, ID, Titel, Projektbezug oder Eingang, Zeitstempel, Tags, ein kurzer Textausschnitt um die Fundstelle und die dauerhafte Adresse innerhalb von Dev Hub
- Rangfolge: Titeltreffer vor Inhaltstreffer, danach neuere Aktualisierung vor aelterer; die Regel ist in einem Test festgeschrieben
- Ein `SearchRepository`-Interface kapselt die Abfragen; die portable Implementierung nutzt `LOWER(...) LIKE`
- Leere oder zu kurze Suchbegriffe liefern `400` mit dem bestehenden Fehlerformat
- Indizes auf den haeufig gefilterten Spalten; ein Test mit mehreren tausend erzeugten Eintraegen belegt eine Antwortzeit im zweistelligen Millisekundenbereich

#### P4.5 - Suche im Frontend (2 Tage)

- Kommandoleiste ueber ein Tastenkuerzel, zusaetzlich die Route `/search` mit Suchbegriff und Filtern in der URL
- Ergebnisse nach Typ gruppiert, mit Tastaturnavigation und direktem Sprung zum Eintrag
- Filter fuer Typ, Projekt, Tag sowie erledigte und archivierte Inhalte, kombinierbar
- Sichtbare Zustaende fuer Laden, kein Ergebnis und Fehler; die Eingabe wird entprellt
- Der Suchbegriff wird im Ergebnis hervorgehoben

#### P4.6 - Dauerhafte Verknuepfungen zwischen Eintraegen (2 Tage)

Zu unterscheiden von den Routen aus P3.1: hier geht es um inhaltliche Verweise zwischen Eintraegen.

- Tabelle `entity_references` mit Quelltyp, Quell-ID, Zieltyp, Ziel-ID und Erstellungszeitpunkt
- Aktion "Mit Eintrag verknuepfen" mit Suche ueber alle Typen
- Verknuepfungen werden beim Zielobjekt als Rueckverweise angezeigt
- Aktion "Dauerhaften Link kopieren" an jedem Eintrag
- Ein geloeschtes Ziel entfernt die Verknuepfung, ohne den Quelltext zu veraendern
- Verknuepfungen ueberstehen Zuordnung, Umwandlung in ein Projekt und Archivierung unveraendert

#### P4.7 - Abschluss Phase 4 (1-2 Tage)

- Responsive Pruefung fuer Editor, Vorschau, Kommandoleiste und Suchergebnisse
- Frontend-Tests fuer Speicherstatus, Entwurfswiederherstellung, Snippet-Einfuegen und Suchfilter
- Backend-Gesamttest, Lint und Produktions-Build als Release-Gate
- Kurze Dokumentation der Suchgrenzen und des vorgesehenen Wechsels auf `tsvector`

**Abnahme Phase 4**

1. Eine Notiz mit Ueberschriften, Listen, Checkboxen, Tabelle und hervorgehobenem Codeblock laesst sich schreiben und korrekt anzeigen.
2. Der Speicherzustand ist jederzeit sichtbar; ein Verbindungsverlust oder ein versehentliches Verlassen fuehrt zu keinem Inhaltsverlust.
3. Ein Snippet laesst sich als Codeblock einfuegen und alternativ als lebende Referenz einbinden.
4. Ein Begriff aus einer Notiz, Idee, einem Todo, einem Snippet oder einem Projektkontext wird ueber die globale Suche in wenigen Sekunden wiedergefunden.
5. Jeder Eintrag hat eine dauerhafte Adresse, und Verweise zwischen Eintraegen sind in beide Richtungen sichtbar.
6. Alle Backend-Tests, Frontend-Tests, Lint und Produktions-Build laufen erfolgreich.

### Meilensteine und Aufwand

1. `M5 Fundament`: P3.0 bis P3.2; Testinfrastruktur, Routing und Datenmodell stehen
2. `M6 Nutzbarer Eingang`: P3.3 bis P3.7; Phase 3 im Alltag testen
3. `M7 Schreiben`: P4.1 bis P4.3; Notizen werden zum eigentlichen Arbeitsmittel
4. `M8 Wiederfinden`: P4.4 bis P4.7; Dev Hub ist ein durchsuchbarer Wissensspeicher

Bei einer einzelnen entwickelnden Person sind fuer Phase 3 etwa 12-14 und fuer Phase 4 etwa 13-16 konzentrierte Entwicklungstage realistisch.

**Groesste Unsicherheiten**

- Der Routing-Umbau beruehrt praktisch den gesamten Frontend-Zustand in `App.tsx`.
- Die Migration auf ein nullable `project_id` beruehrt alle Inhaltstypen gleichzeitig und muss auf befuellten Daten geprueft werden, bevor sie produktiv laeuft.
- Automatisches Speichern mit Konfliktschutz ist erfahrungsgemaess aufwendiger als der Editor selbst.
- Die portable Suche ist bewusst einfach; wenn sie sich im Alltag als zu ungenau erweist, faellt der Wechsel auf `tsvector` frueher an als geplant.

## Konkreter Implementierungsplan fuer geteilte Projekte

### Ausgangslage

- Seit `V6__multi_user.sql` ist Dev Hub mehrbenutzerfaehig, aber strikt isoliert. Jede Abfrage filtert auf `owner_id = CurrentUser.id()`.
- Inhaltstabellen haengen ueber den Fremdschluessel `(project_id, owner_id) -> projects(id, owner_id)` am Projekt. Ein Inhalt muss also immer dem Owner des Projekts gehoeren.
- `app_users` enthaelt nur Nutzer, die sich mindestens einmal angemeldet haben. Ein weiteres Nutzerverzeichnis gibt es nicht.
- Hintergrundarbeit wie der Repository-Auto-Sync laeuft ueber `CurrentUser.runAs(ownerId, ...)` mit dem Git-Token des Owners.

### Rollen und Rechte

| Aktion | VIEWER | EDITOR | OWNER |
|---|:-:|:-:|:-:|
| Projekt, Arbeitskontext, Inhalte, Repository-Metadaten und Verknuepfungen lesen; Projekt in Dashboard und Suche | ja | ja | ja |
| Eigenen Favoriten setzen | ja | ja | ja |
| Projekt verlassen | ja | ja | - |
| Notizen, Snippets, Ideen und Todos anlegen, bearbeiten, loeschen; Todos abschliessen; Idee in Todo umwandeln | - | ja | ja |
| Arbeitskontext pflegen | - | ja | ja |
| Tags und Verknuepfungen an Projektinhalten setzen | - | ja | ja |
| Eigene Eingangs-Eintraege dem Projekt zuordnen | - | ja | ja |
| Idee aus dem Projekt in ein eigenes neues Projekt umwandeln | - | ja | ja |
| Stammdaten aendern: Name, Beschreibung, Links, Status, Prioritaet | - | - | ja |
| Inhalte aus dem Projekt herausloesen | - | - | ja |
| Repository verbinden und Aktualisierung ausloesen | - | - | ja |
| Mitglieder verwalten | - | - | ja |
| Archivieren, wiederherstellen, loeschen | - | - | ja |

### Getroffene Entscheidungen

- **Zwei Rollen.** `VIEWER` und `EDITOR` reichen. Eine Zwischenrolle fuer Stammdaten oder Mitgliederverwaltung kommt nur bei konkretem Bedarf.
- **Stammdaten bleiben beim Owner.** Auch ein `EDITOR` aendert weder Name, Beschreibung, Links, Status noch Prioritaet.
- **Favoriten sind persoenlich.** `favorite` wandert aus `projects` in eine Tabelle pro Nutzer und Projekt.
- **Nutzer werden exakt gesucht.** Ein Mitglied wird ueber den exakten Username oder die E-Mail aus `app_users` gefunden. Es gibt keine Liste und keine Teiltreffer, damit keine Nutzer aufgezaehlt werden koennen. Nur wer sich schon einmal angemeldet hat, kann hinzugefuegt werden.
- **Repository-Aktualisierung nur durch den Owner.** Ausloesen darf sie nur der Owner, zusaetzlich laeuft der Auto-Sync wie bisher mit dem Token des Owners. Mitglieder sehen den zwischengespeicherten Stand. Ein Mitglied loest nie eine Anfrage mit dem Token eines anderen Nutzers aus.
- **Verknuepfungen ueber Nutzergrenzen sind erlaubt.** Sie werden nur angezeigt, wenn der Betrachter beide Enden sehen darf.
- **Idee in eigenes Projekt umwandeln.** Ein `EDITOR` darf aus einer Idee eines geteilten Projekts ein eigenes Projekt anlegen. Das neue Projekt gehoert ihm. Die Idee bleibt im geteilten Projekt und wird mit dem neuen Projekt verknuepft, weil nur der Owner Inhalte herausloesen darf.
- **Herausloesen nur durch den Owner.** Ein aus einem geteilten Projekt geloester Eintrag landet im Eingang des Owners.

### Technische Leitlinien

- **`owner_id` bedeutet Datenbesitz.** Inhalte eines Projekts gehoeren immer dem Projekt-Owner, damit der bestehende zusammengesetzte Fremdschluessel gueltig bleibt. Wer einen Eintrag verfasst hat, steht in einer neuen Spalte `created_by`.
- **Kein `runAs(owner)` fuer Nutzeraktionen.** Sonst gingen der Verfasser und die Trennung der Git-Tokens verloren. Repositories erhalten den Datenbesitzer als expliziten Parameter, `CurrentUser.id()` bleibt immer der handelnde Nutzer.
- **Eine zentrale Rechtepruefung.** `ProjectAccessService.require(projectId, Permission)` liefert Owner und Rolle oder bricht ab. Kein Controller prueft Rollen selbst.
- **Keine Existenzhinweise.** Nicht-Mitglieder erhalten `404`, Mitglieder ohne ausreichende Rolle `403`.
- **Der Owner steht nicht in `project_members`.** `projects.owner_id` bleibt die einzige Quelle fuer die Eigentuemerschaft.
- **Tags im Namensraum des Owners.** Inhalte eines geteilten Projekts verwenden die Tags des Projekt-Owners. Tag-Vorschlaege im Projekt kommen aus diesem Namensraum.
- **Eingang bleibt privat.** Eintraege ohne Projekt sieht weiterhin nur ihr Besitzer.

### S1 - Datenmodell

Migration `V7`:

1. Tabelle `project_members` mit `project_id`, `user_id`, `role`, `added_by` und `created_at`
   - Primaerschluessel `(project_id, user_id)`
   - Fremdschluessel auf `projects` mit `ON DELETE CASCADE`
   - Index auf `user_id` fuer "mit mir geteilt"
2. Tabelle `project_user_settings` mit `project_id`, `user_id` und `favorite`; bestehende Favoriten werden fuer den jeweiligen Owner uebernommen, danach entfaellt `projects.favorite`
3. Spalte `created_by` auf `notes`, `code_snippets`, `ideas` und `todos`, befuellt mit dem bisherigen `owner_id`
4. Spalten `display_name` und `email` auf `app_users`, gepflegt beim Login aus den Token-Claims

**Tests:** Die Migration laeuft auf leerer und befuellter Datenbank sowie auf H2 und PostgreSQL. Bestehende Favoriten und Inhalte bleiben unveraendert.

### S2 - Zugriffsschicht

- Enum `ProjectRole` mit `VIEWER` und `EDITOR`
- Enum `Permission` mit `READ`, `WRITE_CONTENT`, `EDIT_CONTEXT`, `EDIT_METADATA`, `MANAGE_MEMBERS`, `MANAGE_REPOSITORY`, `ARCHIVE`, `DELETE`, `DETACH_CONTENT` und fester Zuordnung zu den Rollen
- `ProjectAccessService.require(...)` liefert `ProjectAccess(ownerId, role)`
- `ProjectRepository` liefert eigene und geteilte Projekte mit `role`, `ownerName`, `shared` und persoenlichem `favorite`
- Die projektbezogenen Repositories erhalten den Datenbesitzer als Parameter; Anlegen setzt `created_by = CurrentUser.id()`
- Alle Routen unter `/api/projects/{projectId}/**` pruefen ueber `require(...)`
- `PATCH /api/projects/{id}/organization` bleibt fuer Status und Prioritaet dem Owner vorbehalten; der Favorit bekommt einen eigenen Endpunkt, den jedes Mitglied nutzen darf

**Tests:** Eine parametrisierte Rechtematrix Rolle mal Endpunkt mal erwarteter Status, aufbauend auf `MultiUserHttpTests` mit drei Nutzern.

### S3 - Mitglieder-API und Nutzersuche

- `GET /api/users/lookup?query=` liefert genau einen Treffer ueber exakten Username oder exakte E-Mail oder `404`
- `GET /api/projects/{id}/members` fuer alle Mitglieder lesbar
- `POST /api/projects/{id}/members` mit `userId` und `role`, nur Owner
- `PATCH /api/projects/{id}/members/{userId}` aendert die Rolle, nur Owner
- `DELETE /api/projects/{id}/members/{userId}` entfernt ein Mitglied, nur Owner
- `DELETE /api/projects/{id}/members/me` zum Verlassen
- Regeln: sich selbst oder den Owner hinzufuegen liefert `400`, ein bereits vorhandenes Mitglied `409`

**Tests:** Ein entferntes Mitglied verliert sofort jeden Zugriff; seine bisher erstellten Inhalte bleiben im Projekt.

### S4 - Querschnitt

- **Suche:** `owner_id = ?` wird ersetzt durch "Eintrag im eigenen Eingang oder Projekt ist zugaenglich".
- **Zentrale Listen:** `GlobalContentRepository` zeigt Inhalte aus geteilten Projekten, Eingangs-Eintraege weiterhin nur dem Besitzer.
- **Zuordnung:** Ein `EDITOR` ordnet eigene Eingangs-Eintraege einem geteilten Projekt zu; `owner_id` wechselt dabei auf den Projekt-Owner, `created_by` bleibt. Herausloesen erfordert `DETACH_CONTENT` und legt den Eintrag in den Eingang des Owners.
- **Idee umwandeln:** `promote` fuer Ideen aus geteilten Projekten legt ein Projekt des Aufrufers an, kopiert Titel und Beschreibung und verknuepft beide, ohne die Idee zu verschieben.
- **Tags:** Tag-Endpunkte im Projektkontext liefern die Tags des Projekt-Owners.
- **Verknuepfungen:** Rueckverweise werden nach Sichtbarkeit beider Enden gefiltert.
- **Repository:** Lesen fuer alle Mitglieder, Aktualisieren und Verbinden nur fuer den Owner. Der Auto-Sync bleibt unveraendert.

**Tests:** Die Suche liefert Nicht-Mitgliedern keine Treffer aus fremden Projekten; eine Verknuepfung auf ein nicht sichtbares Ziel erscheint nicht.

### S5 - Frontend

- Typen `ProjectRole` und `ProjectMember`; `Project` erhaelt `role`, `ownerName` und `shared`
- Seitenleiste und Dashboard kennzeichnen geteilte Projekte und zeigen einen Bereich "Mit mir geteilt"
- Dialog fuer Mitglieder: Nutzer ueber exakten Username oder E-Mail suchen, Rolle waehlen, Rolle aendern, entfernen; nur fuer den Owner bearbeitbar
- Aktion "Projekt verlassen" fuer Mitglieder
- Aktionen richten sich nach der Rolle: `VIEWER` sehen keine Bearbeitungsaktionen, `EDITOR` keine Stammdaten-, Archiv-, Repository- und Mitgliederaktionen; die Kommandoleiste filtert entsprechend
- Bei Eintraegen wird der Verfasser angezeigt
- Eine `403` auf Projektebene zeigt eine eigene Meldung statt des Hinweises auf die fehlende Keycloak-Rolle

**Tests:** Rollenabhaengige Sichtbarkeit von Aktionen, Mitglieder-Dialog und Verlassen.

### S6 - Abschluss

- Backend-Gesamttest, Frontend-Tests, Lint und Produktions-Build als Release-Gate
- Migration gegen einen PostgreSQL-Container mit Bestandsdaten pruefen
- Kurze Dokumentation des Rollenmodells im README

**Abnahme geteilte Projekte**

1. Ein Owner teilt ein Projekt ueber den exakten Username eines zweiten Nutzers und vergibt eine Rolle.
2. Ein `VIEWER` sieht alle Projektinhalte, jeder Schreibversuch liefert `403`.
3. Ein `EDITOR` pflegt Inhalte und Arbeitskontext, kann aber weder Stammdaten aendern noch archivieren, loeschen, das Repository aktualisieren oder Mitglieder verwalten.
4. Ein Nicht-Mitglied erhaelt auf alle Projektrouten `404` und findet in der Suche nichts aus dem Projekt.
5. Favoriten eines Mitglieds beeinflussen die Ansicht anderer Nutzer nicht.
6. Nach dem Entfernen eines Mitglieds bleiben dessen Inhalte im Projekt, der Zugriff endet sofort.
7. Alle Backend-Tests, Frontend-Tests, Lint und Produktions-Build laufen erfolgreich.

**Groesste Unsicherheiten**

- Die Umstellung aller projektbezogenen Repositories auf einen expliziten Datenbesitzer beruehrt jede Inhaltsabfrage. Die Rechtematrix-Tests muessen vor dem Umbau stehen.
- Tags im Namensraum des Owners koennen fuer `EDITOR` ueberraschend sein, wenn sie eigene gleichnamige Tags haben.
- Die exakte Nutzersuche setzt voraus, dass sich das neue Mitglied bereits einmal angemeldet hat.

## Bewusst nicht im ersten Umfang

- Team- und Organisationsverwaltung sowie Rollen ueber `VIEWER` und `EDITOR` pro Projekt hinaus
- Einladungen per Link oder E-Mail, Owner-Wechsel und Benachrichtigungen fuer geteilte Projekte
- Sprints, Story Points und umfangreiche Kanban-Prozesse
- Zeiterfassung
- Automatische KI-Priorisierung ohne nachvollziehbare Grundlage
- Beliebige Dateianhaenge und Medienverwaltung
- Automatisch wandernde Zeilenreferenzen ueber alle Codeaenderungen hinweg
- Mehrere Repositories pro Projekt
- Mobile native Apps

Diese Punkte werden nur aufgenommen, wenn die Nutzung des Produktkerns einen konkreten Bedarf zeigt.

## Empfohlener erster Meilenstein

Der erste sinnvoll nutzbare Meilenstein umfasst Phase 0 bis Phase 2. Er kombiniert den vorhandenen Funktionsumfang mit Projektstatus, Priorisierung, Arbeitskontext und echter Git-Aktivitaet. Danach sollte Dev Hub fuer einige Wochen im Alltag verwendet werden. Die dabei beobachteten Reibungspunkte bestimmen die Detailplanung fuer Inbox, Editor und Codenotizen.

Die Remote-Agent-Funktionen beginnen bewusst erst nach einem stabilen, regelmaessig genutzten lokalen Kern. So bleibt Dev Hub zuerst ein hilfreiches Werkzeug und wird nicht hauptsaechlich Infrastruktur fuer seine eigene Entwicklung.