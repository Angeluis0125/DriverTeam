# DriverTeam

Plataforma para **choferes independientes**: reservas directas, precio estimado del trayecto, clientes, fidelización y finanzas. No es una app de despacho tipo Uber. Cada chofer tiene su propia página (`tu-dominio.com/<link>`) donde sus clientes reservan directo con él.

## Funciones

| Para el cliente | Para el chofer |
|---|---|
| Autocompletado de origen y destino | Onboarding: perfil, link, tarifas, horario y métodos de pago |
| Precio aproximado al instante (distancia y tiempo con tráfico) | Horario semanal con varios bloques por día, días bloqueados y horarios especiales |
| Elige día y hora entre los horarios realmente libres | Margen entre viajes, anticipación mínima, días máximos y confirmación automática o manual |
| Reserva sin crear cuenta (nombre y teléfono) | Avisos de cada reserva: en el panel (tiempo real), push en el celular (PWA) y email |
| Descuento automático por cliente frecuente | Aceptar, rechazar, completar o marcar "no se presentó"; WhatsApp, llamada y ruta en Google Maps |
| Link para consultar o cancelar su reserva | **Registro de pagos** (efectivo, tarjeta, terminal, transferencia) y propinas; no cobra dentro de la app |
| | Clientes: historial, total pagado, notas y progreso de fidelización |
| | Finanzas: ingresos por día y por método, gastos, ganancia neta y exportación CSV |

**Tarifa:** `max(mínima, base + km × precio_km + min × precio_min)`, redondeada.
**Fidelización:** "cada N viajes, el siguiente con X % de descuento". Se identifica al cliente por teléfono.

## Stack

- **Next.js 15** (App Router, Server Actions, TypeScript) + Tailwind CSS 4
- **Supabase**: Postgres, Auth, Realtime y Row Level Security (cada chofer solo ve sus datos)
- **Google Maps Platform**: Routes API (distancia y tiempo) y Places API New (autocompletado). La llave solo vive en el servidor.
- **Resend** para email, **Web Push** (VAPID) para avisos al celular
- **Vercel** para hosting y Vercel Cron

Las reservas dobles se bloquean en la base de datos con una restricción de exclusión (`tstzrange` + `btree_gist`), así que no ocurren aunque dos clientes reserven el mismo horario a la vez.

## Desarrollo local

Requiere Node 20+ y Docker (para Supabase local).

```bash
npm install
```

```bash
npx supabase start
```

```bash
cp .env.example .env.local
```

Completa `.env.local` con la URL y las llaves que imprime `supabase start` (`API URL`, `anon key` y `service_role key`). Para probar sin Google Maps agrega `MAPS_MOCK=1`.

```bash
npm run dev
```

Abre http://localhost:3000, crea una cuenta, completa el onboarding y abre tu link público.

Pruebas unitarias (tarifa, disponibilidad, fidelización y zonas horarias):

```bash
npm test
```

Prueba de punta a punta (con Supabase local y `npm run dev` corriendo, y `MAPS_MOCK=1`):

```bash
node scripts/e2e.mjs
```

## Despliegue en Vercel

1. **Supabase**: crea un proyecto en supabase.com y aplica las migraciones:
   ```bash
   npx supabase link --project-ref <tu-ref>
   ```
   ```bash
   npx supabase db push
   ```
   En *Authentication → URL Configuration* pon tu dominio de Vercel como **Site URL** y agrega `https://<tu-dominio>/auth/callback` en **Redirect URLs**.
2. **Google Cloud**: habilita *Routes API* y *Places API (New)*, crea una llave restringida a esas dos APIs y úsala como `GOOGLE_MAPS_SERVER_KEY`.
3. **Llaves VAPID** para push:
   ```bash
   npx web-push generate-vapid-keys
   ```
4. **Vercel**: importa el repositorio (framework Next.js) y agrega las variables de `.env.example` en *Settings → Environment Variables*: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAPS_SERVER_KEY`, `MAPS_REGION`, `QUOTE_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y, si usarás email, `RESEND_API_KEY` y `EMAIL_FROM`. No definas `MAPS_MOCK` en producción.
5. El cron de `vercel.json` corre **una vez al día** (12:00 UTC, compatible con el plan Hobby). Cancela las reservas pendientes que ya pasaron y le manda a cada chofer su agenda del día.

## Estructura

```
app/
  (marketing)/          landing
  (auth)/               login, registro y magic link
  onboarding/           configuración inicial del chofer
  [slug]/               página pública de reservas
  [slug]/r/[token]/     el cliente consulta o cancela su reserva
  dashboard/            inicio, reservas, clientes, finanzas, ajustes
  api/                  places, quote, availability, bookings, push, cron
lib/
  pricing.ts            cálculo de tarifa (pruebas en tests/)
  availability.ts       horarios libres según reglas, excepciones y reservas
  loyalty.ts            reglas de fidelización
  maps.ts               Google Routes y Places (solo servidor)
  notify.ts             panel + push + email
  public-booking.ts     lectura pública de choferes y horarios
supabase/migrations/    esquema, RLS, reportes y rate limiting
```

## Próximos pasos sugeridos

- WhatsApp (API de Meta o Twilio) para avisos al chofer y al cliente
- Reservas creadas manualmente por el chofer (cuando le escriben directo)
- Captcha (Cloudflare Turnstile) en el formulario de reserva si aparece spam
- Subida de foto de perfil (Supabase Storage)
- Pagos en línea (Stripe o Mercado Pago) cuando se decida agregarlos
