import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL='https://bttwplgymbcfahtyddmh.supabase.co';
const SUPABASE_KEY='sb_publishable_GT6NcPnrv02i5R-WHofvWw_3JRb7YGX';
const db=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);let user=null,recipes=[],category='Toutes',familyId=null,familyRole=null;let timerTick=null;const TIMER_KEY='boulangerie-active-timers';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function msg(id,s){$(id).textContent=s}
function show(userData){user=userData;$('auth').classList.add('hidden');loadFamily()}
function signed(path){return path?db.storage.from('recipe-photos').createSignedUrl(path,3600):Promise.resolve({data:null})}
async function load(){const {data,error}=await db.from('recipes').select('*').order('created_at',{ascending:false});if(error){alert(error.message);return}recipes=await Promise.all((data||[]).map(async r=>{const {data:s}=await signed(r.photo_path);return {...r,photo_url:s?.signedUrl||null}}));render()}
function render(){const term=$('search').value.toLocaleLowerCase('fr');const rows=recipes.filter(r=>(category==='Toutes'||(category==='Levain écarté'?r.starter==='Levain écarté':r.category===category))&&[r.name,r.ingredients,r.notes].join(' ').toLocaleLowerCase('fr').includes(term));$('cards').innerHTML=rows.map(r=>'<article class="card" data-id="'+r.id+'"><div class="cover">'+(r.photo_url?'<img src="'+esc(r.photo_url)+'" alt="" style="'+cropStyle(r)+'">':'✳')+'</div><div class="info"><span class="tag">'+esc(r.category)+'</span><h3>'+esc(r.name)+'</h3><div class="meta">'+esc(r.starter||'Recette maison')+(r.preparation_time?' · '+esc(r.preparation_time):'')+'</div></div></article>').join('');$('empty').classList.toggle('hidden',rows.length>0);$('cards').classList.toggle('hidden',!rows.length);document.querySelectorAll('.card').forEach(c=>c.onclick=()=>detail(c.dataset.id))}
$('filters').onclick=e=>{const b=e.target.closest('[data-cat]');if(!b)return;category=b.dataset.cat;document.querySelectorAll('[data-cat]').forEach(x=>x.classList.toggle('active',x===b));render()};$('search').oninput=render;
let previewObjectUrl=null, cropZoom=1, cropPointers=new Map(), cropGesture=null;
function selectedPhoto(){return $('photoCamera').files[0]||$('photoGallery').files[0]||null}
function cropStyle(r){
 const x=Number(r.photo_position_x??50),y=Number(r.photo_position_y??50),z=Number(r.photo_zoom??1);
 return 'object-fit:cover;object-position:50% 50%;transform:translate3d('+(-(x-50)*(z-1))+'%,'+(-(y-50)*(z-1))+'%,0) scale('+z+');transform-origin:center'
}
function paintCrop(){
 const x=Number($('cropX').value),y=Number($('cropY').value);
 $('cropImage').style.transform='translate3d('+(-(x-50)*(cropZoom-1))+'%,'+(-(y-50)*(cropZoom-1))+'%,0) scale('+cropZoom+')';
 $('zoomLabel').textContent=Math.round(cropZoom*100)+' %'
}
function setCropPreview(src,x=50,y=50,z=1){
 $('cropImage').src=src;$('cropX').value=x;$('cropY').value=y;cropZoom=Math.min(3,Math.max(1,Number(z)||1));
 $('photoTools').classList.remove('hidden');paintCrop()
}
function clearPhotoPreview(){
 if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null}
 $('photoTools').classList.add('hidden');$('cropImage').removeAttribute('src');cropPointers.clear();cropGesture=null;cropZoom=1
}
function clamp(n,min,max){return Math.min(max,Math.max(min,n))}
function changeZoom(z){cropZoom=clamp(z,1,3);paintCrop()}
$('zoomIn').onclick=()=>changeZoom(cropZoom+.15);
$('zoomOut').onclick=()=>changeZoom(cropZoom-.15);
$('cropReset').onclick=()=>{$('cropX').value=50;$('cropY').value=50;changeZoom(1)};
const cropBox=$('cropPreview');
cropBox.addEventListener('pointerdown',e=>{
 if(!$('cropImage').src)return;
 e.preventDefault();cropBox.setPointerCapture(e.pointerId);
 cropPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(cropPointers.size===1)cropGesture={type:'drag',x:e.clientX,y:e.clientY,cx:Number($('cropX').value),cy:Number($('cropY').value),zoom:cropZoom};
 else if(cropPointers.size===2){
  const pts=[...cropPointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
  cropGesture={type:'pinch',distance:Math.max(1,dist),zoom:cropZoom}
 }
});
cropBox.addEventListener('pointermove',e=>{
 if(!cropPointers.has(e.pointerId))return;
 cropPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(cropPointers.size===1&&cropGesture?.type==='drag'){
  const g=cropGesture,rect=cropBox.getBoundingClientRect(),factor=Math.max(.01,g.zoom-1);
  $('cropX').value=clamp(g.cx-(e.clientX-g.x)/rect.width*100/factor,0,100);
  $('cropY').value=clamp(g.cy-(e.clientY-g.y)/rect.height*100/factor,0,100);
  paintCrop()
 }else if(cropPointers.size===2&&cropGesture?.type==='pinch'){
  const pts=[...cropPointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
  changeZoom(cropGesture.zoom*dist/cropGesture.distance)
 }
});
function endCropPointer(e){cropPointers.delete(e.pointerId);if(cropPointers.size===1){const p=[...cropPointers.values()][0];cropGesture={type:'drag',x:p.x,y:p.y,cx:Number($('cropX').value),cy:Number($('cropY').value),zoom:cropZoom}}else if(!cropPointers.size)cropGesture=null}
cropBox.addEventListener('pointerup',endCropPointer);cropBox.addEventListener('pointercancel',endCropPointer);
function edit(r=null){
 $('recipeForm').reset();clearPhotoPreview();$('rid').value=r?.id||'';
 $('formTitle').textContent=r?'Modifier la recette':'Nouvelle recette';
 $('name').value=r?.name||'';$('category').value=r?.category||'Pain';$('starter').value=r?.starter||'';
 renderIngredientRows(r?.ingredients_data?.length?r.ingredients_data:parseLegacyIngredients(r?.ingredients||''));$('ingredients').value=r?.ingredients||'';$('instructions').value=r?.instructions||'';$('quantity').value=r?.quantity||'';$('prep').value=r?.preparation_time||'';
 $('rest').value=r?.rest_time||'';$('bake').value=r?.bake_time||'';$('notes').value=r?.notes||'';renderTimerPresets(r?.timer_presets||[]);
 if(r?.photo_url)setCropPreview(r.photo_url,r.photo_position_x??50,r.photo_position_y??50,r.photo_zoom??1);
 msg('formMsg','');$('editor').showModal()
}
function handlePhoto(file){
 if(!file)return;
 if(!file.type.startsWith('image/')){msg('formMsg','Choisis un fichier image.');return}
 if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);
 previewObjectUrl=URL.createObjectURL(file);
 setCropPreview(previewObjectUrl,50,50,1);msg('formMsg','')
}
$('photoCamera').onchange=e=>handlePhoto(e.target.files[0]);
$('photoGallery').onchange=e=>handlePhoto(e.target.files[0]);
$('addIngredient').onclick=()=>addIngredientRow();$('addTimerPreset').onclick=()=>addTimerPresetRow();$('add').onclick=()=>edit();$('emptyAdd').onclick=()=>edit();$('close').onclick=$('cancel').onclick=()=>{$('editor').close();clearPhotoPreview()};
async function upload(file){if(!file)return null;const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=familyId+'/'+crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('recipe-photos').upload(path,file,{contentType:file.type});if(error)throw error;return path}
$('recipeForm').onsubmit=async e=>{e.preventDefault();const btn=$('save');btn.disabled=true;try{const id=$('rid').value,old=recipes.find(r=>r.id===id);const photo_path=await upload(selectedPhoto())||old?.photo_path||null;const payload={user_id:user.id,family_id:familyId,name:$('name').value.trim(),category:$('category').value,starter:$('starter').value,ingredients:ingredientText(ingredientRows()),ingredients_data:ingredientRows(),instructions:$('instructions').value,quantity:$('quantity').value.trim(),preparation_time:$('prep').value.trim(),rest_time:$('rest').value,bake_time:$('bake').value,notes:$('notes').value,timer_presets:timerPresetRows(),photo_path,photo_position_x:Math.round(clamp(Number($('cropX').value)||50,0,100)),photo_position_y:Math.round(clamp(Number($('cropY').value)||50,0,100)),photo_zoom:cropZoom};let q=id?db.from('recipes').update(payload).eq('id',id):db.from('recipes').insert(payload);let result=await q;
if(result.error&&/photo_zoom|column.*does not exist|schema cache/i.test(result.error.message)){
 const compatible={...payload};delete compatible.photo_zoom;delete compatible.timer_presets;
 q=id?db.from('recipes').update(compatible).eq('id',id):db.from('recipes').insert(compatible);
 result=await q;
}
if(result.error)throw result.error;
$('editor').close();clearPhotoPreview();await load()}catch(e){msg('formMsg',e.message)}finally{btn.disabled=false}};

function parseLegacyIngredients(text){return String(text||'').split(/\r?\n/).filter(x=>x.trim()).map(line=>{const m=line.trim().match(/^([0-9]+(?:[.,][0-9]+)?)\\s*(g|kg|mg|ml|cl|l|pièces?|pcs?)?\\s*(?:de |d’|d')?(.*)$/i);if(!m)return {name:line.trim(),amount:'',unit:''};return {amount:m[1].replace(',','.'),unit:(m[2]||'').toLowerCase(),name:(m[3]||'').trim()||line.trim()}})}
function ingredientRows(){return [...document.querySelectorAll('.ingredientRow')].map(row=>({name:row.querySelector('.ingredientName').value.trim(),amount:row.querySelector('.ingredientAmount').value.trim(),unit:row.querySelector('.ingredientUnit').value})).filter(x=>x.name)}
function addIngredientRow(item={name:'',amount:'',unit:'g'}){const row=document.createElement('div');row.className='ingredientRow';row.innerHTML='<input class="ingredientAmount" type="number" min="0" step="any" placeholder="Qté" value="'+esc(item.amount||'')+'"><select class="ingredientUnit"><option value="g">g</option><option value="kg">kg</option><option value="mg">mg</option><option value="ml">ml</option><option value="cl">cl</option><option value="l">l</option><option value="pièce">pièce</option><option value="pcs">pcs</option><option value="c. à c.">c. à c.</option><option value="c. à s.">c. à s.</option><option value="">—</option></select><input class="ingredientName" placeholder="Ingrédient" value="'+esc(item.name||'')+'"><button type="button" class="removeIngredient" aria-label="Supprimer">×</button>';row.querySelector('.ingredientUnit').value=item.unit??'g';row.querySelector('.removeIngredient').onclick=()=>row.remove();$('ingredientRows').append(row)}
function renderIngredientRows(items){$('ingredientRows').innerHTML='';(items?.length?items:[{name:'',amount:'',unit:'g'}]).forEach(addIngredientRow)}
function ingredientText(items){return items.map(x=>(x.amount?x.amount+' ':'')+(x.unit?x.unit+' ':'')+x.name).join('\n')}
function renderTimerPresets(items){$('timerPresetRows').innerHTML='';items.forEach(addTimerPresetRow)}
function addTimerPresetRow(item={name:'',hours:0,minutes:0}){const row=document.createElement('div');row.className='timerPresetRow';row.innerHTML='<input class="timerPresetName" maxlength="50" placeholder="Ex. Première pousse" value="'+esc(item.name||'')+'"><label>h<input class="timerPresetHours" type="number" min="0" max="99" value="'+Number(item.hours||0)+'"></label><label>min<input class="timerPresetMinutes" type="number" min="0" max="59" value="'+Number(item.minutes||0)+'"></label><button type="button" class="removeIngredient" aria-label="Supprimer">×</button>';row.querySelector('.removeIngredient').onclick=()=>row.remove();$('timerPresetRows').append(row)}
function timerPresetRows(){return [...document.querySelectorAll('.timerPresetRow')].map(row=>({id:crypto.randomUUID(),name:row.querySelector('.timerPresetName').value.trim(),hours:clamp(Number(row.querySelector('.timerPresetHours').value)||0,0,99),minutes:clamp(Number(row.querySelector('.timerPresetMinutes').value)||0,0,59)})).filter(x=>x.name&&(x.hours*60+x.minutes)>0)}
function readTimers(){try{return JSON.parse(localStorage.getItem(TIMER_KEY)||'{}')}catch{return {}}}
function writeTimers(data){localStorage.setItem(TIMER_KEY,JSON.stringify(data))}
function timerRemaining(t){return t.status==='running'?Math.max(0,t.endAt-Date.now()):Math.max(0,t.remainingMs||0)}
function formatTimer(ms){const total=Math.ceil(ms/1000),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function timerSound(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();[0,.35,.7].forEach(delay=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.setValueAtTime(.001,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(.18,c.currentTime+delay+.02);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+delay+.22);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+.24)});setTimeout(()=>c.close(),1500)}catch{}}
function timerFinished(name){timerSound();if('Notification'in window&&Notification.permission==='granted')new Notification('Minuterie terminée',{body:name+' est terminé(e).'})}
function startTimerTicker(){if(timerTick)clearInterval(timerTick);timerTick=setInterval(()=>{const timers=readTimers();let changed=false;Object.entries(timers).forEach(([key,t])=>{if(t.status==='running'&&t.endAt<=Date.now()){t.status='done';t.remainingMs=0;changed=true;timerFinished(t.name)}});if(changed)writeTimers(timers);document.querySelectorAll('.recipeTimer[data-timer-key]').forEach(el=>{const t=timers[el.dataset.timerKey];if(!t)return;el.querySelector('.timerCountdown').textContent=t.status==='done'?'Terminé !':formatTimer(timerRemaining(t));el.querySelector('.timerState').textContent=t.status==='running'?'En cours':t.status==='paused'?'En pause':t.status==='done'?'Terminé':'Prêt';el.querySelector('[data-timer-action]').textContent=t.status==='running'?'Pause':t.status==='paused'?'Reprendre':t.status==='done'?'Relancer':'Démarrer'})},250)}
function timerMarkup(recipe){const presets=recipe.timer_presets||[];if(!presets.length)return '<p class="timerEmpty">Aucune minuterie définie. Ajoute-en en modifiant la recette.</p>';const timers=readTimers();return '<div class="recipeTimers">'+presets.map(p=>{const key=recipe.id+':'+p.id,duration=(Number(p.hours)*60+Number(p.minutes))*60000,t=timers[key]||{name:p.name,status:'idle',remainingMs:duration,durationMs:duration};return '<div class="recipeTimer" data-timer-key="'+esc(key)+'"><div class="timerInfo"><strong>'+esc(p.name)+'</strong><span class="timerState">'+(t.status==='running'?'En cours':t.status==='paused'?'En pause':t.status==='done'?'Terminé':'Prêt')+'</span></div><strong class="timerCountdown">'+(t.status==='done'?'Terminé !':formatTimer(timerRemaining(t)))+'</strong><div class="timerButtons"><button type="button" class="secondary" data-timer-action data-timer-key="'+esc(key)+'">'+(t.status==='running'?'Pause':t.status==='paused'?'Reprendre':t.status==='done'?'Relancer':'Démarrer')+'</button><button type="button" class="secondary" data-timer-reset data-timer-key="'+esc(key)+'">↺</button></div></div>'}).join('')+'</div>'}
function handleTimerClick(e){const action=e.target.closest('[data-timer-action]'),reset=e.target.closest('[data-timer-reset]');if(!action&&!reset)return;const key=(action||reset).dataset.timerKey,timers=readTimers(),parts=key.split(':'),recipe=recipes.find(r=>r.id===parts[0]),preset=(recipe?.timer_presets||[]).find(p=>p.id===parts.slice(1).join(':'));if(!preset)return;const duration=(Number(preset.hours)*60+Number(preset.minutes))*60000;let t=timers[key];if(reset){timers[key]={name:preset.name,status:'idle',remainingMs:duration,durationMs:duration}}else if(!t||t.status==='idle'||t.status==='done'){timers[key]={name:preset.name,status:'running',remainingMs:duration,durationMs:duration,endAt:Date.now()+duration};if('Notification'in window&&Notification.permission==='default')Notification.requestPermission().catch(()=>{})}else if(t.status==='running'){t.remainingMs=Math.max(0,t.endAt-Date.now());t.status='paused';delete t.endAt}else if(t.status==='paused'){t.status='running';t.endAt=Date.now()+t.remainingMs}writeTimers(timers);startTimerTicker()}
function scaledIngredients(items,index,value){const base=Number(items[index]?.amount),target=Number(value);if(!(base>0)||!(target>0))return null;const factor=target/base;return items.map(x=>({...x,scaled:Number(x.amount)>0?Number(x.amount)*factor:null}))}

function detail(id){
 const r=recipes.find(x=>x.id===id),items=r.ingredients_data?.length?r.ingredients_data:parseLegacyIngredients(r.ingredients||'');
 const ingredientHtml=items.length?'<ul class="detailIngredients">'+items.map(x=>'<li><strong>'+esc(x.amount||'—')+' '+esc(x.unit||'')+'</strong> '+esc(x.name)+'</li>').join('')+'</ul>':'<p>Non renseignés</p>';
 $('detailContent').innerHTML='<div class="detailCover">'+(r.photo_url?'<img src="'+esc(r.photo_url)+'" alt="" style="'+cropStyle(r)+'">':'✳')+'</div><div class="detailBody"><span class="tag">'+esc(r.category)+'</span><h2>'+esc(r.name)+'</h2><p>'+esc(r.starter||'')+'</p>'+(r.quantity?'<h3>Quantité obtenue</h3><p>'+esc(r.quantity)+'</p>':'')+'<h3>Ingrédients</h3>'+ingredientHtml+'<button id="scaleOpen" class="primary scaleOpen" type="button">Adapter les quantités</button><div id="scalePanel" class="scalePanel hidden"><label>Ingrédient de référence<select id="scaleReference"></select></label><label>Nouvelle quantité<input id="scaleAmount" type="number" min="0" step="any" placeholder="Quantité disponible"></label><div id="scaleResult" class="scaleResult">Choisis un ingrédient et sa nouvelle quantité.</div></div><h3>Minuteries</h3><div id='timerPanel'></div><h3>Préparation</h3><p>'+esc(r.instructions||'Non renseignée')+'</p><h3>Temps</h3><p>Préparation : '+esc(r.preparation_time||'—')+'\\nRepos / fermentation : '+esc(r.rest_time||'—')+'\\nCuisson : '+esc(r.bake_time||'—')+'</p>'+(r.notes?'<h3>Notes</h3><p>'+esc(r.notes)+'</p>':'')+'<div class="detailActions"><button id="editOne" class="secondary">Modifier</button><button id="deleteOne" class="secondary danger">Supprimer</button><button id="closeDetail" class="secondary">Fermer</button></div></div>';
 $('detail').showModal();$('timerPanel').innerHTML=timerMarkup(r);$('timerPanel').onclick=handleTimerClick;startTimerTicker();const eligible=items.map((x,i)=>({...x,i})).filter(x=>Number(x.amount)>0&&x.unit);
 $('scaleReference').innerHTML=eligible.map(x=>'<option value="'+x.i+'">'+esc(x.name)+' ('+esc(x.amount)+' '+esc(x.unit)+')</option>').join('');
 const calculate=()=>{const index=Number($('scaleReference').value),result=scaledIngredients(items,index,$('scaleAmount').value);$('scaleResult').innerHTML=result?'<h4>Quantités adaptées</h4><ul>'+result.map(x=>'<li><strong>'+esc(x.scaled===null?x.amount:(Number.isInteger(x.scaled)?x.scaled.toString():Number(x.scaled.toFixed(2)).toString()))+' '+esc(x.unit)+'</strong> '+esc(x.name)+'</li>').join('')+'</ul><p class="scaleFactor">Facteur : × '+(result[index].scaled/Number(items[index].amount)).toFixed(3)+'</p>':'Saisis une quantité supérieure à zéro.'};
 $('scaleOpen').onclick=()=>{$('scalePanel').classList.toggle('hidden');if(eligible.length)calculate()};$('scaleReference').onchange=calculate;$('scaleAmount').oninput=calculate;
 $('closeDetail').onclick=()=>$('detail').close();$('editOne').onclick=()=>{$('detail').close();edit(r)};
 $('deleteOne').onclick=async()=>{if(!confirm('Supprimer cette recette ?'))return;const {error}=await db.from('recipes').delete().eq('id',r.id);if(error){alert(error.message);return}$('detail').close();load()}
}

async function loadFamily(){
 const {data:members,error}=await db.from('family_members').select('family_id,role').eq('user_id',user.id).maybeSingle();
 if(error){alert(error.message);return}
 if(!members){
  familyId=null;familyRole=null;$('app').classList.add('hidden');$('familyGate').classList.remove('hidden');return
 }
 familyId=members.family_id;familyRole=members.role;
 $('familyGate').classList.add('hidden');$('app').classList.remove('hidden');
 const {data:family}=await db.from('families').select('name').eq('id',familyId).maybeSingle();
  await load()
}
$('joinFamilyForm').onsubmit=async e=>{
 e.preventDefault();const b=e.submitter;b.disabled=true;msg('familyMsg','Vérification du code…');
 try{const {error}=await db.rpc('join_family_with_code',{p_code:$('familyCode').value.trim()});if(error)throw error;$('familyCode').value='';msg('familyMsg','Famille rejointe !');await loadFamily()}
 catch(err){msg('familyMsg',err.message)}finally{b.disabled=false}
};
$('authForm').onsubmit=async e=>{e.preventDefault();const {data,error}=await db.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(error)msg('authMsg',error.message);else show(data.user)};
$('signup').onclick=async()=>{const {data,error}=await db.auth.signUp({email:$('email').value,password:$('password').value});if(error)msg('authMsg',error.message);else if(data.session)show(data.user);else msg('authMsg','Compte créé. Vérifiez votre e-mail pour confirmer votre inscription.')};

db.auth.getSession().then(({data})=>{if(data.session)show(data.session.user)});db.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_OUT'){location.reload();return}if(s&&!user)show(s.user)});
if('serviceWorker'in navigator)window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js?v=20',{updateViaCache:'none'});await reg.update()}catch(e){console.warn('Mise à jour hors ligne indisponible',e)}});