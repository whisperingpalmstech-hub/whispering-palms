-- =====================================================
-- 1. Campaign Logs Table
-- Tracks which lifecycle emails have been sent to users
-- to prevent duplicate emails.
-- =====================================================

CREATE TABLE IF NOT EXISTS email_campaign_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_type VARCHAR(50) NOT NULL, -- 'onboarding_reminders', 'first_question_reminders', 'limit_exhausted_reminders'
    email_step INTEGER NOT NULL, -- 1, 2, 3
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, campaign_type, email_step)
);

CREATE INDEX IF NOT EXISTS idx_email_campaign_logs_user ON email_campaign_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_logs_type ON email_campaign_logs(campaign_type);

-- Add email unsubscription tracking
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;

-- =====================================================
-- 2. User Lifecycle State View
-- Consolidates user state for cron jobs
-- =====================================================

CREATE OR REPLACE VIEW user_lifecycle_state AS
SELECT 
    u.id AS user_id,
    u.email,
    u.name,
    u.created_at AS signup_date,
    u.email_verified AS is_email_verified,
    COALESCE(up.email_notifications_enabled, true) AS notifications_enabled,
    (up.date_of_birth IS NOT NULL) AS has_birth_details,
    (SELECT COUNT(*) > 0 FROM palm_images pi WHERE pi.user_id = u.id) AS has_palm_uploaded,
    ((up.date_of_birth IS NOT NULL) AND (SELECT COUNT(*) > 0 FROM palm_images pi WHERE pi.user_id = u.id)) AS is_onboarded,
    (SELECT MAX(uploaded_at) FROM palm_images pi WHERE pi.user_id = u.id) AS onboarding_completed_at,
    (SELECT COUNT(*) FROM questions q WHERE q.user_id = u.id) AS question_count,
    COALESCE(up.subscription_plan, 'basic') AS plan_type,
    dq.remaining_questions = 0 AS is_daily_limit_reached,
    dq.date AS current_quota_date,
    COALESCE(u.last_login_at, (SELECT MAX(created_at) FROM questions q WHERE q.user_id = u.id), u.created_at) AS last_activity_timestamp
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN daily_quotas dq ON u.id = dq.user_id AND dq.date = CURRENT_DATE;

-- =====================================================
-- 3. Enable RLS for campaign logs
-- =====================================================

ALTER TABLE email_campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access - campaign_logs" ON email_campaign_logs
    FOR ALL USING (true);
