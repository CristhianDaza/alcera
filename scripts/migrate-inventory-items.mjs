import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");
initializeApp({
  credential: cert({
    projectId: process.env.NUXT_FIREBASE_PROJECT_ID,
    clientEmail: process.env.NUXT_FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.NUXT_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore();
const snapshot = await db.collection("supplies").get();
const report = { normalized: 0, containers: 0, manualReview: [] };
const batch = db.batch();

for (const doc of snapshot.docs) {
  const item = doc.data();
  const sizeMl = item.automaticConsumption?.sizeMl;
  const update = {};
  if (!item.category) {
    if (Number.isFinite(sizeMl) && sizeMl > 0) {
      // La regla antigua acotada por tamaño representa el caso migrable de envase.
      update.category = "DECANT_CONTAINER";
      update.capacityMl = sizeMl;
      update.unit = "UNIT";
      report.containers++;
    } else {
      update.category = "SUPPLY";
      update.unit = item.unit ?? "UNIT";
      if (item.automaticConsumption) report.manualReview.push(doc.id);
    }
    report.normalized++;
  } else if (item.category !== "DECANT_CONTAINER" && item.capacityMl != null) {
    update.capacityMl = null;
    report.normalized++;
  }
  if (Object.keys(update).length && apply) batch.update(doc.ref, update);
}

if (apply) await batch.commit();
console.log(JSON.stringify({ mode: apply ? "applied" : "dry-run", ...report }, null, 2));
