/* Face lock for admin.html  (an extra check IN FRONT of the email + password sign-in)

   How it works, in plain words:
   - SET UP (Admin > Face lock): you look straight, then turn your head side to side and tilt it up and down.
     The browser turns each angle of your face into 128 numbers (never a photo) and saves them in your private
     Supabase table `admin_face`, labelled by angle: S straight, YL/YH turned to either side, PL/PH tilted up/down.
   - SIGN-IN: the page opens the camera first. You must look straight, then turn side to side and tilt up and down
     again. At EVERY angle the database must say "that is the same face as the saved one for this angle".
     It answers only "match" or "no match": the saved template is never sent out.
   - After the face check you still sign in with your email and password, exactly as before.

   Honest limit: this runs in the visitor's browser, so it is a lock on the door, not a vault. The password and
   Supabase's own login remain the real protection. */
(function(){
  'use strict';
  var LIB='https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js';
  var MODELS='https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/';
  var PASS_KEY='faceLockPassedAt',PASS_MS=12*60*60*1000;
  var $=function(id){return document.getElementById(id);};
  var libP=null,stream=null,token=0;
  /* defaults for how far you must turn (compared with your own straight pose); real values come from your set-up */
  var DEFAULT_T={yl:0.10,yh:0.10,pl:0.045,ph:0.045};
  var NEED_PER_ANGLE=2,ENROLL_PER_ANGLE=2,ENROLL_STRAIGHT=3;

  function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function withTimeout(p,ms){return Promise.race([p,new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'));},ms);})]);}
  function mean(a){return a.reduce(function(s,v){return s+v;},0)/(a.length||1);}

  /* ---------- face library + camera ---------- */
  function loadLib(){
    if(libP)return libP;
    libP=new Promise(function(res,rej){
      if(window.faceapi){res();return;}
      var s=document.createElement('script');s.src=LIB;s.onload=res;s.onerror=function(){rej(new Error('lib'));};document.head.appendChild(s);
    }).then(function(){
      return faceapi.tf&&faceapi.tf.ready?faceapi.tf.ready():null;
    }).then(function(){
      return Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri(MODELS),faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS),faceapi.nets.faceRecognitionNet.loadFromUri(MODELS)]);
    }).catch(function(e){libP=null;throw e;});
    return libP;
  }
  function startCamera(video){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return Promise.reject(Object.assign(new Error('nocamera'),{name:'NotSupportedError'}));
    return navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false}).then(function(s){
      stream=s;video.srcObject=s;video.muted=true;video.setAttribute('playsinline','');
      return video.play();
    });
  }
  function stopCamera(video){
    if(stream){stream.getTracks().forEach(function(t){t.stop();});stream=null;}
    if(video)video.srcObject=null;
  }
  function detectAll(video){
    return faceapi.detectAllFaces(video,new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.5})).withFaceLandmarks(true).withFaceDescriptors();
  }
  function startFailText(e){
    var n=e&&e.name;
    if(n==='NotAllowedError'||n==='SecurityError')return 'The camera is blocked. Click the camera icon in the address bar, choose Allow, then press Try again.';
    if(n==='NotFoundError'||n==='OverconstrainedError')return 'No camera was found on this device.';
    if(n==='NotReadableError')return 'The camera is being used by another app. Close it, then press Try again.';
    if(n==='NotSupportedError')return 'This browser cannot use the camera here. Open the page in Chrome, Safari or Edge.';
    return 'The camera or the face check could not start. Press Try again.';
  }

  /* ---------- head angle: measured against YOUR OWN straight pose ---------- */
  function pose(landmarks){
    var p=landmarks.positions,w=p[16].x-p[0].x,eyeY=0,i;
    for(i=36;i<48;i++)eyeY+=p[i].y;
    eyeY/=12;
    var h=p[8].y-eyeY;
    return {yaw:w>0?(p[30].x-p[0].x)/w:0.5,pitch:h>0?(p[30].y-eyeY)/h:0.5};
  }
  /* S straight, YL/YH turned to either side, PL/PH tilted up/down, null = in between */
  function classify(pz,base,T){
    var dy=pz.yaw-base.yaw,dp=pz.pitch-base.pitch;
    if(Math.abs(dy)<0.05&&Math.abs(dp)<0.035)return 'S';
    var ry=dy<0?-dy/T.yl:dy/T.yh,rp=dp<0?-dp/T.pl:dp/T.ph;
    if(ry>=1&&ry>=rp)return dy<0?'YL':'YH';
    if(rp>=1)return dp<0?'PL':'PH';
    return null;
  }
  function rpcMatch(descriptor,poseName){
    return sb.rpc('face_match',{d:Array.prototype.slice.call(descriptor),pose:poseName}).then(function(r){return !r.error&&r.data===true;});
  }
  function thresholdsFrom(meta){
    meta=meta||{};
    function t(v,floor,def){return v?Math.max(floor,0.6*v):def;}
    return {yl:t(meta.yl,0.05,DEFAULT_T.yl),yh:t(meta.yh,0.05,DEFAULT_T.yh),pl:t(meta.pl,0.025,DEFAULT_T.pl),ph:t(meta.ph,0.025,DEFAULT_T.ph)};
  }

  /* ---------- the sign-in scan ---------- */
  var YAW=['YL','YH'],PITCH=['PL','PH'];
  async function scan(video,say,cancelled,T){
    T=T||DEFAULT_T;
    var t0=Date.now(),stage='S',good=0,bad=0,ps=[],base=null,counts={YL:0,YH:0,PL:0,PH:0};
    var done=function(k){return counts[k]>=NEED_PER_ANGLE;};
    var anglesDone=function(){return YAW.concat(PITCH).filter(done).length;};
    say('Look straight at the camera');
    while(Date.now()-t0<75000){
      if(cancelled())return 'cancel';
      var faces;
      try{faces=await detectAll(video);}catch(e){await wait(200);continue;}
      if(cancelled())return 'cancel';
      if(faces.length===0){say('I cannot see a face. Move closer and add light.');await wait(150);continue;}
      if(faces.length>1){say('Only one face, please.');await wait(150);continue;}
      var f=faces[0],pz=pose(f.landmarks);
      if(stage==='S'){
        if(await rpcMatch(f.descriptor,'S')){good++;ps.push(pz);say('Face recognised… '+good+'/3');
          if(good>=3){base={yaw:mean(ps.map(function(p){return p.yaw;})),pitch:mean(ps.map(function(p){return p.pitch;}))};stage='angles';say('Now slowly turn your head side to side');}
        }else{good=0;ps=[];bad++;say('Face not recognised');if(bad>=10)return 'fail';await wait(250);}
      }else if(stage==='angles'){
        var b=classify(pz,base,T);
        if(!b||b==='S'||done(b))continue;
        if(await rpcMatch(f.descriptor,b)){
          counts[b]++;
          if(anglesDone()===4){stage='final';say('Look straight at the camera again');continue;}
          say((YAW.every(done)?'Now slowly tilt your head up and down':'Keep turning your head side to side')+'  ('+anglesDone()+'/4 angles)');
        }else{bad++;say('That angle did not match');if(bad>=10)return 'fail';await wait(250);}
      }else if(stage==='final'){
        if(classify(pz,base,T)!=='S')continue;
        if(await rpcMatch(f.descriptor,'S'))return 'pass';
        bad++;if(bad>=10)return 'fail';await wait(250);
      }
    }
    return 'fail';
  }

  function recentPass(){try{return Date.now()-(+sessionStorage.getItem(PASS_KEY)||0)<PASS_MS;}catch(e){return false;}}
  function markPass(){try{sessionStorage.setItem(PASS_KEY,String(Date.now()));}catch(e){}}
  function getThresholds(){
    return withTimeout(sb.rpc('face_meta'),7000).then(function(r){return thresholdsFrom(r&&r.data);}).catch(function(){return DEFAULT_T;});
  }

  /* ---------- gate: runs before the sign-in form ---------- */
  var attempts=0,lockUntil=0;
  async function gate(){
    var enrolled=false;
    try{var r=await withTimeout(sb.rpc('face_enrolled'),7000);enrolled=!r.error&&r.data===true;}
    catch(e){enrolled=false;} /* cannot reach the database: the normal sign-in will report that */
    var note=$('faceLoginNote');
    if(note)note.classList.toggle('hidden',enrolled);
    if(!enrolled||recentPass())return true;
    var box=$('faceGate'),video=$('faceGateVideo'),msg=$('faceGateMsg'),retry=$('faceGateRetry'),skip=$('faceGateSkip');
    box.classList.remove('hidden');
    var T=await getThresholds();
    return new Promise(function(resolve){
      var done=false;
      function pass(){done=true;stopCamera(video);markPass();box.classList.add('hidden');resolve(true);}
      async function run(){
        retry.classList.add('hidden');skip.classList.add('hidden');
        if(Date.now()<lockUntil){msg.textContent='Too many tries. Please wait '+Math.ceil((lockUntil-Date.now())/1000)+' seconds.';retry.classList.remove('hidden');return;}
        try{msg.textContent='Loading the face check…';await loadLib();msg.textContent='Starting the camera…';await startCamera(video);}
        catch(e){stopCamera(video);msg.textContent=startFailText(e);retry.classList.remove('hidden');skip.classList.remove('hidden');return;}
        var res=await scan(video,function(t){msg.textContent=t;},function(){return done;},T);
        if(res==='pass')return pass();
        stopCamera(video);attempts++;
        if(attempts>=3){attempts=0;lockUntil=Date.now()+30000;msg.textContent='Face not recognised. Please wait 30 seconds before trying again.';}
        else msg.textContent='Face not recognised. Use good light and follow the prompts slowly.';
        retry.classList.remove('hidden');
      }
      retry.onclick=run;
      /* this button only appears when the camera / library cannot start at all */
      skip.onclick=function(){done=true;stopCamera(video);box.classList.add('hidden');resolve(true);};
      run();
    });
  }

  /* ---------- Admin > Face lock screen ---------- */
  function say(t,err){var m=$('faceEnrollMsg');m.textContent=t||'';m.className='face-msg'+(err?' err':'');}
  function busy(b){['faceEnrollBtn','faceTestBtn','faceOffBtn'].forEach(function(id){$(id).disabled=b;});}
  function showCam(on){$('faceEnrollCam').classList.toggle('hidden',!on);}
  function dotsReset(){var d=$('faceDots');d.querySelectorAll('i').forEach(function(i){i.classList.remove('on');});d.classList.add('hidden');}

  async function refresh(){
    var st=$('faceStatus');if(!st)return;
    var r=await sb.from('admin_face').select('updated_at').maybeSingle();
    if(r.error){st.textContent='Could not read the status: '+r.error.message;return;}
    if(r.data){
      st.textContent='ON. Set up on '+new Date(r.data.updated_at).toLocaleString('en',{dateStyle:'medium',timeStyle:'short'})+'. The admin page now asks for a face check first.';
      $('faceEnrollBtn').innerHTML='<i class="fas fa-camera"></i>Scan my face again';$('faceTestBtn').classList.remove('hidden');$('faceOffBtn').classList.remove('hidden');
    }else{
      st.textContent='OFF. Anyone who opens the admin link goes straight to the email and password form.';
      $('faceEnrollBtn').innerHTML='<i class="fas fa-camera"></i>Set up face lock';$('faceTestBtn').classList.add('hidden');$('faceOffBtn').classList.add('hidden');
    }
    var banner=$('faceBanner');if(banner)banner.classList.toggle('hidden',!!r.data);
  }
  /* dashboard reminder while the face lock is still off */
  async function banner(){
    var b=$('faceBanner');if(!b)return;
    try{var r=await sb.rpc('face_enrolled');b.classList.toggle('hidden',!(r&&!r.error&&r.data===false));}catch(e){}
  }

  /* set-up: 3 straight + 2 at each of 4 angles (turned to each side, tilted up, tilted down) = 11 samples */
  async function enroll(){
    var video=$('faceEnrollVideo'),dots=$('faceDots').querySelectorAll('i'),my=++token;
    busy(true);dotsReset();$('faceDots').classList.remove('hidden');say('Loading the face check…');
    try{await loadLib();say('Starting the camera…');showCam(true);await startCamera(video);}
    catch(e){stopCamera(video);showCam(false);say(startFailText(e),true);busy(false);$('faceDots').classList.add('hidden');return;}
    var T=DEFAULT_T,samples=[],counts={S:0,YL:0,YH:0,PL:0,PH:0},need={S:ENROLL_STRAIGHT,YL:ENROLL_PER_ANGLE,YH:ENROLL_PER_ANGLE,PL:ENROLL_PER_ANGLE,PH:ENROLL_PER_ANGLE};
    var total=ENROLL_STRAIGHT+4*ENROLL_PER_ANGLE,base=null,straightPs=[],deltas={YL:[],YH:[],PL:[],PH:[]},t0=Date.now(),lastAt=0;
    var left=function(k){return counts[k]<need[k];};
    while(samples.length<total&&Date.now()-t0<180000){
      if(my!==token){stopCamera(video);return;}
      var yawOpen=left('YL')||left('YH');
      say(left('S')?'Look straight at the camera':(yawOpen?'Slowly turn your head side to side':'Slowly tilt your head up and down')+'  ('+samples.length+'/'+total+')');
      var faces;try{faces=await detectAll(video);}catch(e){await wait(200);continue;}
      if(faces.length!==1){say(faces.length?'Only you in the picture, please.':'I cannot see a face. Move closer and add light.');await wait(200);continue;}
      var f=faces[0],pz=pose(f.landmarks);
      if(f.detection.score<0.6||Date.now()-lastAt<600){await wait(100);continue;}
      var b=null;
      if(base===null){b='S';}else b=classify(pz,base,T);
      if(!b||!left(b)){await wait(100);continue;}
      if(b==='S'){straightPs.push(pz);if(base===null||counts.S<ENROLL_STRAIGHT-1)base={yaw:mean(straightPs.map(function(p){return p.yaw;})),pitch:mean(straightPs.map(function(p){return p.pitch;}))};}
      else{deltas[b].push(b[0]==='Y'?Math.abs(pz.yaw-base.yaw):Math.abs(pz.pitch-base.pitch));}
      samples.push({pose:b,d:Array.prototype.slice.call(f.descriptor)});counts[b]++;lastAt=Date.now();
      if(dots[samples.length-1])dots[samples.length-1].classList.add('on');
      await wait(300);
    }
    stopCamera(video);showCam(false);
    if(samples.length<total){say('The scan did not finish. Use good light, look at the camera, turn your head slowly side to side and tilt it up and down, then try again.',true);busy(false);return;}
    say('Saving…');
    var meta={yl:mean(deltas.YL),yh:mean(deltas.YH),pl:mean(deltas.PL),ph:mean(deltas.PH)};
    var up=await sb.from('admin_face').upsert({id:1,descriptors:samples,meta:meta,updated_at:new Date().toISOString()});
    if(up.error){say('Could not save: '+up.error.message,true);busy(false);return;}
    var ok=await rpcMatch(samples[0].d,'S');
    if(!ok){say('Saved, but the database check failed. Please tell your developer.',true);busy(false);return;}
    markPass();say('Done. Face lock is ON. Next time the admin page opens it will scan your face from every angle first.');
    busy(false);refresh();
  }

  async function test(){
    var video=$('faceEnrollVideo'),my=++token;
    busy(true);dotsReset();say('Loading the face check…');
    try{await loadLib();say('Starting the camera…');showCam(true);await startCamera(video);}
    catch(e){stopCamera(video);showCam(false);say(startFailText(e),true);busy(false);return;}
    var T=await getThresholds();
    var res=await scan(video,function(t){say(t);},function(){return my!==token;},T);
    stopCamera(video);showCam(false);busy(false);
    if(res==='pass')say('Face check passed. This is what you will do when the admin page opens.');
    else if(res==='fail')say('Face not recognised. Try again in good light, or scan your face again.',true);
  }

  async function turnOff(){
    if(!confirm('Turn off face lock? The admin page will go straight to the email and password form again.'))return;
    busy(true);
    var r=await sb.from('admin_face').delete().eq('id',1);
    busy(false);
    if(r.error){say('Could not turn it off: '+r.error.message,true);return;}
    say('Face lock is OFF.');refresh();
  }

  function stop(){token++;stopCamera($('faceEnrollVideo'));var c=$('faceEnrollCam');if(c)c.classList.add('hidden');}

  document.addEventListener('DOMContentLoaded',function(){
    if(!$('faceEnrollBtn'))return;
    $('faceEnrollBtn').addEventListener('click',enroll);
    $('faceTestBtn').addEventListener('click',test);
    $('faceOffBtn').addEventListener('click',turnOff);
  });

  window.FaceLock={gate:gate,refresh:refresh,banner:banner,stop:stop,_scan:scan,_pose:pose,_classify:classify,_thresholds:thresholdsFrom};
})();
