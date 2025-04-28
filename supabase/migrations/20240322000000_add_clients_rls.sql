-- Enable RLS on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policies for clients table
CREATE POLICY "Trainers can view their own clients"
    ON public.clients FOR SELECT
    TO authenticated
    USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert their own clients"
    ON public.clients FOR INSERT
    TO authenticated
    WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their own clients"
    ON public.clients FOR UPDATE
    TO authenticated
    USING (trainer_id = auth.uid())
    WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete their own clients"
    ON public.clients FOR DELETE
    TO authenticated
    USING (trainer_id = auth.uid()); 