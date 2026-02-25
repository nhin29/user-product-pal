
-- Create support_folders table
CREATE TABLE public.support_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.support_folders(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_folders ENABLE ROW LEVEL SECURITY;

-- Only admins can manage folders
CREATE POLICY "Admins can view all folders"
  ON public.support_folders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create folders"
  ON public.support_folders FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update folders"
  ON public.support_folders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete folders"
  ON public.support_folders FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add folder_id to conversations
ALTER TABLE public.conversations
  ADD COLUMN folder_id UUID REFERENCES public.support_folders(id) ON DELETE SET NULL;

-- Seed default folders
INSERT INTO public.support_folders (name, display_order) VALUES
  ('Pending', 0),
  ('Solved', 1),
  ('Product Questions', 2),
  ('Feedback', 3);
