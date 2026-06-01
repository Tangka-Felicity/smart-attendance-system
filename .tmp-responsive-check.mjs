import { chromium } from 'playwright';

const sizes = [
  { name: 'laptop',  w: 1400, h: 900 },
  { name: 'tablet',  w: 900,  h: 900 },
  { name: 'mobile',  w: 390,  h: 800 },
];

const routes = ['/overview', '/sessions', '/reports', '/users'];

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  for (const size of sizes) {
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
    const page = await ctx.newPage();

    // Screenshot login at this size
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `.tmp-resp-${size.name}-login.png`, fullPage: false });

    // Login
    await page.fill('#email', 'admin@institution.edu');
    await page.fill('#password', 'Admin@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/overview/, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);

    for (const route of routes) {
      await page.goto(`http://localhost:5173${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const path = route.replace('/', '');
      await page.screenshot({ path: `.tmp-resp-${size.name}-${path}.png`, fullPage: false });
    }

    // Measure sidebar width
    await page.goto('http://localhost:5173/overview', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const sidebar = await page.$('.app-sidebar');
    const box = sidebar ? await sidebar.boundingBox() : null;
    console.log(`${size.name} (${size.w}px) sidebar box:`, box);

    // On mobile, click hamburger to show overlay
    if (size.name === 'mobile') {
      await page.click('.app-hamburger');
      await page.waitForTimeout(400);
      await page.screenshot({ path: '.tmp-resp-mobile-overlay.png', fullPage: false });
      const sb2 = await (await page.$('.app-sidebar')).boundingBox();
      console.log('mobile sidebar after open:', sb2);
    }

    await ctx.close();
  }

  await browser.close();
})().catch((e) => {
  console.error('ERR:', e);
  process.exit(1);
});
