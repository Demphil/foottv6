const admin = require('firebase-admin');
const { config } = require('./config');

function getDb() {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
  return admin.firestore();
}

async function saveStaging(matchId, payload) {
  return getDb().collection(config.stagingCollection).doc(matchId).set({
    ...payload,
    savedAt: admin.firestore.FieldValue.serverTimestamp(),
    environment: 'staging'
  }, { merge: true });
}

module.exports = { saveStaging };
