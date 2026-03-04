-- Migration: 20260126_super_admin_policies.sql
-- Description: Grants full access to Super Admins (by email)

-- 1. Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT email 
    FROM auth.users 
    WHERE id = auth.uid()
  ) IN ('jefferson22gs@gmail.com', 'admin@syshair.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add Policies for Salons (Super Admins can do anything)
CREATE POLICY "Super Admins can select all salons"
ON public.salons FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "Super Admins can update all salons"
ON public.salons FOR UPDATE
TO authenticated
USING (is_super_admin());

CREATE POLICY "Super Admins can delete salons"
ON public.salons FOR DELETE
TO authenticated
USING (is_super_admin());

-- 3. Add Policies for Subscriptions
CREATE POLICY "Super Admins can manage subscriptions"
ON public.subscriptions FOR ALL
TO authenticated
USING (is_super_admin());

-- 4. Add Policies for Notifications
CREATE POLICY "Super Admins can manage notifications"
ON public.notifications FOR ALL
TO authenticated
USING (is_super_admin());

-- 5. Add Policies for WhatsApp Instances
CREATE POLICY "Super Admins can manage whatsapp instances"
ON public.whatsapp_instances FOR ALL
TO authenticated
USING (is_super_admin());

-- 6. Add Policies for Chatbot Settings
CREATE POLICY "Super Admins can manage chatbot settings"
ON public.chatbot_settings FOR ALL
TO authenticated
USING (is_super_admin());
