/* Face lock for admin.html  (an extra check IN FRONT of the email + password sign-in)

   How it works, in plain words:
   - You scan your face once in Admin > Face lock. The browser turns your face into 128 numbers (never a photo)
     and saves them in your private Supabase table `admin_face`.
   - Next time the admin page opens, the camera asks for a face check first. The browser sends the numbers of the
     face it sees to the database, which answers only "match" or "no match". The saved template is never sent out.
   - To beat a held-up photo you must also turn your head to one side and look straight again.
   - After the face check you still sign in with your email and password, exactly as before.

   Honest limit: this runs in the visitor's browser, so it is a lock on the door, not a vault. The password and
   Supabase's own login remain the real protection. */
(function(){
  'use strict';
  var LIB='https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js';
  var MODELS='https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/';
  var PASS_KEY='faceLockPassedAt',PASS_MS=12*60*60*1000;
  var $=function(id){return document.getElementById(id);};
  var libP=null,stream=null,testToken=0;

  function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function withTimeout(p,ms){return Promise.race([p,new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'));},ms);})]);}

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
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return Promise.reject(new Error('nocamera'));
    return navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false}).then(function(s){
      stream=s;video.srcObject=s;return video.play();
    });
  }
  function stopCamera(video){
    if(stream){stream.getTracks().forEach(function(t){t.stop();});stream=null;}
    if(video)video.srcObject=null;
  }
  function detectAll(video,withDescriptors){
    var q=faceapi.detectAllFaces(video,new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.5})).withFaceLandmarks(true);
    return withDescriptors?q.withFaceDescriptors():q;
  }
  /* head turn: where the nose tip sits between the two sides of the jaw (0.5 = straight at the camera) */
  function yaw(landmarks){
    var p=landmarks.positions,w=p[16].x-p[0].x;
    return w>0?(p[30].x-p[0].x)/w:0.5;
  }
  function rpcMatch(descriptor){
    return sb.rpc('face_match',{d:Array.prototype.slice.call(descriptor)}).then(function(r){return !r.error&&r.data===true;});
  }

  /* ---------- the scan: recognise -> turn head -> look straight -> recognise again ---------- */
  async function scan(video,say,cancelled){
    var t0=Date.now(),stage='match',good=0,bad=0,ys=[],base=0.5;
    say('Look straight at the camera');
    while(Date.now()-t0<30000){
      if(cancelled())return 'cancel';
      var faces;
      try{faces=await detectAll(video,stage==='match'||stage==='final');}catch(e){await wait(200);continue;}
      if(cancelled())return 'cancel';
      if(faces.length===0){say('I cannot see a face. Move closer and add light.');await wait(150);continue;}
      if(faces.length>1){say('Only one face, please.');await wait(150);continue;}
      var f=faces[0],y=yaw(f.landmarks);
      if(stage==='match'){
        if(await rpcMatch(f.descriptor)){
          good++;ys.push(y);say('Face recognised… '+good+'/3');
          if(good>=3){base=ys.reduce(function(a,b){return a+b;},0)/ys.length;stage='turn';say('Now slowly turn your head to one side');}
        }else{good=0;ys=[];bad++;say('Face not recognised');if(bad>=8)return 'fail';await wait(250);}
      }else if(stage==='turn'){
        if(Math.abs(y-base)>0.13){stage='back';say('Good. Now look straight again');}
      }else if(stage==='back'){
        if(Math.abs(y-base)<0.07){stage='final';say('Hold still…');}
      }else if(stage==='final'){
        if(Math.abs(y-base)>0.08)continue;
        if(await rpcMatch(f.descriptor))return 'pass';
        bad++;if(bad>=8)return 'fail';await wait(250);
      }
    }
    return 'fail';
  }

  function recentPass(){try{return Date.now()-(+sessionStorage.getItem(PASS_KEY)||0)<PASS_MS;}catch(e){return false;}}
  function markPass(){try{sessionStorage.setItem(PASS_KEY,String(Date.now()));}catch(e){}}
  function startFailText(e){
    if(e&&e.name==='NotAllowedError')return 'The camera is blocked. Allow the camera for this site, then try again.';
    if(e&&e.name==='NotFoundError')return 'No camera was found on this device.';
    return 'The camera or the face check could not start.';
  }

  /* ---------- gate: runs before the sign-in form ---------- */
  var attempts=0,lockUntil=0;
  async function gate(){
    var enrolled=false;
    try{var r=await withTimeout(sb.rpc('face_enrolled'),7000);enrolled=!r.error&&r.data===true;}
    catch(e){enrolled=false;} /* cannot reach the database: the normal sign-in will report that */
    if(!enrolled||recentPass())return true;
    var box=$('faceGate'),video=$('faceGateVideo'),msg=$('faceGateMsg'),retry=$('faceGateRetry'),skip=$('faceGateSkip');
    box.classList.remove('hidden');
    return new Promise(function(resolve){
      var done=false;
      function pass(){done=true;stopCamera(video);markPass();box.classList.add('hidden');resolve(true);}
      async function run(){
        retry.classList.add('hidden');skip.classList.add('hidden');
        if(Date.now()<lockUntil){msg.textContent='Too many tries. Please wait '+Math.ceil((lockUntil-Date.now())/1000)+' seconds.';retry.classList.remove('hidden');return;}
        try{msg.textContent='Loading the face check…';await loadLib();msg.textContent='Starting the camera…';await startCamera(video);}
        catch(e){stopCamera(video);msg.textContent=startFailText(e);retry.classList.remove('hidden');skip.classList.remove('hidden');return;}
        var res=await scan(video,function(t){msg.textContent=t;},function(){return done;});
        if(res==='pass')return pass();
        stopCamera(video);attempts++;
        if(attempts>=3){attempts=0;lockUntil=Date.now()+30000;msg.textContent='Face not recognised. Please wait 30 seconds before trying again.';}
        else msg.textContent='Face not recognised. Try again in good light, looking straight at the camera.';
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
  function resetDots(){document.querySelectorAll('#faceDots i').forEach(function(d){d.classList.remove('on');});$('faceDots').classList.add('hidden');}

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
  }

  async function enroll(){
    var video=$('faceEnrollVideo'),dots=document.querySelectorAll('#faceDots i');
    testToken++;busy(true);resetDots();$('faceDots').classList.remove('hidden');say('Loading the face check…');
    try{await loadLib();say('Starting the camera…');showCam(true);await startCamera(video);}
    catch(e){stopCamera(video);showCam(false);say(startFailText(e),true);busy(false);$('faceDots').classList.add('hidden');return;}
    var prompts=['Look straight at the camera','Tilt your head up a little','Tilt your head down a little','Smile','Look straight again, relaxed face'];
    var samples=[],i=0,t0=Date.now(),ref=null;
    while(i<5&&Date.now()-t0<120000){
      say(prompts[i]+'  ('+(i+1)+'/5)');
      var faces;try{faces=await detectAll(video,true);}catch(e){await wait(200);continue;}
      if(faces.length!==1){say(faces.length?'Only you in the picture, please.':'I cannot see a face. Move closer and add light.');await wait(200);continue;}
      var f=faces[0];
      var fy=yaw(f.landmarks);
      if(f.detection.score<0.6||(ref!==null&&Math.abs(fy-ref)>0.08)){await wait(150);continue;}
      if(ref===null)ref=fy;
      samples.push(Array.prototype.slice.call(f.descriptor));dots[i].classList.add('on');i++;await wait(900);
    }
    stopCamera(video);showCam(false);
    if(samples.length<5){say('The scan did not finish. Use good light, look at the camera, and try again.',true);busy(false);return;}
    say('Saving…');
    var up=await sb.from('admin_face').upsert({id:1,descriptors:samples,updated_at:new Date().toISOString()});
    if(up.error){say('Could not save: '+up.error.message,true);busy(false);return;}
    var ok=await rpcMatch(samples[0]);
    if(!ok){say('Saved, but the database check failed. Please tell your developer.',true);busy(false);return;}
    markPass();say('Done. Face lock is ON. Next time the admin page opens it will ask for your face first.');
    busy(false);refresh();
  }

  async function test(){
    var video=$('faceEnrollVideo'),token=++testToken;
    busy(true);resetDots();say('Loading the face check…');
    try{await loadLib();say('Starting the camera…');showCam(true);await startCamera(video);}
    catch(e){stopCamera(video);showCam(false);say(startFailText(e),true);busy(false);return;}
    var res=await scan(video,function(t){say(t);},function(){return token!==testToken;});
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

  function stop(){testToken++;stopCamera($('faceEnrollVideo'));var c=$('faceEnrollCam');if(c)c.classList.add('hidden');}

  document.addEventListener('DOMContentLoaded',function(){
    if(!$('faceEnrollBtn'))return;
    $('faceEnrollBtn').addEventListener('click',enroll);
    $('faceTestBtn').addEventListener('click',test);
    $('faceOffBtn').addEventListener('click',turnOff);
  });

  window.FaceLock={gate:gate,refresh:refresh,stop:stop,_yaw:yaw,_scan:scan};
})();
