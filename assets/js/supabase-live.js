/* Live content from Supabase (managed in admin.html). Every page works without this file:
   the HTML already contains the same content, so search engines and slow connections see it too.
   The public (anon) key is meant to be in the browser; Row Level Security protects the data. */
(function(){
  var cfg=window.SITE_SUPABASE;
  if(!cfg||!window.supabase)return;
  var sb=window.supabase.createClient(cfg.url,cfg.anonKey);
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});};
  var fmt=function(t){return esc(t).replace(/\[\[(.+?)\]\]/g,'<mark class="hl">$1</mark>').replace(/\{\{(.+?)\}\}/g,'<span class="accent">$1</span>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');};
  var iconOk=function(i,fallback){return /^(fab|fas) fa-[a-z0-9-]+$/.test(i||'')?i:fallback;};
  var isHome=!!document.getElementById('home-live');

  /* profile photo + favicon */
  function img(table,cb){
    sb.from(table).select('image_url').eq('is_active',true).order('created_at',{ascending:false}).limit(1).then(function(r){
      var d=r.data;if(!d||!d[0]||!d[0].image_url)return;
      var url=d[0].image_url,pre=new Image();pre.onload=function(){cb(url);};pre.src=url;
    },function(){});
  }
  if(isHome)img('profile_photos',function(url){
    var h=document.getElementById('heroPhoto');if(h)h.src=url;
    if(!document.documentElement.dataset.fav)document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(function(l){l.href=url;});
  });
  img('favicons',function(url){document.documentElement.dataset.fav='1';document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(function(l){l.href=url;});});

  /* editable text blocks on the home page */
  if(isHome)sb.from('site_content').select('key,value').then(function(r){
    var data=r.data;if(r.error||!data||!data.length)return;
    var C={};data.forEach(function(x){C[x.key]=x.value;});
    document.querySelectorAll('[data-key]').forEach(function(n){
      var k=n.getAttribute('data-key');if(typeof C[k]!=='string')return;
      if(n.hasAttribute('data-rich'))n.innerHTML=fmt(C[k]);else n.textContent=C[k];
    });
    var list=function(k){return Array.isArray(C[k])?C[k]:null;};
    var roles=list('hero_roles');
    if(roles&&roles.length){var r2=roles.map(String);window.__siteRoles=r2;if(window.SITE_ROLES)window.SITE_ROLES.splice.apply(window.SITE_ROLES,[0,window.SITE_ROLES.length].concat(r2));}
    var stats=list('hero_stats'),sb2=document.getElementById('statBars');
    if(stats&&sb2)sb2.innerHTML=stats.map(function(s){var v=Math.max(0,Math.min(100,parseInt(s.value)||0));return '<div class="stat-row"><div class="stat-row-top"><span>'+esc(s.label)+'</span><span>'+v+'%</span></div><div class="stat-track"><div class="stat-fill" style="--val:'+v+'%"></div></div></div>';}).join('');
    var cards=list('svc_cards'),sg=document.getElementById('svcGrid');
    if(cards&&sg)sg.innerHTML=cards.map(function(c,i){return '<article class="service-card in-view"><span class="service-no" aria-hidden="true">'+String(i+1).padStart(2,'0')+'</span><div class="service-icon" aria-hidden="true"><i class="'+iconOk(c.icon,'fas fa-code')+'"></i></div><h3>'+esc(c.title)+'</h3><p>'+fmt(c.text)+'</p></article>';}).join('');
    var skl=list('skills_list'),kg=document.getElementById('skillsGrid');
    if(skl&&kg)kg.innerHTML=skl.map(function(s){return '<li class="skill"><i class="'+iconOk(s.icon,'fas fa-code')+'" aria-hidden="true"></i>'+esc(s.name)+'</li>';}).join('');
    var cred=function(col,items,before){
      if(!items||!col)return;
      col.querySelectorAll('.cred-item').forEach(function(n){n.remove();});
      var html=items.map(function(it){return '<div class="cred-item"><div class="cred-role">'+esc(it.role)+'</div><div class="cred-place">'+esc(it.place)+'</div><div class="cred-time">'+esc(it.time)+'</div></div>';}).join('');
      if(before)before.insertAdjacentHTML('beforebegin',html);else col.insertAdjacentHTML('beforeend',html);
    };
    cred(document.getElementById('bgCol1'),list('bg_col1_items'),null);
    cred(document.getElementById('bgCol2'),list('bg_col2_items'),document.getElementById('langRow'));
    var langs=list('bg_langs'),lr=document.getElementById('langRow');
    if(langs&&lr)lr.innerHTML=langs.map(function(l){return '<span class="lang-pill">'+esc(l)+'</span>';}).join('');
  },function(){});

  /* projects page: refresh screenshots, and add any project you create later in admin.html */
  var grid=document.querySelector('.projects-grid[data-live]');
  if(grid)sb.from('projects').select('*').eq('published',true).order('sort_order').order('created_at',{ascending:false}).then(function(r){
    var d=r.data;if(r.error||!d)return;
    var safe=function(u){return /^https?:\/\//i.test(u)?u:'#';};
    d.forEach(function(p){
      var card=grid.querySelector('[data-id="'+p.id+'"]');
      if(card){
        var im=card.querySelector('img'),u=p.image_url;
        if(im&&u&&/^https?:/.test(u)&&im.src!==u)im.src=u;
      }else{
        var el=document.createElement('article');el.className='project-card';el.dataset.id=p.id;el.dataset.category='all-new';
        el.innerHTML='<div class="project-thumb"><img src="'+esc(p.image_url)+'" alt="'+esc(p.title)+'" width="1280" height="720" loading="lazy"></div><div class="project-body"><h3><a href="'+esc(safe(p.url))+'" target="_blank" rel="noopener">'+esc(p.title)+'</a></h3><p class="project-sub">'+esc(p.subtitle)+'</p><p>'+esc(p.description)+'</p><span class="view-project">View project <i class="fas fa-arrow-right" aria-hidden="true"></i></span></div>';
        grid.appendChild(el);
      }
    });
  },function(){});
})();
