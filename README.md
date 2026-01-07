# Bewerber Test 2026

Dieses Projekt dient als technischer Bewerbertest und besteht aus einem **Backend (Node.js + Express)**, einer **MongoDB-Datenbank** sowie einem **Frontend (Vue 3 + Vite)**.  
Alle Services werden lokal über **Docker** betrieben.

---

## Voraussetzungen

Bitte stelle sicher, dass folgende Tools installiert sind:

- Node.js (>= 18, empfohlen 20)
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
Optional kann die Datenbank initialisiert bzw. zurückgesetzt werden.

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

Bewerbertest2026
├── Backend
│   ├── app
│   ├── Database
│   ├── docker-compose.yml
│   ├── Dockerfile.dev
│   ├── index.js
│   └── package.json
│
├── Frontend
│   ├── app
│   ├── docker-compose.yml
│   └── Dockerfile.dev
│
├── user.csv
└── README.md

---

## Hinweise

- Backend und Frontend laufen in getrennten Docker-Containern
- Hot Reload ist für beide Services aktiviert
- Die API ist über Docker-internes Networking mit MongoDB verbunden
- CSV-Dateien können für Import-Funktionalitäten verwendet werden

---

Viel Erfolg beim Bewerbertest 🚀