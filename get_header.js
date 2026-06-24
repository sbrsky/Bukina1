const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "skinlab-cms",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const snap = await getDoc(doc(db, 'content/header'));
  console.log(JSON.stringify(snap.data(), null, 2));
  process.exit(0);
}
main();
