/* Blog: list page (#blog-list) and single post page (#blog-post). Posts live in Supabase (table blog_posts)
   and are written in admin.html. Only published posts are readable by the public (Row Level Security). */
(function(){
  var cfg=window.SITE_SUPABASE;
  var list=document.getElementById('blog-list'),post=document.getElementById('blog-post');
  if(!list&&!post)return;
  var esc=MD.esc;
  var SITE=location.origin;
  var fmtDate=function(d){try{return new Date(d).toLocaleDateString('en',{year:'numeric',month:'long',day:'numeric'});}catch(e){return '';}};
  var postUrl=function(p){return '/blog/post/?slug='+encodeURIComponent(p.slug);};
  var COLS='id,slug,title,excerpt,cover_url,cover_alt,tags,published_at,created_at';

  function ready(cb){
    if(window.supabase){cb(window.supabase.createClient(cfg.url,cfg.anonKey));return;}
    var t=setInterval(function(){if(window.supabase){clearInterval(t);cb(window.supabase.createClient(cfg.url,cfg.anonKey));}},60);
    setTimeout(function(){clearInterval(t);},10000);
  }
  function state(host,html){host.innerHTML='<div class="blog-state">'+html+'</div>';}

  /* ---------------- list ---------------- */
  function card(p,feature){
    var d=fmtDate(p.published_at||p.created_at);
    var tags=(p.tags||[]).slice(0,3).map(function(t){return '<span class="chip">'+esc(t)+'</span>';}).join('');
    var img=p.cover_url?'<div class="post-thumb"><img src="'+esc(p.cover_url)+'" alt="'+esc(p.cover_alt||p.title)+'" width="1280" height="720" loading="'+(feature?'eager':'lazy')+'" decoding="async"></div>':'<div class="post-thumb post-thumb--empty" aria-hidden="true"><span>'+esc((p.title||'').charAt(0))+'</span></div>';
    return '<article class="post-card'+(feature?' post-card--feature':'')+'" data-tags="'+esc((p.tags||[]).join('|').toLowerCase())+'" data-text="'+esc((p.title+' '+(p.excerpt||'')).toLowerCase())+'">'+img+
      '<div class="post-body"><div class="post-meta"><time datetime="'+esc(p.published_at||p.created_at)+'">'+esc(d)+'</time></div>'+
      '<h2 class="post-title"><a href="'+postUrl(p)+'">'+esc(p.title)+'</a></h2>'+
      (p.excerpt?'<p class="post-excerpt">'+esc(p.excerpt)+'</p>':'')+
      '<div class="chips">'+tags+'</div><span class="view-project" aria-hidden="true">Read article <i class="fas fa-arrow-right"></i></span></div></article>';
  }
  function runList(sb){
    sb.from('blog_posts').select(COLS).eq('published',true).order('published_at',{ascending:false}).then(function(r){
      var host=document.getElementById('blog-grid');
      if(r.error){state(host,'<p>Could not load articles right now. Please try again in a moment.</p>');return;}
      var posts=r.data||[];
      if(!posts.length){state(host,'<h2>First articles are on the way</h2><p>I write about web development, Shopify, WordPress and growing a business online. Check back soon, or <a href="/#contact">get in touch</a> in the meantime.</p>');document.getElementById('blog-tools').hidden=true;return;}
      host.innerHTML='<div class="posts-grid">'+posts.map(function(p,i){return card(p,i===0&&posts.length>1);}).join('')+'</div>';
      var tags={};posts.forEach(function(p){(p.tags||[]).forEach(function(t){tags[t]=(tags[t]||0)+1;});});
      var tb=document.getElementById('blog-tags');
      tb.innerHTML='<button class="filter-btn" type="button" data-tag="" aria-pressed="true">All<span class="count">'+posts.length+'</span></button>'+Object.keys(tags).sort().map(function(t){return '<button class="filter-btn" type="button" data-tag="'+esc(t.toLowerCase())+'" aria-pressed="false">'+esc(t)+'<span class="count">'+tags[t]+'</span></button>';}).join('');
      var cur='',q='';
      var apply=function(){
        var n=0;host.querySelectorAll('.post-card').forEach(function(c){
          var ok=(!cur||c.dataset.tags.split('|').indexOf(cur)>-1)&&(!q||c.dataset.text.indexOf(q)>-1);
          c.hidden=!ok;if(ok)n++;
        });
        var s=document.getElementById('blog-status');s.textContent=n?('Showing '+n+' article'+(n===1?'':'s')):'No articles match.';
      };
      tb.addEventListener('click',function(e){var b=e.target.closest('.filter-btn');if(!b)return;cur=b.dataset.tag;tb.querySelectorAll('.filter-btn').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});apply();});
      document.getElementById('blog-search').addEventListener('input',function(e){q=e.target.value.trim().toLowerCase();apply();});
    });
  }

  /* ---------------- single post ---------------- */
  function meta(sel,attr,val){var m=document.head.querySelector(sel);if(!m){m=document.createElement('meta');var parts=sel.match(/\[(\w+(?::\w+)?)="([^"]+)"\]/);m.setAttribute(parts[1],parts[2]);document.head.appendChild(m);}m.setAttribute(attr,val);}
  function runPost(sb){
    var slug=new URLSearchParams(location.search).get('slug');
    var host=document.getElementById('blog-post');
    if(!slug){state(host,'<h2>Article not found</h2><p><a href="/blog/">Browse all articles</a></p>');return;}
    sb.from('blog_posts').select('*').eq('slug',slug).eq('published',true).maybeSingle().then(function(r){
      var p=r.data;
      if(r.error||!p){document.title='Article not found | Md Limon Ali';meta('meta[name="robots"]','content','noindex,follow');state(host,'<h2>Article not found</h2><p>It may have been moved or unpublished. <a href="/blog/">Browse all articles</a>.</p>');return;}
      var out=MD.render(p.content),date=p.published_at||p.created_at,url=SITE+postUrl(p);
      var desc=(p.excerpt||p.content.replace(/[#*`>\-\[\]()!]/g,' ').replace(/\s+/g,' ').trim()).slice(0,158);
      document.title=p.title+' | Md Limon Ali';
      meta('meta[name="description"]','content',desc);
      meta('meta[property="og:title"]','content',p.title+' | Md Limon Ali');
      meta('meta[property="og:description"]','content',desc);
      meta('meta[property="og:type"]','content','article');
      meta('meta[property="og:url"]','content',url);
      meta('meta[name="twitter:title"]','content',p.title);
      meta('meta[name="twitter:description"]','content',desc);
      if(p.cover_url){meta('meta[property="og:image"]','content',p.cover_url);meta('meta[name="twitter:image"]','content',p.cover_url);}
      var can=document.head.querySelector('link[rel="canonical"]');if(can)can.href=url;
      var ld=document.createElement('script');ld.type='application/ld+json';
      ld.textContent=JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:p.title,description:desc,image:p.cover_url?[p.cover_url]:undefined,datePublished:date,dateModified:p.updated_at||date,mainEntityOfPage:url,keywords:(p.tags||[]).join(', ')||undefined,author:{'@type':'Person',name:'Md Limon Ali',url:SITE+'/'},publisher:{'@type':'Organization',name:'Md Limon Ali',logo:{'@type':'ImageObject',url:SITE+'/profile.png'}},inLanguage:'en'}).replace(/</g,'\\u003c');
      document.head.appendChild(ld);
      var enc=encodeURIComponent(url),t=encodeURIComponent(p.title);
      var toc=out.headings.filter(function(h){return h.level===2;});
      host.innerHTML=
        '<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/blog/">Blog</a></li><li><span aria-current="page">'+esc(p.title)+'</span></li></ol></nav>'+
        '<header class="article-head"><div class="chips">'+(p.tags||[]).map(function(x){return '<span class="chip">'+esc(x)+'</span>';}).join('')+'</div>'+
        '<h1>'+esc(p.title)+'</h1>'+(p.excerpt?'<p class="lede">'+esc(p.excerpt)+'</p>':'')+
        '<div class="byline"><img src="/profile.png" alt="" width="44" height="44"><div><strong>Md Limon Ali</strong><span><time datetime="'+esc(date)+'">'+esc(fmtDate(date))+'</time> · '+MD.readingTime(p.content)+' min read</span></div></div></header>'+
        (p.cover_url?'<figure class="article-cover"><img src="'+esc(p.cover_url)+'" alt="'+esc(p.cover_alt||p.title)+'" width="1280" height="720" fetchpriority="high" decoding="async"></figure>':'')+
        '<div class="article-grid">'+
        (toc.length>1?'<aside class="article-toc" aria-label="In this article"><p>In this article</p><ol>'+toc.map(function(h){return '<li><a href="#'+esc(h.id)+'">'+esc(h.text)+'</a></li>';}).join('')+'</ol></aside>':'<span></span>')+
        '<div><div class="prose">'+out.html+'</div>'+
        '<div class="share"><span>Share this article</span>'+
        '<a class="icon-btn" aria-label="Share on X (opens in a new tab)" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text='+t+'&url='+enc+'"><i class="fab fa-x-twitter" aria-hidden="true"></i></a>'+
        '<a class="icon-btn" aria-label="Share on LinkedIn (opens in a new tab)" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url='+enc+'"><i class="fab fa-linkedin-in" aria-hidden="true"></i></a>'+
        '<a class="icon-btn" aria-label="Share on Facebook (opens in a new tab)" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u='+enc+'"><i class="fab fa-facebook-f" aria-hidden="true"></i></a>'+
        '<a class="icon-btn" aria-label="Share on WhatsApp (opens in a new tab)" target="_blank" rel="noopener" href="https://wa.me/?text='+t+'%20'+enc+'"><i class="fab fa-whatsapp" aria-hidden="true"></i></a>'+
        '<button class="icon-btn" type="button" id="copy-link" aria-label="Copy link"><i class="fas fa-link" aria-hidden="true"></i></button><span class="sr-only" role="status" id="copy-status"></span></div>'+
        '<div class="author-box"><img src="/profile.png" alt="Md Limon Ali" width="72" height="72" loading="lazy"><div><strong>Written by Md Limon Ali</strong><p>Web developer in Kushtia, Bangladesh. I build Shopify stores, WordPress sites and custom web apps. <a href="/#contact">Work with me</a> or see my <a href="/projects/">projects</a>.</p></div></div>'+
        '</div></div><section id="related" hidden aria-labelledby="related-h"><h2 id="related-h">More articles</h2><div class="posts-grid" id="related-grid"></div></section>';
      var cl=document.getElementById('copy-link');
      cl.addEventListener('click',function(){var done=function(){document.getElementById('copy-status').textContent='Link copied';cl.querySelector('i').className='fas fa-check';setTimeout(function(){cl.querySelector('i').className='fas fa-link';},2000);};
        if(navigator.clipboard)navigator.clipboard.writeText(url).then(done,function(){});else{var ta=document.createElement('textarea');ta.value=url;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch(e){}ta.remove();}});
      sb.from('blog_posts').select(COLS).eq('published',true).neq('id',p.id).order('published_at',{ascending:false}).limit(3).then(function(rr){
        if(rr.data&&rr.data.length){document.getElementById('related').hidden=false;document.getElementById('related-grid').innerHTML=rr.data.map(function(x){return card(x,false);}).join('');}
      });
    });
  }

  if(!cfg){var h=list?document.getElementById('blog-grid'):post;state(h,'<p>Blog is unavailable right now.</p>');return;}
  ready(function(sb){if(list)runList(sb);else runPost(sb);});
})();
