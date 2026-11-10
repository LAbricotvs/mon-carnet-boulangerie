import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL='https://bttwplgymbcfahtyddmh.supabase.co';
const SUPABASE_KEY='sb_publishable_GT6NcPnrv02i5R-WHofvWw_3JRb7YGX';
const db=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const TIMER_SOUND_KEY='boulangerie-timer-sound';
function readSound(){try{return {...{tone:'double',volume:60},...JSON.parse(localStorage.getItem(TIMER_SOUND_KEY)||'{}')}}catch{return {tone:'double',volume:60}}}
function saveSound(){const s={tone:$('timerTone').value,volume:Number($('timerVolume').value)};localStorage.setItem(TIMER_SOUND_KEY,JSON.stringify(s));$('timerVolumeValue').textContent=s.volume+' %'}
function playTestSound(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const s=readSound(),c=new C(),vol=s.volume/100,tones=s.tone==='bell'?[660,880,1100]:s.tone==='soft'?[523,659]:[880,660,880];tones.forEach((f,i)=>{const d=i*.35,o=c.createOscillator(),g=c.createGain();o.type=s.tone==='bell'?'sine':'triangle';o.frequency.value=f;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.001,c.currentTime+d);g.gain.exponentialRampToValueAtTime(Math.max(.001,.22*vol),c.currentTime+d+.025);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d+.22);o.start(c.currentTime+d);o.stop(c.currentTime+d+.24)});setTimeout(()=>c.close(),1600)}catch(e){$('soundMsg').textContent='Impossible de jouer le son.'}}
function initSound(){const s=readSound();$('timerTone').value=s.tone;$('timerVolume').value=s.volume;$('timerVolumeValue').textContent=s.volume+' %';$('timerTone').onchange=saveSound;$('timerVolume').oninput=saveSound;$('testTimerSound').onclick=playTestSound}
function message(text){$('accountMsg').textContent=text}
async function init(){
 const {data:{session},error}=await db.auth.getSession();
 if(error||!session){location.replace('./index.html');return}
 $('accountEmail').textContent=session.user.email||'Compte connecté';
 const {data:member,error:memberError}=await db.from('family_members').select('family_id,role').eq('user_id',session.user.id).maybeSingle();
 if(memberError){message(memberError.message);return}
 if(!member){$('familyName').textContent='Aucune famille';$('joinFamilyTools').classList.remove('hidden');message('Ce compte ne fait pas encore partie d’une famille.');return}
 const {data:family,error:familyError}=await db.from('families').select('name').eq('id',member.family_id).maybeSingle();
 if(familyError){message(familyError.message);return}
 $('familyName').textContent=family?.name||'Ma famille';
 if(member.role==='owner'){$('ownerTools').classList.remove('hidden');$('familyNameInput').value=family?.name||'Ma famille';}
 else $('familyMemberInfo').classList.remove('hidden');
}
$('inviteFamily').onclick=async()=>{
 const b=$('inviteFamily');b.disabled=true;message('Création du code…');
 try{
  const {data,error}=await db.rpc('create_family_invite');
  if(error)throw error;
  $('inviteCode').textContent=data;
  $('inviteResult').classList.remove('hidden');
  message('Code créé. Transmettez-le à la personne que vous souhaitez inviter.');
 }catch(e){message(e.message)}finally{b.disabled=false}
};
$('copyInvite').onclick=async()=>{
 const code=$('inviteCode').textContent;
 try{await navigator.clipboard.writeText(code);$('copyInvite').textContent='Copié !';}
 catch{message('Copiez ce code : '+code)}
};
$('logout').onclick=async()=>{
 const b=$('logout');b.disabled=true;
 const {error}=await db.auth.signOut();
 if(error){message(error.message);b.disabled=false;return}
 location.replace('./index.html');
};

$('saveFamilyName').onclick=async()=>{
 const b=$('saveFamilyName'),name=$('familyNameInput').value.trim();
 if(!name){message('Indiquez un nom pour la famille.');return}
 b.disabled=true;message('Enregistrement du nom…');
 try{
  const {data:{user},error:userError}=await db.auth.getUser();if(userError)throw userError;
  const {data:member,error:memberError}=await db.from('family_members').select('family_id').eq('user_id',user.id).single();if(memberError)throw memberError;
  const {error}=await db.from('families').update({name}).eq('id',member.family_id);if(error)throw error;
  $('familyName').textContent=name;message('Nom de la famille modifié.');
 }catch(e){message(e.message)}finally{b.disabled=false}
};
$('accountJoinForm').onsubmit=async e=>{
 e.preventDefault();const b=e.submitter;b.disabled=true;message('Vérification du code…');
 try{const {error}=await db.rpc('join_family_with_code',{p_code:$('accountFamilyCode').value.trim()});if(error)throw error;message('Famille rejointe !');location.reload()}
 catch(err){message(err.message)}finally{b.disabled=false}
};

async function backupData(){const {data:recipes,error}=await db.from('recipes').select('*').order('created_at',{ascending:false});if(error)throw error;const {data:bakes,error:bakeError}=await db.from('bake_logs').select('*').order('baked_at',{ascending:false}).limit(1000);if(bakeError)throw bakeError;return {exported_at:new Date().toISOString(),format:'mon-carnet-boulangerie-v1',recipes:recipes||[],bake_logs:bakes||[]}}
$('exportCarnet').onclick=async()=>{const b=$('exportCarnet');b.disabled=true;try{const d=await backupData(),blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mon-carnet-boulangerie.json';a.click();URL.revokeObjectURL(url);$('backupMsg').textContent='Sauvegarde téléchargée.'}catch(e){$('backupMsg').textContent=e.message}finally{b.disabled=false}};
$('printCarnet').onclick=async()=>{const b=$('printCarnet');b.disabled=true;try{const d=await backupData(),w=window.open('','_blank');if(!w)throw new Error('Autorisez les fenêtres pop-up pour imprimer.');w.document.write('<html lang="fr"><meta charset="utf-8"><title>Mon Carnet de Boulangerie</title><body><h1>Mon Carnet de Boulangerie</h1>'+d.recipes.map(r=>'<article><h2>'+String(r.name||'')+'</h2><h3>Ingrédients</h3><pre>'+String(r.ingredients||'')+'</pre><h3>Préparation</h3><pre>'+String(r.instructions||'')+'</pre></article>').join('')+'</body></html>');w.document.close();w.print()}catch(e){$('backupMsg').textContent=e.message}finally{b.disabled=false}};
initSound();
init();
