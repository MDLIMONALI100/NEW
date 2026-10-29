// Static site generator for mdlimonali.com  ->  run:  node scripts/build.mjs
// Reads data/site.json + data/projects.json and writes plain HTML (index, services, projects, case studies,
// 404, sitemap.xml, robots.txt). Nothing here runs on the live site; GitHub Pages just serves the output.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(readFileSync(join(ROOT, "data/site.json"), "utf8"));
const projects = JSON.parse(readFileSync(join(ROOT, "data/projects.json"), "utf8"));
const sbGet = async (path) => {
  try {
    const r = await fetch(`${site.supabase.url}/rest/v1/${path}`, { headers: { apikey: site.supabase.anonKey } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
};
const liveContent = Object.fromEntries(((await sbGet("site_content?select=key,value")) || []).map((r) => [r.key, r.value]));
const livePosts = (await sbGet("blog_posts?select=slug,updated_at,published_at&published=eq.true&order=published_at.desc")) || [];
const TODAY = new Date().toISOString().slice(0, 10);
const V = TODAY.replaceAll("-", "");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const write = (rel, content) => {
  const f = join(ROOT, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, content);
};
const abs = (p) => (p.startsWith("http") ? p : site.url + p);
const projectUrl = (p) => `/projects/${p.slug}/`;
const mapsUrl = site.gbpUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery)}`;
const categories = ["Shopify", "WordPress", "Custom Code", "Apps & Games"];

const contextLine = {
  Shopify: "I build Shopify stores like this one from Kushtia, Bangladesh, for brands that sell locally and to customers abroad.",
  WordPress: "This is the kind of WordPress and WooCommerce work I do from Kushtia, Bangladesh, for shops and service businesses here and overseas.",
  "Custom Code": "I code projects like this from scratch in Kushtia, Bangladesh, when a business needs full control over speed, design and behaviour.",
  "Apps & Games": "I build apps and games like this from Kushtia, Bangladesh, and ship them so anyone in the world can open them in a browser or on their phone.",
};

/* ---------- shared FAQ (visible text and FAQPage schema come from the same list) ---------- */
const faqs = [
  ["Are you a web developer in Kushtia, Bangladesh?", "Yes. I am a freelance web developer based in Mirpur, Kushtia, Bangladesh. I work with businesses in Kushtia and across Bangladesh, and with clients overseas, mostly remotely."],
  ["What kinds of websites do you build?", "Shopify stores, WordPress and WooCommerce sites, hand-coded websites in HTML, CSS and JavaScript, and full-stack web apps with Next.js, Node.js and Cloudflare."],
  ["How long does a typical project take?", "Most business sites take 1 to 2 weeks. Shopify and WooCommerce stores usually take 2 to 4 weeks, depending on how many products and features you need."],
  ["How much does a website cost?", "It depends on scope. Send me the details of what you need and I will give you a clear quote before any work starts."],
  ["Which platform is right for my business?", "It depends on your catalog, budget and how much customisation you want. Shopify suits fast-launching stores, WordPress and WooCommerce give flexible content control, and custom code gives full control. I am happy to talk it through first."],
  ["Can you work with an existing website?", "Yes. I can take over, redesign or extend an existing WordPress or Shopify site instead of starting from scratch."],
  ["Do you offer support after launch?", "Yes. Every project includes a handoff period for fixes, and ongoing support can be arranged afterwards."],
  ["Do you handle hosting and domains?", "I can guide you through hosting and domain setup, or work within the setup you already have."],
];
const faqHtml = () => `<div class="faq-list" data-reveal>${faqs
  .map(([q, a], i) => `<div class="faq-item"><h3 style="font-size:inherit"><button class="faq-q" type="button" aria-expanded="false" aria-controls="faq-a${i}" id="faq-q${i}">${esc(q)} <i class="fas fa-plus" aria-hidden="true"></i></button></h3><div class="faq-a" id="faq-a${i}" role="region" aria-labelledby="faq-q${i}"><div><p>${esc(a)}</p></div></div></div>`)
  .join("")}</div>`;
const faqSchema = () => ({ "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });

/* ---------- services (used on home teaser, services page and schema) ---------- */
const services = [
  { icon: "fab fa-shopify", name: "Shopify Store Development", teaser: "Conversion-focused storefronts with clean product layouts, fast checkout and themes tailored to your brand.",
    long: "A Shopify store that looks like your brand, loads quickly on a phone and makes it easy to buy. I customise themes with Liquid, CSS and JavaScript, set up collections and products, and keep the checkout short.",
    points: ["Theme customisation and branding", "Collections, products and navigation set-up", "Mobile-first layout and fast loading", "Handover so you can manage orders yourself"] },
  { icon: "fab fa-wordpress", name: "WordPress & WooCommerce Development", teaser: "Flexible business sites and online stores built with WordPress, WooCommerce and Elementor for easy content control.",
    long: "Business websites and online shops you can edit yourself. I build with WordPress, Elementor and WooCommerce, add custom touches such as slide-out carts, and tune everything for speed and search engines.",
    points: ["Business sites, landing pages and blogs", "WooCommerce stores with custom cart and checkout touches", "Elementor layouts you can edit without code", "Redesigns and take-overs of existing WordPress sites"] },
  { icon: "fas fa-code", name: "Custom-Coded Websites", teaser: "Hand-built with HTML, CSS and JavaScript when you need full control over performance, design and behaviour.",
    long: "When a template is not enough, I write the site by hand. No page-builder weight, clean semantic HTML, strong accessibility and top performance scores, hosted cheaply on a global network.",
    points: ["Hand-written HTML, CSS and JavaScript", "Accessible, semantic and search-friendly markup", "Static hosting on GitHub Pages or Cloudflare", "Animations and interactions that stay fast"] },
  { icon: "fas fa-layer-group", name: "Full-Stack Web Apps", teaser: "Custom stores, dashboards and tools with Next.js, Node.js, databases and Cloudflare Workers.",
    long: "For products that need accounts, data and an admin panel. I build front end, API and database together, for example the Streetwear store in my portfolio, with a 200-product catalog and a no-code admin.",
    points: ["Next.js and React front ends", "Node.js and Express APIs on Cloudflare Workers", "SQL (D1, Supabase) and MongoDB databases", "Admin panels so non-developers can manage content"] },
];

/* ---------- JSON-LD ---------- */
const sameAs = [...site.social.map((s) => s.url), ...(site.gbpUrl ? [site.gbpUrl] : [])];
const businessNode = () => ({
  "@type": ["ProfessionalService", "LocalBusiness"],
  "@id": `${site.url}/#business`,
  name: site.businessName,
  alternateName: [site.name, site.brand],
  description: "Freelance web developer in Kushtia, Bangladesh building Shopify stores, WordPress and WooCommerce websites, custom-coded sites and full-stack web apps.",
  url: site.url + "/",
  image: abs(site.image),
  logo: abs(site.image),
  telephone: site.phone,
  email: site.email,
  address: { "@type": "PostalAddress", streetAddress: site.address.street, addressLocality: site.address.locality, addressRegion: site.address.region, postalCode: site.address.postalCode, addressCountry: site.address.country },
  geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
  hasMap: mapsUrl,
  areaServed: [{ "@type": "City", name: "Kushtia" }, { "@type": "Country", name: "Bangladesh" }, "Worldwide"],
  founder: { "@id": `${site.url}/#person` },
  knowsAbout: ["Web development", "Frontend development", "Full-stack development", "Shopify", "WordPress", "WooCommerce", "JavaScript", "React", "Next.js", "Search engine optimization"],
  makesOffer: services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name, description: s.teaser, provider: { "@id": `${site.url}/#business` }, areaServed: "Bangladesh" } })),
  sameAs,
});
const personNode = () => ({
  "@type": "Person", "@id": `${site.url}/#person`, name: site.name, jobTitle: site.jobTitle, url: site.url + "/", image: abs(site.image), email: site.email, telephone: site.phone,
  address: { "@type": "PostalAddress", addressLocality: site.address.locality, addressRegion: site.address.region, addressCountry: site.address.country },
  worksFor: { "@id": `${site.url}/#business` }, sameAs,
});
const websiteNode = () => ({ "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url + "/", name: `${site.name} — Web Developer`, inLanguage: "en", publisher: { "@id": `${site.url}/#business` } });
const crumbSchema = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: site.url + path })) });

/* ---------- page shell ---------- */
function layout({ path, title, description, ogImage, ogType = "website", nav = "", schema = [], body, noindex = false }) {
  const url = site.url + path;
  const img = abs(ogImage || site.image);
  const graph = { "@context": "https://schema.org", "@graph": schema };
  const navLink = (href, label, key) => `<a class="nav-link" href="${href}"${nav === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${noindex ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1"}">
<meta name="author" content="${esc(site.name)}">
<meta name="theme-color" content="#F3F1E1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14110D" media="(prefers-color-scheme: dark)">
<meta name="geo.region" content="BD-27">
<meta name="geo.placename" content="Kushtia">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">
<link rel="icon" type="image/png" href="/profile.png">
<link rel="apple-touch-icon" href="/profile.png">
<meta name="google-site-verification" content="RJxk-1GS3BxuLK53h9K_9lvtggdfBkw9Tq2WVyvIh_M">
<script>try{var d=document.documentElement,t=localStorage.getItem('theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.setAttribute('data-theme',t);d.className='js';}catch(e){document.documentElement.className='js';}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&family=Mrs+Saint+Delafield&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"></noscript>
<link rel="stylesheet" href="/assets/css/site.css?v=${V}">
<script type="application/ld+json">${JSON.stringify(graph).replaceAll("<", "\\u003c")}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="progress" aria-hidden="true"></div>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/" aria-label="${esc(site.name)} — home"><span class="dotmark" aria-hidden="true"></span>${esc(site.brand)}</a>
    <nav class="nav" id="site-nav" aria-label="Main">
      ${navLink("/", "Home", "home")}${navLink("/services/", "Services", "services")}${navLink("/projects/", "Projects", "projects")}${navLink("/blog/", "Blog", "blog")}${navLink("/#about", "About", "about")}${navLink("/#contact", "Contact", "contact")}
      <a class="btn btn-primary header-cta" href="/#contact">Hire me</a>
    </nav>
    <div class="header-tools">
      <button class="icon-btn theme-toggle" type="button" aria-label="Switch to dark mode" aria-pressed="false">
        <svg class="i-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
        <svg class="i-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>
      <button class="icon-btn nav-toggle" type="button" aria-label="Toggle menu" aria-expanded="false" aria-controls="site-nav"><i class="fas fa-bars" aria-hidden="true"></i></button>
    </div>
  </div>
</header>
<main id="main">
${body}
</main>
${footer()}
<a href="https://wa.me/${site.whatsapp}?text=Hi%20Limon%2C%20I%20found%20your%20portfolio%20and%20I%27d%20like%20to%20talk%20about%20a%20project." class="whatsapp-float" target="_blank" rel="noopener" aria-label="Chat on WhatsApp (opens in a new tab)">
  <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path d="M16.004 2.667c-7.363 0-13.333 5.97-13.333 13.333 0 2.353.615 4.66 1.784 6.686L2.667 29.333l6.815-1.756a13.27 13.27 0 0 0 6.522 1.723h.006c7.362 0 13.333-5.97 13.333-13.333 0-3.56-1.386-6.906-3.904-9.425A13.25 13.25 0 0 0 16.004 2.667zm0 24.4h-.005a11.05 11.05 0 0 1-5.63-1.541l-.404-.24-4.045 1.043 1.08-3.943-.263-.405a11.04 11.04 0 0 1-1.7-5.881c0-6.106 4.968-11.073 11.072-11.073 2.958 0 5.738 1.153 7.829 3.246a10.995 10.995 0 0 1 3.239 7.833c0 6.105-4.968 11.061-11.173 11.061z"/></svg>
</a>
<button class="icon-btn back-top" type="button" aria-label="Back to top"><i class="fas fa-arrow-up" aria-hidden="true"></i></button>
<script src="/assets/js/site.js?v=${V}" defer></script>
${nav === "home" || nav === "projects" || nav === "blog" ? `<script>window.SITE_SUPABASE=${JSON.stringify(site.supabase)};</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js" defer></script>
<script src="/assets/js/supabase-live.js?v=${V}" defer></script>` : ""}
${nav === "blog" ? `<script src="/assets/js/md.js?v=${V}" defer></script>\n<script src="/assets/js/blog.js?v=${V}" defer></script>` : ""}
</body>
</html>
`;
}

function footer() {
  const a = site.address;
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <h2>Contact</h2>
        <address>
          <span class="org">${esc(site.businessName)}</span>
          <span>${esc(a.street)}, ${esc(a.locality)} ${esc(a.postalCode)}, ${esc(a.region)}, ${esc(a.countryName)}</span>
          <span><span class="sr-only">Phone: </span><a href="tel:${site.phone}">${esc(site.phoneDisplay)}</a></span>
          <span><span class="sr-only">Email: </span><a href="mailto:${site.email}">${esc(site.email)}</a></span>
          <span><a href="${esc(mapsUrl)}" target="_blank" rel="noopener">Open in Google Maps <span class="sr-only">(opens in a new tab)</span></a></span>
        </address>
        <div class="social-row" style="margin-top:20px">${site.social.map((s) => `<a class="social-icon" href="${s.url}" target="_blank" rel="noopener me" aria-label="${s.name} (opens in a new tab)"><i class="${s.icon}" aria-hidden="true"></i></a>`).join("")}</div>
      </div>
      <nav aria-label="Footer">
        <h2>Explore</h2>
        <ul class="footer-links">
          <li><a href="/">Web developer in Kushtia</a></li>
          <li><a href="/services/">Services</a></li>
          <li><a href="/projects/">Projects &amp; case studies</a></li>
          <li><a href="/#contact">Get a quote</a></li>
          <li><a href="/blog/">Blog</a></li>
          <li><a href="/resume/">Resume</a></li>
        </ul>
      </nav>
      <div>
        <h2>Find me</h2>
        <div class="map-box"><iframe title="Map showing ${esc(a.locality)}, ${esc(a.countryName)}" src="https://maps.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&amp;z=13&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" width="600" height="375"></iframe></div>
      </div>
    </div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${esc(site.name)}. All rights reserved.</span><span>Web developer · ${esc(a.locality)}, ${esc(a.countryName)}</span></div>
  </div>
</footer>`;
}

const crumbs = (items) => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map(([n, p], i) => `<li>${i === items.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${p}">${esc(n)}</a>`}</li>`).join("")}</ol></nav>`;

const projectCard = (p, i = 0, delay = true) => `<article class="project-card" data-id="${p.id}" data-category="${esc(p.category)}"${delay ? ` data-reveal style="--d:${(i % 3) * 0.08}s"` : ""}>
  <div class="project-thumb"><img src="${esc(p.image)}" alt="${esc(p.alt)}" width="1280" height="720" loading="${i < 3 ? "eager" : "lazy"}" decoding="async"><span class="tag">${esc(p.category)}</span></div>
  <div class="project-body">
    <h3><a href="${projectUrl(p)}">${esc(p.title)}</a></h3>
    <p class="project-sub">${esc(p.subtitle)}</p>
    <p>${esc(p.summary)}</p>
    <span class="view-project" aria-hidden="true">Read case study <i class="fas fa-arrow-right"></i></span>
  </div>
</article>`;

const ctaBand = (h = "Have a project in mind?", p = "Tell me what you need. I will reply with a clear plan and a quote, whether you are in Kushtia or on the other side of the world.") => `<section class="section" aria-labelledby="cta-h"><div class="wrap"><div class="cta-band" data-reveal><div><h2 id="cta-h">${esc(h)}</h2><p>${esc(p)}</p></div><div class="cta-row"><a class="btn btn-primary" href="/#contact"><i class="fas fa-paper-plane" aria-hidden="true"></i>Start a project</a><a class="btn btn-outline" href="tel:${site.phone}"><i class="fas fa-phone" aria-hidden="true"></i>${esc(site.phoneDisplay)}</a></div></div></div></section>`;

const serviceCard = (s, i, long = false) => `<article class="service-card" data-reveal style="--d:${(i % 2) * 0.08}s"><span class="service-no" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span><div class="service-icon" aria-hidden="true"><i class="${s.icon}"></i></div><h3>${esc(s.name)}</h3><p>${esc(long ? s.long : s.teaser)}</p>${long ? `<ul>${s.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</article>`;

const skills = [["fab fa-html5", "HTML5"], ["fab fa-css3-alt", "CSS3"], ["fab fa-js", "JavaScript"], ["fab fa-shopify", "Shopify Liquid"], ["fab fa-wordpress", "WordPress"], ["fas fa-cart-shopping", "WooCommerce"], ["fas fa-pen-ruler", "Elementor"], ["fas fa-wind", "Tailwind CSS"], ["fab fa-react", "React"], ["fab fa-node-js", "Node.js"], ["fas fa-mobile-screen", "Responsive Design"], ["fab fa-github", "GitHub"], ["fas fa-cloud", "Cloudflare Workers"], ["fas fa-database", "Cloudflare D1 (SQL)"], ["fas fa-leaf", "MongoDB Atlas"], ["fas fa-bolt", "Supabase"], ["fas fa-plug", "REST APIs"], ["fas fa-code-branch", "Git Version Control"]];
const processSteps = [["Discover", "We talk through your <mark class=\"hl\">goals, audience</mark> and what the site needs to do."], ["Design", "I plan the layout: clean, <mark class=\"hl\">on-brand</mark>, built around real usage."], ["Build", "Development in Shopify, WordPress or hand-written code, <mark class=\"hl\">tested across devices</mark>."], ["Launch", "Your site goes live <mark class=\"hl\">fast and smooth</mark>, with room to grow."]];
const processHtml = () => `<div class="process-track">${processSteps.map(([t, d], i) => `<div class="process-step" data-reveal style="--d:${i * 0.08}s"><div class="process-num" aria-hidden="true">0${i + 1}</div><h3>${t}</h3><p>${d}</p></div>`).join("")}</div>`;

/* ================= HOME ================= */
function home() {
  const featured = projects.slice(0, 6);
  const body = `<div id="home-live">
<section class="hero" id="about" aria-labelledby="hero-h">
  <div class="wrap">
    <div class="hero-grid">
      <div class="hero-text">
        <div class="pill" data-reveal><span class="live-dot" aria-hidden="true"></span><span data-key="hero_location">Kushtia, Bangladesh · Available for freelance</span></div>
        <p class="hello" data-reveal style="--d:.05s" data-key="hero_hello">Hello, I'm</p>
        <h1 id="hero-h" data-reveal style="--d:.1s"><span class="hn-first" data-key="hero_first">Md Limon</span><span class="hn-last" data-key="hero_last">Ali</span><span class="h1-role">Web Developer in Kushtia, Bangladesh</span></h1>
        <p class="role-line" data-reveal style="--d:.15s" aria-label="Shopify, WordPress and custom web developer"><span class="cursor-blink" id="roleText">Shopify Developer</span></p>
        <p class="hero-tagline" data-reveal style="--d:.2s" data-key="hero_tagline" data-rich>I design and build <mark class="hl">fast, responsive websites</mark> — <strong>Shopify stores</strong>, <strong>WordPress sites</strong>, and fully custom-coded projects — for businesses that want to <mark class="hl">look as good online as they do in person</mark>.</p>
        <p class="signature" data-reveal style="--d:.25s" data-key="hero_signature" aria-hidden="true">Limon</p>
        <div class="cta-row" data-reveal style="--d:.3s"><a class="btn btn-primary" href="/projects/"><i class="fas fa-arrow-right" aria-hidden="true"></i>View my work</a><a class="btn btn-outline" href="/resume/"><i class="fas fa-file-lines" aria-hidden="true"></i>Resume</a></div>
        <div class="social-row" data-reveal style="--d:.35s">${site.social.map((s) => `<a class="social-icon" href="${s.url}" target="_blank" rel="noopener me" aria-label="${s.name} (opens in a new tab)"><i class="${s.icon}" aria-hidden="true"></i></a>`).join("")}</div>
      </div>
      <div class="hero-photo-wrap" data-reveal style="--d:.15s"><div class="hero-photo"><img src="/profile.png" alt="Md Limon Ali, web developer in Kushtia, Bangladesh" id="heroPhoto" width="720" height="900" fetchpriority="high" decoding="async"></div></div>
    </div>
    <div class="trust-strip" role="list">
      <div class="trust-item" role="listitem" data-reveal><div class="num">${projects.length}</div><div class="lbl">Projects in my portfolio</div></div>
      <div class="trust-item" role="listitem" data-reveal style="--d:.06s"><div class="num">3+</div><div class="lbl">Platforms: Shopify, WordPress, custom</div></div>
      <div class="trust-item" role="listitem" data-reveal style="--d:.12s"><div class="num">2025</div><div class="lbl">Building websites since</div></div>
      <div class="trust-item" role="listitem" data-reveal style="--d:.18s"><div class="num">BD</div><div class="lbl">Based in Kushtia, working worldwide</div></div>
    </div>
  </div>
</section>

<section class="section alt" id="services" aria-labelledby="svc-h">
  <div class="wrap">
    <div class="section-head" data-reveal><p class="eyebrow">What I build</p><h2 id="svc-h">Web development services for businesses in <span class="accent">Kushtia and beyond.</span></h2><p class="lede">Pick the platform that fits your goals, or let me <mark class="hl">recommend one</mark> after we talk through what you need.</p></div>
    <div class="grid services-grid four">${services.map((s, i) => serviceCard(s, i)).join("")}</div>
    <p style="margin-top:28px" data-reveal><a class="btn btn-outline" href="/services/">See all services <i class="fas fa-arrow-right" aria-hidden="true"></i></a></p>
  </div>
</section>

<section class="section" id="work" aria-labelledby="work-h">
  <div class="wrap">
    <div class="section-head" data-reveal><p class="eyebrow">Selected work</p><h2 class="h-stack" id="work-h"><span class="h-top">Web developer</span><span class="h-big">Projects</span></h2><p class="lede">A curated selection of recent builds: <mark class="hl">real stores, business sites, apps and games</mark>, each with a full case study.</p></div>
    <div class="projects-grid">${featured.map((p, i) => projectCard(p, i)).join("")}</div>
    <p style="margin-top:32px" data-reveal><a class="btn btn-primary" href="/projects/">View all ${projects.length} projects <i class="fas fa-arrow-right" aria-hidden="true"></i></a></p>
  </div>
</section>

<section class="section alt" id="skills" aria-labelledby="skills-h">
  <div class="wrap">
    <div class="section-head" data-reveal><p class="eyebrow" data-key="skills_eyebrow">Toolbox</p><h2 class="h-stack" id="skills-h"><span class="h-top" data-key="skills_top">Skills &amp;</span><span class="h-big" data-key="skills_big">Expertise</span></h2><p class="lede" data-key="skills_lede" data-rich>The stack I reach for most, across design, development, and deployment.</p></div>
    <ul class="skills-grid" id="skillsGrid" data-reveal style="list-style:none">${skills.map(([ic, n]) => `<li class="skill"><i class="${ic}" aria-hidden="true"></i>${esc(n)}</li>`).join("")}</ul>
    <div class="stat-bars" id="statBars" style="margin-top:36px"><div class="stat-row"><div class="stat-row-top"><span>WordPress</span><span>100%</span></div><div class="stat-track"><div class="stat-fill" style="--val:100%"></div></div></div><div class="stat-row"><div class="stat-row-top"><span>Shopify</span><span>85%</span></div><div class="stat-track"><div class="stat-fill" style="--val:85%"></div></div></div></div>
  </div>
</section>

<section class="section" id="process" aria-labelledby="proc-h">
  <div class="wrap">
    <div class="section-head" data-reveal><p class="eyebrow">How I work</p><h2 id="proc-h">From idea to <span class="accent">launch</span>, in four steps.</h2></div>
    ${processHtml()}
  </div>
</section>

<section class="section alt" id="background" aria-labelledby="bg-h">
  <div class="wrap">
    <div class="section-head" data-reveal><p class="eyebrow" data-key="bg_eyebrow">Background</p><h2 class="h-stack" id="bg-h"><span class="h-top" data-key="bg_top">Experience &amp;</span><span class="h-big" data-key="bg_big">Education</span></h2><p class="lede" data-key="bg_lede" data-rich>The path so far — <mark class="hl">hands-on work</mark>, formal study, and the training behind the skills.</p></div>
    <div class="cred-grid">
      <div class="cred-col" id="bgCol1" data-reveal><h3 data-key="bg_col1_title">Experience &amp; Education</h3>
        <div class="cred-item"><div class="cred-role">Web Developer</div><div class="cred-place">E Code Craft</div><div class="cred-time">3 months</div></div>
        <div class="cred-item"><div class="cred-role">Bachelor of Arts (B.A.)</div><div class="cred-place">Kushtia Government College</div><div class="cred-time">2025 – Present · Expected 2029</div></div>
        <div class="cred-item"><div class="cred-role">HSC (Science)</div><div class="cred-place">Amla Government Degree College</div><div class="cred-time">Completed 2025</div></div></div>
      <div class="cred-col" id="bgCol2" data-reveal style="--d:.08s"><h3 data-key="bg_col2_title">Certification &amp; Languages</h3>
        <div class="cred-item"><div class="cred-role">Web Development Certification</div><div class="cred-place">Shopify &amp; WordPress — Venus IT Institute</div><div class="cred-time">Completed</div></div>
        <div class="cred-item"><div class="cred-role">Self-Taught Front-End Development</div><div class="cred-place">Independent study &amp; project work</div><div class="cred-time">Jan 2025 – Jul 2026</div></div>
        <div class="lang-row" id="langRow"><span class="lang-pill">Bengali — Native</span><span class="lang-pill">English — Fluent</span></div></div>
    </div>
  </div>
</section>

<section class="section" id="faq" aria-labelledby="faq-h">
  <div class="wrap">
    <div class="section-head" data-reveal><p class="eyebrow">FAQ</p><h2 id="faq-h">Frequently asked <span class="accent">questions.</span></h2></div>
    ${faqHtml()}
  </div>
</section>

<section class="section alt" id="contact" aria-labelledby="contact-h">
  <div class="wrap">
    <div class="section-head" data-reveal><p class="eyebrow">Get in touch</p><h2 class="h-stack" id="contact-h"><span class="h-top">Let's create</span><span class="h-big">Something great</span></h2><p class="lede">Have a project in mind? Let's build something that <mark class="hl">makes an impact</mark>.</p></div>
    <div class="contact-wrap">
      <div data-reveal>
        <div class="contact-info-item"><span class="icon-box" aria-hidden="true"><i class="fas fa-envelope"></i></span><a href="mailto:${site.email}">${esc(site.email)}</a></div>
        <div class="contact-info-item"><span class="icon-box" aria-hidden="true"><i class="fas fa-phone"></i></span><a href="tel:${site.phone}">${esc(site.phoneDisplay)}</a></div>
        <div class="contact-info-item"><span class="icon-box" aria-hidden="true"><i class="fas fa-location-dot"></i></span><span>${esc(site.address.street)}, ${esc(site.address.locality)}, ${esc(site.address.region)}, ${esc(site.address.countryName)}</span></div>
      </div>
      <form action="${site.formAction}" method="POST" id="contact-form" class="contact-form" data-reveal style="--d:.08s">
        <div><label for="cf-name">Your name</label><input id="cf-name" type="text" name="name" autocomplete="name" required></div>
        <div><label for="cf-email">Your email</label><input id="cf-email" type="email" name="email" autocomplete="email" required></div>
        <div><label for="cf-msg">Your message</label><textarea id="cf-msg" name="message" required></textarea></div>
        <button class="btn btn-primary" type="submit">Send message</button>
        <div id="form-message" role="status" aria-live="polite"></div>
      </form>
    </div>
  </div>
</section>
</div>`;
  return layout({
    path: "/",
    nav: "home",
    title: "Web Developer in Kushtia, Bangladesh | Md Limon Ali",
    description: "Md Limon Ali is a freelance web developer in Kushtia, Bangladesh. I build fast Shopify stores, WordPress sites and custom full-stack web apps. See 9 projects.",
    schema: [businessNode(), personNode(), websiteNode(), { "@type": "WebPage", "@id": `${site.url}/#webpage`, url: site.url + "/", name: "Web Developer in Kushtia, Bangladesh | Md Limon Ali", isPartOf: { "@id": `${site.url}/#website` }, about: { "@id": `${site.url}/#business` }, primaryImageOfPage: abs(site.image), inLanguage: "en" }, faqSchema()],
    body,
  });
}

/* ================= SERVICES ================= */
function servicesPage() {
  const crumb = [["Home", "/"], ["Services", "/services/"]];
  const body = `<section class="page-hero"><div class="wrap">${crumbs(crumb)}
  <p class="eyebrow">Services</p>
  <h1>Web development services in Kushtia, Bangladesh</h1>
  <p class="lede">Shopify stores, WordPress and WooCommerce sites, hand-coded websites and full-stack web apps, built by one developer you can talk to directly. I work with businesses in <mark class="hl">Kushtia and across Bangladesh</mark>, and with clients overseas.</p></div></section>

<section class="section" aria-labelledby="what-h"><div class="wrap">
  <div class="section-head" data-reveal><h2 id="what-h">What I can build for you</h2></div>
  <div class="grid services-grid four">${services.map((s, i) => serviceCard(s, i, true)).join("")}</div>
</div></section>

<section class="section alt" aria-labelledby="who-h"><div class="wrap">
  <div class="section-head" data-reveal><h2 id="who-h">Who I work with</h2></div>
  <div class="grid services-grid three">
    <article class="service-card" data-reveal><div class="service-icon" aria-hidden="true"><i class="fas fa-store"></i></div><h3>Local businesses in Kushtia</h3><p>Shops, service businesses and start-ups that need a clear, fast website and an online presence customers can find. We can meet in person or work over a call.</p></article>
    <article class="service-card" data-reveal style="--d:.08s"><div class="service-icon" aria-hidden="true"><i class="fas fa-flag"></i></div><h3>Brands across Bangladesh</h3><p>Online stores and company sites that load quickly on mobile networks and are easy for your team to update in Bengali or English.</p></article>
    <article class="service-card" data-reveal style="--d:.16s"><div class="service-icon" aria-hidden="true"><i class="fas fa-globe"></i></div><h3>International clients</h3><p>Remote projects with clear communication and written plans, delivered on time. You can also find me on Upwork.</p></article>
  </div>
</div></section>

<section class="section" aria-labelledby="proc-h"><div class="wrap">
  <div class="section-head" data-reveal><p class="eyebrow">How I work</p><h2 id="proc-h">From idea to <span class="accent">launch</span>, in four steps.</h2></div>
  ${processHtml()}
</div></section>

<section class="section alt" aria-labelledby="faq-h"><div class="wrap">
  <div class="section-head" data-reveal><h2 id="faq-h">Questions about my services</h2></div>
  ${faqHtml()}
</div></section>
${ctaBand("Ready to start your website?")}`;
  return layout({
    path: "/services/",
    nav: "services",
    title: "Web Development Services in Kushtia, Bangladesh | Md Limon Ali",
    description: "Shopify, WordPress, WooCommerce, custom-coded websites and full-stack web apps from a freelance web developer in Kushtia, Bangladesh. Get a clear quote.",
    schema: [{ "@type": "WebPage", "@id": `${site.url}/services/#webpage`, url: site.url + "/services/", name: "Web Development Services in Kushtia, Bangladesh", isPartOf: { "@id": `${site.url}/#website` }, about: { "@id": `${site.url}/#business` }, inLanguage: "en" }, crumbSchema(crumb), faqSchema(),
      { "@type": "ItemList", name: "Web development services", itemListElement: services.map((s, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "Service", name: s.name, description: s.long, provider: { "@id": `${site.url}/#business` }, areaServed: ["Kushtia", "Bangladesh"] } })) }],
    body,
  });
}

/* ================= PROJECTS INDEX ================= */
function projectsPage() {
  const crumb = [["Home", "/"], ["Projects", "/projects/"]];
  const count = (c) => projects.filter((p) => p.category === c).length;
  const body = `<section class="page-hero"><div class="wrap">${crumbs(crumb)}
  <p class="eyebrow">Portfolio</p>
  <h1>Web developer portfolio: ${projects.length} projects and case studies</h1>
  <p class="lede">Stores, business sites, apps and games I have built from Kushtia, Bangladesh. Open any project for the <mark class="hl">challenge, the stack, my role and the result</mark>.</p></div></section>
<section class="section"><div class="wrap">
  <div class="filters" role="group" aria-label="Filter projects by type">
    <button class="filter-btn" type="button" data-filter="all" aria-pressed="true">All<span class="count">${projects.length}</span></button>
    ${categories.map((c) => `<button class="filter-btn" type="button" data-filter="${esc(c)}" aria-pressed="false">${esc(c)}<span class="count">${count(c)}</span></button>`).join("")}
  </div>
  <p class="sr-only" id="filter-status" role="status" aria-live="polite"></p>
  <div class="projects-grid" data-live>${projects.map((p, i) => projectCard(p, i, false)).join("")}</div>
</div></section>
${ctaBand("Want a project like one of these?")}`;
  return layout({
    path: "/projects/",
    nav: "projects",
    title: "Web Developer Portfolio & Case Studies | Md Limon Ali",
    description: `Browse ${projects.length} web projects by Md Limon Ali, a web developer in Kushtia, Bangladesh: Shopify and WooCommerce stores, custom-coded sites, apps and games, with case studies.`,
    schema: [{ "@type": "CollectionPage", "@id": `${site.url}/projects/#webpage`, url: site.url + "/projects/", name: "Web Developer Portfolio & Case Studies", isPartOf: { "@id": `${site.url}/#website` }, about: { "@id": `${site.url}/#business` }, inLanguage: "en" }, crumbSchema(crumb),
      { "@type": "ItemList", itemListElement: projects.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: site.url + projectUrl(p), name: p.title })) }],
    body,
  });
}

/* ================= CASE STUDIES ================= */
function casePage(p, i) {
  const prev = projects[(i + projects.length - 1) % projects.length];
  const next = projects[(i + 1) % projects.length];
  const path = projectUrl(p);
  const crumb = [["Home", "/"], ["Projects", "/projects/"], [p.title, path]];
  const body = `<section class="page-hero"><div class="wrap">${crumbs(crumb)}
  <p class="eyebrow">${esc(p.category)} · Case study</p>
  <h1>${esc(p.title)}: ${esc(p.kind.toLowerCase())} case study</h1>
  <p class="lede">${esc(p.summary)}</p>
  <p class="cta-row" style="margin-top:24px"><a class="btn btn-primary" href="${esc(p.url)}" target="_blank" rel="noopener">${/\.apk$/.test(p.url) ? "Download the app" : "Visit the live project"} <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i><span class="sr-only">(opens in a new tab)</span></a><a class="btn btn-outline" href="/projects/"><i class="fas fa-arrow-left" aria-hidden="true"></i>All projects</a></p>
</div></section>
<div class="section"><div class="wrap">
  <div class="case-hero-img" data-reveal><img src="${esc(p.image)}" alt="${esc(p.alt)}" width="1280" height="720" fetchpriority="high" decoding="async"></div>
  <dl class="case-meta"><div><dt>Type</dt><dd>${esc(p.kind)}</dd></div><div><dt>Category</dt><dd>${esc(p.category)}</dd></div><div><dt>Built in</dt><dd>${esc(site.address.locality)}, ${esc(site.address.countryName)}</dd></div><div><dt>My role</dt><dd>Design &amp; development</dd></div></dl>
  <div class="case-grid">
    <nav class="case-toc" aria-label="On this page"><ol>
      <li><a href="#overview">Overview</a></li><li><a href="#challenge">The challenge</a></li><li><a href="#stack">Technical stack</a></li><li><a href="#solution">My role &amp; solutions</a></li><li><a href="#impact">Impact &amp; results</a></li></ol></nav>
    <div class="case-body">
      <section id="overview" aria-labelledby="overview-h"><h2 id="overview-h">Project overview</h2><p>${esc(p.overview)}</p><p>${esc(contextLine[p.category])}</p></section>
      <section id="challenge" aria-labelledby="challenge-h"><h2 id="challenge-h">The challenge</h2><p>${esc(p.challenge)}</p></section>
      <section id="stack" aria-labelledby="stack-h"><h2 id="stack-h">Technical stack used</h2><ul class="stack-list">${p.stack.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>
      <section id="solution" aria-labelledby="solution-h"><h2 id="solution-h">My role and solutions</h2><ul>${p.role.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>
      <section id="impact" aria-labelledby="impact-h"><h2 id="impact-h">Business impact and results</h2><ul>${p.impact.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>${p.metrics ? `<ul style="margin-top:16px">${p.metrics.map((s) => `<li><strong>${esc(s)}</strong></li>`).join("")}</ul>` : ""}</section>
      <div class="next-prev"><a class="prev" href="${projectUrl(prev)}" rel="prev"><small>Previous project</small><span>${esc(prev.title)}</span></a><a class="next" href="${projectUrl(next)}" rel="next"><small>Next project</small><span>${esc(next.title)}</span></a></div>
    </div>
  </div>
</div></div>
${ctaBand(`Need something like ${p.title}?`)}`;
  return layout({
    path,
    nav: "projects",
    title: `${p.title}: ${p.kind} Case Study | Md Limon Ali`,
    description: `${p.summary} Case study by Md Limon Ali, web developer in Kushtia, Bangladesh.`.slice(0, 300),
    ogImage: p.image,
    schema: [{ "@type": "WebPage", "@id": `${site.url}${path}#webpage`, url: site.url + path, name: `${p.title}: ${p.kind} case study`, isPartOf: { "@id": `${site.url}/#website` }, inLanguage: "en", primaryImageOfPage: abs(p.image) }, crumbSchema(crumb),
      { "@type": "CreativeWork", "@id": `${site.url}${path}#work`, name: p.title, headline: `${p.title}: ${p.kind}`, description: p.summary, url: p.url, image: abs(p.image), creator: { "@id": `${site.url}/#person` }, locationCreated: { "@type": "Place", name: "Kushtia, Bangladesh" }, keywords: p.stack.join(", "), genre: p.category }],
    body,
  });
}

/* ================= BLOG ================= */
function blogPage() {
  const crumb = [["Home", "/"], ["Blog", "/blog/"]];
  const body = `<section class="page-hero"><div class="wrap">${crumbs(crumb)}
  <p class="eyebrow">Blog</p>
  <h1>Web development blog</h1>
  <p class="lede">Practical notes on <mark class="hl">Shopify, WordPress, custom code and growing a business online</mark>, written from Kushtia, Bangladesh.</p></div></section>
<section class="section"><div class="wrap">
  <div class="blog-tools" id="blog-tools">
    <div id="blog-tags" role="group" aria-label="Filter articles by topic"></div>
    <label class="blog-search"><span class="sr-only">Search articles</span><i class="fas fa-magnifying-glass" aria-hidden="true"></i><input type="search" id="blog-search" placeholder="Search articles"></label>
  </div>
  <p class="sr-only" id="blog-status" role="status" aria-live="polite"></p>
  <div id="blog-list"><div id="blog-grid"><div class="posts-grid"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div></div></div>
  <noscript><div class="blog-state"><p>Please turn on JavaScript to read the articles.</p></div></noscript>
</div></section>
${ctaBand("Want a website like the ones I write about?")}`;
  return layout({
    path: "/blog/", nav: "blog",
    title: "Web Development Blog | Md Limon Ali",
    description: "Articles on Shopify, WordPress, custom-coded websites and growing a business online, by Md Limon Ali, a web developer in Kushtia, Bangladesh.",
    schema: [{ "@type": "Blog", "@id": `${site.url}/blog/#blog`, url: site.url + "/blog/", name: "Md Limon Ali — Web Development Blog", publisher: { "@id": `${site.url}/#business` }, inLanguage: "en" }, crumbSchema(crumb)],
    body,
  });
}
function blogPostShell() {
  return layout({
    path: "/blog/post/", nav: "blog",
    title: "Article | Md Limon Ali",
    description: "Read this article by Md Limon Ali, web developer in Kushtia, Bangladesh.",
    schema: [websiteNode()],
    body: `<div class="wrap article-wrap" id="blog-post"><div class="skeleton" style="height:420px"></div></div><noscript><div class="wrap"><div class="blog-state"><p>Please turn on JavaScript to read this article, or <a href="/blog/">browse the blog</a>.</p></div></div></noscript>
${ctaBand("Need a website built the right way?")}`,
  });
}

/* ================= RESUME ================= */
function resumePage() {
  const crumb = [["Home", "/"], ["Resume", "/resume/"]];
  const arr = (k, fb) => (Array.isArray(liveContent[k]) && liveContent[k].length ? liveContent[k] : fb);
  const exp = arr("bg_col1_items", [{ role: "Web Developer", place: "E Code Craft", time: "3 months" }, { role: "Bachelor of Arts (B.A.)", place: "Kushtia Government College", time: "2025 – Present · Expected 2029" }, { role: "HSC (Science)", place: "Amla Government Degree College", time: "Completed 2025" }]);
  const cert = arr("bg_col2_items", [{ role: "Web Development Certification", place: "Shopify & WordPress — Venus IT Institute", time: "Completed" }, { role: "Self-Taught Front-End Development", place: "Independent study & project work", time: "Jan 2025 – Jul 2026" }]);
  const langs = arr("bg_langs", ["Bengali — Native", "English — Fluent"]);
  const skillNames = arr("skills_list", skills.map(([, n]) => ({ name: n }))).map((x) => x.name);
  const item = (it) => `<div class="r-item"><h3>${esc(it.role)}</h3><div class="r-place">${esc(it.place)}</div><div class="r-time">${esc(it.time)}</div></div>`;
  const body = `<section class="section" style="padding-top:clamp(28px,4vw,56px)"><div class="wrap">${crumbs(crumb)}
  <div class="resume-bar"><p class="eyebrow" style="margin:0">Resume</p><div class="cta-row" style="margin:0"><a class="btn btn-primary" href="/Md-Limon-Ali-Resume.pdf" download><i class="fas fa-download" aria-hidden="true"></i>Download PDF</a><button class="btn btn-outline" type="button" onclick="window.print()"><i class="fas fa-print" aria-hidden="true"></i>Print</button></div></div>
  <article class="resume-sheet" aria-labelledby="r-name">
    <header class="resume-top">
      <div><h1 id="r-name">${esc(site.name)}</h1><p class="role">Web Developer · Kushtia, Bangladesh</p></div>
      <ul class="resume-contact">
        <li><i class="fas fa-phone" aria-hidden="true"></i><a href="tel:${site.phone}">${esc(site.phoneDisplay)}</a></li>
        <li><i class="fas fa-envelope" aria-hidden="true"></i><a href="mailto:${site.email}">${esc(site.email)}</a></li>
        <li><i class="fas fa-location-dot" aria-hidden="true"></i>${esc(site.address.street)}, ${esc(site.address.locality)}, ${esc(site.address.region)}, ${esc(site.address.countryName)}</li>
        <li><i class="fas fa-globe" aria-hidden="true"></i><a href="${site.url}/">mdlimonali.com</a></li>
      </ul>
    </header>
    <section class="r-sec" aria-labelledby="r-sum"><h2 id="r-sum">Profile</h2><p>Freelance web developer in Kushtia, Bangladesh. I design and build fast, responsive websites: Shopify stores, WordPress and WooCommerce sites, hand-coded websites and full-stack web apps, for businesses that want to look as good online as they do in person. Building since January 2025.</p></section>
    <section class="r-sec" aria-labelledby="r-skills"><h2 id="r-skills">Skills</h2><ul class="r-skills">${skillNames.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></section>
    <div class="r-cols">
      <section class="r-sec" aria-labelledby="r-exp"><h2 id="r-exp">Experience &amp; education</h2>${exp.map(item).join("")}</section>
      <section class="r-sec" aria-labelledby="r-cert"><h2 id="r-cert">Certification &amp; training</h2>${cert.map(item).join("")}<h2 id="r-lang" style="margin-top:28px">Languages</h2><ul class="r-skills">${langs.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></section>
    </div>
    <section class="r-sec" aria-labelledby="r-proj"><h2 id="r-proj">Selected projects</h2>
      ${projects.map((p) => `<div class="r-item"><h3><a href="${projectUrl(p)}">${esc(p.title)}</a> <span class="r-place">· ${esc(p.kind)}</span></h3><div class="r-place">${esc(p.summary)}</div><div class="r-time">${esc(p.stack.slice(0, 5).join(" · "))}</div></div>`).join("")}
    </section>
    <section class="r-sec" aria-labelledby="r-links"><h2 id="r-links">Online</h2><ul class="r-links">${site.social.map((s) => `<li><span>${esc(s.name)}:</span> <a href="${s.url}" target="_blank" rel="noopener me">${esc(s.url.replace(/^https?:\/\/(www\.)?/, ""))}</a></li>`).join("")}</ul></section>
  </article>
  <p class="hint" style="text-align:center;margin-top:24px;color:var(--ink-soft)">Prefer a file? <a href="/Md-Limon-Ali-Resume.pdf" download style="color:var(--accent-text);text-decoration:underline">Download the PDF resume</a>.</p>
</div></section>`;
  return layout({
    path: "/resume/", nav: "resume",
    title: "Resume of Md Limon Ali | Web Developer in Kushtia, Bangladesh",
    description: "Online resume of Md Limon Ali, a freelance web developer in Kushtia, Bangladesh: skills, experience, education, certification and projects. Download the PDF.",
    schema: [{ "@type": "ProfilePage", "@id": `${site.url}/resume/#webpage`, url: site.url + "/resume/", name: "Resume of Md Limon Ali", mainEntity: { "@id": `${site.url}/#person` }, isPartOf: { "@id": `${site.url}/#website` }, inLanguage: "en" }, personNode(), crumbSchema(crumb)],
    body,
  });
}

/* ================= 404 ================= */
function notFound() {
  return layout({
    path: "/404.html", noindex: true, title: "Page not found | Md Limon Ali", description: "This page could not be found.",
    schema: [websiteNode()],
    body: `<section class="notfound"><div class="wrap"><p class="big" aria-hidden="true">404</p><h1 style="font-size:clamp(1.8rem,1.3rem + 2vw,2.8rem);margin-bottom:12px">This page could not be found</h1><p class="lede center" style="margin-bottom:24px">The link may be old or mistyped. Try one of these instead.</p><p class="cta-row" style="justify-content:center"><a class="btn btn-primary" href="/">Go home</a><a class="btn btn-outline" href="/projects/">See projects</a></p></div></section>`,
  });
}

/* ================= WRITE EVERYTHING ================= */
write("index.html", home());
write("services/index.html", servicesPage());
write("projects/index.html", projectsPage());
projects.forEach((p, i) => write(`projects/${p.slug}/index.html`, casePage(p, i)));
write("blog/index.html", blogPage());
write("blog/post/index.html", blogPostShell());
write("resume/index.html", resumePage());
write("404.html", notFound());

const urls = [["/", "1.0"], ["/services/", "0.9"], ["/projects/", "0.9"], ["/blog/", "0.8"], ["/resume/", "0.6"], ...projects.map((p) => [projectUrl(p), "0.7"]), ...livePosts.map((p) => [`/blog/post/?slug=${encodeURIComponent(p.slug)}`, "0.7"])];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, pr]) => `  <url><loc>${site.url}${u}</loc><lastmod>${TODAY}</lastmod><priority>${pr}</priority></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /admin.html\n\nSitemap: ${site.url}/sitemap.xml\n`);
console.log(`Built ${3 + projects.length + 4} pages (${livePosts.length} published blog posts in sitemap) + sitemap.xml + robots.txt`);
