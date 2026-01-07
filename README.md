# Bewerber Test 2026

Dieses Projekt dient als technischer Bewerbertest und besteht aus einem **Backend (Node.js + Express)**, einer **MongoDB-Datenbank** sowie einem **Frontend (Vue 3 + Vite)**.  
Alle Services werden lokal über **Docker** betrieben.

---

## Aufgabe
Erstelle eine Webapp in der folgende Funktionalitäten bereitgestellt werden:
- Import der Userdaten aus der CSV in die Datenbank
- Anzeige der Userdaten tabellarisch auf einer Webseite.
- User anlegen und anpassen können
- User blockieren und freischalten können
- In der Tabelle nach verschiedenen Attributen sortieren und filtern können
- Nutze für die Darstellung Vuetify

In der Präsentation:
- Vorstellung der App
- Erklärung des Codes

Wichtige Fragen:
- Was würdest du an der Struktur vereinfachen?
- Was sollte man ändern, wenn der Code in eine Produktivumgebung deployed wird? 

---

## Voraussetzungen

Bitte stelle sicher, dass folgende Tools installiert sind:

- Node.js
- npm
- Docker
- Docker Compose

---

## Installation & Start

### Backend

```bash
cd Backend
npm install
docker compose up --build
```

Das Backend läuft anschließend unter:

http://localhost:4001

---

### Datenbank

Die MongoDB läuft in einem Docker-Container.  
Die Datenbank kann initialisiert bzw. zurückgesetzt werden.

```bash
chmod +x initiateDB.sh
./initiateDB.sh
```

Hinweis: MongoDB ist im Entwicklungsmodus **ohne Authentifizierung** konfiguriert.

---

### Frontend

```bash
cd Frontend
npm install
docker compose up --build
```

Das Frontend ist danach erreichbar unter:

http://localhost:5001

---

## Projektstruktur (Übersicht)

```bash
Bewerbertest2026
├── Backend
│ ├── app
│ ├── Database
│ ├── docker-compose.yml
│ ├── Dockerfile.dev
│ ├── index.js
│ └── package.json
│
├── Frontend
│ ├── app
│ ├── docker-compose.yml
│ └── Dockerfile.dev
│
├── user.csv
└── README.md
```

---

## Hinweise

- Backend und Frontend laufen in getrennten Docker-Containern
- Hot Reload ist für beide Services aktiviert
- Die API ist über Docker-internes Networking mit MongoDB verbunden


Viel Erfolg beim Bewerbertest 🚀