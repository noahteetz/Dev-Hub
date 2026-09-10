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