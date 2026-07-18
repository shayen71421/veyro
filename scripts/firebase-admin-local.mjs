import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function firebaseCliCredential() {
  try {
    const require = createRequire(import.meta.url);
    const firebaseToolsRoot = dirname(require.resolve("firebase-tools/package.json"));
    const firebaseAuth = require(join(firebaseToolsRoot, "lib/auth.js"));
    const defaultCredentials = require(join(firebaseToolsRoot, "lib/defaultCredentials.js"));
    const account = firebaseAuth.getProjectDefaultAccount(process.cwd()) ?? firebaseAuth.getGlobalDefaultAccount();
    if (!account?.tokens?.refresh_token) return null;
    const credentialPath = await defaultCredentials.getCredentialPathAsync(account);
    if (!credentialPath) return null;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
    return applicationDefault();
  } catch {
    return null;
  }
}

async function projectIdFromConfig() {
  if (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT) {
    return process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  }
  try {
    const config = JSON.parse(await readFile(new URL("../.firebaserc", import.meta.url), "utf8"));
    return config.projects?.default || config.projects?.prod;
  } catch {
    return undefined;
  }
}

export async function getLocalAdminFirestore() {
  const projectId = await projectIdFromConfig();
  if (!projectId) throw new Error("Set FIREBASE_PROJECT_ID or configure .firebaserc.");
  const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS ? applicationDefault() : await firebaseCliCredential();
  if (!credential) {
    throw new Error("Set GOOGLE_APPLICATION_CREDENTIALS or authenticate the local Firebase CLI.");
  }
  const app = getApps()[0] ?? initializeApp({ credential, projectId });
  return { db: getFirestore(app), projectId };
}

export function argumentValue(name) {
  const inline = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
