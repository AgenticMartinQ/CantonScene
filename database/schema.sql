create extension if not exists pgcrypto;

create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  native_language text default 'en',
  learning_level text default 'beginner',
  created_at timestamptz default now()
);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  media_type text not null check (media_type in ('photo', 'video', 'audio')),
  storage_path text not null,
  thumbnail_path text,
  mime_type text,
  file_size_bytes bigint,
  duration_seconds numeric,
  width int,
  height int,
  created_at timestamptz default now()
);

create table learning_scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  media_asset_id uuid references media_assets(id) on delete cascade,
  scene_type text not null check (scene_type in ('photo', 'video')),
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'failed')),
  english_summary text,
  cantonese_summary text,
  jyutping_summary text,
  detail_level int default 3,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table detected_objects (
  id uuid primary key default gen_random_uuid(),
  learning_scene_id uuid references learning_scenes(id) on delete cascade,
  english_label text not null,
  cantonese_label text,
  jyutping text,
  description_en text,
  bbox_x numeric,
  bbox_y numeric,
  bbox_width numeric,
  bbox_height numeric,
  confidence numeric,
  display_priority int default 0,
  created_at timestamptz default now()
);

create table scene_descriptions (
  id uuid primary key default gen_random_uuid(),
  learning_scene_id uuid references learning_scenes(id) on delete cascade,
  language text not null check (language in ('english', 'cantonese')),
  description_type text not null default 'learner',
  text text not null,
  jyutping text,
  source_model text,
  qa_status text default 'pending' check (qa_status in ('pending', 'approved', 'rejected')),
  version int default 1,
  created_at timestamptz default now()
);

create table generated_audio (
  id uuid primary key default gen_random_uuid(),
  learning_scene_id uuid references learning_scenes(id) on delete cascade,
  detected_object_id uuid references detected_objects(id) on delete set null,
  tts_provider text not null,
  voice_id text,
  language_code text default 'zh-HK',
  storage_path text not null,
  duration_seconds numeric,
  created_at timestamptz default now()
);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  learning_scene_id uuid references learning_scenes(id) on delete cascade,
  detected_object_id uuid references detected_objects(id) on delete cascade,
  favorite_type text not null check (favorite_type in ('scene', 'object', 'sentence')),
  created_at timestamptz default now()
);

create table practice_targets (
  id uuid primary key default gen_random_uuid(),
  learning_scene_id uuid references learning_scenes(id) on delete cascade,
  detected_object_id uuid references detected_objects(id) on delete set null,
  target_type text not null check (target_type in ('object_word', 'scene_sentence', 'full_scene')),
  english_text text,
  cantonese_text text not null,
  jyutping text,
  reference_audio_id uuid references generated_audio(id) on delete set null,
  created_at timestamptz default now()
);

create table pronunciation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  practice_target_id uuid references practice_targets(id) on delete cascade,
  user_audio_asset_id uuid references media_assets(id) on delete set null,
  overall_score numeric,
  pronunciation_score numeric,
  tone_score numeric,
  fluency_score numeric,
  rhythm_score numeric,
  created_at timestamptz default now()
);

create table pronunciation_score_details (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references pronunciation_attempts(id) on delete cascade,
  unit_type text not null check (unit_type in ('syllable', 'word', 'sentence')),
  unit_text text not null,
  jyutping text,
  expected_tone text,
  score numeric,
  feedback text,
  start_ms int,
  end_ms int
);

create table ai_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  learning_scene_id uuid references learning_scenes(id) on delete cascade,
  job_type text not null check (job_type in ('vision', 'cantonese_expression', 'cantonese_qa', 'tts', 'pronunciation')),
  status text not null default 'queued' check (status in ('queued', 'running', 'complete', 'failed')),
  attempt_count int default 0,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table model_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references ai_processing_jobs(id) on delete cascade,
  provider text not null,
  model_name text not null,
  input_json jsonb,
  output_json jsonb,
  latency_ms int,
  cost_estimate numeric,
  created_at timestamptz default now()
);
