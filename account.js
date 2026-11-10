import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL='https://bttwplgymbcfahtyddmh.supabase.co';
const SUPABASE_KEY='sb_publishable_GT6NcPnrv02i5R-WHofvWw_3JRb7YGX';
const db=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
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

init();
