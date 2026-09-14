// Read-only storefront checks; never submits an order or changes remote data.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.argv[2] || "http://127.0.0.1:3107";
const products = await (await fetch(`${base}/api/products`)).json();
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const results = [];
const landingPaths = [
  "/categorias/mujer",
  "/categorias/hombre",
  "/categorias/unisex",
  "/marcas/lattafa",
  "/marcas/armaf",
  "/marcas/rasasi",
  "/marcas/bharara",
  "/marcas/maison-alhambra",
  "/marcas/al-haramain",
  "/marcas/game-of-spades",
  "/marcas/ariana-grande",
  "/marcas/paco-rabanne",
  "/marcas/carolina-herrera",
  "/marcas/dolce-gabbana",
  "/familias/dulces",
  "/familias/amaderados",
  "/familias/citricos",
  "/familias/florales",
  "/familias/frutales",
  "/familias/orientales",
  "/familias/especiados",
  "/familias/aromaticos",
  "/familias/acuaticos",
  "/colecciones/perfumes-arabes",
];
await mkdir("test-results/seo-browser", { recursive: true });
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of [
      "/",
      "/perfumes",
      "/guia-de-perfumes",
      ...landingPaths,
      `/perfumes/${products[0].slug}`,
    ]) {
      const response = await page.goto(base + path);
      await expect(page.locator("h1")).toHaveCount(1);
      await page.evaluate(() => document.fonts.ready);
      results.push({
        width,
        path,
        status: response.status(),
        ...(await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          brokenLoadedImages: [...document.images]
            .filter((i) => i.complete && !i.naturalWidth)
            .map((i) => i.currentSrc),
          imagesMissingAlt: [...document.images].filter(
            (i) => !i.hasAttribute("alt"),
          ).length,
        }))),
      });
      if (width === 390)
        await page.screenshot({
          path: `test-results/seo-browser/${path === "/" ? "home" : path.split("/").pop()}.png`,
          fullPage: true,
        });
    }
    if (width === 390) {
      await page.goto(base + "/perfumes");
      await page.waitForFunction(() =>
        Boolean(document.querySelector("#__nuxt")?.__vue_app__),
      );
      await page
        .getByRole("link", { name: "Siguiente →", exact: true })
        .click();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        /\/perfumes\?page=2$/,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /^index,/,
      );
      await page
        .getByRole("combobox", { name: "Categoría", exact: true })
        .selectOption("Mujer");
      await expect(page).toHaveURL(/category=Mujer/);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, follow",
      );
      await page.locator(".product-card").first().click();
      const firstName = await page.locator("h1").textContent();
      const related = page.locator(".product-card").first();
      if (await related.count()) {
        await related.click();
        await expect(page.locator("h1")).not.toHaveText(firstName);
      }
      await page.goto(base + "/categorias/mujer");
      await expect(page.locator(".product-card")).toHaveCount(12);
      await expect(page.locator(".pagination-page-btn")).not.toHaveCount(0);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const previousScroll = await page.evaluate(() => window.scrollY);
      await page
        .getByRole("link", { name: "2", exact: true })
        .evaluate((element) => element.click());
      await expect(page).toHaveURL(/\/categorias\/mujer\?page=2$/);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeLessThan(previousScroll);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        /\/categorias\/mujer\?page=2$/,
      );
    }
    results.push({ width, errors });
    await page.close();
  }
  const noJS = await browser.newPage({ javaScriptEnabled: false });
  await noJS.goto(base + "/perfumes?page=2");
  await expect(noJS.locator(".product-card")).toHaveCount(12);
  await noJS.goto(base + `/perfumes/${products[0].slug}`);
  await expect(noJS.locator(".description")).toContainText(
    products[0].description,
  );
  await expect(noJS.locator(".price")).toContainText("COP");
  await noJS.goto(base + "/marcas/lattafa");
  await expect(noJS.locator(".product-card")).toHaveCount(12);
  results.push({
    javascriptDisabled:
      "Product description, price and page 2 product links visible",
  });
} finally {
  await writeFile(
    "test-results/seo-browser/results.json",
    JSON.stringify(results, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(results));
if (results.some((r) => r.overflow || r.errors?.length || r.imagesMissingAlt))
  process.exitCode = 1;
