-- Clear existing employees and insert the correct team members
DELETE FROM public.employees;

INSERT INTO public.employees (name) VALUES 
('Andre'),
('Amith'), 
('Adam'),
('Sid');