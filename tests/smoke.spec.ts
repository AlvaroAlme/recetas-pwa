/**
 * Prueba de humo de Vigía con Playwright (@playwright/test), salida de la
 * auditoría de la fase 13 (audit/report.md). Repite el recorrido principal:
 * entrar, ver el inventario y apuntar, tachar y quitar una línea de la lista
 * de la compra (lo deja todo como estaba).
 *
 * NO la ejecuta `npm test` (node --test solo busca *.test.js). Para usarla
 * hace falta @playwright/test, que no está instalado.
 *
 * Contra el servidor de desarrollo, con la cuenta de prueba de Ana (base de
 * datos de DESARROLLO). Se puede cambiar con BASE_URL, E2E_EMAIL y
 * E2E_CONTRASENA.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL ?? 'ana@prueba.test';
const CONTRASENA = process.env.E2E_CONTRASENA ?? 'una clave larga';

test.describe('Entrar se ve en los tres anchos', () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 375, height: 812 },
  ]) {
    test(`${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`${BASE_URL}/entrar`);
      await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
      // Nada se sale por los lados.
      const sobra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(sobra).toBeLessThanOrEqual(0);
    });
  }
});

test('entrar, ver el inventario y usar la lista de la compra', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE_URL}/entrar`);
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(CONTRASENA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();

  await page.getByRole('link', { name: 'Lista' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Lista' })).toBeVisible();

  const nombre = `Prueba humo ${Date.now()}`;
  await page.getByRole('combobox', { name: '¿Qué hay que comprar?' }).fill(nombre);
  await page.getByRole('button', { name: 'Añadir' }).click();
  const linea = page.getByRole('button', { name: nombre, exact: true });
  await expect(linea).toHaveAttribute('aria-pressed', 'false');

  await linea.click();
  await expect(page.getByRole('button', { name: nombre, exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: `Quitar «${nombre}»` }).click();
  await expect(page.getByRole('button', { name: nombre, exact: true })).toHaveCount(0);
});
