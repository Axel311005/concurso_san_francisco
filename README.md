# Liga del Saber Franciscana 2026

Aplicación web para el **concurso oral** de preguntas sobre San Francisco de Asís: moderador, jurados (2–3), equipos con la cantidad de integrantes que definas en admin y tablero para proyector.

## Requisitos

- Node.js 20+
- PostgreSQL en la nube (Neon, Supabase o Vercel Postgres)

## Configuración local

1. Clona el repositorio e instala dependencias:

```bash
npm install
```

2. Copia las variables de entorno:

```bash
cp .env.example .env
```

3. Configura `DATABASE_URL` en `.env` (ejemplo Neon con pooler):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler/DATABASE?sslmode=require&pgbouncer=true&connect_timeout=30"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

En Neon, `DATABASE_URL` usa el host **pooler**; `DIRECT_URL` el host directo (migraciones).

4. Aplica migraciones y importa las 60 preguntas:

```bash
npm run db:migrate
npm run db:seed
```

También puedes importar desde **Admin** (`/admin`) subiendo el JSON o con «Importar desde data/».

5. Arranca la app:

```bash
npm run dev
```

Abre [http://localhost:3000/admin](http://localhost:3000/admin).

## Rutas

| Ruta | Rol |
|------|-----|
| `/admin` | Crear sesión, equipos, jurados, importar preguntas, enlaces/QR |
| `/session/[code]/moderator` | Moderador |
| `/session/[code]/judge` | Jurado (PIN) |
| `/session/[code]/display` | Tablero público (sin respuesta oficial) |
| `/session/[code]/team/[teamId]` | Capitán / equipo (buzz) |

## Tiempo real

Las vistas de una misma sesión se sincronizan **sin recargar** mediante **polling** al endpoint `/api/sessions/[code]/sync` usando un contador `revision` en la base de datos.

- Tablero y moderador: ~800 ms
- Equipos: ~1,5 s
- Reconexión automática al volver `online`

**Motivo:** con Neon ya configurado no hace falta otro proveedor (Pusher, Supabase Realtime). Para ~10 clientes en un salón es estable y fácil de depurar. En producción puedes publicar el mismo `revision` por WebSocket si necesitas menor latencia.

## Flujo el día del evento (10 oct 2026 — Salón San Juan Pablo II)

1. **Antes:** `npm run db:seed` o importar JSON en admin; crear sesión (ej. `SF2026`), equipos y jurados (PIN por jurado).
2. **Proyector:** `/session/SF2026/display`
3. **Moderador (laptop):** `/session/SF2026/moderator`
4. **Jurados (móvil):** `/session/SF2026/judge` + PIN
5. **Capitanes:** enlaces por equipo desde admin
6. Moderador lanza pregunta → asigna equipo o primer buzz → **10 s** de timer → jurados puntúan (promedio redondeado) → tablero muestra ranking.

## Reglas implementadas

- Un intento por equipo y pregunta
- Si fallan (0 pts, incorrecto o tiempo): siguiente equipo elegible en la misma pregunta
- Comodín: otro integrante del mismo equipo, tope configurable (por defecto 50 % de `puntosBase`)
- Desempate: detección de empate en primer lugar; solo equipos empatados

## Jurados — timeout opcional

En la config de sesión (`wildcardMaxPercent`, `timerSeconds`, `judgeTimeoutSeconds`) el timeout de jurados está documentado por defecto en 120 s; el cierre del intento ocurre cuando **todos** los jurados envían puntaje.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo |
| `npm run build` | Build producción |
| `npm run db:migrate` | Migraciones Prisma |
| `npm run db:seed` | Importa `data/preguntas-liga-saber-franciscano-2026.import.json` |
| `npm run db:studio` | Prisma Studio |

## Formato JSON de preguntas

```json
{
  "text": "...",
  "modelAnswer": "...",
  "category": "...",
  "basePoints": 10,
  "isTiebreaker": false
}
```

`modelAnswer` se guarda como `respuestaOficial`. No hay corrección automática ni variantes de texto.
