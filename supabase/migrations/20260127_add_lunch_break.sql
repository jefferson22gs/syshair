-- Migration: Add Lunch Break Configuration to Salons
-- Author: Antigravity Agent
-- Description: Stores lunch break settings (start/end time and applicable days)

ALTER TABLE public.salons
ADD COLUMN IF NOT EXISTS lunch_break_config JSONB DEFAULT '{
  "enabled": false,
  "start_time": "12:00",
  "end_time": "13:00",
  "days": [1, 2, 3, 4, 5]
}'::jsonb;
