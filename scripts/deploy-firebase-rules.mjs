import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const projectId = process.env.FIREBASE_PROJECT_ID || 'cocoa-35632';
const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  'cocoa-35632.firebasestorage.app';
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialsPath) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required.');
}

const credentials = JSON.parse(
  await readFile(credentialsPath, 'utf8')
);

const base64url = (value) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const issueAccessToken = async () => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  );
  const payload = base64url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    })
  );

  const signer = createSign('RSA-SHA256');
  signer.update(header + '.' + payload);
  signer.end();

  const signature = signer
    .sign(credentials.private_key, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const response = await fetch(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type:
          'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion:
          header + '.' + payload + '.' + signature
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      'OAuth token exchange failed: HTTP ' +
        response.status +
        ' ' +
        (await response.text())
    );
  }

  const token = await response.json();
  if (!token.access_token) {
    throw new Error(
      'OAuth response did not contain an access token.'
    );
  }

  return token.access_token;
};

const accessToken = await issueAccessToken();

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

const createRuleset = async (fileName) => {
  const content = await readFile(fileName, 'utf8');

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
              name: fileName,
              content
            }
          ]
        }
      })
    }
  );

  if (!ruleset?.name) {
    throw new Error(
      'Rules API did not return a ruleset for ' + fileName
    );
  }

  return ruleset.name;
};

const publishRelease = async ({
  fileName,
  releaseSuffix
}) => {
  const rulesetName = await createRuleset(fileName);
  const releaseName =
    'projects/' +
    projectId +
    '/releases/' +
    releaseSuffix;
  const releaseUrl =
    'https://firebaserules.googleapis.com/v1/' +
    releaseName;

  const existing = await fetch(releaseUrl, {
    headers: {
      authorization: 'Bearer ' + accessToken
    }
  });

  if (existing.status === 404) {
    await api(
      'https://firebaserules.googleapis.com/v1/projects/' +
        projectId +
        '/releases',
      {
        method: 'POST',
        body: JSON.stringify({
          name: releaseName,
          rulesetName
        })
      }
    );
  } else {
    if (!existing.ok) {
      throw new Error(
        'Unable to inspect Firebase Rules release ' +
          releaseName +
          ': HTTP ' +
          existing.status +
          ' ' +
          (await existing.text())
      );
    }

    await api(
      releaseUrl + '?updateMask=ruleset_name',
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: releaseName,
          rulesetName
        })
      }
    );
  }

  console.log('Firebase Rules release: PASS', {
    fileName,
    release: releaseName,
    ruleset: rulesetName
  });
};

await publishRelease({
  fileName: 'firestore.rules',
  releaseSuffix: 'cloud.firestore'
});

await publishRelease({
  fileName: 'storage.rules',
  releaseSuffix:
    'firebase.storage/' + storageBucket
});

console.log('Firebase Rules API deploy: PASS', {
  projectId,
  storageBucket,
  principal: credentials.client_email
});
