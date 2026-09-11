# Konzept: Private Repositories und Organisationen anbinden

Ergaenzung zu `PRODUCT_ROADMAP.md`, Abschnitt 2 (Repository-Anbindung). Gehoert zwischen Phase 2 und Phase 8.

**Stand: G1, G2 und G3 sind umgesetzt.** Abweichungen von diesem Konzept sind am Ende unter "Umsetzung" festgehalten.

## Problem

Die aktuelle Integration liest Repository-Metadaten anonym. `GitHubRepositoryMetadataProvider` und `GitLabRepositoryMetadataProvider` bauen ihren `RestClient` ohne `Authorization`-Header. Damit gilt:

- Private Repositories liefern `404` und landen im Status `PRIVATE_OR_NOT_FOUND`.
- Repositories in Organisationen sind genauso wenig erreichbar, wenn sie nicht public sind.
- Das anonyme GitHub-Rate-Limit liegt bei 60 Anfragen pro Stunde und IP. Ein `refresh` verbraucht bis zu vier davon.
- Ein Projekt wird angelegt, indem die URL von Hand eingetippt wird. Es gibt keine Liste, aus der man auswaehlen koennte.

Genau der Fall "vibe coded stuff, deshalb privat" ist also heute der Fall, der nicht funktioniert.

## Ziel

Zwei Dinge, die zusammengehoeren:

1. **Authentifizierter Zugriff** auf private Repositories und auf Repositories der eigenen Organisationen.
2. **Repository-Auswahl statt URL-Eingabe**: beim Anlegen oder Verbinden eines Projekts wird aus den eigenen Repositories gewaehlt.

## Grundentscheidung: Personal Access Token zuerst

Dev Hub ist self-hosted und einbenutzerlich. Ein OAuth-Flow oder eine GitHub App braucht eine registrierte Anwendung, eine erreichbare Callback-URL und Token-Refresh. Das ist fuer den aktuellen Stand zu viel.

Der Einstieg ist deshalb ein **Personal Access Token pro Provider**, das der Benutzer in den Einstellungen hinterlegt. Eine GitHub App bleibt als spaetere Option offen, wird aber erst relevant, wenn Remote-Workspaces (Roadmap Abschnitt 10) Schreibzugriff brauchen.

Empfohlene Scopes:

| Provider | Token-Typ | Scope | Deckt ab |
| --- | --- | --- | --- |
| GitHub | Classic PAT | `repo`, `read:org` | Eigene private Repos und Org-Repos |
| GitHub | Fine-grained PAT | `Contents: Read`, `Metadata: Read` | Nur explizit freigegebene Repos |
| GitLab | Personal Access Token | `read_api`, `read_repository` | Eigene und Gruppen-Projekte |

Zwei Fallstricke gehoeren in die UI, nicht in eine Dokumentationsseite: ein fine-grained PAT muss pro Organisation von einem Org-Owner freigegeben werden, und bei Organisationen mit SAML Single Sign-on muss ein classic PAT zusaetzlich fuer die Organisation autorisiert werden. Beides fuehrt sonst zu leeren Listen ohne erkennbaren Fehler.

## Datenmodell

Neue Tabelle `git_credential`, eine Zeile pro Provider.

- `provider`: `GITHUB` oder `GITLAB`, eindeutig
- `label`: freier Name, etwa "Privat" oder "Arbeit"
- `host`: Standard `github.com` bzw. `gitlab.com`, vorbereitet auf self-hosted GitLab
- `token_encrypted`: verschluesselter Tokenwert
- `token_hint`: die letzten vier Zeichen, nur fuer die Anzeige
- `account_login`: beim Speichern ermittelter Benutzername
- `scopes`: beim Speichern ermittelte Scopes als Text
- `created_at`, `last_verified_at`, `last_error`

Der Token wird mit AES-GCM verschluesselt abgelegt. Der Schluessel kommt aus `DEVHUB_ENCRYPTION_KEY` als Base64 und wird in `.env.example` dokumentiert. Fehlt die Variable, startet die Anwendung weiterhin, aber das Anlegen von Credentials wird mit einer klaren Meldung abgelehnt. So bleiben bestehende Installationen lauffaehig.

Der Klartext-Token verlaesst das Backend nie. Die API liefert ausschliesslich `label`, `host`, `accountLogin`, `scopes`, `tokenHint` und den Verifikationsstatus.

## Backend

### Auth in die Provider einziehen

Heute setzt der Konstruktor alle Header fest. Der Token ist aber veraenderlich und pro Anfrage verschieden, sobald mehrere Hosts moeglich sind. Deshalb:

- `RepositoryMetadataProvider.fetch` erhaelt einen zweiten Parameter `RepositoryCredential`, der auch `null` sein darf.
- Die Provider setzen den Header pro Anfrage: GitHub `Authorization: Bearer <token>`, GitLab `PRIVATE-TOKEN: <token>`.
- Ohne Credential bleibt das bisherige anonyme Verhalten erhalten. Public Repositories funktionieren also unveraendert weiter.

`RepositoryMetadataService.refresh` laedt das passende Credential ueber den Provider der `RepositoryReference` und reicht es durch.

### Fehlerbilder schaerfen

`statusFor` wirft heute `401`, `403` und `404` in denselben Topf. Mit Token sind das drei verschiedene Ursachen, und der Unterschied ist genau das, was der Benutzer wissen muss:

- `401`: Token ungueltig oder abgelaufen. Neuer Status `CREDENTIAL_INVALID`.
- `403` mit aufgebrauchtem Rate-Limit: `RATE_LIMITED`, mit dem Zeitpunkt aus dem `x-ratelimit-reset`-Header in der Meldung.
- `403` sonst: Token hat den Scope nicht oder ist nicht fuer die Organisation autorisiert. Neuer Status `CREDENTIAL_INSUFFICIENT`.
- `404` mit gueltigem Token: Repository existiert nicht oder der Account hat keinen Zugriff. Bleibt `PRIVATE_OR_NOT_FOUND`.
- `404` ohne hinterlegten Token: Meldung weist aktiv darauf hin, dass ein Token fehlt, und verlinkt die Einstellungen.

Die letzte Zeile ist der eigentliche Gewinn im Alltag. Statt "private or not found" steht dort, was zu tun ist.

### Neue Endpunkte

Credential-Verwaltung:

- `GET /api/git-credentials` listet hinterlegte Credentials ohne Tokenwerte
- `PUT /api/git-credentials/{provider}` speichert oder ersetzt einen Token, verifiziert ihn sofort und schreibt `accountLogin` und `scopes`
- `DELETE /api/git-credentials/{provider}` entfernt ihn
- `POST /api/git-credentials/{provider}/verify` prueft erneut

Verifiziert wird mit einem einzigen Aufruf gegen `/user`. Bei GitHub liefert der Antwort-Header `x-oauth-scopes` die tatsaechlichen Scopes eines classic PAT, damit fehlende Berechtigungen sofort beim Speichern auffallen statt erst beim ersten Sync.

Repository-Discovery:

- `GET /api/git-repositories?provider=GITHUB&query=&owner=` liefert die auswaehlbaren Repositories
- `GET /api/git-repositories/owners?provider=GITHUB` liefert den eigenen Account und die Organisationen als Filter

Fuer GitHub genuegt `GET /user/repos` mit `visibility=all`, `affiliation=owner,organization_member`, `sort=pushed` und `per_page=100`. Das deckt private Repos und Org-Repos in einem Aufruf ab. Die Organisationsliste kommt aus `GET /user/orgs`. Fuer GitLab ist es `GET /projects` mit `membership=true`, `min_access_level=20` und `order_by=last_activity_at`, die Gruppen kommen aus `GET /groups?min_access_level=20`.

Jeder Eintrag enthaelt `fullName`, `description`, `private`, `defaultBranch`, `lastActivityAt`, `language`, `webUrl` und `cloneUrl`. Das Ergebnis wird pro Provider kurz zwischengespeichert, damit das Tippen im Suchfeld nicht jedes Mal die API trifft. Fuenf Minuten reichen.

## Frontend

**Einstellungen.** Ein neuer Bereich "Git-Zugaenge" mit einer Karte pro Provider: Status, verbundener Account, Scopes, Token-Hinweis, letzte Pruefung. Dazu ein Feld zum Eintragen eines Tokens und ein Link auf die Seite, auf der man ihn erzeugt, mit den passenden Scopes bereits vorausgewaehlt.

**Repository-Auswahl.** Im Projektformular ersetzt ein Picker das freie URL-Feld. Suchfeld, Filter nach Account oder Organisation, Liste sortiert nach letzter Aktivitaet, private Repositories mit Schloss-Symbol. Die manuelle URL-Eingabe bleibt als Ausweichweg erhalten, fuer generische Git-Hosts und fuer den Fall, dass kein Token hinterlegt ist.

**RepositoryPanel.** Die neuen Status brauchen Labels und Farben in `statusLabels` und `statusColors`. Bei `CREDENTIAL_INVALID` und `CREDENTIAL_INSUFFICIENT` zeigt das Panel zusaetzlich einen direkten Link in die Einstellungen.

## Sicherheit

Diese Punkte gehoeren in die Umsetzung, nicht in ein spaeteres Haertungs-Ticket:

- Der Token wird nie an das Frontend zurueckgegeben, auch nicht maskiert ueber die volle Laenge.
- Kein Token in Logs. Beim Loggen von `RestClientResponseException` wird der Request-Header ausgeblendet.
- Kein Token in URLs oder Query-Parametern.
- Der Verschluesselungsschluessel steht nur in der Umgebung, nie in der Datenbank und nie im Repository.
- `.env.example` bekommt `DEVHUB_ENCRYPTION_KEY` mit einem Hinweis, wie man ihn erzeugt.
- Ein Backup der Datenbank ohne den Schluessel ist wertlos fuer Angreifer, aber auch fuer den Benutzer. Das gehoert in die Backup-Dokumentation aus Roadmap Abschnitt 9.

## Umsetzung in Etappen

**G1: Token speichern und verwenden, ohne Discovery.** Migration `V4`, Verschluesselung, Credential-API, Provider-Signatur um das Credential erweitern, neue Fehlerstatus, Einstellungsseite. Ergebnis: ein von Hand eingetragenes privates Repository synchronisiert. Schaetzung 2 bis 3 Tage.

**G2: Repository-Discovery.** Listen-Endpunkte, Owner-Filter, Zwischenspeicher, Picker im Projektformular. Ergebnis: Projekte werden per Auswahl statt per Copy-Paste angelegt. Schaetzung 2 Tage.

**G3: Feinschliff.** Rate-Limit-Restkontingent im Panel anzeigen, Discovery-Ergebnis fuer den Import mehrerer Projekte auf einmal nutzen, ETag-basiertes bedingtes Nachladen, damit unveraenderte Repositories kein Kontingent kosten. Schaetzung 1 bis 2 Tage.

G1 ist unabhaengig nutzbar und loest das eigentliche Problem. G2 ist Komfort, macht aber den Unterschied zwischen "funktioniert" und "macht Spass".

## Umsetzung

Drei Abweichungen vom Konzept, jeweils mit Grund:

- **Der Host wird abgeleitet, nicht eingegeben.** Er kommt aus der konfigurierten Basis-URL des Providers, weil ein frei eingetippter Host heute nichts steuern wuerde. Bei GitHub wird das fuehrende `api.` entfernt, damit dort `github.com` steht.
- **Die Organisationsliste wird aus der Repository-Liste berechnet.** Ein eigener Aufruf gegen `/user/orgs` waere ein zusaetzlicher Request fuer eine Liste, die sonst nicht zur Auswahl passt. So stimmen die Anzahlen pro Konto immer mit dem ueberein, was tatsaechlich sichtbar ist.
- **Der bedingte Abruf haengt an der Repository-Ressource.** Ein Push aktualisiert `pushed_at`, also aendert sich deren ETag bei jeder Aenderung. Antwortet der Provider mit `304`, bleiben Commit, Sprachen und README ungelesen und die zwischengespeicherten Daten unveraendert gueltig.

Der Import akzeptiert ausschliesslich Repositories, die in der Liste des hinterlegten Tokens stehen. Ein manipulierter Request kann damit keine Projekte aus beliebigen Namen erzeugen.

## Bewusst nicht enthalten

- OAuth- oder GitHub-App-Flow, solange nur gelesen wird
- Mehrere Accounts pro Provider gleichzeitig; das Modell ist dafuer vorbereitet, die UI bleibt zunaechst bei einem
- Schreibzugriffe, Klonen oder SSH-Keys; das gehoert zu Remote-Workspaces
- Automatische Hintergrund-Synchronisation; `refresh` bleibt vorerst manuell
