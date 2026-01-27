-- Add public SELECT policy for onboarding_responses to allow admin panel to view all responses
CREATE POLICY "Anyone can view onboarding responses for admin panel"
ON public.onboarding_responses
FOR SELECT
USING (true);