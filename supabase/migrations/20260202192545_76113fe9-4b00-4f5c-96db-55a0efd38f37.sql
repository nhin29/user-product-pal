INSERT INTO public.user_roles (user_id, role)
VALUES ('3a4f8041-b8fa-4c18-b510-59a4bb102b68', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;