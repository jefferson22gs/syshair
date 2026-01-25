-- =============================================
-- FIX: RLS Policy for scheduled_posts INSERT
-- Migration: 20260125_fix_scheduled_posts_rls.sql
-- =============================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Salon owners can manage scheduled posts" ON public.scheduled_posts;

-- Create separate policies for better control

-- SELECT policy
CREATE POLICY "scheduled_posts_select_policy"
    ON public.scheduled_posts FOR SELECT
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- INSERT policy with WITH CHECK
CREATE POLICY "scheduled_posts_insert_policy"
    ON public.scheduled_posts FOR INSERT
    WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- UPDATE policy
CREATE POLICY "scheduled_posts_update_policy"
    ON public.scheduled_posts FOR UPDATE
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()))
    WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- DELETE policy
CREATE POLICY "scheduled_posts_delete_policy"
    ON public.scheduled_posts FOR DELETE
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- Also fix other tables that might have the same issue

-- Fix whatsapp_instances
DROP POLICY IF EXISTS "Salon owners can manage their WhatsApp instances" ON public.whatsapp_instances;

CREATE POLICY "whatsapp_instances_select_policy"
    ON public.whatsapp_instances FOR SELECT
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "whatsapp_instances_insert_policy"
    ON public.whatsapp_instances FOR INSERT
    WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "whatsapp_instances_update_policy"
    ON public.whatsapp_instances FOR UPDATE
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()))
    WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "whatsapp_instances_delete_policy"
    ON public.whatsapp_instances FOR DELETE
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- Fix chatbot_settings
DROP POLICY IF EXISTS "Salon owners can manage chatbot settings" ON public.chatbot_settings;

CREATE POLICY "chatbot_settings_select_policy"
    ON public.chatbot_settings FOR SELECT
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "chatbot_settings_insert_policy"
    ON public.chatbot_settings FOR INSERT
    WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "chatbot_settings_update_policy"
    ON public.chatbot_settings FOR UPDATE
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()))
    WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "chatbot_settings_delete_policy"
    ON public.chatbot_settings FOR DELETE
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- Fix chatbot_conversations
DROP POLICY IF EXISTS "Salon owners can view their conversations" ON public.chatbot_conversations;

CREATE POLICY "chatbot_conversations_select_policy"
    ON public.chatbot_conversations FOR SELECT
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "chatbot_conversations_insert_policy"
    ON public.chatbot_conversations FOR INSERT
    WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "chatbot_conversations_update_policy"
    ON public.chatbot_conversations FOR UPDATE
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()))
    WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "chatbot_conversations_delete_policy"
    ON public.chatbot_conversations FOR DELETE
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- Fix chatbot_knowledge_base
DROP POLICY IF EXISTS "Salon owners can manage knowledge base" ON public.chatbot_knowledge_base;

CREATE POLICY "chatbot_knowledge_base_select_policy"
    ON public.chatbot_knowledge_base FOR SELECT
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "chatbot_knowledge_base_insert_policy"
    ON public.chatbot_knowledge_base FOR INSERT
    WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "chatbot_knowledge_base_update_policy"
    ON public.chatbot_knowledge_base FOR UPDATE
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()))
    WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

CREATE POLICY "chatbot_knowledge_base_delete_policy"
    ON public.chatbot_knowledge_base FOR DELETE
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));
