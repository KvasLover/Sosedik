# Sosedik App - Web Application for Neighbors

Веб-приложение для организации взаимодействия жителей многоквартирных домов.

## Setup

### Prerequisites
- Node.js and npm
- PostgreSQL 18+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure PostgreSQL connection in `.env`:
```
DATABASE_URL=postgresql://postgres:f@localhost:5432/sosedik_db
JWT_SECRET=your_secret_key
PORT=3000
```

3. Start server:
```bash
npm start
```

Server runs on http://localhost:3000

## API Endpoints

### Health Check
- `GET /api/health` - Check database connection

### Authentication
- `POST /api/auth/register` - Register new user
  - Body: `{ "phone": "+375XXXXXXXXX", "password": "password" }`
  - Returns: `{ user, token }`

- `POST /api/auth/login` - Login user
  - Body: `{ "phone": "+375XXXXXXXXX", "password": "password" }`
  - Returns: `{ token, user }`

### Ads (Объявления)
- `GET /api/ads` - Get all active ads (public)
  - Query params: `?category=...&type=offer|request`

- `GET /api/ads/:id` - Get ad by ID

- `POST /api/ads` - Create new ad (level 1+)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "type": "offer|request", "category": "...", "title": "...", "description": "...", urgency: false, location: "..." }`

- `PUT /api/ads/:id` - Update ad (owner only)
  - Headers: `Authorization: Bearer <token>`

- `DELETE /api/ads/:id` - Delete/archive ad (owner only)
  - Headers: `Authorization: Bearer <token>`

### Users
- `GET /api/users/me` - Get current user profile
  - Headers: `Authorization: Bearer <token>`

- `PUT /api/users/me` - Update user profile
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "name": "...", "apartment": "..." }`

- `GET /api/users/:id` - Get public user profile

- `POST /api/users/:id/points` - Add points to user (admin only)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "points": 100 }`

## User Levels
- 0: Guest - View anonymous statistics
- 1: Registered - Create ads with limits
- 2: Verified - Full access, verified with utility bill
- 3: Moderator - Can moderate ads and disputes
- 4: Admin - Full control

## Database Schema
- `users` - User accounts with levels
- `ads` - Ads/announcements
- `rentals` - Item rentals
- `rental_requests` - Rental requests with checklists
- `moderation` - Disputes and moderation
- `messages` - Chat messages between users

## Development

Run with nodemon (auto-reload):
```bash
npm run dev
```

## Next Steps
- [ ] SMS verification for phone numbers
- [ ] Chat system implementation
- [ ] Rental module
- [ ] Moderation system
- [ ] Points and rewards system
- [ ] Frontend UI
- [ ] Tests
- [ ] Deployment