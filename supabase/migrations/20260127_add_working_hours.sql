-- Migration: Add Working Hours JSON to Salons
-- Author: Antigravity Agent
-- Description: Stores detailed working hours per day of week (0-6)
-- Format: { "0": { "isOpen": false, "start": "09:00", "end": "18:00" }, "1": ... }

ALTER TABLE public.salons
ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT NULL;
