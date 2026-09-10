import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
for (const path of [
  "/",
  "/perfumes",
  "/perfumes/bruma-dorada",
  "/sitemap.xml",
  "/robots.txt",
]) {
  const r = await fetch(base + path);
  assert.equal(r.status, 200, path);
  const html = await r.text();
  if (path === "/perfumes/bruma-dorada") {
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /Bruma Dorada/);
    assert.match(html, /rel="canonical"/);
  }
}
assert.equal((await fetch(base + "/api/products/missing")).status, 404);
for (const [path, method] of [
  ["products", "GET"],
  ["products", "POST"],
  ["settings", "PUT"],
  ["upload", "POST"],
])
  assert.equal(
    (await fetch(`${base}/api/admin/${path}`, { method })).status,
    401,
  );
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.waitForLoadState("networkidle");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `test-results/home-${viewport.width}.png`,
      fullPage: true,
    });
    await page.goto(base + "/perfumes");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("Nombre o marca…").fill("Bruma");
    await expect(page.locator(".product-card")).toHaveCount(1);
    await page.locator(".product-card").click();
    await page.getByRole("button", { name: "Añadir a mi bolsa" }).click();
    await page.getByRole("link", { name: "Ver bolsa ↗", exact: true }).click();
    await page.locator(".cart-row").waitFor();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await page.locator(".cart-row").waitFor();
    assert.equal(await page.locator(".cart-row").count(), 1);
    await page.getByLabel("Nombre", { exact: true }).fill("Cliente de prueba");
    await page.getByLabel("WhatsApp con código de país").fill("573001234567");
    await page.getByLabel("Ciudad y departamento").fill("Medellín, Antioquia");
    await page.getByRole("checkbox", { name: /Autorizo/ }).check();
    await page.getByRole("button", { name: "Registrar solicitud" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "WhatsApp configurado" })
      .waitFor();
    const changedProducts = await (await fetch(base + "/api/products")).json();
    changedProducts[0].variants[0].price = 300000;
    await page.route("**/api/products", (route) =>
      route.fulfill({ json: changedProducts }),
    );
    await page.getByRole("button", { name: "Registrar solicitud" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Actualizamos" })
      .waitFor();
    changedProducts[0].variants[0].available = false;
    await page.getByRole("button", { name: "Registrar solicitud" }).click();
    await page.getByText("Agotado o retirado del catálogo").waitFor();
    await page.getByRole("button", { name: "Registrar solicitud" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Retira las presentaciones" })
      .waitFor();
    changedProducts[0].variants[0].available = true;
    const requests = [];
    await page.route("**/api/orders", (route) => {
      const request = route.request().postDataJSON();
      requests.push(request);
      if (requests.length === 1) return route.abort();
      return route.fulfill({
        json: {
          id: request.requestId,
          whatsappUrl: `https://wa.me/573000000000?text=${encodeURIComponent("Solicitud " + request.requestId + "\nSubtotal: $600.000")}`,
        },
      });
    });
    await page.route("**/api/settings", (route) =>
      route.fulfill({
        json: { name: "Tienda de prueba", whatsapp: "573000000000" },
      }),
    );
    await page.getByRole("button", { name: "Registrar solicitud" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Actualizamos" })
      .waitFor();
    await page.getByRole("button", { name: "Registrar solicitud" }).click();
    const link = page.getByRole("link", { name: "Abrir WhatsApp" });
    await page.getByRole("status").filter({ hasText: "Reintenta" }).waitFor();
    await page.getByRole("button", { name: "Registrar solicitud" }).click();
    await expect(link).toBeVisible();
    assert.equal(requests.length, 2);
    assert.equal(requests[0].requestId, requests[1].requestId);
    await expect(page.locator(".order-reference")).toContainText(
      requests[1].requestId,
    );
    assert.match(
      decodeURIComponent(await link.getAttribute("href")),
      /Subtotal:/,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "PASS: SSR, SEO, 404, protección API, filtros, persistencia, cambios de precio, agotados, enlace WhatsApp y vistas móvil/escritorio.",
  );
} finally {
  await browser.close();
}
