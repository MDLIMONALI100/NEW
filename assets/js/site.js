/* Shared behaviour for every page: theme, nav, reveal, FAQ, filters, form. No dependencies. */
(function(){
  var root=document.documentElement;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* theme toggle (initial theme is set by a tiny inline script in <head>) */
  var tt=document.querySelector('.theme-toggle');
  if(tt){
    var sync=function(){var d=root.getAttribute('data-theme')==='dark';tt.setAttribute('aria-pressed',d?'true':'false');tt.setAttribute('aria-label',d?'Switch to light mode':'Switch to dark mode');};
    sync();
    tt.addEventListener('click',function(){
      var next=root.getAttribute('data-theme')==='dark'?'light':'dark';
      root.setAttribute('data-theme',next);
      try{localStorage.setItem('theme',next);}catch(e){}
      sync();
    });
  }

  /* mobile nav */
  var nt=document.querySelector('.nav-toggle'),nav=document.getElementById('site-nav');
  if(nt&&nav){
    nt.addEventListener('click',function(){
      var o=nav.classList.toggle('open');
      nt.setAttribute('aria-expanded',o?'true':'false');
      nt.querySelector('i').className=o?'fas fa-xmark':'fas fa-bars';
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('open')){nt.click();nt.focus();}});
  }

  /* reveal on scroll */
  var items=[].slice.call(document.querySelectorAll('[data-reveal],.stat-bars,.hl-scope'));
  if('IntersectionObserver' in window&&!reduce){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in-view');io.unobserve(e.target);}});},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
    items.forEach(function(el){io.observe(el);});
  }else{items.forEach(function(el){el.classList.add('in-view');});}
  /* highlighter marks draw in when their section is visible */
  var scopes=[].slice.call(document.querySelectorAll('.section,.hero,.page-hero'));
  if('IntersectionObserver' in window&&!reduce){
    var io2=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in-view');io2.unobserve(e.target);}});},{threshold:.2});
    scopes.forEach(function(el){io2.observe(el);});
  }else{scopes.forEach(function(el){el.classList.add('in-view');});}

  /* scroll progress + back to top */
  var bar=document.querySelector('.progress'),top=document.querySelector('.back-top');
  var ticking=false;
  function onScroll(){
    if(ticking)return;ticking=true;
    requestAnimationFrame(function(){
      var h=document.documentElement.scrollHeight-window.innerHeight;
      if(bar)bar.style.transform='scaleX('+(h>0?Math.min(1,window.scrollY/h):0)+')';
      if(top)top.classList.toggle('show',window.scrollY>700);
      ticking=false;
    });
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  if(top)top.addEventListener('click',function(){window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});});

  /* FAQ accordion (buttons carry aria-expanded) */
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q=item.querySelector('.faq-q');if(!q)return;
    q.addEventListener('click',function(){
      var open=item.classList.contains('open');
      item.parentNode.querySelectorAll('.faq-item.open').forEach(function(i){i.classList.remove('open');i.querySelector('.faq-q').setAttribute('aria-expanded','false');});
      if(!open){item.classList.add('open');q.setAttribute('aria-expanded','true');}
    });
  });

  /* project filter */
  var fbtns=document.querySelectorAll('.filter-btn');
  if(fbtns.length){
    var apply=function(cat){
      fbtns.forEach(function(b){b.setAttribute('aria-pressed',b.dataset.filter===cat?'true':'false');});
      document.querySelectorAll('.projects-grid .project-card').forEach(function(c){c.hidden=!(cat==='all'||c.dataset.category===cat);});
      var live=document.getElementById('filter-status');
      if(live){var n=document.querySelectorAll('.projects-grid .project-card:not([hidden])').length;live.textContent='Showing '+n+' project'+(n===1?'':'s');}
    };
    fbtns.forEach(function(b){b.addEventListener('click',function(){apply(b.dataset.filter);try{history.replaceState(null,'',b.dataset.filter==='all'?location.pathname:'#'+encodeURIComponent(b.dataset.filter));}catch(e){}});});
    var h=decodeURIComponent((location.hash||'').slice(1));
    if(h&&document.querySelector('.filter-btn[data-filter="'+h.replace(/"/g,'')+'"]'))apply(h);
  }

  /* case-study table of contents highlight */
  var tocLinks=[].slice.call(document.querySelectorAll('.case-toc a'));
  if(tocLinks.length&&'IntersectionObserver' in window){
    var map={};tocLinks.forEach(function(a){map[a.getAttribute('href').slice(1)]=a;});
    var io3=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){tocLinks.forEach(function(a){a.classList.remove('active');});var a=map[e.target.id];if(a)a.classList.add('active');}});},{rootMargin:'-30% 0px -60% 0px'});
    Object.keys(map).forEach(function(id){var s=document.getElementById(id);if(s)io3.observe(s);});
  }

  /* typing role line (home) */
  var rt=document.getElementById('roleText');
  if(rt){
    var roles=window.SITE_ROLES=(window.__siteRoles&&window.__siteRoles.length)?window.__siteRoles:["Shopify Developer","WordPress Developer","Custom Web Developer"];
    if(reduce){rt.textContent=roles[0];rt.classList.remove('cursor-blink');}
    else{
      var ri=0,ci=0,del=false;
      (function tick(){
        var w=roles[ri%roles.length]||'';
        if(!del){ci++;rt.textContent=w.slice(0,ci);if(ci===w.length){del=true;setTimeout(tick,1300);return;}}
        else{ci--;rt.textContent=w.slice(0,ci);if(ci===0){del=false;ri=(ri+1)%roles.length;}}
        setTimeout(tick,del?40:72);
      })();
    }
  }

  /* contact form (Formspree) */
  var form=document.getElementById('contact-form'),fmsg=document.getElementById('form-message');
  if(form&&fmsg){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var btn=form.querySelector('button[type=submit]');if(btn)btn.disabled=true;
      fetch(form.action,{method:'POST',body:new FormData(form),headers:{'Accept':'application/json'}}).then(function(r){
        fmsg.style.display='block';
        if(r.ok){fmsg.textContent='Message sent. I will reply as soon as I can.';form.reset();}else fmsg.textContent='Sorry, that failed. Please email me directly.';
      }).catch(function(){fmsg.style.display='block';fmsg.textContent='Network error. Please email me directly.';}).then(function(){if(btn)btn.disabled=false;setTimeout(function(){fmsg.style.display='none';},6000);});
    });
  }
})();
