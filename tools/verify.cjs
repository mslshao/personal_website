const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
const out = path.join(root, '.local', 'checks');

(async () => {
  await fs.mkdir(out, { recursive: true });
  // Use the installed Chrome; TEST_BROWSER=msedge or chromium is also supported.
  const browser = await chromium.launch({ channel: process.env.TEST_BROWSER || 'chrome', headless: true });
  const context = await browser.newContext({ reducedMotion:'reduce' });
  const errors = [];
  const failedAssets = [];
  const externalRequests = [];
  const browserInjectedRequests = [];
  // No test submission can reach the contact provider.
  await context.route('https://formspree.io/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', req => {
    if (!/^https?:/.test(req.url())) return;
    const url=new URL(req.url());
    // This computer's AdGuard injects its own scripts into HTTP responses.
    // Record those separately; they are absent from the site's source and ZIP.
    if (url.hostname==='local.adguard.org') browserInjectedRequests.push(req.url());
    else if (url.origin!==new URL(base).origin) externalRequests.push(req.url());
  });
  page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) failedAssets.push(r.url()); });
  const report = [];
  try {
    for (const width of [320, 390, 600, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height:900 });
      await page.goto(base, { waitUntil:'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      assert.match(await page.title(), /Michael Shao/);
      await page.locator('[data-lightbox]').last().scrollIntoViewIfNeeded();
      // Load every lazy image before checking geometry or taking screenshots.
      for (const img of await page.locator('.gallery img').all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate(el => el.decode());
      }
      const geometry = await page.evaluate(() => ({width:innerWidth, pageWidth:document.documentElement.scrollWidth,
        badImages:[...document.querySelectorAll('.gallery img')].filter(i=>!i.complete || !i.naturalWidth).length}));
      assert.ok(geometry.pageWidth <= width, `Horizontal overflow at ${width}: ${geometry.pageWidth}`);
      assert.equal(geometry.badImages,0);
      await page.locator('.nav a[href="#photographs"]').click();
      const section = await page.locator('#photographs').boundingBox();
      const nav = await page.locator('.nav').boundingBox();
      assert.ok(section.y >= 0, 'Anchor scrolled past section');
      if (width > 480) assert.ok(section.y >= nav.height, 'Sticky navigation hides anchor');
      await page.evaluate(() => scrollTo(0,0));
      await page.screenshot({path:path.join(out,`hero-${width}.png`)});
      await page.screenshot({path:path.join(out,`after-${width}.png`), fullPage:true});
      report.push(geometry);
    }

    const links = page.locator('[data-lightbox]');
    assert.equal(await links.count(),11);
    await links.first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('dialog').evaluate(el=>el.open),true);
    assert.equal(await page.locator('#lightbox-close').evaluate(el=>el===document.activeElement),true);
    await page.locator('#lightbox-img').evaluate(el=>el.decode());
    const box=await page.locator('dialog').boundingBox();
    assert.ok(Math.abs((box.x+box.width/2)-720)<12, 'Dialog must be horizontally centered');
    await page.screenshot({path:path.join(out,'after-dialog-desktop.png')});
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#lightbox-count').textContent(),'11 / 11');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#lightbox-count').textContent(),'1 / 11');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.closest('dialog')!==null),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').evaluate(el=>el.open),false);
    assert.equal(await links.first().evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('lightbox-open')),false);
    // Every photograph opens the correct full image and a meaningful caption.
    for (let i=0;i<11;i++) {
      await links.nth(i).click();
      await page.locator('#lightbox-img').evaluate(el=>el.decode());
      assert.equal(await page.locator('#lightbox-img').getAttribute('src'),await links.nth(i).evaluate(el=>el.href));
      assert.ok((await page.locator('#lightbox-caption').textContent()).length>10);
      await page.locator('#lightbox-close').click();
    }
    await page.setViewportSize({width:320,height:568});
    await links.last().click();
    await page.locator('#lightbox-img').evaluate(el=>el.decode());
    const mobileBox=await page.locator('dialog').boundingBox();
    assert.ok(mobileBox.x>=0 && mobileBox.y>=0 && mobileBox.y+mobileBox.height<=568);
    const mobileCaption=await page.locator('#lightbox-caption').boundingBox();
    assert.ok(mobileCaption.y+mobileCaption.height<=mobileBox.y+mobileBox.height,'Caption must fit in mobile dialog');
    await page.screenshot({path:path.join(out,'after-dialog-mobile.png')});
    await page.mouse.click(1,1);
    assert.equal(await page.locator('dialog').evaluate(el=>el.open),false);

    // Native form validation and form data only; never submit to the service.
    const form=page.locator('.contact-form');
    assert.equal(await form.evaluate(el=>el.checkValidity()),false);
    await page.getByLabel('Name',{exact:true}).fill('Local test');
    await page.getByLabel('Email',{exact:true}).fill('invalid');
    await page.getByLabel('Message',{exact:true}).fill('Local validation only.');
    assert.equal(await form.evaluate(el=>el.checkValidity()),false);
    await page.getByLabel('Email',{exact:true}).fill('test@example.com');
    assert.equal(await form.evaluate(el=>el.checkValidity()),true);
    assert.deepEqual(await form.evaluate(el=>Object.fromEntries(new FormData(el))),
      {_gotcha:'',name:'Local test',email:'test@example.com',message:'Local validation only.'});

    // Check all candidates, even if this browser didn't select a particular image or font.
    const refs=await page.evaluate(()=>{
      const refs=[...document.querySelectorAll('[src], [href]')].flatMap(el=>[el.getAttribute('src'),el.getAttribute('href')]).filter(Boolean);
      for (const img of document.querySelectorAll('[srcset]')) refs.push(...img.srcset.split(',').map(candidate=>candidate.trim().split(/\s+/)[0]));
      for (const sheet of document.styleSheets) {
        for (const match of [...sheet.cssRules].map(rule=>rule.cssText).join('\n').matchAll(/url\(["']?([^"')]+)["']?\)/g))
          refs.push(new URL(match[1],sheet.href).href);
      }
      return [...new Set(refs)];
    });
    for (const ref of refs) {
      const url=new URL(ref,base);
      if (url.origin!==new URL(base).origin) continue;
      if (url.hash && url.pathname==='/') assert.equal(await page.locator(url.hash).count(),1,`Missing anchor ${url.hash}`);
      else assert.equal((await context.request.get(url.href)).status(),200,`Missing ${url.href}`);
    }
    for (const file of ['robots.txt','sitemap.xml']) assert.equal((await context.request.get(`${base}/${file}`)).status(),200);
    for (const file of ['_archive/contact.php','.local/before/index.html','tools/preview.mjs'])
      assert.equal((await context.request.get(`${base}/${file}`)).status(),404);

    // Progressive enhancement: the gallery remains usable without JavaScript.
    const nojs=await browser.newContext({javaScriptEnabled:false});
    const fallback=await nojs.newPage();
    await fallback.goto(base);
    await fallback.locator('[data-lightbox]').first().click();
    assert.match(fallback.url(), /moraine-lake-1920\.webp$/);
    await nojs.close();

    // A failed image must explain the problem, allow a retry, and recover focus.
    const recovery=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    let attempts=0;
    await recovery.route('**/moraine-lake-1920.webp', async route=>{
      attempts++;
      if (attempts===1) await route.abort('failed');
      else await route.continue();
    });
    const retryPage=await recovery.newPage();
    await retryPage.goto(base);
    await retryPage.locator('[data-lightbox]').first().click();
    await retryPage.waitForFunction(()=>document.getElementById('lightbox-media').dataset.state==='error');
    assert.equal(await retryPage.locator('#lightbox-retry').isVisible(),true);
    await retryPage.screenshot({path:path.join(out,'photo-error-mobile.png')});
    await retryPage.locator('#lightbox-retry').click();
    await retryPage.waitForFunction(()=>document.getElementById('lightbox-media').dataset.state==='ready');
    assert.ok(attempts>=2);
    assert.equal(await retryPage.locator('#lightbox-close').evaluate(el=>el===document.activeElement),true);
    assert.equal(await retryPage.locator('#lightbox-status').isVisible(),false);
    await retryPage.keyboard.press('Escape');
    await recovery.close();

    // Delay a photo until the loading message has been observed.
    const delayed=await browser.newContext({reducedMotion:'reduce'});
    let releasePhoto;
    const photoGate=new Promise(resolve=>{releasePhoto=resolve;});
    await delayed.route('**/oahu-night-1920.webp',async route=>{await photoGate;await route.continue();});
    const slow=await delayed.newPage();
    await slow.goto(base);
    await slow.locator('[data-lightbox]').nth(1).click();
    assert.equal(await slow.locator('#lightbox-media').getAttribute('data-state'),'loading');
    assert.equal(await slow.locator('#lightbox-message').textContent(),'Loading photograph…');
    releasePhoto();
    await slow.waitForFunction(()=>document.getElementById('lightbox-media').dataset.state==='ready');
    await delayed.close();
    const offline=await browser.newContext({reducedMotion:'reduce',viewport:{width:844,height:390}});
    await offline.route('**/*',route=>route.request().url().startsWith(base) ? route.continue() : route.abort());
    const small=await offline.newPage();
    await small.goto(base);
    await small.evaluate(()=>document.fonts.ready);
    assert.ok(await small.evaluate(()=>document.fonts.check('700 16px "Bricolage Grotesque"') && document.fonts.check('400 16px "Source Serif 4"') && document.fonts.check('400 16px "IBM Plex Mono"')),'Fonts must load with external requests blocked');
    await small.keyboard.press('Tab');
    assert.equal(await small.locator('.skip-link').evaluate(el=>el===document.activeElement),true);
    await small.keyboard.press('Enter');
    assert.equal(await small.locator('main').evaluate(el=>el===document.activeElement),true);
    assert.equal(await small.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
    await small.locator('[data-lightbox]').last().click();
    await small.locator('#lightbox-img').evaluate(el=>el.decode());
    const landscape=await small.locator('dialog').boundingBox();
    const landscapeCaption=await small.locator('#lightbox-caption').boundingBox();
    assert.ok(landscapeCaption.y+landscapeCaption.height<=landscape.y+landscape.height);
    await small.keyboard.press('Escape');
    await small.setViewportSize({width:320,height:900});
    await small.evaluate(()=>{document.documentElement.style.fontSize='200%';});
    assert.ok(await small.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Large text must reflow');
    await offline.close();
    assert.deepEqual(errors,[]);
    assert.deepEqual(failedAssets,[]);
    assert.deepEqual(externalRequests,[]);
    await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify({passed:true,base,viewports:report,errors,failedAssets,externalRequests,browserInjectedRequests,
      checks:['gallery decoding','modal centering','keyboard and focus return','all 11 photographs','mobile close','anchor offsets','form validation only','local assets including srcset and CSS','no-JS fallback','skip link','reduced motion','self-hosted fonts without external requests','landscape dialog','200% text reflow','failed photograph retry','delayed photograph feedback']},null,2));
    console.log('PASS: 6 viewport sizes, all 11 photographs, keyboard and focus, mobile dialog, anchors, form validation, local assets, no-JS fallback.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
