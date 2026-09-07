import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
const uid = process.argv[2];
if (!uid)
  throw new Error(
    "Uso: node --env-file=.env scripts/admin.mjs UID_DEL_USUARIO",
  );
initializeApp({
  credential: cert({
    projectId: process.env.NUXT_FIREBASE_PROJECT_ID,
    clientEmail: process.env.NUXT_FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.NUXT_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth(),
  user = await auth.getUser(uid);
await auth.setCustomUserClaims(uid, { ...user.customClaims, admin: true });
console.log(
  "Permisos de administrador asignados. Vuelve a iniciar sesión en la tienda.",
);
