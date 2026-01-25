-- Add public UPDATE policy for profiles
CREATE POLICY "Anyone can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Add public DELETE policy for profiles
CREATE POLICY "Anyone can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (true);