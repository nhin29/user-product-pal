
CREATE POLICY "Admins can delete analytics events"
ON public.analytics_events
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete prompt interactions"
ON public.prompt_interactions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
