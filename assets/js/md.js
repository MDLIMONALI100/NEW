/* Tiny, safe Markdown renderer (used by the blog page and the admin preview).
   All HTML in the source is escaped first, so a post can never inject scripts.
   Supports: # ## ### headings, **bold**, *italic*, `code`, ``` code blocks, [links](https://), ![images](https://),
   - bullet and 1. numbered lists, > quotes, --- rules. */
(function(root){
  var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});};
  var safeUrl=function(u){u=u.trim();return /^(https?:\/\/|mailto:|\/|#)/i.test(u)?u:'#';};
  function inline(t){
    var codes=[];
    t=t.replace(/`([^`]+)`/g,function(_,c){codes.push(c);return '\u0000'+(codes.length-1)+'\u0000';});
    t=esc(t);
    t=t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,function(_,a,u){return /^https?:\/\//i.test(u.replace(/&amp;/g,'&'))?'<img src="'+u+'" alt="'+a+'" loading="lazy" decoding="async">':'';});
    t=t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,function(_,a,u){var url=safeUrl(u.replace(/&amp;/g,'&'));var ext=/^https?:/i.test(url);return '<a href="'+esc(url)+'"'+(ext?' target="_blank" rel="noopener noreferrer"':'')+'>'+a+'</a>';});
    t=t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<em>$2</em>');
    return t.replace(/\u0000(\d+)\u0000/g,function(_,i){return '<code>'+esc(codes[+i])+'</code>';});
  }
  function slugify(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function render(src){
    var lines=String(src||'').replace(/\r\n?/g,'\n').split('\n'),out=[],i=0,heads=[];
    var para=[];
    function flush(){if(para.length){out.push('<p>'+inline(para.join(' '))+'</p>');para=[];}}
    while(i<lines.length){
      var l=lines[i],m;
      if(/^```/.test(l)){flush();var buf=[];i++;while(i<lines.length&&!/^```/.test(lines[i])){buf.push(lines[i]);i++;}i++;out.push('<pre><code>'+esc(buf.join('\n'))+'</code></pre>');continue;}
      if(!l.trim()){flush();i++;continue;}
      if((m=l.match(/^(#{1,3})\s+(.*)$/))){flush();var lv=m[1].length>=3?3:2;/* the post title is the h1, so # and ## are h2 and ### is h3 */var id=slugify(m[2]);heads.push({level:lv,text:m[2],id:id});out.push('<h'+lv+' id="'+id+'">'+inline(m[2])+'</h'+lv+'>');i++;continue;}
      if(/^(-{3,}|\*{3,})\s*$/.test(l)){flush();out.push('<hr>');i++;continue;}
      if(/^>\s?/.test(l)){flush();var q=[];while(i<lines.length&&/^>\s?/.test(lines[i])){q.push(lines[i].replace(/^>\s?/,''));i++;}out.push('<blockquote>'+inline(q.join(' '))+'</blockquote>');continue;}
      if(/^\s*[-*]\s+/.test(l)){flush();var u=[];while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i])){u.push('<li>'+inline(lines[i].replace(/^\s*[-*]\s+/,''))+'</li>');i++;}out.push('<ul>'+u.join('')+'</ul>');continue;}
      if(/^\s*\d+[.)]\s+/.test(l)){flush();var o=[];while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i])){o.push('<li>'+inline(lines[i].replace(/^\s*\d+[.)]\s+/,''))+'</li>');i++;}out.push('<ol>'+o.join('')+'</ol>');continue;}
      para.push(l.trim());i++;
    }
    flush();
    return {html:out.join('\n'),headings:heads};
  }
  var api={render:render,slugify:slugify,esc:esc,
    readingTime:function(src){var w=String(src||'').trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(w/200));}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MD=api;
})(typeof window!=='undefined'?window:globalThis);
