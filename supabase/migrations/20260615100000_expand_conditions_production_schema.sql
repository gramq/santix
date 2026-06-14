begin;

alter table if exists public.conditions
  add column if not exists name_en text,
  add column if not exists medical_name_en text,
  add column if not exists description_en text,
  add column if not exists educational_note_en text not null default 'Educational information. Does not replace medical consultation.',
  add column if not exists condition_category text not null default 'general',
  add column if not exists aliases_ro text[] not null default '{}',
  add column if not exists aliases_en text[] not null default '{}',
  add column if not exists keywords_ro text[] not null default '{}',
  add column if not exists keywords_en text[] not null default '{}',
  add column if not exists typical_duration_ro text,
  add column if not exists typical_duration_en text,
  add column if not exists common_causes_ro text,
  add column if not exists common_causes_en text,
  add column if not exists self_care_ro text,
  add column if not exists self_care_en text,
  add column if not exists doctor_when_ro text,
  add column if not exists doctor_when_en text,
  add column if not exists emergency_signs_ro text,
  add column if not exists emergency_signs_en text,
  add column if not exists prevention_ro text,
  add column if not exists prevention_en text,
  add column if not exists icd10_code text,
  add column if not exists snomed_ct_id text,
  add column if not exists triage_priority smallint not null default 5,
  add column if not exists active boolean not null default true,
  add column if not exists review_status text not null default 'needs_review',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

update public.conditions
set
  condition_category = case
    when condition_category = 'general' and tissue in ('muschi', 'tendon', 'os', 'articulatie')
      then 'musculoskeletal'
    else condition_category
  end,
  triage_priority = case default_level
    when 'consultare_doctor' then 8
    when 'mediu' then 5
    else 3
  end,
  educational_note_en = coalesce(
    nullif(trim(educational_note_en), ''),
    'Educational information. Does not replace medical consultation.'
  ),
  aliases_ro = coalesce(aliases_ro, '{}'),
  aliases_en = coalesce(aliases_en, '{}'),
  keywords_ro = coalesce(keywords_ro, '{}'),
  keywords_en = coalesce(keywords_en, '{}'),
  active = coalesce(active, true),
  review_status = coalesce(nullif(trim(review_status), ''), 'needs_review')
where true;

alter table public.conditions
  drop constraint if exists conditions_name_ro_not_blank,
  drop constraint if exists conditions_description_ro_not_blank,
  drop constraint if exists conditions_category_not_blank,
  drop constraint if exists conditions_review_status_check,
  drop constraint if exists conditions_triage_priority_check,
  drop constraint if exists conditions_reviewed_content_check,
  drop constraint if exists conditions_archived_inactive_check;

alter table public.conditions
  add constraint conditions_name_ro_not_blank
    check (char_length(trim(name_ro)) > 0),
  add constraint conditions_description_ro_not_blank
    check (char_length(trim(description_ro)) > 0),
  add constraint conditions_category_not_blank
    check (char_length(trim(condition_category)) > 0),
  add constraint conditions_review_status_check
    check (review_status in ('needs_review', 'reviewed', 'archived')),
  add constraint conditions_triage_priority_check
    check (triage_priority between 1 and 10),
  add constraint conditions_reviewed_content_check
    check (
      review_status <> 'reviewed'
      or (
        nullif(trim(coalesce(name_en, '')), '') is not null
        and nullif(trim(coalesce(description_en, '')), '') is not null
        and nullif(trim(coalesce(doctor_when_ro, '')), '') is not null
        and nullif(trim(coalesce(emergency_signs_ro, '')), '') is not null
        and nullif(trim(coalesce(doctor_when_en, '')), '') is not null
        and nullif(trim(coalesce(emergency_signs_en, '')), '') is not null
        and reviewed_at is not null
      )
    ),
  add constraint conditions_archived_inactive_check
    check (review_status <> 'archived' or active = false);

create index if not exists conditions_active_tissue_level_idx
  on public.conditions (active, tissue, default_level, triage_priority desc);

create index if not exists conditions_category_idx
  on public.conditions (condition_category);

create index if not exists conditions_review_status_idx
  on public.conditions (review_status);

create index if not exists conditions_aliases_ro_idx
  on public.conditions using gin (aliases_ro);

create index if not exists conditions_aliases_en_idx
  on public.conditions using gin (aliases_en);

create index if not exists conditions_keywords_ro_idx
  on public.conditions using gin (keywords_ro);

create index if not exists conditions_keywords_en_idx
  on public.conditions using gin (keywords_en);

create index if not exists conditions_search_ro_idx
  on public.conditions using gin (
    to_tsvector(
      'simple',
      coalesce(name_ro, '') || ' ' ||
      coalesce(medical_name, '') || ' ' ||
      coalesce(description_ro, '') || ' ' ||
      coalesce(common_causes_ro, '') || ' ' ||
      coalesce(doctor_when_ro, '') || ' ' ||
      coalesce(emergency_signs_ro, '')
    )
  );

create index if not exists conditions_search_en_idx
  on public.conditions using gin (
    to_tsvector(
      'simple',
      coalesce(name_en, '') || ' ' ||
      coalesce(medical_name_en, '') || ' ' ||
      coalesce(description_en, '') || ' ' ||
      coalesce(common_causes_en, '') || ' ' ||
      coalesce(doctor_when_en, '') || ' ' ||
      coalesce(emergency_signs_en, '')
    )
  );

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conditions_set_updated_at on public.conditions;
create trigger conditions_set_updated_at
  before update on public.conditions
  for each row
  execute function public.set_updated_at();

commit;
