const fs = require('node:fs/promises');
const path = require('node:path');
const admin = require('firebase-admin');
const { config, list } = require('./config');

async function fromFile() {
  const filePath = path.resolve(config.allowlistFile);
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  return { sourceHosts: list(data.sourceHosts), mediaHosts: list(data.mediaHosts) };
}

async function fromFirestore() {
  if (!process.env.GOOGLE_CLOUD_PROJECT) return null;
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const snapshot = await admin.firestore().collection(config.allowlistCollection).where('enabled', '==', true).get();
  const sourceHosts = [];
  const mediaHosts = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    sourceHosts.push(...list(data.sourceHosts || data.host));
    mediaHosts.push(...list(data.mediaHosts));
  });
  return { sourceHosts, mediaHosts };
}

async function loadAllowlist() {
  try {
    const firestoreList = await fromFirestore();
    if (firestoreList?.sourceHosts.length) return firestoreList;
  } catch (error) {
    console.warn(`Allowlist Firestore unavailable: ${error.message}`);
  }
  return fromFile();
}

module.exports = { loadAllowlist };
