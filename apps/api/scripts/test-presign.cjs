// Test : presignUrl sans slash initial (corrige le double slash) + lecture blob
const fs = require('fs');
const env = {};
for (const line of fs.readFileSync('/Users/victorlebarbier/Atelier/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
}
process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN;

import('@vercel/blob').then(async ({ issueSignedToken, presignUrl }) => {
  const pathname = 'carrousel-bordeluche-v7/slides/slide-01.png';
  const signedToken = await issueSignedToken({ token: env.BLOB_READ_WRITE_TOKEN, pathname, operations: ['get'] });
  const { presignedUrl } = await presignUrl(signedToken, { pathname, access: 'private', operation: 'get' });
  console.log('presignedUrl:', presignedUrl.slice(0, 130));
  const res = await fetch(presignedUrl);
  console.log('Blob →', res.status, res.headers.get('content-type'), (await res.arrayBuffer()).byteLength + ' octets');
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
