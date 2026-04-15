-- PostgreSQL schema for Sosedik app

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  level INTEGER DEFAULT 0, -- 0: guest, 1: registered, 2: verified, 3: moderator, 4: admin
  name VARCHAR(100),
  apartment VARCHAR(50),
  show_apartment BOOLEAN DEFAULT FALSE,
  verification_photo TEXT, -- URL or path to photo
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ads table
CREATE TABLE ads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(20) NOT NULL, -- 'offer' or 'request'
  category VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  urgency BOOLEAN DEFAULT FALSE,
  location VARCHAR(100), -- apartment, floor, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);

-- Add accepted fields to ads table
ALTER TABLE ads ADD COLUMN accepted_by INTEGER REFERENCES users(id);
ALTER TABLE ads ADD COLUMN accepted_at TIMESTAMP;

-- Rentals table
CREATE TABLE rentals (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id),
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  photos TEXT[], -- array of photo URLs
  rental_terms TEXT,
  value_category VARCHAR(50), -- low, medium, high
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rental requests
CREATE TABLE rental_requests (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id),
  requester_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, completed
  checklist_before TEXT,
  checklist_after TEXT,
  contract_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moderation table
CREATE TABLE moderation (
  id SERIAL PRIMARY KEY,
  reported_by INTEGER REFERENCES users(id),
  reported_user INTEGER REFERENCES users(id),
  issue_type VARCHAR(100),
  description TEXT,
  status VARCHAR(20) DEFAULT 'open', -- open, resolved, escalated
  moderator_id INTEGER REFERENCES users(id),
  resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Favorites table
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- 'ad' or 'rental'
  item_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_type, item_id)
);

-- Chat messages
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);