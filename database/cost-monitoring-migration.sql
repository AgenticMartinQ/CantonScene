-- CantonScene AI cost monitoring migration
-- Run this once in Supabase SQL Editor.

alter table model_runs add column if not exists task_type text;
alter table model_runs add column if not exists status text not null default 'complete';
alter table model_runs add column if not exists usage_json jsonb;
alter table model_runs add column if not exists input_tokens int;
alter table model_runs add column if not exists output_tokens int;
alter table model_runs add column if not exists total_tokens int;
alter table model_runs add column if not exists media_bytes bigint;
alter table model_runs add column if not exists input_cost_usd numeric;
alter table model_runs add column if not exists output_cost_usd numeric;
alter table model_runs add column if not exists error_message text;

create index if not exists model_runs_created_at_idx on model_runs (created_at desc);
create index if not exists model_runs_task_type_idx on model_runs (task_type);
create index if not exists model_runs_provider_model_idx on model_runs (provider, model_name);
