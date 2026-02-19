-- Create function to increment coupon usage
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons 
  SET uses_count = COALESCE(uses_count, 0) + 1
  WHERE id = coupon_id;
END;
$$;