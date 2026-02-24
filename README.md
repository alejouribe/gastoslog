# GastoLog

PWA mobile-first para registrar gastos cotidianos en menos de 15 segundos.

**Stack:** Next.js 15 (App Router) · Supabase · Tailwind CSS · Recharts · IndexedDB (idb)

---

## Setup rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Configurar Supabase

Ejecuta el siguiente SQL en el SQL Editor de tu proyecto Supabase:

```sql
-- Categorías
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  nombre TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 30),
  color TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_categoria_nombre_usuario UNIQUE (usuario_id, lower(nombre))
);
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios ven sus categorias" ON categorias FOR ALL USING (auth.uid() = usuario_id);

-- Gastos
CREATE TABLE gastos (
  id UUID PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  monto_cop INTEGER NOT NULL CHECK (monto_cop > 0),
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  metodo_de_pago TEXT NOT NULL CHECK (metodo_de_pago IN ('Efectivo','Tarjeta','Transferencia','Otro')),
  nota TEXT CHECK (char_length(nota) <= 140),
  estado_sync TEXT NOT NULL DEFAULT 'Sincronizado',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado_en TIMESTAMPTZ
);
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios ven sus gastos" ON gastos FOR ALL USING (auth.uid() = usuario_id);
CREATE INDEX idx_gastos_usuario_fecha ON gastos (usuario_id, fecha_hora DESC);
CREATE INDEX idx_gastos_usuario_categoria ON gastos (usuario_id, categoria_id);

-- Presupuestos
CREATE TABLE presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  mes TEXT NOT NULL CHECK (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  monto_objetivo_cop INTEGER NOT NULL CHECK (monto_objetivo_cop > 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_presupuesto_activo UNIQUE (usuario_id, categoria_id, mes)
);
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios ven sus presupuestos" ON presupuestos FOR ALL USING (auth.uid() = usuario_id);

-- Preferencias
CREATE TABLE preferencias_usuario (
  usuario_id UUID PRIMARY KEY REFERENCES auth.users(id),
  moneda TEXT NOT NULL DEFAULT 'COP',
  zona_horaria TEXT NOT NULL DEFAULT 'America/Bogota',
  semana_inicia_en TEXT NOT NULL DEFAULT 'Lunes' CHECK (semana_inicia_en IN ('Lunes','Domingo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE preferencias_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario ve sus preferencias" ON preferencias_usuario FOR ALL USING (auth.uid() = usuario_id);
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu browser.

---

## Estructura del proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (AuthProvider + SW)
│   ├── page.tsx            # Redirect según sesión
│   ├── auth/
│   │   ├── login/          # Pantalla de login
│   │   └── registro/       # Pantalla de registro
│   └── app/                # Área autenticada
│       ├── layout.tsx      # Layout con NavTabs + Providers
│       ├── dashboard/      # Feature 3
│       ├── registrar/      # Feature 1 ✅
│       ├── historial/      # Feature 4
│       ├── gastos/[id]/    # Feature 4 (edición)
│       ├── presupuestos/   # Feature 5
│       ├── categorias/     # Feature 2
│       ├── ajustes/        # Feature 8
│       └── sync/           # Feature 7 (monitor)
├── components/
│   ├── formulario-gasto/   # Componentes del Feature 1
│   ├── layout/             # NavTabs, RegisterSW
│   └── ui/                 # Toast, BadgeSync
├── contexts/               # AuthContext, SyncContext, PreferenciasContext
├── hooks/                  # useCrearGasto, useCategorias, useToast
├── lib/
│   ├── db.ts               # IndexedDB schema (idb)
│   ├── format.ts           # Formateo COP y fechas
│   ├── periodos.ts         # Cálculo de rangos de periodo
│   ├── utils.ts            # Helpers generales
│   └── supabase/           # Clientes browser y server
├── services/               # Lógica de negocio
│   ├── gasto-service.ts
│   ├── categoria-service.ts
│   ├── preferencias-service.ts
│   └── inicializacion-usuario-service.ts
├── types/
│   └── index.ts            # Todos los tipos TypeScript
└── middleware.ts            # Protección de rutas
```

## Features implementados

| Feature | Estado |
|---|---|
| F1 — Registro rápido | ✅ Completo |
| F2 — Categorización | 🔧 Servicio listo, UI pendiente |
| F3 — Dashboard | 🔧 Pendiente |
| F4 — Historial | 🔧 Pendiente |
| F5 — Presupuestos | 🔧 Pendiente |
| F6 — Autenticación | ✅ Completo |
| F7 — Offline/Sync | ✅ Motor completo |
| F8 — Configuración | ✅ Completo |
