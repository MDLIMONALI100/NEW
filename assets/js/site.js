
/* ============================== pages, menu, typing text, FAQ, contact form ============================== */
const PAGE_URL={about:'/',work:'/work/',blog:'/blog/',contact:'/contact/'};

window.addEventListener('load',()=>{
  setTimeout(()=>{const l=document.getElementById('loader');if(l)l.classList.add('hide');},620);
});
setTimeout(()=>{const l=document.getElementById('loader');if(l)l.classList.add('hide');},1200);

document.addEventListener('DOMContentLoaded',()=>{
  typeRoles();
  setupFaq();
  setupNav();
  setupPager();
});

function setupPager(){
  /* each page is its own web address now; links in the menu do the navigation */
  const cur=document.querySelector('.page');
  const show=()=>{if(cur&&!cur.classList.contains('page-active')){cur.classList.add('page-active');window.srFlush&&window.srFlush(cur);}};
  if(cur){requestAnimationFrame(()=>requestAnimationFrame(show));setTimeout(show,150);}   /* the timer is a backup if the browser is not drawing frames yet */
  window.goToPage=function(slug){if(PAGE_URL[slug])location.href=PAGE_URL[slug];};
  /* Scrolling (mouse wheel, trackpad, touch, arrow keys, Space) is the browser's own page scrolling. */
  window.updateScrollProgress=function(){const bar=document.querySelector('.scroll-progress');if(!bar)return;const h=document.documentElement.scrollHeight-window.innerHeight;bar.style.transform='scaleX('+(h>0?Math.min(1,window.scrollY/h):0)+')';};
}

function setupNav(){
  const toggle=document.getElementById('navToggle');
  const links=document.getElementById('navLinks');
  toggle.addEventListener('click',()=>{
    const open=links.classList.toggle('open');
    toggle.setAttribute('aria-expanded',open?'true':'false');
    toggle.innerHTML=open?'<i class="fas fa-xmark"></i>':'<i class="fas fa-bars"></i>';
  });
  links.querySelectorAll('a,button').forEach(b=>b.addEventListener('click',()=>{
    links.classList.remove('open');toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<i class="fas fa-bars"></i>';
  }));
}

const heroPhotoEl=document.getElementById('heroPhoto');
if(heroPhotoEl)heroPhotoEl.addEventListener('error',function(){
  this.closest('.hero-photo').innerHTML='<div class="avatar-fallback">ML</div>';
});

function typeRoles(){
  const roles=window.SITE_ROLES=(window.__siteRoles&&window.__siteRoles.length)?window.__siteRoles:["Shopify Developer","WordPress Developer","Custom Web Developer"];
  const el=document.getElementById('roleText');
  if(!el)return;
  let ri=0,ci=0,del=false;
  function tick(){
    const w=roles[ri%roles.length]||"";
    if(!del){ci++;el.textContent=w.slice(0,ci);if(ci===w.length){del=true;setTimeout(tick,1100);return;}}
    else{ci--;el.textContent=w.slice(0,ci);if(ci===0){del=false;ri=(ri+1)%roles.length;}}
    setTimeout(tick,del?42:75);
  }
  tick();
}

function setupFaq(){
  document.querySelectorAll('.faq-item').forEach(item=>{
    item.querySelector('.faq-q').addEventListener('click',()=>{
      const o=item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i=>{i.classList.remove('open');i.querySelector('.faq-q').setAttribute('aria-expanded','false');});
      if(!o){item.classList.add('open');item.querySelector('.faq-q').setAttribute('aria-expanded','true');}
    });
  });
}

const form=document.getElementById('contact-form');
const fmsg=document.getElementById('form-message');
if(form)form.addEventListener('submit',async e=>{
  e.preventDefault();
  try{
    const r=await fetch(form.action,{method:'POST',body:new FormData(form),headers:{'Accept':'application/json'}});
    fmsg.style.display='block';
    if(r.ok){fmsg.textContent='Message sent!';form.reset();}
    else fmsg.textContent='Failed. Please try again.';
    setTimeout(()=>{fmsg.style.display='none';},3000);
  }catch{fmsg.textContent='Error. Please try again.';fmsg.style.display='block';}
});

/* ============================== live content from Supabase (admin panel) ============================== */
(function(){
  const SUPABASE_URL='https://ppxloknpydrodtfclowh.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable_ZV4M9EtX3_1BcqTncOl3NA_nLKcX_lJ';
  if(SUPABASE_URL.indexOf('YOUR_')===0||!window.supabase)return; // not configured yet -> keep static cards
  const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=u=>/^https?:\/\//i.test(u)?u:'#';
  /* active profile photo (managed from admin.html); falls back to profile.png */
  (async function(){
    try{
      const {data}=await sb.from('profile_photos').select('image_url').eq('is_active',true).order('created_at',{ascending:false}).limit(1);
      if(!data||!data[0]||!data[0].image_url)return;
      const url=data[0].image_url,pre=new Image();
      pre.onload=function(){
        const h=document.getElementById('heroPhoto');if(h)h.src=url;
        if(!document.documentElement.dataset.fav)document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(function(l){l.href=url;});
      };
      pre.src=url;
    }catch(e){/* keep profile.png */}
  })();
  /* editable text (managed from admin.html): front page, services, background */
  (async function(){
    try{
      if(!document.getElementById('sec-about'))return;           /* front-page text: only on the About page */
      const {data,error}=await sb.from('site_content').select('key,value');
      if(error||!data||!data.length)return;
      const C={};data.forEach(r=>{C[r.key]=r.value;});
      const has=k=>C[k]!==undefined&&C[k]!==null;
      const fmt=t=>esc(t).replace(/\[\[(.+?)\]\]/g,'<mark class="hl">$1</mark>').replace(/\{\{(.+?)\}\}/g,'<span class="accent">$1</span>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
      document.querySelectorAll('[data-key]').forEach(n=>{
        const k=n.getAttribute('data-key');if(!has(k)||typeof C[k]!=='string')return;
        if(n.hasAttribute('data-rich'))n.innerHTML=fmt(C[k]);else n.textContent=C[k];
      });
      const list=k=>Array.isArray(C[k])?C[k]:null;
      const roles=list('hero_roles');
      if(roles&&roles.length){const r2=roles.map(String);window.__siteRoles=r2;if(window.SITE_ROLES)window.SITE_ROLES.splice(0,window.SITE_ROLES.length,...r2);}
      const stats=list('hero_stats');
      if(stats){
        document.getElementById('statBars').innerHTML=stats.map(r=>{const v=Math.max(0,Math.min(100,parseInt(r.value)||0));
          return '<div class="stat-row"><div class="stat-row-top"><span>'+esc(r.label)+'</span><span>'+v+'%</span></div><div class="stat-track"><div class="stat-fill" style="--val:'+v+'%"></div></div></div>';}).join('');
      }
      const cards=list('svc_cards');
      if(cards){
        document.getElementById('svcGrid').innerHTML=cards.map((c,i)=>{
          const ic=/^(fab|fas) fa-[a-z0-9-]+$/.test(c.icon||'')?c.icon:'fas fa-code';
          return '<div class="service-card d'+Math.min(4+i,12)+'" data-anim><span class="service-no">'+String(i+1).padStart(2,'0')+'</span><div class="service-icon"><i class="'+ic+'"></i></div><h3>'+esc(c.title)+'</h3><p>'+fmt(c.text)+'</p></div>';
        }).join('');
      }
      const skl=list('skills_list');
      if(skl){
        document.getElementById('skillsGrid').innerHTML=skl.map((s,i)=>{
          const ic=/^(fab|fas) fa-[a-z0-9-]+$/.test(s.icon||'')?s.icon:'fas fa-code';
          return '<div class="skill d'+Math.min(3+Math.floor(i/2),12)+'" data-anim><i class="'+ic+'"></i>'+esc(s.name)+'</div>';
        }).join('');
      }
      const credItems=(col,items,before)=>{
        if(!items)return;
        col.querySelectorAll('.cred-item').forEach(n=>n.remove());
        const html=items.map(it=>'<div class="cred-item"><div class="cred-role">'+esc(it.role)+'</div><div class="cred-place">'+esc(it.place)+'</div><div class="cred-time">'+esc(it.time)+'</div></div>').join('');
        if(before)before.insertAdjacentHTML('beforebegin',html);else col.insertAdjacentHTML('beforeend',html);
      };
      credItems(document.getElementById('bgCol1'),list('bg_col1_items'),null);
      credItems(document.getElementById('bgCol2'),list('bg_col2_items'),document.getElementById('langRow'));
      const langs=list('bg_langs');
      if(langs)document.getElementById('langRow').innerHTML=langs.map(l=>'<span class="lang-pill">'+esc(l)+'</span>').join('');
    }catch(e){/* keep the static text */}
  })();
  /* active favicon (managed from admin.html); overrides the profile-photo fallback above */
  (async function(){
    try{
      const {data}=await sb.from('favicons').select('image_url').eq('is_active',true).order('created_at',{ascending:false}).limit(1);
      if(!data||!data[0]||!data[0].image_url)return;
      const url=data[0].image_url,pre=new Image();
      pre.onload=function(){
        document.documentElement.dataset.fav='1';
        document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(function(l){l.href=url;});
      };
      pre.src=url;
    }catch(e){/* keep fallback */}
  })();
  (function(){
    const list=document.getElementById('projList');
    if(!list)return;                                            /* projects: only on the Work page */
    const CACHE='projCache.v1';
    /* cards made from the admin panel: keep them the same size and style as the hand-written ones */
    const LIMIT=150;
    const long=function(t){return String(t||'').length>LIMIT+20;};
    const short=function(t){t=String(t||'').trim();if(!long(t))return t;const c=t.slice(0,LIMIT),i=c.lastIndexOf(' ');return c.slice(0,i>80?i:LIMIT).replace(/[\s,.;:-]+$/,'')+'\u2026';};
    const calm=function(t){t=String(t||'').trim();return t&&t===t.toUpperCase()&&/[A-Z]/.test(t)?t.charAt(0)+t.slice(1).toLowerCase():t;};
    const apply=function(data){
      list.querySelectorAll('.proj-row').forEach(r=>{if(!data.some(p=>String(p.id)===r.dataset.id))r.remove();});
      data.forEach(p=>{
        let row=list.querySelector('[data-id="'+p.id+'"]');
        if(row){const im=row.querySelector('img');if(im&&p.image_url&&/^https?:/.test(p.image_url)&&im.getAttribute('src')!==p.image_url)im.src=p.image_url;list.appendChild(row);return;}
        row=document.createElement('article');row.className='proj-row';row.dataset.id=p.id;
        row.innerHTML='<div class="proj-media" data-sr="up"><a class="proj-shot" href="'+esc(safeUrl(p.url))+'" target="_blank" rel="noopener" aria-label="'+esc(p.title)+' (opens in a new tab)"><img src="'+esc(/^https?:/.test(p.image_url||'')?p.image_url:'/'+String(p.image_url||'').replace(/^\//,''))+'" alt="'+esc(p.title)+'" width="1280" height="720" loading="lazy" decoding="async" onerror="this.closest(\'.proj-shot\').classList.add(\'img-missing\')"><span class="proj-num"></span></a></div>'+
          '<div class="proj-info" data-sr="up"><div class="proj-top"><span class="platform-tag">'+esc(p.platform)+'</span></div><h3>'+esc(p.title)+'</h3><p class="proj-sub">'+esc(calm(p.subtitle))+'</p><p class="proj-desc">'+esc(short(p.description))+'</p>'+
          (long(p.description)?'<div class="proj-more" id="pm-'+esc(p.id)+'"><div class="proj-more-in"><p class="proj-desc proj-full">'+esc(p.description)+'</p></div></div>':'')+
          '<div class="proj-actions"><a class="btn btn-primary" href="'+esc(safeUrl(p.url))+'" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i>Visit live project<span class="sr-only"> (opens in a new tab)</span></a>'+
          (long(p.description)?'<button class="proj-more-btn" type="button" aria-expanded="false" aria-controls="pm-'+esc(p.id)+'"><span>Show details</span><i class="fas fa-chevron-down" aria-hidden="true"></i></button>':'')+'</div></div>';
list.appendChild(row);
      });
      list.querySelectorAll('.proj-row').forEach((r,i)=>{r.querySelector('.proj-num').textContent=String(i+1).padStart(2,'0');r.querySelector('.proj-media').setAttribute('data-sr','up');r.querySelector('.proj-info').setAttribute('data-sr','up');});
      {const n=list.querySelectorAll('.proj-row').length,lc=document.getElementById('liveCount'),ll=document.getElementById('liveLabel');if(lc){lc.textContent=n;ll.textContent=n===1?'project live':'projects live';}}
      if(window.srScan){window.srScan();window.srFlush(document.querySelector('.page-active'));}
    };
    /* show the last known list straight away (no hidden list, no pop-in), then refresh it quietly */
    let cached=null;try{cached=localStorage.getItem(CACHE);}catch(e){}
    if(cached){try{apply(JSON.parse(cached));}catch(e){cached=null;}document.documentElement.classList.add('proj-synced');}
    (async function(){
      try{
        const {data,error}=await sb.from('projects').select('*').eq('published',true).order('sort_order').order('created_at',{ascending:false});
        if(error||!data)return;
        const fresh=JSON.stringify(data);
        if(fresh!==cached){apply(data);try{localStorage.setItem(CACHE,fresh);}catch(e){}}
      }catch(e){/* keep static fallback */}finally{document.documentElement.classList.add('proj-synced');}
    })();
  })();
})();

/* ============================== scroll effects, jump links, blog + article reader ============================== */
(function(){
  setTimeout(function(){document.documentElement.classList.add('proj-synced');},3500);
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav=function(){return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'))||72;};

  /* ---- scroll reveal (works inside the scrolling content panels) ---- */
  document.querySelectorAll('[data-stagger]').forEach(function(g){
    Array.prototype.forEach.call(g.children,function(c,i){
      if(!c.hasAttribute('data-sr'))c.setAttribute('data-sr',g.getAttribute('data-stagger')||(i%2?'zoom':'up'));
      c.style.setProperty('--sr-d',Math.min(i,8)*70+'ms');
    });
  });
  var ios=new Map();
  function ioFor(root){
    if(ios.has(root))return ios.get(root);
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting)return;
        var pg=e.target.closest('.page');
        if(pg&&!pg.classList.contains('page-active'))return; /* wait until its page is shown */
        e.target.classList.add('sr-in');io.unobserve(e.target);
      });
    },{root:root,rootMargin:'0px 0px -8% 0px',threshold:.1});
    ios.set(root,io);return io;
  }
  var instantNext=false;
  window.srScan=function(instant){
    instantNext=!!instant;
    document.querySelectorAll('[data-sr]:not(.sr-in):not([data-sr-bound])').forEach(function(el){
      el.setAttribute('data-sr-bound','1');
      if(reduce||!('IntersectionObserver' in window)){el.classList.add('sr-in');return;}
      if(navIn&&(!navInDone||instantNext)){var r=el.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0){el.classList.add('sr-in','sr-now');return;}} /* already on screen: show it now, no pop-in */
      ioFor(null).observe(el);
    });
  };
  window.srFlush=function(page){ /* page just became active: re-check its pending items */
    if(!page)return;
    page.querySelectorAll('[data-sr]:not(.sr-in)').forEach(function(el){
      var io=ios.get(null);
      if(io){io.unobserve(el);io.observe(el);}
    });
  };
  var navIn=document.documentElement.classList.contains('nav-in'),navInDone=false;
  window.srScan();navInDone=true;
  setTimeout(function(){window.srFlush(document.querySelector('.page-active'));},700);

  /* ---- progress bar + hero parallax, one rAF per scroll ---- */
  var bar=document.createElement('div');bar.className='scroll-progress';bar.setAttribute('aria-hidden','true');document.body.appendChild(bar);
  var tick=false;
  function onScroll(){
    if(tick)return;tick=true;
    requestAnimationFrame(function(){window.updateScrollProgress&&window.updateScrollProgress();tick=false;});
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});

  /* ---- project cards: "Show details" opens role, highlights and tech ---- */
  document.addEventListener('click',function(e){
    var b=e.target.closest('.proj-more-btn');if(!b)return;
    var row=b.closest('.proj-row'),open=!row.classList.contains('more-open');
    row.classList.toggle('more-open',open);b.setAttribute('aria-expanded',open);
    b.querySelector('span').textContent=open?'Hide details':'Show details';
  });

  /* ---- jump chips: smooth scroll inside the page ---- */
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-scroll]');if(!b)return;
    var t=document.getElementById(b.getAttribute('data-scroll'));if(!t)return;
    window.scrollTo({top:Math.max(0,t.getBoundingClientRect().top+window.scrollY-nav()-18),behavior:reduce?'auto':'smooth'});
  });

  /* ================= BLOG ================= */
  if(!window.supabase||!window.MD)return;
  var SB='https://ppxloknpydrodtfclowh.supabase.co',KEY='sb_publishable_ZV4M9EtX3_1BcqTncOl3NA_nLKcX_lJ';
  var sbc=window.supabase.createClient(SB,KEY),esc=MD.esc,$=function(id){return document.getElementById(id);};
  var grid=$('blogGrid'),reader=$('reader'),body=$('readerBody'),posts=[],pushed=false,lastFocus=null;
  if(!grid||!reader)return;                                     /* the blog only lives on /blog/ */
  var COLS='id,slug,title,excerpt,cover_url,cover_alt,tags,published_at,created_at';
  var fmt=function(d){try{return new Date(d).toLocaleDateString('en',{year:'numeric',month:'long',day:'numeric'});}catch(e){return '';}};
  var link=function(p){return '/blog/?post='+encodeURIComponent(p.slug);};

  function card(p,i){
    var th=p.cover_url?'<img src="'+esc(p.cover_url)+'" alt="'+esc(p.cover_alt||p.title)+'" width="1280" height="720" loading="lazy" decoding="async">':'<div class="thumb-letter" aria-hidden="true">'+esc((p.title||'?').charAt(0))+'</div>';
    var tag=(p.tags&&p.tags[0])?'<span class="platform-tag">'+esc(p.tags[0])+'</span>':'';
    return '<a class="project-card" data-sr="up" style="--sr-d:'+Math.min(i,6)*70+'ms" href="'+link(p)+'" data-post="'+esc(p.slug)+'">'+
      '<div class="project-thumb">'+th+'</div><div class="project-body"><div class="project-head"><span class="project-num">'+String(i+1).padStart(2,'0')+'</span><div><h3>'+esc(p.title)+'</h3><span class="project-sub">'+esc(fmt(p.published_at||p.created_at))+' · '+MD.readingTime(p.excerpt||'')+' min</span></div>'+tag+'</div>'+
      (p.excerpt?'<p>'+esc(p.excerpt)+'</p>':'')+'<span class="view-project">Read Article <i class="fas fa-arrow-right"></i></span></div></a>';
  }
  var BCACHE='blogCache.v1',bcached=null;
  try{bcached=localStorage.getItem(BCACHE);}catch(e){}
  if(bcached){try{posts=JSON.parse(bcached);if(posts.length){grid.innerHTML=posts.map(card).join('');window.srScan(true);}}catch(e){bcached=null;posts=[];}}
  function loadList(){
    return sbc.from('blog_posts').select(COLS).eq('published',true).order('published_at',{ascending:false}).then(function(r){
      if(r.error){grid.innerHTML='<div class="blog-empty"><strong>Articles are unavailable right now</strong>Please check back soon.</div>';return;}
      var fresh=JSON.stringify(r.data||[]);
      if(fresh===bcached)return;                                  /* nothing changed: keep what is on screen */
      try{localStorage.setItem(BCACHE,fresh);}catch(e){}
      posts=r.data||[];
      if(!posts.length){grid.innerHTML='<div class="blog-empty"><strong>First articles are on the way</strong>I will share notes on web development, Shopify and WordPress here. Check back soon.</div>';return;}
      grid.innerHTML=posts.map(card).join('');window.srScan();window.srFlush(document.querySelector('.page-active'));
    },function(){grid.innerHTML='<div class="blog-empty"><strong>Articles are unavailable right now</strong>Please check back soon.</div>';});
  }
  grid.addEventListener('click',function(e){
    var a=e.target.closest('a[data-post]');if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
    e.preventDefault();openPost(a.getAttribute('data-post'),true,a);
  });

  /* meta swap while an article is open */
  var orig=null;
  function metaEl(sel){return document.head.querySelector(sel);}
  function setMeta(t,d,url,img){
    if(!orig)orig={title:document.title,desc:metaEl('meta[name="description"]').content,can:metaEl('link[rel="canonical"]').href,ogt:metaEl('meta[property="og:title"]').content,ogd:metaEl('meta[property="og:description"]').content,ogu:metaEl('meta[property="og:url"]').content,ogi:metaEl('meta[property="og:image"]').content};
    document.title=t;metaEl('meta[name="description"]').content=d;metaEl('link[rel="canonical"]').href=url;
    metaEl('meta[property="og:title"]').content=t;metaEl('meta[property="og:description"]').content=d;metaEl('meta[property="og:url"]').content=url;if(img)metaEl('meta[property="og:image"]').content=img;
  }
  function restoreMeta(){
    if(!orig)return;document.title=orig.title;metaEl('meta[name="description"]').content=orig.desc;metaEl('link[rel="canonical"]').href=orig.can;
    metaEl('meta[property="og:title"]').content=orig.ogt;metaEl('meta[property="og:description"]').content=orig.ogd;metaEl('meta[property="og:url"]').content=orig.ogu;metaEl('meta[property="og:image"]').content=orig.ogi;
    var l=$('post-ld');if(l)l.remove();orig=null;
  }

  function showReader(html){
    body.innerHTML=html;reader.scrollTop=0;
    reader.classList.add('open');reader.inert=false;document.body.classList.add('reader-open');
    ['scroller'].forEach(function(id){$(id).inert=true;});document.querySelector('.navbar').inert=true;
    setTimeout(function(){$('readerClose').focus();},60);
  }
  function openPost(slug,push,from){
    lastFocus=from||document.activeElement;
    sbc.from('blog_posts').select('*').eq('slug',slug).eq('published',true).maybeSingle().then(function(r){
      var p=r.data;
      if(r.error||!p){showReader('<button class="reader-back" type="button" data-close><i class="fas fa-arrow-left"></i>All articles</button><h2 class="reader-title" id="readerTitle">Article not found</h2><p class="reader-lede">It may have been moved or unpublished.</p>');return;}
      var out=MD.render(p.content),date=p.published_at||p.created_at,url=location.origin+link(p);
      var desc=(p.excerpt||p.content.replace(/[#*`>\-\[\]()!]/g,' ').replace(/\s+/g,' ').trim()).slice(0,158);
      setMeta(p.title+' | Md Limon Ali',desc,url,p.cover_url);
      var ld=document.createElement('script');ld.type='application/ld+json';ld.id='post-ld';
      ld.textContent=JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:p.title,description:desc,image:p.cover_url?[p.cover_url]:undefined,datePublished:date,dateModified:p.updated_at||date,mainEntityOfPage:url,keywords:(p.tags||[]).join(', ')||undefined,author:{'@type':'Person',name:'Md Limon Ali',url:location.origin+'/'},publisher:{'@type':'Organization',name:'Md Limon Ali',logo:{'@type':'ImageObject',url:location.origin+'/profile.png'}},inLanguage:'en'}).replace(/</g,'\\u003c');
      document.head.appendChild(ld);
      var enc=encodeURIComponent(url),t=encodeURIComponent(p.title);
      var more=posts.filter(function(x){return x.id!==p.id;}).slice(0,2);
      showReader(
        '<button class="reader-back" type="button" data-close><i class="fas fa-arrow-left"></i>All articles</button>'+
        '<div class="reader-tags">'+(p.tags||[]).map(function(x){return '<span class="platform-tag" style="margin-left:0">'+esc(x)+'</span>';}).join('')+'</div>'+
        '<h2 class="reader-title" id="readerTitle">'+esc(p.title)+'</h2>'+(p.excerpt?'<p class="reader-lede">'+esc(p.excerpt)+'</p>':'')+
        '<div class="reader-by"><img src="/avatar.webp" alt="" width="44" height="44"><div><strong>Md Limon Ali</strong><span><time datetime="'+esc(date)+'">'+esc(fmt(date))+'</time> · '+MD.readingTime(p.content)+' min read</span></div></div>'+
        (p.cover_url?'<figure class="reader-cover"><img src="'+esc(p.cover_url)+'" alt="'+esc(p.cover_alt||p.title)+'" width="1280" height="720" decoding="async"></figure>':'')+
        '<div class="prose">'+out.html+'</div>'+
        '<div class="reader-share"><span>Share</span>'+
        '<a aria-label="Share on X (opens in a new tab)" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text='+t+'&url='+enc+'"><i class="fab fa-x-twitter"></i></a>'+
        '<a aria-label="Share on LinkedIn (opens in a new tab)" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url='+enc+'"><i class="fab fa-linkedin-in"></i></a>'+
        '<a aria-label="Share on Facebook (opens in a new tab)" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u='+enc+'"><i class="fab fa-facebook-f"></i></a>'+
        '<a aria-label="Share on WhatsApp (opens in a new tab)" target="_blank" rel="noopener" href="https://wa.me/?text='+t+'%20'+enc+'"><i class="fab fa-whatsapp"></i></a>'+
        '<button type="button" id="copyLink" aria-label="Copy link"><i class="fas fa-link"></i></button></div>'+
        '<div class="reader-author"><img src="/avatar.webp" alt="Md Limon Ali" width="68" height="68" loading="lazy"><div><strong>Written by Md Limon Ali</strong><p>Web developer in Kushtia, Bangladesh. I build Shopify stores, WordPress sites and custom web apps. <a href="#contact" data-close-contact>Work with me</a>.</p></div></div>'+
        '<section class="comments" aria-labelledby="commentsH"><h3 id="commentsH">Comments <span id="commentCount"></span></h3><div id="commentList" aria-live="polite"><p class="comment-empty">Loading comments…</p></div>'+
        '<form id="commentForm" class="comment-form" novalidate><h4>Leave a comment</h4>'+
        '<label for="cmName">Your name</label><input id="cmName" name="author" maxlength="60" autocomplete="name" required>'+
        '<label for="cmBody">Your comment</label><textarea id="cmBody" name="body" maxlength="1000" rows="4" required></textarea>'+
        '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'+
        '<button class="btn btn-primary" type="submit"><i class="fas fa-paper-plane"></i>Post comment</button>'+
        '<p class="comment-msg" id="commentMsg" role="status"></p><p class="comment-note">Comments are reviewed before they appear. Please be kind and keep it on topic.</p></form></section>'+
        (more.length?'<div class="reader-more"><h3>More articles</h3><div class="projects-grid">'+more.map(function(x,i){return card(x,i).replace(' data-sr="up"','');}).join('')+'</div></div>':'')
      );
      loadComments(p);
      var cl=$('copyLink');
      if(cl)cl.addEventListener('click',function(){var ok=function(){cl.innerHTML='<i class="fas fa-check"></i>';setTimeout(function(){cl.innerHTML='<i class="fas fa-link"></i>';},1800);};
        if(navigator.clipboard)navigator.clipboard.writeText(url).then(ok,function(){});});
      if(push){history.pushState({post:slug},'',link(p));pushed=true;}
    });
  }
  function loadComments(p){
    var box=$('commentList'),f=$('commentForm'),msg=$('commentMsg');
    sbc.from('blog_comments').select('author_name,body,created_at').eq('post_id',p.id).eq('approved',true).order('created_at',{ascending:true}).then(function(r){
      var c=r.data||[];$('commentCount').textContent=c.length?'('+c.length+')':'';
      box.innerHTML=c.length?c.map(function(x){return '<article class="comment"><div class="comment-head"><span class="comment-av" aria-hidden="true">'+esc(x.author_name.trim().charAt(0).toUpperCase())+'</span><strong>'+esc(x.author_name)+'</strong><time datetime="'+esc(x.created_at)+'">'+esc(fmt(x.created_at))+'</time></div><p>'+esc(x.body).replace(/\n/g,'<br>')+'</p></article>';}).join(''):'<p class="comment-empty">No comments yet. Be the first to share your thoughts.</p>';
    },function(){box.innerHTML='';});
    f.addEventListener('submit',function(e){
      e.preventDefault();
      if(f.website.value)return; /* honeypot: bots fill hidden fields */
      var last=0;try{last=+localStorage.getItem('cmt_t')||0;}catch(x){}
      var say=function(t,ok){msg.className='comment-msg '+(ok?'ok':'err');msg.textContent=t;};
      var name=f.author.value.trim(),body=f.body.value.trim();
      if(!name||body.length<2){say('Please add your name and a comment.',false);return;}
      if(Date.now()-last<30000){say('Please wait a moment before posting again.',false);return;}
      var btn=f.querySelector('button[type=submit]');btn.disabled=true;
      sbc.from('blog_comments').insert({post_id:p.id,author_name:name.slice(0,60),body:body.slice(0,1000),approved:false}).then(function(r){
        btn.disabled=false;
        if(r.error){say('Sorry, your comment could not be sent. Please try again later.',false);return;}
        f.reset();try{localStorage.setItem('cmt_t',String(Date.now()));}catch(x){}
        say('Thank you! Your comment was received and will appear after it is approved.',true);
      },function(){btn.disabled=false;say('Network error. Please try again.',false);});
    });
  }
  function closeReader(fromPop){
    reader.classList.remove('open');reader.inert=true;document.body.classList.remove('reader-open');
    $('scroller').inert=false;document.querySelector('.navbar').inert=false;restoreMeta();
    if(!fromPop){
      if(pushed&&history.state&&history.state.post){history.back();}
      else history.replaceState(null,'',location.pathname);
    }
    pushed=false;
    if(lastFocus&&lastFocus.focus)setTimeout(function(){lastFocus.focus();},50);
  }
  reader.addEventListener('click',function(e){
    if(e.target.closest('#readerClose')||e.target.closest('[data-close]')){closeReader(false);return;}
    var ia=e.target.closest('.prose a[href^="#"],a[data-close-contact]');
    if(ia&&!e.metaKey&&!e.ctrlKey){e.preventDefault();var dest=(ia.getAttribute('href')||'#contact').slice(1);closeReader(true);history.replaceState(null,'',location.pathname);if(window.goToPage)window.goToPage(dest);return;}
    var a=e.target.closest('a[data-post]');if(a&&!e.metaKey&&!e.ctrlKey){e.preventDefault();var s=a.getAttribute('data-post');restoreMeta();openPost(s,false,a);history.replaceState({post:s},'',link({slug:s}));}
    if(e.target.closest('[data-close-contact]')){e.preventDefault();closeReader(false);window.goToPage&&window.goToPage('contact');}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&reader.classList.contains('open'))closeReader(false);});
  window.addEventListener('popstate',function(){
    var s=new URLSearchParams(location.search).get('post');
    if(s)openPost(s,false);else if(reader.classList.contains('open'))closeReader(true);
  });

  loadList().then(function(){
    var s=new URLSearchParams(location.search).get('post');
    if(s){openPost(s,false);}
  });
})();

/* Deterrent: blocks right-click and the usual DevTools / view-source shortcuts. (Cannot fully prevent copying: browsers always receive the page.) */
(function(){
  var stop=function(e){e.preventDefault();e.stopPropagation();return false;};
  document.addEventListener('contextmenu',stop,true);
  document.addEventListener('dragstart',function(e){if(e.target&&e.target.tagName==='IMG')stop(e);},true);
  document.addEventListener('keydown',function(e){
    var k=(e.key||'').toLowerCase(),mod=e.ctrlKey||e.metaKey;
    if(e.key==='F12'||e.keyCode===123)return stop(e);
    if(mod&&e.shiftKey&&['i','j','c','k'].indexOf(k)>-1)return stop(e);   /* Ctrl/Cmd+Shift+I/J/C/K */
    if(e.metaKey&&e.altKey&&['i','j','c','u'].indexOf(k)>-1)return stop(e); /* Mac: Cmd+Option+I/J/C/U */
    if(e.ctrlKey&&['u','s'].indexOf(k)>-1)return stop(e);                  /* view source / save */
  },true);
})();
