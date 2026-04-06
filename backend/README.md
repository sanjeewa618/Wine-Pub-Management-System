# Wine Pub Backend

Express + MongoDB backend for the Wine Pub Management System.

## Features

- JWT auth with roles: customer, seller, admin
- Wine and bites catalog endpoints
- Cart, checkout, reservations, orders, payments
- Admin analytics and management queues
- MongoDB seed script with demo data

## Setup

1. Copy `.env.example` to `.env`
2. Set `MONGODB_URI` to your MongoDB connection string
3. Run `npm install`
4. Start the API with `npm run dev`
5. Seed demo data with `npm run seed`

## Main Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/wines`
- `GET /api/bites`
- `GET /api/cart`
- `POST /api/reservations`
- `POST /api/orders`
- `POST /api/payments/process`
- `GET /api/admin/analytics`
