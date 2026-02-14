-- Add two_fa_required column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_required BOOLEAN NOT NULL DEFAULT FALSE;
