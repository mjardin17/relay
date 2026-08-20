import fs from 'fs';
import path from 'path';
import { BusinessWebsiteContext, WebsiteBrandProfile, WebsiteComponent, WebsitePage, CompiledSite } from '../types/websiteBuilder';

export class WebsiteRendererService {
  private static instance: WebsiteRendererService;

  private constructor() {}

  public static getInstance(): WebsiteRendererService {
    if (!WebsiteRendererService.instance) {
      WebsiteRendererService.instance = new WebsiteRendererService();
    }
    return WebsiteRendererService.instance;
  }

  public exportSiteToDisk(compiledSite: CompiledSite, baseDir?: string): { exportPath: string; files: string[] } {
    const exportPath = baseDir || path.resolve(process.cwd(), 'dist/exported-sites', compiledSite.tenantId);
    fs.mkdirSync(exportPath, { recursive: true });

    const writtenFiles: string[] = [];

    // Write all compiled HTML pages
    for (const page of compiledSite.pages) {
      const filePath = path.join(exportPath, page.filename);
      const parentDir = path.dirname(filePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(filePath, page.html, 'utf-8');
      writtenFiles.push(page.filename);
    }

    // Write all static assets (CSS, etc.)
    for (const asset of compiledSite.assets) {
      const assetPath = path.join(exportPath, asset.path);
      const parentDir = path.dirname(assetPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(assetPath, asset.content, 'utf-8');
      writtenFiles.push(asset.path);
    }

    // Write sitemap.xml
    if (compiledSite.sitemapXml) {
      fs.writeFileSync(path.join(exportPath, 'sitemap.xml'), compiledSite.sitemapXml, 'utf-8');
      writtenFiles.push('sitemap.xml');
    }

    // Write robots.txt
    if (compiledSite.robotsTxt) {
      fs.writeFileSync(path.join(exportPath, 'robots.txt'), compiledSite.robotsTxt, 'utf-8');
      writtenFiles.push('robots.txt');
    }

    // Write manifest.json
    if (compiledSite.manifestJson) {
      fs.writeFileSync(path.join(exportPath, 'manifest.json'), compiledSite.manifestJson, 'utf-8');
      writtenFiles.push('manifest.json');
    }

    return {
      exportPath,
      files: writtenFiles
    };
  }

  public compileSite(
    projectId: string,
    tenantId: string,
    versionId: string,
    contentHash: string,
    siteName: string,
    pages: WebsitePage[],
    brand: WebsiteBrandProfile,
    context: BusinessWebsiteContext,
    domain?: string
  ): CompiledSite {
    const compiledPages: Array<{
      slug: string;
      filename: string;
      html: string;
      title: string;
      metaDescription: string;
    }> = [];

    const navLinks = pages
      .filter(p => p.isPublished)
      .sort((a, b) => a.navOrder - b.navOrder)
      .map(p => ({
        label: p.title,
        slug: p.slug,
        url: p.isIndex || p.slug === 'home' ? '/' : `/${p.slug}.html`
      }));

    for (const page of pages) {
      const filename = page.isIndex || page.slug === 'home' ? 'index.html' : `${page.slug}.html`;
      const html = this.renderPageToHtml(page, pages, navLinks, brand, context, domain);
      compiledPages.push({
        slug: page.slug,
        filename,
        html,
        title: page.title,
        metaDescription: page.metaDescription
      });
    }

    const cssContent = this.generateGlobalCss(brand);
    const sitemapXml = this.generateSitemapXml(domain || 'https://example.com', pages);
    const robotsTxt = this.generateRobotsTxt(domain || 'https://example.com');
    const manifestJson = JSON.stringify(
      {
        name: brand.brandName || siteName,
        short_name: siteName,
        description: context.description?.value || 'Professional Local Services',
        start_url: '/',
        display: 'standalone',
        background_color: brand.colors.background,
        theme_color: brand.colors.primary,
        icons: []
      },
      null,
      2
    );

    return {
      projectId,
      tenantId,
      versionId,
      contentHash,
      siteName,
      domain,
      pages: compiledPages,
      assets: [
        {
          path: 'css/styles.css',
          content: cssContent,
          contentType: 'text/css'
        }
      ],
      sitemapXml,
      robotsTxt,
      manifestJson,
      compiledAt: new Date().toISOString()
    };
  }

  public renderPageToHtml(
    page: WebsitePage,
    allPages: WebsitePage[],
    navLinks: Array<{ label: string; slug: string; url: string }>,
    brand: WebsiteBrandProfile,
    context: BusinessWebsiteContext,
    domain?: string
  ): string {
    const jsonLd = this.generateJsonLd(page, brand, context, domain);
    const isDarkTheme = brand.colors.background.toLowerCase().includes('#0') || brand.colors.background.toLowerCase().includes('#1');
    const bodyHtml = page.components
      .sort((a, b) => a.order - b.order)
      .map(comp => this.renderComponentHtml(comp, brand, context))
      .join('\n');

    const canonicalHref = domain
      ? `${domain.replace(/\/$/, '')}/${page.isIndex || page.slug === 'home' ? '' : page.slug + '.html'}`
      : `/${page.isIndex || page.slug === 'home' ? '' : page.slug + '.html'}`;

    const isStudio = context.industry?.value?.toLowerCase().includes('software') || 
                     context.industry?.value?.toLowerCase().includes('ai') || 
                     context.industry?.value?.toLowerCase().includes('studio') ||
                     brand.brandName.toLowerCase().includes('outpost');

    return `<!DOCTYPE html>
<html lang="en" class="h-full scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(page.metaTitle || `${page.title} | ${brand.brandName}`)}</title>
  <meta name="description" content="${this.escapeHtml(page.metaDescription || context.description?.value || '')}">
  <link rel="canonical" href="${canonicalHref}">
  <meta property="og:title" content="${this.escapeHtml(page.metaTitle || page.title)}">
  <meta property="og:description" content="${this.escapeHtml(page.metaDescription || context.description?.value || '')}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalHref}">
  <meta property="og:site_name" content="${this.escapeHtml(brand.brandName)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${this.escapeHtml(page.metaTitle || page.title)}">
  <meta name="twitter:description" content="${this.escapeHtml(page.metaDescription || context.description?.value || '')}">
  <link rel="stylesheet" href="css/styles.css">
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
</head>
<body class="${isDarkTheme ? 'bg-[#0B0F17] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'} font-sans antialiased min-h-full flex flex-col selection:bg-sky-500 selection:text-white" style="background-color: ${brand.colors.background}; color: ${brand.colors.text};">
  <!-- Header / Navigation Bar -->
  <header class="sticky top-0 z-40 ${isDarkTheme ? 'bg-[#0B0F17]/90 border-slate-800/80' : 'bg-white/95 border-slate-200'} backdrop-blur border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-20">
        <!-- Logo / Brand Identity -->
        <a href="/" class="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg p-1" aria-label="${this.escapeHtml(brand.brandName)} Home">
          <span class="text-xl sm:text-2xl font-extrabold tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading">${this.escapeHtml(brand.brandName)}</span>
        </a>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center space-x-8" aria-label="Main Navigation">
          ${navLinks
            .map(
              link => `
            <a href="${link.url}" class="text-sm font-medium ${
                link.slug === page.slug 
                  ? (isDarkTheme ? 'text-sky-400 font-semibold border-b-2 border-sky-400' : 'text-primary font-semibold border-b-2 border-primary') 
                  : (isDarkTheme ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              } py-2 transition-colors">
              ${this.escapeHtml(link.label)}
            </a>`
            )
            .join('')}
        </nav>

        <!-- Header Action CTA -->
        <div class="flex items-center space-x-4">
          ${isStudio ? `
          <a href="/projects.html" class="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
            ${this.escapeHtml(brand.ctaStyle?.primaryLabel || 'Explore Projects')}
          </a>` : `
          <div class="hidden sm:flex items-center space-x-4">
            <a href="tel:${this.escapeHtml(context.contactPhone?.value || '+15089991234')}" class="text-sm font-semibold text-slate-900 hover:text-primary flex items-center gap-1.5" aria-label="Call direct">
              <span>📞</span> ${this.escapeHtml(context.contactPhone?.value || '(508) 999-1234')}
            </a>
            <a href="/contact.html" class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-slate-800 rounded-lg shadow-sm transition-all">
              ${this.escapeHtml(brand.ctaStyle?.primaryLabel || 'Request Quote')}
            </a>
          </div>`}
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content Flow -->
  <main class="flex-grow" id="main-content">
${bodyHtml}
  </main>
</body>
</html>`;
  }

  private renderComponentHtml(comp: WebsiteComponent, brand: WebsiteBrandProfile, context: BusinessWebsiteContext): string {
    const isDarkTheme = brand.colors.background.toLowerCase().includes('#0') || brand.colors.background.toLowerCase().includes('#1');

    switch (comp.type) {
      case 'Hero': {
        const c = comp.content;
        return `
    <section class="relative ${isDarkTheme ? 'bg-[#0B0F17] border-b border-slate-800/60' : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white'} py-20 lg:py-28 px-4 sm:px-6 lg:px-8" id="${comp.id}">
      <div class="max-w-5xl mx-auto text-center space-y-6">
        ${c.badgeText ? `<div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium ${isDarkTheme ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">${this.escapeHtml(c.badgeText)}</div>` : ''}
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-heading leading-tight">${this.escapeHtml(c.headline)}</h1>
        <p class="text-lg sm:text-xl ${isDarkTheme ? 'text-slate-400' : 'text-slate-300'} max-w-3xl mx-auto leading-relaxed">${this.escapeHtml(c.subheadline)}</p>
        <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="${c.primaryCta?.target || '#contact'}" class="w-full sm:w-auto px-8 py-3.5 text-base font-bold ${isDarkTheme ? 'text-slate-950 bg-sky-400 hover:bg-sky-300' : 'text-slate-900 bg-amber-500 hover:bg-amber-400'} rounded-lg shadow-lg transition-all text-center">
            ${this.escapeHtml(c.primaryCta?.label || 'Get Started')}
          </a>
          ${c.secondaryCta ? `
          <a href="${c.secondaryCta.target}" class="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all text-center">
            ${this.escapeHtml(c.secondaryCta.label)}
          </a>` : ''}
        </div>
        ${c.trustBullets && c.trustBullets.length > 0 ? `
        <div class="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t ${isDarkTheme ? 'border-slate-800/80 text-slate-400' : 'border-slate-800 text-slate-300'} max-w-3xl mx-auto text-sm">
          ${c.trustBullets.map(b => `<div class="flex items-center justify-center gap-2"><span>✓</span><span>${this.escapeHtml(b)}</span></div>`).join('')}
        </div>` : ''}
      </div>
    </section>`;
      }

      case 'TextSection': {
        const c = comp.content;
        return `
    <section class="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto" id="${comp.id}">
      ${c.title ? `<h2 class="text-3xl font-bold tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading mb-4 ${c.alignment === 'CENTER' ? 'text-center' : ''}">${this.escapeHtml(c.title)}</h2>` : ''}
      ${c.subtitle ? `<p class="text-lg ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'} mb-6 ${c.alignment === 'CENTER' ? 'text-center' : ''}">${this.escapeHtml(c.subtitle)}</p>` : ''}
      <div class="prose ${isDarkTheme ? 'prose-invert text-slate-300' : 'prose-slate text-slate-700'} max-w-none leading-relaxed space-y-4">
        ${this.escapeHtml(c.bodyMarkdown).replace(/\n\n/g, '</p><p class="mt-4">')}
      </div>
    </section>`;
      }

      case 'ProductGrid': {
        const c = comp.content;
        return `
    <section class="py-20 px-4 sm:px-6 lg:px-8 ${isDarkTheme ? 'bg-[#0B0F17] border-b border-slate-800/60' : 'bg-slate-50 border-y border-slate-200'}" id="${comp.id}">
      <div class="max-w-7xl mx-auto space-y-12">
        <div class="text-center max-w-3xl mx-auto space-y-3">
          <h2 class="text-3xl sm:text-4xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading">${this.escapeHtml(c.sectionTitle)}</h2>
          ${c.sectionDescription ? `<p class="text-lg ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}">${this.escapeHtml(c.sectionDescription)}</p>` : ''}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          ${c.products
            .map(
              p => `
          <div class="${isDarkTheme ? 'bg-[#111827] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200'} rounded-xl p-8 border shadow-sm flex flex-col justify-between transition-all">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">${this.escapeHtml(p.stage || 'PRODUCTION')}</span>
                <span class="text-xs ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'} font-mono">${this.escapeHtml(p.category)}</span>
              </div>
              <h3 class="text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading">${this.escapeHtml(p.name)}</h3>
              <p class="text-sm ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'} leading-relaxed">${this.escapeHtml(p.tagline)}</p>
              <div class="space-y-2 pt-2">
                ${p.capabilities.map(cap => `<div class="text-xs ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'} flex items-center gap-2"><span class="text-sky-400">▪</span><span>${this.escapeHtml(cap)}</span></div>`).join('')}
              </div>
            </div>
            <div class="pt-6 mt-6 border-t ${isDarkTheme ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between">
              <span class="text-xs ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'} font-mono">${this.escapeHtml(p.stackSummary || 'TypeScript / Node / SQLite')}</span>
              <a href="${p.pageSlug ? `/${p.pageSlug}.html` : '/projects.html'}" class="text-sm font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1.5">
                ${this.escapeHtml(p.ctaLabel || 'Architecture & Proof')} <span>→</span>
              </a>
            </div>
          </div>`
            )
            .join('')}
        </div>
      </div>
    </section>`;
      }

      case 'ProofOfWork': {
        const c = comp.content;
        return `
    <section class="py-20 px-4 sm:px-6 lg:px-8 ${isDarkTheme ? 'bg-[#0B0F17] border-b border-slate-800/60' : 'bg-slate-900 text-white'}" id="${comp.id}">
      <div class="max-w-7xl mx-auto space-y-12">
        <div class="space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span>🛡️</span> <span>EVIDENCE-BACKED PROOF OF WORK</span>
          </div>
          <h2 class="text-3xl sm:text-4xl font-bold ${isDarkTheme ? 'text-white' : 'text-white'} font-heading">${this.escapeHtml(c.sectionTitle)}</h2>
          ${c.sectionDescription ? `<p class="text-base sm:text-lg ${isDarkTheme ? 'text-slate-400' : 'text-slate-300'} max-w-3xl">${this.escapeHtml(c.sectionDescription)}</p>` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${c.items
            .map(
              item => `
          <div class="${isDarkTheme ? 'bg-[#111827] border-slate-800 hover:border-slate-700' : 'bg-slate-800/90 border-slate-700'} border rounded-xl p-6 flex flex-col justify-between transition-all">
            <div class="space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-mono uppercase font-bold text-sky-400">${this.escapeHtml(item.type)}</span>
                <span class="px-2 py-0.5 rounded font-semibold ${item.verificationStatus === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                  ${this.escapeHtml(item.verificationStatus)}
                </span>
              </div>
              <h3 class="text-lg font-bold text-white font-heading">${this.escapeHtml(item.title)}</h3>
              <p class="text-xs text-slate-300 leading-relaxed">${this.escapeHtml(item.summary)}</p>
            </div>
            <div class="mt-6 pt-4 border-t ${isDarkTheme ? 'border-slate-800' : 'border-slate-700'} space-y-1.5 font-mono text-[11px] text-slate-400">
              <div class="truncate"><strong class="text-slate-500">Source:</strong> ${this.escapeHtml(item.sourceReference)}</div>
              ${item.evidenceHash ? `<div class="truncate"><strong class="text-slate-500">SHA256:</strong> ${this.escapeHtml(item.evidenceHash.substring(0, 16))}...</div>` : ''}
            </div>
          </div>`
            )
            .join('')}
        </div>
      </div>
    </section>`;
      }

      case 'CaseStudySection': {
        const c = comp.content;
        return `
    <section class="py-20 px-4 sm:px-6 lg:px-8 ${isDarkTheme ? 'bg-[#0B0F17] border-b border-slate-800/60' : 'bg-white'}" id="${comp.id}">
      <div class="max-w-5xl mx-auto space-y-10">
        <div class="space-y-3">
          <span class="text-xs uppercase font-bold tracking-widest text-sky-400">Case Study & Architecture</span>
          <h2 class="text-3xl sm:text-4xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading">${this.escapeHtml(c.title)}</h2>
          <p class="text-lg ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}">${this.escapeHtml(c.clientOrProduct)}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="${isDarkTheme ? 'bg-[#111827] border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-xl p-6 space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-rose-400">The Problem</h4>
            <p class="text-sm ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'} leading-relaxed">${this.escapeHtml(c.problemStatement)}</p>
          </div>
          <div class="${isDarkTheme ? 'bg-[#111827] border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-xl p-6 space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-sky-400">Deterministic Solution</h4>
            <p class="text-sm ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'} leading-relaxed">${this.escapeHtml(c.solutionArchitecture)}</p>
          </div>
          <div class="${isDarkTheme ? 'bg-[#111827] border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-xl p-6 space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-400">Verified Results</h4>
            <div class="space-y-2">
              ${c.verifiedMetrics.map(m => `
                <div class="text-xs ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}">
                  <strong class="text-white block text-sm">${this.escapeHtml(m.metric)}</strong>
                  <span class="text-slate-400">${this.escapeHtml(m.description)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>`;
      }

      case 'StudioPortfolio': {
        const c = comp.content;
        return `
    <section class="py-20 px-4 sm:px-6 lg:px-8 ${isDarkTheme ? 'bg-[#0B0F17]' : 'bg-slate-50'}" id="${comp.id}">
      <div class="max-w-7xl mx-auto space-y-12">
        <div class="space-y-3 max-w-3xl">
          <h2 class="text-3xl sm:text-4xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading">${this.escapeHtml(c.title)}</h2>
          ${c.description ? `<p class="text-lg ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}">${this.escapeHtml(c.description)}</p>` : ''}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          ${c.projects
            .map(
              proj => `
          <div class="${isDarkTheme ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'} border rounded-xl p-8 space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-sky-400 uppercase">${this.escapeHtml(proj.domain)}</span>
              <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">${this.escapeHtml(proj.status)}</span>
            </div>
            <h3 class="text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading">${this.escapeHtml(proj.title)}</h3>
            <p class="text-sm ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'} leading-relaxed">${this.escapeHtml(proj.summary)}</p>
            <div class="pt-4 border-t ${isDarkTheme ? 'border-slate-800' : 'border-slate-100'} flex flex-wrap gap-2">
              ${proj.tags.map(t => `<span class="px-2 py-1 rounded bg-slate-800/60 text-slate-400 text-xs font-mono">${this.escapeHtml(t)}</span>`).join('')}
            </div>
          </div>`
            )
            .join('')}
        </div>
      </div>
    </section>`;
      }

      case 'ServiceGrid': {
        const c = comp.content;
        return `
    <section class="py-20 px-4 sm:px-6 lg:px-8 ${isDarkTheme ? 'bg-[#0B0F17] border-b border-slate-800/60' : 'bg-slate-50 border-y border-slate-200'}" id="${comp.id}">
      <div class="max-w-7xl mx-auto space-y-12">
        <div class="text-center max-w-3xl mx-auto space-y-3">
          <h2 class="text-3xl sm:text-4xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading">${this.escapeHtml(c.sectionTitle)}</h2>
          ${c.sectionDescription ? `<p class="text-lg ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}">${this.escapeHtml(c.sectionDescription)}</p>` : ''}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          ${c.services
            .map(
              s => `
          <div class="${isDarkTheme ? 'bg-[#111827] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200'} rounded-xl p-6 shadow-sm border flex flex-col justify-between transition-all">
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg ${isDarkTheme ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-50 text-amber-600'} flex items-center justify-center font-bold text-lg">⚡</div>
              <h3 class="text-xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}">${this.escapeHtml(s.title)}</h3>
              <p class="text-sm ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'} leading-relaxed">${this.escapeHtml(s.description)}</p>
            </div>
            <div class="pt-6 mt-4 border-t ${isDarkTheme ? 'border-slate-800' : 'border-slate-100'}">
              <a href="${s.pageSlug ? `/${s.pageSlug}.html` : '/contact.html'}" class="text-sm font-semibold ${isDarkTheme ? 'text-sky-400 hover:text-sky-300' : 'text-primary hover:text-amber-600'} flex items-center gap-1">
                ${this.escapeHtml(s.ctaLabel || 'Learn More / Inquire')} <span>→</span>
              </a>
            </div>
          </div>`
            )
            .join('')}
        </div>
      </div>
    </section>`;
      }

      case 'CredentialBlock': {
        const c = comp.content;
        return `
    <section class="py-14 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white" id="${comp.id}">
      <div class="max-w-6xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center md:text-left">
          <div class="space-y-2">
            <span class="text-xs uppercase tracking-widest text-amber-400 font-semibold">Verified Compliance</span>
            <h3 class="text-2xl font-bold text-white font-heading">${this.escapeHtml(c.title || 'Licensed & Insured Electrical Contractor')}</h3>
          </div>
          <div class="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${c.licenseStatements
              .map(
                lic => `
            <div class="bg-slate-800/80 border border-slate-700 rounded-lg p-4 text-left">
              <div class="text-xs text-slate-400 uppercase font-medium">${this.escapeHtml(lic.licenseType)}</div>
              <div class="text-lg font-bold text-amber-400 mt-1">${this.escapeHtml(lic.licenseNumber)}</div>
              <div class="text-xs text-slate-300 mt-1">${this.escapeHtml(lic.holderName || 'Commonwealth of MA Licensed')}</div>
            </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    </section>`;
      }

      case 'ServiceArea': {
        const c = comp.content;
        return `
    <section class="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="${comp.id}">
      <div class="${isDarkTheme ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'} rounded-2xl border p-8 lg:p-12 shadow-sm">
        <div class="max-w-3xl space-y-4">
          <span class="text-xs uppercase tracking-wider text-amber-600 font-bold">Local Service Coverage</span>
          <h2 class="text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading">${this.escapeHtml(c.title)}</h2>
          <p class="${isDarkTheme ? 'text-slate-400' : 'text-slate-600'} leading-relaxed">${this.escapeHtml(c.description)}</p>
        </div>
        <div class="mt-8 pt-8 border-t ${isDarkTheme ? 'border-slate-800' : 'border-slate-100'}">
          <h4 class="text-sm font-semibold ${isDarkTheme ? 'text-slate-200' : 'text-slate-900'} uppercase tracking-wide mb-4">Cities & Towns Served in ${this.escapeHtml(c.state)}</h4>
          <div class="flex flex-wrap gap-2">
            ${c.municipalitiesServed
              .map(
                m => `
            <span class="px-3 py-1.5 rounded-md ${isDarkTheme ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-200'} text-sm font-medium border">
              📍 ${this.escapeHtml(m)}
            </span>`
              )
              .join('')}
          </div>
        </div>
      </div>
    </section>`;
      }

      case 'ContactForm': {
        const c = comp.content;
        return `
    <section class="py-20 px-4 sm:px-6 lg:px-8 ${isDarkTheme ? 'bg-[#0B0F17]' : 'bg-slate-900'} text-white" id="${comp.id}">
      <div class="max-w-3xl mx-auto ${isDarkTheme ? 'bg-[#111827] border-slate-800' : 'bg-slate-950 border-slate-800'} border rounded-2xl p-8 sm:p-10 shadow-2xl space-y-8">
        <div class="space-y-2 text-center">
          <h2 class="text-3xl font-bold text-white font-heading">${this.escapeHtml(c.title)}</h2>
          ${c.subtitle ? `<p class="text-slate-400 text-sm">${this.escapeHtml(c.subtitle)}</p>` : ''}
        </div>

        <!-- Relay Native Lead Form -->
        <form class="space-y-6" action="/api/public/forms/submit" method="POST" id="relay-web-lead-form">
          <input type="hidden" name="tenantId" value="${this.escapeHtml(context.tenantId)}">
          <input type="hidden" name="formType" value="${this.escapeHtml(c.formType)}">
          <input type="hidden" name="disclosureVersion" value="${this.escapeHtml(c.disclosureVersion || 'v1.0')}">
          <input type="hidden" name="utmSource" id="f_utm_source" value="">
          <input type="hidden" name="utmMedium" id="f_utm_medium" value="">
          <input type="hidden" name="utmCampaign" id="f_utm_campaign" value="">

          <!-- Security Honeypot -->
          <div style="position: absolute; left: -9999px; top: -9999px;" aria-hidden="true">
            <label for="company_fax_check">Leave this empty</label>
            <input type="text" name="company_fax_check" id="company_fax_check" tabindex="-1" autocomplete="off">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="f_fullName" class="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name *</label>
              <input type="text" id="f_fullName" name="fullName" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none">
            </div>
            <div>
              <label for="f_phone" class="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number *</label>
              <input type="tel" id="f_phone" name="phone" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="f_email" class="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Address</label>
              <input type="email" id="f_email" name="email" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none">
            </div>
            <div>
              <label for="f_service" class="block text-xs font-semibold text-slate-300 uppercase mb-1">Requested Focus / Service *</label>
              <select id="f_service" name="requestedService" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none">
                <option value="">Select an option...</option>
                ${(c.availableServices || ['AI Systems & Governance', 'Software Product Engineering', 'Business Infrastructure', 'Product Inquiries', 'General Inquiries'])
                  .map(s => `<option value="${this.escapeHtml(s)}">${this.escapeHtml(s)}</option>`)
                  .join('')}
              </select>
            </div>
          </div>

          <div>
            <label for="f_notes" class="block text-xs font-semibold text-slate-300 uppercase mb-1">Project Details / Message</label>
            <textarea id="f_notes" name="notes" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"></textarea>
          </div>

          <!-- Explicit Versioned Consent -->
          <div class="p-4 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="consentGiven" required class="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-400">
              <span class="text-xs text-slate-300 leading-normal">
                ${this.escapeHtml(c.consentText || 'By checking this box, I consent to receive transactional communication regarding this inquiry. Message and data rates may apply.')}
              </span>
            </label>
          </div>

          <button type="submit" class="w-full py-3.5 px-6 text-base font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg shadow-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
            ${this.escapeHtml(c.submitButtonLabel || 'Send Service Inquiry')}
          </button>
        </form>
      </div>
    </section>`;
      }

      case 'Testimonial': {
        const c = comp.content;
        return `
    <section class="py-16 px-4 sm:px-6 lg:px-8 ${isDarkTheme ? 'bg-[#0B0F17] border-b border-slate-800/60' : 'bg-slate-50 border-b border-slate-200'}" id="${comp.id}">
      <div class="max-w-6xl mx-auto space-y-10">
        <h2 class="text-3xl font-bold text-center ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading">${this.escapeHtml(c.title || 'Verified Testimonials')}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${c.testimonials
            .map(
              t => `
          <div class="${isDarkTheme ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'} p-6 rounded-xl border shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div class="text-amber-500 text-lg">★★★★★</div>
              <span class="text-xs font-semibold ${isDarkTheme ? 'text-slate-500' : 'text-slate-500'}">Verified Client</span>
            </div>
            <p class="${isDarkTheme ? 'text-slate-300' : 'text-slate-700'} italic text-sm leading-relaxed">"${this.escapeHtml(t.text)}"</p>
            <div class="text-xs ${isDarkTheme ? 'text-slate-500' : 'text-slate-500'} border-t ${isDarkTheme ? 'border-slate-800' : 'border-slate-100'} pt-3">
              <strong class="${isDarkTheme ? 'text-white' : 'text-slate-900'}">${this.escapeHtml(t.author)}</strong> — ${this.escapeHtml(t.location)}
            </div>
          </div>`
            )
            .join('')}
        </div>
      </div>
    </section>`;
      }

      case 'FAQ': {
        const c = comp.content;
        return `
    <section class="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto" id="${comp.id}">
      <div class="space-y-8">
        <h2 class="text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'} font-heading text-center">${this.escapeHtml(c.title)}</h2>
        <div class="space-y-4">
          ${c.items
            .map(
              item => `
          <div class="border ${isDarkTheme ? 'border-slate-800 bg-[#111827]' : 'border-slate-200 bg-white'} rounded-xl p-5 shadow-sm">
            <h3 class="text-base font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'} mb-2">${this.escapeHtml(item.question)}</h3>
            <p class="text-sm ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'} leading-relaxed">${this.escapeHtml(item.answer)}</p>
          </div>`
            )
            .join('')}
        </div>
      </div>
    </section>`;
      }

      case 'Footer': {
        const c = comp.content;
        return `
    <footer class="${isDarkTheme ? 'bg-[#06090E] border-slate-800' : 'bg-slate-950 border-slate-800'} text-slate-400 py-12 px-4 sm:px-6 lg:px-8 border-t" id="${comp.id}">
      <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div class="space-y-3 md:col-span-2">
          <h4 class="text-lg font-bold text-white font-heading">${this.escapeHtml(c.companyName)}</h4>
          <p class="text-sm text-slate-400">${this.escapeHtml(c.address)}</p>
          <p class="text-sm font-semibold text-sky-400">${this.escapeHtml(c.phone)} | ${this.escapeHtml(c.email)}</p>
          <p class="text-xs text-slate-500 leading-relaxed">${this.escapeHtml(c.licenseNotice)}</p>
        </div>
        <div>
          <h5 class="text-sm font-semibold text-white uppercase tracking-wider mb-3">Navigation</h5>
          <ul class="space-y-2 text-sm">
            ${c.quickLinks.map(l => `<li><a href="${l.url}" class="hover:text-white transition-colors">${this.escapeHtml(l.label)}</a></li>`).join('')}
          </ul>
        </div>
        <div>
          <h5 class="text-sm font-semibold text-white uppercase tracking-wider mb-3">Integrity & Governance</h5>
          <p class="text-xs text-slate-500 leading-relaxed">${this.escapeHtml(c.disclaimerText || 'All statements verified against ground-truth Relay test suites and immutable audit logs.')}</p>
        </div>
      </div>
      <div class="max-w-7xl mx-auto pt-8 border-t ${isDarkTheme ? 'border-slate-800' : 'border-slate-900'} text-xs text-slate-600 text-center">
        © ${c.copyrightYear} ${this.escapeHtml(c.companyName)}. All rights reserved.
      </div>
    </footer>`;
      }

      default:
        return '';
    }
  }

  private generateJsonLd(page: WebsitePage, brand: WebsiteBrandProfile, context: BusinessWebsiteContext, domain?: string): any {
    const hq = context.headquarters?.value;
    const isStudio = context.industry?.value?.toLowerCase().includes('software') || 
                     context.industry?.value?.toLowerCase().includes('ai') || 
                     context.industry?.value?.toLowerCase().includes('studio') ||
                     brand.brandName.toLowerCase().includes('outpost');

    if (isStudio) {
      const studioOrg: any = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': brand.brandName,
        'description': context.description?.value || 'Building practical AI systems, software products, and business infrastructure.',
        'url': domain || 'https://jardinsoutpost.com',
        'email': context.contactEmail?.value || 'contact@jardinsoutpost.com',
        'knowsAbout': [
          'Artificial Intelligence',
          'Software Engineering',
          'Deterministic Workflow Automation',
          'Segregation of Duties',
          'Commerce Platforms',
          'Publishing Engines'
        ],
        'founder': {
          '@type': 'Person',
          'name': 'Founder & Technical Lead'
        },
        '@graph': [
          {
            '@type': 'SoftwareApplication',
            'name': 'Relay',
            'applicationCategory': 'BusinessApplication',
            'description': 'AI operating system and website engine for local businesses with Segregation of Duties and verified revenue attribution.',
            'operatingSystem': 'Cloud / Linux / Web'
          },
          {
            '@type': 'SoftwareApplication',
            'name': 'BossLister',
            'applicationCategory': 'CommerceApplication',
            'description': 'Automated inventory indexing, price comps, and multi-channel marketplace listing engine.',
            'operatingSystem': 'Web'
          },
          {
            '@type': 'SoftwareApplication',
            'name': 'StoryForge',
            'applicationCategory': 'AuthoringApplication',
            'description': 'Algorithmic narrative plot coherence graph and manuscript publishing engine.',
            'operatingSystem': 'Web'
          },
          {
            '@type': 'SoftwareApplication',
            'name': 'OnTrack',
            'applicationCategory': 'ProductivityApplication',
            'description': 'Deterministic offline-first habit engine and momentum analytics.',
            'operatingSystem': 'Mobile / Web'
          }
        ]
      };
      return studioOrg;
    }

    const license = context.credentials?.value?.find(c => c.type === 'MASTER_LICENSE');
    const localBusiness: any = {
      '@context': 'https://schema.org',
      '@type': ['ElectricalContractor', 'LocalBusiness'],
      'name': brand.brandName,
      'description': context.description?.value,
      'telephone': context.contactPhone?.value,
      'email': context.contactEmail?.value,
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': hq?.street,
        'addressLocality': hq?.city,
        'addressRegion': hq?.state,
        'postalCode': hq?.postalCode,
        'addressCountry': hq?.country || 'US'
      },
      'areaServed': (context.serviceAreas?.value || []).flatMap(sa => sa.cities),
      'hasCredential': license ? {
        '@type': 'EducationalOccupationalCredential',
        'credentialCategory': 'license',
        'name': `${license.type} #${license.identifier}`
      } : undefined
    };

    if (domain) {
      localBusiness['url'] = domain;
    }

    return localBusiness;
  }

  private generateGlobalCss(brand: WebsiteBrandProfile): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
      
      :root {
        --color-primary: ${brand.colors.primary};
        --color-secondary: ${brand.colors.secondary};
        --color-accent: ${brand.colors.accent};
        --color-bg: ${brand.colors.background};
        --color-surface: ${brand.colors.surface};
        --color-text: ${brand.colors.text};
        --color-muted: ${brand.colors.muted};
      }

      body {
        font-family: '${brand.typography.bodyFont}', sans-serif;
        color: var(--color-text);
        background-color: var(--color-bg);
      }

      h1, h2, h3, h4, h5, h6, .font-heading {
        font-family: '${brand.typography.headingFont}', sans-serif;
      }
    `;
  }

  private generateSitemapXml(domain: string, pages: WebsitePage[]): string {
    const cleanDomain = domain.replace(/\/$/, '');
    const urls = pages
      .filter(p => p.isPublished)
      .map(p => {
        const path = `${p.slug}.html`;
        return `  <url>\n    <loc>${cleanDomain}/${path}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${p.isIndex ? '1.0' : '0.8'}</priority>\n  </url>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  }

  private generateRobotsTxt(domain: string): string {
    const cleanDomain = domain.replace(/\/$/, '');
    return `User-agent: *\nAllow: /\n\nSitemap: ${cleanDomain}/sitemap.xml\n`;
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const websiteRendererService = WebsiteRendererService.getInstance();
