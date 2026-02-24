CREATE POLICY "Admins can view all time tracking"
ON public.daily_time_tracking
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));