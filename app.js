import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL='https://bttwplgymbcfahtyddmh.supabase.co';
const SUPABASE_KEY='sb_publishable_GT6NcPnrv02i5R-WHofvWw_3JRb7YGX';
const db=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);let user=null,recipes=[],category='Toutes',familyId=null,familyRole=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function msg(id,s){$(id).textContent=s}
function show(userData){user=userData;$('auth').classList.add('hidden');loadFamily()}
function signed(path){return path?db.storage.from('recipe-photos').createSignedUrl(path,3600):Promise.resolve({data:null})}
async function load(){const {data,error}=await db.from('recipes').select('*').order('created_at',{ascending:false});if(error){alert(error.message);return}recipes=await Promise.all((data||[]).map(async r=>{const {data:s}=await signed(r.photo_path);return {...r,photo_url:s?.signedUrl||null}}));render()}
function render(){const term=$('search').value.toLocaleLowerCase('fr');const rows=recipes.filter(r=>(category==='Toutes'||r.category===category)&&[r.name,r.ingredients,r.notes].join(' ').toLocaleLowerCase('fr').includes(term));$('cards').innerHTML=rows.map(r=>'<article class="card" data-id="'+r.id+'"><div class="cover">'+(r.photo_url?'<img src="'+esc(r.photo_url)+'" alt="" style="'+cropStyle(r)+'">':'✳')+'</div><div class="info"><span class="tag">'+esc(r.category)+'</span><h3>'+esc(r.name)+'</h3><div class="meta">'+esc(r.starter||'Recette maison')+(r.preparation_time?' · '+esc(r.preparation_time):'')+'</div></div></article>').join('');$('empty').classList.toggle('hidden',rows.length>0);$('cards').classList.toggle('hidden',!rows.length);document.querySelectorAll('.card').forEach(c=>c.onclick=()=>detail(c.dataset.id))}
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
 $('ingredients').value=r?.ingredients||'';$('instructions').value=r?.instructions||'';$('quantity').value=r?.quantity||'';$('prep').value=r?.preparation_time||'';
 $('rest').value=r?.rest_time||'';$('bake').value=r?.bake_time||'';$('notes').value=r?.notes||'';
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
$('add').onclick=()=>edit();$('emptyAdd').onclick=()=>edit();$('close').onclick=$('cancel').onclick=()=>{$('editor').close();clearPhotoPreview()};
async function upload(file){if(!file)return null;const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=familyId+'/'+crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('recipe-photos').upload(path,file,{contentType:file.type});if(error)throw error;return path}
$('recipeForm').onsubmit=async e=>{e.preventDefault();const btn=$('save');btn.disabled=true;try{const id=$('rid').value,old=recipes.find(r=>r.id===id);const photo_path=await upload(selectedPhoto())||old?.photo_path||null;const payload={user_id:user.id,family_id:familyId,name:$('name').value.trim(),category:$('category').value,starter:$('starter').value,ingredients:$('ingredients').value,instructions:$('instructions').value,quantity:$('quantity').value.trim(),preparation_time:$('prep').value.trim(),rest_time:$('rest').value,bake_time:$('bake').value,notes:$('notes').value,photo_path,photo_position_x:Math.round(clamp(Number($('cropX').value)||50,0,100)),photo_position_y:Math.round(clamp(Number($('cropY').value)||50,0,100)),photo_zoom:cropZoom};let q=id?db.from('recipes').update(payload).eq('id',id):db.from('recipes').insert(payload);let result=await q;
if(result.error&&/photo_zoom|column.*does not exist|schema cache/i.test(result.error.message)){
 const compatible={...payload};delete compatible.photo_zoom;
 q=id?db.from('recipes').update(compatible).eq('id',id):db.from('recipes').insert(compatible);
 result=await q;
}
if(result.error)throw result.error;
$('editor').close();clearPhotoPreview();await load()}catch(e){msg('formMsg',e.message)}finally{btn.disabled=false}};
function detail(id){const r=recipes.find(x=>x.id===id);$('detailContent').innerHTML='<div class="detailCover">'+(r.photo_url?'<img src="'+esc(r.photo_url)+'" alt="" style="'+cropStyle(r)+'">':'✳')+'</div><div class="detailBody"><span class="tag">'+esc(r.category)+'</span><h2>'+esc(r.name)+'</h2><p>'+esc(r.starter||'')+'</p>'+(r.quantity?'<h3>Quantité obtenue</h3><p>'+esc(r.quantity)+'</p>':'')+'<h3>Ingrédients</h3><p>'+esc(r.ingredients||'Non renseignés')+'</p><h3>Préparation</h3><p>'+esc(r.instructions||'Non renseignée')+'</p><h3>Temps</h3><p>Préparation : '+esc(r.preparation_time||'—')+'\nRepos / fermentation : '+esc(r.rest_time||'—')+'\nCuisson : '+esc(r.bake_time||'—')+'</p>'+(r.notes?'<h3>Notes</h3><p>'+esc(r.notes)+'</p>':'')+'<div class="detailActions"><button id="editOne" class="secondary">Modifier</button><button id="deleteOne" class="secondary danger">Supprimer</button><button id="closeDetail" class="secondary">Fermer</button></div></div>';$('detail').showModal();$('closeDetail').onclick=()=>$('detail').close();$('editOne').onclick=()=>{$('detail').close();edit(r)};$('deleteOne').onclick=async()=>{if(!confirm('Supprimer cette recette ?'))return;const {error}=await db.from('recipes').delete().eq('id',r.id);if(error){alert(error.message);return}$('detail').close();load()}}

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
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));