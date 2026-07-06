-- 全成本测算 - 初始化表结构

create table scenarios (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table app_config (
  key text primary key,
  value text not null
);

-- 默认入口密码
insert into app_config (key, value)
values ('entry_password', '888888')
on conflict (key) do nothing;

-- 允许匿名查询 app_config（只有 entry_password 这一条公开数据）
-- 但禁止匿名写入
alter table app_config enable row level security;
create policy "允许所有人读取配置"
  on app_config for select
  using (true);

-- scenarios 表：允许所有人读写
alter table scenarios enable row level security;
create policy "允许所有人读取方案"
  on scenarios for select
  using (true);
create policy "允许所有人新增方案"
  on scenarios for insert
  with check (true);
create policy "允许所有人更新方案"
  on scenarios for update
  using (true);
