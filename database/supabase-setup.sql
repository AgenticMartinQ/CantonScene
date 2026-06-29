-- Run database/schema.sql first, then run this file in Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values
  ('media', 'media', false),
  ('generated-audio', 'generated-audio', false)
on conflict (id) do update set public = excluded.public;

alter table app_users enable row level security;
alter table media_assets enable row level security;
alter table learning_scenes enable row level security;
alter table detected_objects enable row level security;
alter table scene_descriptions enable row level security;
alter table generated_audio enable row level security;
alter table favorites enable row level security;
alter table practice_targets enable row level security;
alter table pronunciation_attempts enable row level security;
alter table pronunciation_score_details enable row level security;
alter table ai_processing_jobs enable row level security;
alter table model_runs enable row level security;

drop policy if exists "Users read own profile" on app_users;
create policy "Users read own profile"
on app_users for select
using (auth.uid() = id);

drop policy if exists "Users update own profile" on app_users;
create policy "Users update own profile"
on app_users for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users read own media assets" on media_assets;
create policy "Users read own media assets"
on media_assets for select
using (auth.uid() = user_id);

drop policy if exists "Users read own scenes" on learning_scenes;
create policy "Users read own scenes"
on learning_scenes for select
using (auth.uid() = user_id);

drop policy if exists "Users read objects from own scenes" on detected_objects;
create policy "Users read objects from own scenes"
on detected_objects for select
using (
  exists (
    select 1
    from learning_scenes
    where learning_scenes.id = detected_objects.learning_scene_id
      and learning_scenes.user_id = auth.uid()
  )
);

drop policy if exists "Users read descriptions from own scenes" on scene_descriptions;
create policy "Users read descriptions from own scenes"
on scene_descriptions for select
using (
  exists (
    select 1
    from learning_scenes
    where learning_scenes.id = scene_descriptions.learning_scene_id
      and learning_scenes.user_id = auth.uid()
  )
);

drop policy if exists "Users read audio from own scenes" on generated_audio;
create policy "Users read audio from own scenes"
on generated_audio for select
using (
  exists (
    select 1
    from learning_scenes
    where learning_scenes.id = generated_audio.learning_scene_id
      and learning_scenes.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own favorites" on favorites;
create policy "Users manage own favorites"
on favorites for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users read practice targets from own scenes" on practice_targets;
create policy "Users read practice targets from own scenes"
on practice_targets for select
using (
  exists (
    select 1
    from learning_scenes
    where learning_scenes.id = practice_targets.learning_scene_id
      and learning_scenes.user_id = auth.uid()
  )
);

drop policy if exists "Users read own pronunciation attempts" on pronunciation_attempts;
create policy "Users read own pronunciation attempts"
on pronunciation_attempts for select
using (auth.uid() = user_id);

drop policy if exists "Users read own pronunciation details" on pronunciation_score_details;
create policy "Users read own pronunciation details"
on pronunciation_score_details for select
using (
  exists (
    select 1
    from pronunciation_attempts
    where pronunciation_attempts.id = pronunciation_score_details.attempt_id
      and pronunciation_attempts.user_id = auth.uid()
  )
);

drop policy if exists "Users read own processing jobs" on ai_processing_jobs;
create policy "Users read own processing jobs"
on ai_processing_jobs for select
using (
  exists (
    select 1
    from learning_scenes
    where learning_scenes.id = ai_processing_jobs.learning_scene_id
      and learning_scenes.user_id = auth.uid()
  )
);

drop policy if exists "Users read own model runs" on model_runs;
create policy "Users read own model runs"
on model_runs for select
using (
  exists (
    select 1
    from ai_processing_jobs
    join learning_scenes on learning_scenes.id = ai_processing_jobs.learning_scene_id
    where ai_processing_jobs.id = model_runs.job_id
      and learning_scenes.user_id = auth.uid()
  )
);

drop policy if exists "Users read own media objects" on storage.objects;
create policy "Users read own media objects"
on storage.objects for select
using (
  bucket_id in ('media', 'generated-audio')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users upload own media objects" on storage.objects;
create policy "Users upload own media objects"
on storage.objects for insert
with check (
  bucket_id in ('media', 'generated-audio')
  and (storage.foldername(name))[1] = auth.uid()::text
);
