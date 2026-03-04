-- Add policies for users to manage their own subscriptions

-- Allow users to insert their own subscription (for trial start)
CREATE POLICY "Users can insert own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own subscription
CREATE POLICY "Users can update own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Note: SELECT policy already exists from previous migration
