-- ═══════════════════════════════════════════════════════════════════════════
-- Plomada · esquema de base de datos (PostgreSQL / Neon)
-- La API crea estas tablas sola la primera vez que arranca; este archivo
-- queda como referencia (y para correrlo a mano en el SQL Editor de Neon).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists usuarios (
  id        text primary key,
  usuario   text not null,
  email     text not null,
  hash      text not null,                 -- contraseña encriptada con bcrypt
  creado    timestamptz not null default now()
);
create unique index if not exists usuarios_usuario_unico on usuarios (lower(usuario));
create unique index if not exists usuarios_email_unico   on usuarios (lower(email));

create table if not exists ajustes (
  usuario_id text primary key references usuarios(id) on delete cascade,
  moneda     text not null default 'ARS' check (moneda in ('ARS','USD')),
  tc         numeric(12,4) not null default 1450,
  tc_fuente  text not null default 'manual',
  tc_fecha   date,
  ejemplo    boolean not null default false
);

create table if not exists obras (
  id                 text primary key,
  usuario_id         text not null references usuarios(id) on delete cascade,
  nombre             text not null,
  direccion          text not null default '',
  pisos              integer not null default 1,
  unidades           integer not null default 0,
  m2                 numeric(12,2) not null default 0,
  presupuesto        numeric(16,2) not null default 0,
  presupuesto_moneda text not null default 'USD' check (presupuesto_moneda in ('ARS','USD')),
  inicio             text,
  estado             text not null default 'En obra',
  paleta             integer not null default 0,
  usar_c             boolean not null default false,
  tipos              jsonb not null,           -- nombres de Costo A / B / C
  rubros             jsonb not null,           -- [{id, nombre, icono}]
  creado             timestamptz not null default now(),
  actualizado        timestamptz not null default now()
);
create index if not exists obras_usuario on obras (usuario_id);

create table if not exists gastos (
  id          text primary key,
  obra_id     text not null references obras(id) on delete cascade,
  usuario_id  text not null references usuarios(id) on delete cascade,
  fecha       date not null,
  rubro_id    text not null,
  concepto    text not null,
  descripcion text not null default '',
  proveedor   text not null default '',
  monto       numeric(16,2) not null check (monto > 0),
  moneda      text not null check (moneda in ('ARS','USD')),
  tc          numeric(12,4) not null check (tc > 0),  -- pesos por dólar el día del gasto
  tipo        text not null check (tipo in ('A','B','C')),
  creado      timestamptz not null default now()
);
create index if not exists gastos_obra on gastos (obra_id);
create index if not exists gastos_usuario_fecha on gastos (usuario_id, fecha);
