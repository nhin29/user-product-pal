-- Add public SELECT policy for prompt_interactions so dashboard can read the data
CREATE POLICY "Anyone can view prompt interactions for analytics" 
ON public.prompt_interactions 
FOR SELECT 
USING (true);