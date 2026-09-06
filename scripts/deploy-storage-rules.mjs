import { readFile } from 'node:fs/promises';
import { createSign } from 'node:crypto';

const projectId = process.env.FIREBASE_PROJECT_ID || 'cocoa-35632';
const bucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  'cocoa-35632.firebasestorage.app';
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialsPath) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required.');
}

const credentials = JSON.parse(
  await readFile(credentialsPath, 'utf8')
);

const encodeBase64Url = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const now = Math.floor(Date.now() / 1000);
const jwtHeader = encodeBase64Url(
  JSON.stringify({ alg: 'RS256', typ: 'JWT' })
);
const jwtPayload = encodeBase64Url(
  JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })
);

const signer = createSign('RSA-SHA256');
signer.update(jwtHeader + '.' + jwtPayload);
signer.end();

const signature = signer
  .sign(credentials.private_key, 'base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const assertion = jwtHeader + '.' + jwtPayload + '.' + signature;

const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  })
});

if (!tokenResponse.ok) {
  throw new Error(
    'OAuth token exchange failed: HTTP ' +
      tokenResponse.status +
      ' ' +
      (await tokenResponse.text())
  );
}

const { access_token: accessToken } = await tokenResponse.json();
if (!accessToken) {
  throw new Error('OAuth response did not contain an access token.');
}

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: 'Bearer ' + accessToken,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const reason =
      data?.error?.message ||
      data?.error?.status ||
      JSON.stringify(data);
    throw new Error(
      'Firebase Rules API request failed: HTTP ' +
        response.status +
        ' ' +
        reason
    );
  }

  return data;
};

const rulesContent = await readFile('storage.rules', 'utf8');

const ruleset = await api(
  'https://firebaserules.googleapis.com/v1/projects/' +
    projectId +
    '/rulesets',
  {
    method: 'POST',
    body: JSON.stringify({
      source: {
        files: [
          {
            name: 'storage.rules',
            content: rulesContent
          }
        ]
      }
    })
  }
);

if (!ruleset?.name) {
  throw new Error('Rules API did not return a ruleset name.');
}

const releaseName =
  'projects/' +
  projectId +
  '/releases/firebase.storage/' +
  bucket;
const releaseUrl =
  'https://firebaserules.googleapis.com/v1/' + releaseName;

const existingReleaseResponse = await fetch(releaseUrl, {
  headers: { authorization: 'Bearer ' + accessToken }
});

if (existingReleaseResponse.status === 404) {
  await api(
    'https://firebaserules.googleapis.com/v1/projects/' +
      projectId +
      '/releases',
    {
      method: 'POST',
      body: JSON.stringify({
        name: releaseName,
        rulesetName: ruleset.name
      })
    }
  );
} else {
  if (!existingReleaseResponse.ok) {
    throw new Error(
      'Unable to inspect Storage rules release: HTTP ' +
        existingReleaseResponse.status +
        ' ' +
        (await existingReleaseResponse.text())
    );
  }

  await api(
    releaseUrl + '?updateMask=ruleset_name',
    {
      method: 'PATCH',
      body: JSON.stringify({
        name: releaseName,
        rulesetName: ruleset.name
      })
    }
  );
}

console.log('Storage Rules API deploy: PASS', {
  projectId,
  bucket,
  release: releaseName,
  ruleset: ruleset.name,
  principal: credentials.client_email
});
