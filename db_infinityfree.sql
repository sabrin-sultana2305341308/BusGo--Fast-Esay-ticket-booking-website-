-- ============================================================
--  BusGo Database Schema  –  InfinityFree Edition
--
--  HOW TO IMPORT:
--  1. Go to phpMyAdmin on InfinityFree
--  2. Click your database (e.g. if0_41736256_...) in the LEFT panel
--  3. Click the Import tab
--  4. Choose this file → click Go
--
--  NOTE: Do NOT click "New" to create a database first.
--        Your database already exists from the control panel.
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         VARCHAR(32)  NOT NULL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    phone      VARCHAR(20)  NOT NULL UNIQUE,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Bookings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id           VARCHAR(16)  NOT NULL PRIMARY KEY,
    user_id      VARCHAR(32)  NOT NULL,
    user_name    VARCHAR(100) NOT NULL,
    route        VARCHAR(50)  NOT NULL,
    route_label  VARCHAR(100) NOT NULL,
    ticket_type  VARCHAR(20)  NOT NULL,
    travel_date  DATE         NOT NULL,
    travel_time  VARCHAR(20)  NOT NULL,
    seats        JSON         NOT NULL,
    seat_count   TINYINT      NOT NULL DEFAULT 1,
    total        INT          NOT NULL,
    status       ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
    booked_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_bookings_user  ON bookings (user_id);
CREATE INDEX idx_bookings_route ON bookings (route, travel_date, travel_time, status);
