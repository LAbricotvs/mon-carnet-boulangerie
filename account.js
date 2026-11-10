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
 if(!member){$('familyName').textContent='Aucune famille';message('Ce compte ne fait pas encore partie d’une famille.');return}
 const {data:family,error:familyError}=await db.from('families').select('name').eq('id',member.family_id).maybeSingle();
 if(familyError){message(familyError.message);return}
 $('familyName').textContent=family?.name||'Ma famille';
 if(member.role==='owner')$('ownerTools').classList.remove('hidden');
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
init();
