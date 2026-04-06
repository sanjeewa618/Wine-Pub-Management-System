# Wine-Pub-Management-System

Monorepo structure:

- `frontend/src` - React + Vite frontend
- `backend` - Express + MongoDB API

## Run Frontend

```bash
cd frontend/src
npm install
npm run dev
```

## Run Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

## MongoDB

Use a local MongoDB instance or a MongoDB Atlas connection string in `backend/.env`.

## Seed Data

```bash
cd backend
npm run seed
```