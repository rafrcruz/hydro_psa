import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1512, height: 982 } });

const shots = [
  { url: 'http://127.0.0.1:4200/relatorio', path: 'comparison/origem-relatorio.png' },
  { url: 'http://127.0.0.1:5173/solicitante/chamados', path: 'comparison/destino-psa.png' },
  { url: 'http://127.0.0.1:4200/admin', path: 'comparison/origem-admin.png' },
  { url: 'http://127.0.0.1:5173/automacao/painel', path: 'comparison/destino-automacao.png' }
];

for (const item of shots) {
  const page = await context.newPage();
  await page.goto(item.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.screenshot({ path: item.path, fullPage: true });
  await page.close();
}

await browser.close();
