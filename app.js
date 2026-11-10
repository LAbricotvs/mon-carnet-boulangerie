import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL='https://bttwplgymbcfahtyddmh.supabase.co';
const SUPABASE_KEY='sb_publishable_GT6NcPnrv02i5R-WHofvWw_3JRb7YGX';
const db=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);let user=null,recipes=[],category='Toutes';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function msg(id,s){$(id).textContent=s}
function show(userData){user=userData;$('auth').classList.add('hidden');$('app').classList.remove('hidden');$('logout').classList.remove('hidden');load()}
function signed(path){return path?db.storage.from('recipe-photos').createSignedUrl(path,3600):Promise.resolve({data:null})}
async function load(){const {data,error}=await db.from('recipes').select('*').order('created_at',{ascending:false});if(error){alert(error.message);return}recipes=await Promise.all((data||[]).map(async r=>{const {data:s}=await signed(r.photo_path);return {...r,photo_url:s?.signedUrl||null}}));render()}
function render(){const term=$('search').value.toLocaleLowerCase('fr');const rows=recipes.filter(r=>(category==='Toutes'||r.category===category)&&[r.name,r.ingredients,r.notes].join(' ').toLocaleLowerCase('fr').includes(term));$('cards').innerHTML=rows.map(r=>'<article class="card" data-id="'+r.id+'"><div class="cover">'+(r.photo_url?'<img src="'+esc(r.photo_url)+'" alt="" style="object-position:'+(r.photo_position_x??50)+'% '+(r.photo_position_y??50)+'%">':'✳')+'</div><div class="info"><span class="tag">'+esc(r.category)+'</span><h3>'+esc(r.name)+'</h3><div class="meta">'+esc(r.starter||'Recette maison')+(r.bake_time?' · '+esc(r.bake_time):'')+'</div></div></article>').join('');$('empty').classList.toggle('hidden',rows.length>0);$('cards').classList.toggle('hidden',!rows.length);document.querySelectorAll('.card').forEach(c=>c.onclick=()=>detail(c.dataset.id))}
$('filters').onclick=e=>{const b=e.target.closest('[data-cat]');if(!b)return;category=b.dataset.cat;document.querySelectorAll('[data-cat]').forEach(x=>x.classList.toggle('active',x===b));render()};$('search').oninput=render;
let previewObjectUrl=null;
function selectedPhoto(){return $('photoCamera').files[0]||$('photoGallery').files[0]||null}
function setCropPreview(src,x=50,y=50){$('cropImage').src=src;$('cropX').value=x;$('cropY').value=y;$('cropImage').style.objectPosition=x+'% '+y+'%';$('photoTools').classList.remove('hidden')}
function clearPhotoPreview(){if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null}$('photoTools').classList.add('hidden');$('cropImage').removeAttribute('src')}
function edit(r=null){
 $('recipeForm').reset();clearPhotoPreview();$('rid').value=r?.id||'';
 $('formTitle').textContent=r?'Modifier la recette':'Nouvelle recette';
 $('name').value=r?.name||'';$('category').value=r?.category||'Pain';$('starter').value=r?.starter||'';
 $('ingredients').value=r?.ingredients||'';$('instructions').value=r?.instructions||'';
 $('rest').value=r?.rest_time||'';$('bake').value=r?.bake_time||'';$('notes').value=r?.notes||'';
 if(r?.photo_url)setCropPreview(r.photo_url,r.photo_position_x??50,r.photo_position_y??50);
 msg('formMsg','');$('editor').showModal()
}
function handlePhoto(file){
 if(!file)return;
 if(!file.type.startsWith('image/')){msg('formMsg','Choisis un fichier image.');return}
 if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);
 previewObjectUrl=URL.createObjectURL(file);
 setCropPreview(previewObjectUrl,50,50);msg('formMsg','')
}
$('photoCamera').onchange=e=>handlePhoto(e.target.files[0]);
$('photoGallery').onchange=e=>handlePhoto(e.target.files[0]);
function updateCrop(){ $('cropImage').style.objectPosition=$('cropX').value+'% '+$('cropY').value+'%' }
$('cropX').oninput=updateCrop;$('cropY').oninput=updateCrop;
$('add').onclick=()=>edit();$('emptyAdd').onclick=()=>edit();$('close').onclick=$('cancel').onclick=()=>{$('editor').close();clearPhotoPreview()};
async function upload(file){if(!file)return null;const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=user.id+'/'+crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('recipe-photos').upload(path,file,{contentType:file.type});if(error)throw error;return path}
$('recipeForm').onsubmit=async e=>{e.preventDefault();const btn=$('save');btn.disabled=true;try{const id=$('rid').value,old=recipes.find(r=>r.id===id);const photo_path=await upload(selectedPhoto())||old?.photo_path||null;const payload={user_id:user.id,name:$('name').value.trim(),category:$('category').value,starter:$('starter').value,ingredients:$('ingredients').value,instructions:$('instructions').value,rest_time:$('rest').value,bake_time:$('bake').value,notes:$('notes').value,photo_path,photo_position_x:Number($('cropX').value||50),photo_position_y:Number($('cropY').value||50)};const q=id?db.from('recipes').update(payload).eq('id',id):db.from('recipes').insert(payload);const {error}=await q;if(error)throw error;$('editor').close();clearPhotoPreview();await load()}catch(e){msg('formMsg',e.message)}finally{btn.disabled=false}};
function detail(id){const r=recipes.find(x=>x.id===id);$('detailContent').innerHTML='<div class="detailCover">'+(r.photo_url?'<img src="'+esc(r.photo_url)+'" alt="" style="object-position:'+(r.photo_position_x??50)+'% '+(r.photo_position_y??50)+'%">':'✳')+'</div><div class="detailBody"><span class="tag">'+esc(r.category)+'</span><h2>'+esc(r.name)+'</h2><p>'+esc(r.starter||'')+'</p><h3>Ingrédients</h3><p>'+esc(r.ingredients||'Non renseignés')+'</p><h3>Préparation</h3><p>'+esc(r.instructions||'Non renseignée')+'</p><h3>Temps</h3><p>Repos : '+esc(r.rest_time||'—')+'\nCuisson : '+esc(r.bake_time||'—')+'</p>'+(r.notes?'<h3>Notes</h3><p>'+esc(r.notes)+'</p>':'')+'<div class="detailActions"><button id="editOne" class="secondary">Modifier</button><button id="deleteOne" class="secondary danger">Supprimer</button><button id="closeDetail" class="secondary">Fermer</button></div></div>';$('detail').showModal();$('closeDetail').onclick=()=>$('detail').close();$('editOne').onclick=()=>{$('detail').close();edit(r)};$('deleteOne').onclick=async()=>{if(!confirm('Supprimer cette recette ?'))return;const {error}=await db.from('recipes').delete().eq('id',r.id);if(error){alert(error.message);return}$('detail').close();load()}}
$('authForm').onsubmit=async e=>{e.preventDefault();const {data,error}=await db.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(error)msg('authMsg',error.message);else show(data.user)};
$('signup').onclick=async()=>{const {data,error}=await db.auth.signUp({email:$('email').value,password:$('password').value});if(error)msg('authMsg',error.message);else if(data.session)show(data.user);else msg('authMsg','Compte créé. Vérifiez votre e-mail pour confirmer votre inscription.')};
$('logout').onclick=async()=>{await db.auth.signOut();location.reload()};
db.auth.getSession().then(({data})=>{if(data.session)show(data.session.user)});db.auth.onAuthStateChange((_e,s)=>{if(s&&!user)show(s.user)});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));