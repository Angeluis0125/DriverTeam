// Prueba de punta a punta. Requiere: app en BASE_URL con MAPS_MOCK=1 y Supabase local.
// Uso: node scripts/e2e.mjs   (SHOTS=<carpeta> para guardar capturas)
import { createRequire } from "node:module";
// playwright se resuelve con require para usar la instalación global si existe (npm i -D playwright si no)
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS;
const id = Date.now().toString(36);
const email = `chofer-${id}@example.com`;
const slug = `chofer-${id}`;
const phone = `55${String(Date.now()).slice(-8)}`;

const browser = await chromium.launch();
// Cada corrida usa su propia IP simulada para no chocar con el rate limit entre corridas
const fakeIp = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
const newContext = browser.newContext.bind(browser);
browser.newContext = (opts = {}) => newContext({ ...opts, extraHTTPHeaders: { "x-forwarded-for": fakeIp, ...(opts.extraHTTPHeaders ?? {}) } });
const mobile = { ...devices["Pixel 7"] };
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
const step = (s) => console.log(`✓ ${s}`);

// --- Chofer: registro + onboarding ---
const driverCtx = await browser.newContext(mobile);
const dp = await driverCtx.newPage();
await dp.goto(`${BASE}/signup`);
await dp.fill('input[name="email"]', email);
await dp.fill('input[name="password"]', "contrasena-segura");
await dp.click('button:has-text("Crear cuenta")');
await dp.waitForURL("**/onboarding");
step("registro");

await dp.fill('input[name="full_name"]', "Juan Pérez");
await dp.fill('input[name="slug"]', slug);
await dp.fill('input[name="vehicle"]', "Toyota Corolla gris");
// agregar fin de semana para que "mañana" siempre tenga horario
for (const wd of ["Sábado", "Domingo"]) {
  await dp.locator(`div:has(> div:text-is("${wd}")) >> button:has-text("Bloque")`).click();
}
await shot(dp, "01-onboarding");
await dp.click('button:has-text("Publicar mi página")');
await dp.waitForURL("**/dashboard?welcome=1");
await shot(dp, "02-dashboard");
step("onboarding y publicación");

// Fidelización: cada 1 viaje, el siguiente 10% (para probarlo rápido); sin anticipación mínima
await dp.goto(`${BASE}/dashboard/settings`);
const loyalty = dp.locator("#fidelizacion");
await loyalty.locator('input[name="active"]').check();
await loyalty.locator('input[name="trips_required"]').fill("1");
await loyalty.locator('input[name="discount_pct"]').fill("10");
await loyalty.locator('button:has-text("Guardar")').click();
await loyalty.getByText("Programa de fidelización guardado").waitFor();
step("fidelización activada");

// --- Cliente: reserva ---
async function book({ expectDiscount }) {
  const ctx = await browser.newContext(mobile);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/${slug}`);
  await p.getByRole("heading", { name: "Juan Pérez" }).waitFor();
  await p.getByRole("combobox", { name: "Origen" }).fill("Aeropuerto CDMX Terminal 1");
  await p.getByRole("option").first().click();
  await p.getByRole("combobox", { name: "Destino" }).fill("Polanco, Ciudad de México");
  await p.getByRole("option").first().click();
  await p.click('button:has-text("Calcular precio")');
  await p.getByText("Precio aproximado").waitFor();
  // mañana (hay horario todos los días)
  await p.locator("section:has(h2:text('¿Cuándo?')) button").nth(1).click();
  const slots = p.locator("section:has(h2:text('¿Cuándo?')) .grid button");
  await slots.first().waitFor();
  const n = await slots.count();
  await slots.nth(expectDiscount ? Math.min(6, n - 1) : 0).click();
  await p.fill('input[name="name"]', "María López");
  await p.fill('input[name="phone"]', phone);
  await shot(p, expectDiscount ? "05-public-2" : "03-public");
  await p.locator('button:has-text("Reservar")').last().click();
  await p.getByText("¡Reserva enviada!").waitFor();
  if (expectDiscount) await p.getByText("Incluye 10% de descuento").waitFor();
  await shot(p, expectDiscount ? "06-success-discount" : "04-success");
  const manage = await p.getByRole("link", { name: "Ver o cancelar mi reserva" }).getAttribute("href");
  await ctx.close();
  return manage;
}
const manage1 = await book({ expectDiscount: false });
step("cliente reserva sin cuenta");

// --- Chofer: aviso, aceptar, pagar ---
await dp.goto(`${BASE}/dashboard`);
await dp.getByRole("button", { name: /Avisos \(1 sin leer\)/ }).waitFor();
step("aviso en el panel");
await dp.goto(`${BASE}/dashboard/bookings?tab=pending`);
await dp.getByText("María López").first().click();
await dp.waitForURL("**/dashboard/bookings/*");
await dp.click('button:has-text("Aceptar")');
await dp.getByText("Confirmada").first().waitFor();
const wa = await dp.getByRole("link", { name: "WhatsApp" }).getAttribute("href");
assert.match(wa, new RegExp(`^https://wa\\.me/52${phone}`), `WhatsApp sin lada: ${wa}`);
await shot(dp, "07-booking-confirmed");
step("chofer acepta");
await dp.fill('input[name="amount"]', "350");
await dp.fill('input[name="tip"]', "50");
await dp.selectOption('select[name="method"]', "terminal");
await dp.click('button:has-text("Registrar pago y completar")');
await dp.getByText("Pago registrado").first().waitFor();
await dp.getByText("Completada").first().waitFor();
step("pago registrado (terminal) y viaje completado");

await dp.goto(`${BASE}/dashboard/reports`);
await dp.getByText("$400.00").first().waitFor();
await dp.getByText("Terminal bancaria").waitFor();
await shot(dp, "08-reports");
step("finanzas muestran $400 (350 + 50 de propina)");

const csv = await dp.request.get(`${BASE}/dashboard/reports/export?from=2020-01-01&to=2099-12-31`);
assert.equal(csv.status(), 200);
assert.match(await csv.text(), /María López.*Terminal bancaria,350,50,400/);
step("exportación CSV");

// --- Segunda reserva con descuento de fidelización ---
const manage2 = await book({ expectDiscount: true });
step("segunda reserva con 10% de descuento");

// --- Doble reserva: el mismo horario debe rechazarse ---
{
  const ctx = await browser.newContext();
  const r = ctx.request;
  const q = await (await r.post(`${BASE}/api/quote`, { data: { slug, pickup: { text: "Aeropuerto CDMX Terminal 1" }, dropoff: { text: "Polanco, Ciudad de México" } } })).json();
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const av = await (await r.get(`${BASE}/api/availability?slug=${slug}&date=${tomorrow}&duration=${q.quote.durationMin}`)).json();
  const startAt = av.slots[0].start;
  const body = { slug, quoteToken: q.token, startAt, name: "Cliente Prueba", phone: "5511111111" };
  const [a, b] = await Promise.all([r.post(`${BASE}/api/bookings`, { data: body }), r.post(`${BASE}/api/bookings`, { data: { ...body, phone: "5522222222" } })]);
  const codes = [a.status(), b.status()].sort();
  assert.deepEqual(codes, [200, 409], `esperaba 200 y 409, recibí ${codes}`);
  step("doble reserva simultánea bloqueada (200 + 409)");
  const tampered = await r.post(`${BASE}/api/bookings`, { data: { ...body, quoteToken: q.token.slice(0, -2) + "xx", startAt: av.slots.at(-1).start } });
  assert.equal(tampered.status(), 400);
  step("cotización alterada rechazada");
  await ctx.close();
}

// --- Cliente cancela ---
{
  const ctx = await browser.newContext(mobile);
  const p = await ctx.newPage();
  await p.goto(`${BASE}${manage2}`);
  await p.click('button:has-text("Cancelar reserva")');
  await p.getByText("Cancelada").waitFor();
  await shot(p, "09-cancelled");
  await p.goto(`${BASE}${manage1}`);
  await p.getByText("Completada").waitFor();
  await ctx.close();
  step("cliente cancela su reserva");
}

// --- Clientes y fidelización ---
await dp.goto(`${BASE}/dashboard/customers`);
await dp.getByText("María López").click();
await dp.getByText("Fidelización").waitFor();
await shot(dp, "10-customer");
step("ficha de cliente");

// --- Aislamiento entre choferes (RLS) ---
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/signup`);
  await p.fill('input[name="email"]', `otro-${id}@example.com`);
  await p.fill('input[name="password"]', "contrasena-segura");
  await p.click('button:has-text("Crear cuenta")');
  await p.waitForURL("**/onboarding");
  await p.fill('input[name="full_name"]', "Otro Chofer");
  await p.fill('input[name="slug"]', `otro-${id}`);
  await p.click('button:has-text("Publicar mi página")');
  await p.waitForURL("**/dashboard?welcome=1");
  await p.goto(`${BASE}/dashboard/customers`);
  await p.getByText("Tus clientes aparecerán aquí").waitFor();
  await ctx.close();
  step("otro chofer no ve los clientes del primero");
}

// --- Cron diario ---
{
  const r = await (await browser.newContext()).request;
  assert.equal((await r.get(`${BASE}/api/cron/daily`)).status(), 401);
  const ok = await r.get(`${BASE}/api/cron/daily`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET || "local-cron"}` } });
  assert.equal(ok.status(), 200);
  step("cron protegido y funcionando");
}

await browser.close();
console.log("\nTodo OK");
