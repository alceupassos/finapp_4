create extension if not exists pgcrypto;

create table if not exists public.news_items (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  title text not null,
  summary text not null,
  sentiment text check (sentiment in ('positivo','negativo','neutro')) not null,
  source text not null,
  url text not null,
  tab text not null,
  period text not null,
  created_at timestamptz default now()
);

create unique index if not exists news_items_unique on public.news_items(date, title);

create table if not exists public.news_indicators (
  id uuid default gen_random_uuid() primary key,
  metric text not null,
  value numeric not null,
  direction text check (direction in ('up','down','neutral')) not null,
  captured_at timestamptz default now()
);

