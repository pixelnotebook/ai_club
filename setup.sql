-- ============================================================
-- AI Club Portal: database setup. Paste this whole file into
-- Supabase > SQL Editor > New query > Run.  (Safe to run once.)
-- ============================================================
create extension if not exists pgcrypto;

-- ---------- tables ----------
create table trainers (user_id uuid primary key references auth.users(id) on delete cascade);
create table members (id uuid primary key default gen_random_uuid(), name text not null, class_div text, photo_url text, role text, interests text, joined_on date, intro text, created_at timestamptz default now(), updated_at timestamptz default now());
create table projects (id uuid primary key default gen_random_uuid(), title text not null, description text, students text, category text, start_date date, end_date date, status text not null default 'Not Started' check (status in ('Not Started','In Progress','Completed','On Hold')), progress int default 0 check (progress between 0 and 100), photo_url text, milestones text, created_at timestamptz default now(), updated_at timestamptz default now());
create table gallery (id uuid primary key default gen_random_uuid(), caption text not null, description text, category text, image_url text not null, taken_on date, created_at timestamptz default now(), updated_at timestamptz default now());
create table achievements (id uuid primary key default gen_random_uuid(), title text not null, description text, achieved_on date, photo_url text, featured boolean default false, created_at timestamptz default now(), updated_at timestamptz default now());
create table events (id uuid primary key default gen_random_uuid(), title text not null, kind text, event_date date not null, location text, description text, photo_url text, created_at timestamptz default now(), updated_at timestamptz default now());
create table announcements (id uuid primary key default gen_random_uuid(), title text not null, body text not null, posted_on date default current_date, pinned boolean default false, created_at timestamptz default now(), updated_at timestamptz default now());
create table resources (id uuid primary key default gen_random_uuid(), title text not null, kind text, description text, url text, created_at timestamptz default now(), updated_at timestamptz default now());
create table settings (key text primary key, value text, updated_at timestamptz default now());
create table feedback (id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) <= 80), email text check (char_length(email) <= 120), message text not null check (char_length(message) between 5 and 2000), created_at timestamptz default now());

-- ---------- who is a trainer? ----------
create function public.is_trainer() returns boolean language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.trainers where user_id = auth.uid()) $$;

create function public.touch() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- security rules (RLS) ----------
-- Everyone can READ content. Only trainers can add / change / delete.
do $$ declare t text; begin
  foreach t in array array['members','projects','gallery','achievements','events','announcements','resources','settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "anyone can read" on %I for select using (true)', t);
    execute format('create policy "trainer can write" on %I for all to authenticated using (public.is_trainer()) with check (public.is_trainer())', t);
    execute format('create trigger touch before update on %I for each row execute function public.touch()', t);
  end loop;
end $$;

-- Feedback: anyone can SEND, only trainers can read or delete.
alter table feedback enable row level security;
create policy "anyone can send" on feedback for insert with check (true);
create policy "trainer can read" on feedback for select to authenticated using (public.is_trainer());
create policy "trainer can delete" on feedback for delete to authenticated using (public.is_trainer());

-- Trainers table: a logged-in user can only see their own row.
alter table trainers enable row level security;
create policy "see own row" on trainers for select to authenticated using (user_id = auth.uid());

-- ---------- file storage ----------
insert into storage.buckets (id, name, public) values ('club-media', 'club-media', true) on conflict (id) do nothing;
create policy "trainer uploads" on storage.objects for insert to authenticated with check (bucket_id = 'club-media' and public.is_trainer());
create policy "trainer updates" on storage.objects for update to authenticated using (bucket_id = 'club-media' and public.is_trainer());
create policy "trainer deletes" on storage.objects for delete to authenticated using (bucket_id = 'club-media' and public.is_trainer());

-- ---------- sample content (trainer can edit or delete all of it) ----------
insert into settings (key, value) values
('school_name','Sant Dyaneshwar Primary School No. 6'),
('club_name','AI Club'),
('donor','HP India'),
('partner','Learning Links Foundation'),
('managed_by','AI Club Trainer'),
('welcome','Welcome to the AI Club portal of Sant Dyaneshwar Primary School No. 6. Here you can see what our students are building, learning and achieving.'),
('mission','To help every child understand AI, ask good questions about technology, and use it to solve problems around them.'),
('vision','A school where every student grows up confident with technology and uses it responsibly and creatively.'),
(E'objectives',E'Introduce students to AI and coding through play and projects\nBuild curiosity, teamwork and problem solving\nTeach safe and responsible use of technology\nShowcase student work to the school and community'),
('importance','AI is already part of daily life. Learning it early helps students become informed users and confident creators, not just consumers.'),
('role_hp','HP India supports the programme as donor, providing the resources that make the AI Club possible.'),
('role_llf','Learning Links Foundation implements and manages the programme, including training, curriculum and monitoring.'),
('role_school','The school provides space, time and student support. The AI Club Trainer runs sessions and keeps this portal updated.'),
('contact_address','Sant Dyaneshwar Primary School No. 6, Pune, Maharashtra'),
('contact_phone','+91 00000 00000'),
('contact_email','aiclub@example.org');

insert into members (name, class_div, role, interests, joined_on, intro) values
('Aarav Patil','5-A','Club Captain','Robots, Scratch','2026-07-01','I love making things move and want to build a helper robot.'),
('Sneha Jadhav','4-B','Project Lead','Drawing with AI, stories','2026-07-01','I like turning my drawings into stories with AI tools.'),
('Omkar Shinde','5-B','Tech Reporter','Photography, quizzes','2026-07-15','I take photos of our sessions and write the club news.');

insert into projects (title, description, students, category, start_date, end_date, status, progress, milestones) values
('Teach a Machine: Fruit Sorter','Students train a simple model to recognise fruits using a camera.','Aarav, Sneha','Machine Learning','2026-08-01','2026-11-30','In Progress',60,E'Collected fruit photos\nTrained first model\nTesting accuracy'),
('AI Storybook','Students write short stories and illustrate them with AI image tools.','Sneha, Omkar','Creative AI','2026-07-10','2026-09-30','Completed',100,E'Story ideas\nIllustrations\nClass reading day'),
('Smart Classroom Helper','Plan a voice assistant that answers common classroom questions.','Omkar','Voice AI','2026-12-01','2027-02-28','Not Started',0,'Planning to begin after term exams');

insert into events (title, kind, event_date, location, description) values
('AI Awareness Day','AI awareness','2026-09-12','School hall','Students showed AI demos to parents and teachers.'),
('Winter Project Showcase','Demonstration','2026-12-15','School hall','Students present their projects to the school and HP India visitors.');

insert into announcements (title, body, posted_on, pinned) values
('Welcome to the AI Club portal','This website will be updated regularly with our projects, photos and events.','2026-10-01',true),
('Project showcase planned for December','All teams should be ready with a short demo by the first week of December.','2026-10-20',false);

insert into achievements (title, description, achieved_on, featured) values
('AI Club launched','Our first batch of students completed the introductory AI module.','2026-08-15',true),
('AI Storybook completed','Students finished and shared their first group project.','2026-09-30',true);

insert into resources (title, kind, description, url) values
('Scratch','Tool','Free block-based coding for beginners.','https://scratch.mit.edu'),
('Teachable Machine','Tool','Train a simple AI model in your browser.','https://teachablemachine.withgoogle.com'),
('Code.org','Website','Free coding lessons for students.','https://code.org');

-- ============================================================
-- AFTER you create the trainer's login (see README step 3), run:
--   insert into trainers (user_id) select id from auth.users where email = 'trainer@example.org';
-- ============================================================
