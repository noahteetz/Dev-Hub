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
- Laufende Prozesse, Status und Ressourcenverbrauch anzeigen
- Aenderungen pruefen, committen und pushen
- Workspace bewusst beenden
- Repository und temporaere Daten nach erfolgreichem Abschluss entfernen
- Vor dem Loeschen vor uncommitteten oder nicht gepushten Aenderungen warnen
- Verwaiste Sitzungen nach einer konfigurierbaren Frist bereinigen

Erforderliche technische Leitplanken:

- Prozess- oder Container-Isolation
- Authentifizierung und Autorisierung
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

Der synchrone Abruf ist fuer den ersten Meilenstein ausreichend und vereinfacht Fehlerbehandlung und Betrieb. Timeouts begrenzen die Wartezeit. Regelmaessige Hintergrundaktualisierung folgt erst nach beobachtetem Bedarf.

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

## Bewusst nicht im ersten Umfang

- Team-, Rollen- und Organisationsverwaltung
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