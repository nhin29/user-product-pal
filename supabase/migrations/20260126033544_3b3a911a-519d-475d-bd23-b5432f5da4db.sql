-- Add public SELECT policy for analytics_events so user analytics page can read the data
CREATE POLICY "Anyone can view analytics events for admin" 
ON public.analytics_events 
FOR SELECT 
USING (true);