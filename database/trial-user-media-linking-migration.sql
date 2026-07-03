-- Link each tested web-trial photo/video to the verified Supabase user and/or email.
-- Safe to run multiple times in Supabase SQL Editor.

alter table app_users
  add column if not exists last_seen_at timestamptz;

alter table media_assets
  add column if not exists trial_email text;

alter table learning_scenes
  add column if not exists trial_email text;

create index if not exists app_users_email_idx
  on app_users (email);

create index if not exists media_assets_user_created_idx
  on media_assets (user_id, created_at desc);

create index if not exists media_assets_trial_email_created_idx
  on media_assets (trial_email, created_at desc);

create index if not exists learning_scenes_user_created_idx
  on learning_scenes (user_id, created_at desc);

create index if not exists learning_scenes_trial_email_created_idx
  on learning_scenes (trial_email, created_at desc);

create or replace view trial_media_activity as
select
  ls.id as scene_id,
  coalesce(au.email, ls.trial_email, ma.trial_email) as email,
  coalesce(ls.user_id, ma.user_id) as user_id,
  ls.scene_type,
  ls.status,
  ls.english_summary,
  ls.cantonese_summary,
  ls.jyutping_summary,
  ma.storage_path,
  ma.mime_type,
  ma.file_size_bytes,
  ls.created_at,
  count(detected_objects.id) as object_count
from learning_scenes ls
join media_assets ma on ma.id = ls.media_asset_id
left join app_users au on au.id = coalesce(ls.user_id, ma.user_id)
left join detected_objects on detected_objects.learning_scene_id = ls.id
group by
  ls.id,
  au.email,
  ls.trial_email,
  ls.user_id,
  ma.trial_email,
  ma.user_id,
  ma.storage_path,
  ma.mime_type,
  ma.file_size_bytes
order by ls.created_at desc;
