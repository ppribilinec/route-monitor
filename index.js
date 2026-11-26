const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
initializeApp();
exports.manageUser=onCall({region:'europe-west1'},async req=>{
 const db=getFirestore(), auth=getAuth();
 if(!req.auth || (await db.doc('users/'+req.auth.uid).get()).data()?.role!=='admin')throw new HttpsError('permission-denied','Pouze admin.');
 const {uid,action,password}=req.data||{};
 if(typeof uid!=='string'||!uid||uid.includes('/')||uid===req.auth.uid)throw new HttpsError('invalid-argument','Neplatny ucet.');
 const ref=db.doc('users/'+uid);if(!(await ref.get()).exists)throw new HttpsError('not-found','Ucet nenalezen.');
 if(action==='password'){if(typeof password!=='string'||password.length<6)throw new HttpsError('invalid-argument','Minimalne 6 znaku.');await auth.updateUser(uid,{password});await auth.revokeRefreshTokens(uid);}
 else if(action==='delete'){await ref.delete();try{await auth.deleteUser(uid)}catch(e){if(e.code!=='auth/user-not-found')throw e;}}
 else throw new HttpsError('invalid-argument','Neplatna akce.');return {ok:true};
});
