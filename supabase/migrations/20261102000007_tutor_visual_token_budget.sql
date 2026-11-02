-- ============================================================================
-- Migration 000007: Raise default max_tokens_per_response from 1100 to 1600
-- Ensures real-teacher step-by-step explanations + structured visual diagrams
-- and follow-up prompts complete cleanly without mid-block truncation.
-- ============================================================================

UPDATE public.ai_system_settings
SET max_tokens_per_response = 1600,
    updated_at = timezone('utc', now())
WHERE id = 1
  AND max_tokens_per_response < 1600;
