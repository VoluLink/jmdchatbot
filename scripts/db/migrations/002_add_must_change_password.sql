-- Migration: Add must_change_password column for forced password reset
-- Run this if upgrading an existing database

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
