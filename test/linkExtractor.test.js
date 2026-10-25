import { beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

// Fake DNS: hostnames resolve to whatever the test says.
const dnsRecords = {
  'public.example': '93.184.216.34',
  'internal.example': '10.0.0.5',
};

mock.module('node:dns/promises', {
  namedExports: {
    async lookup(hostname) {
      if (!dnsRecords[hostname]) {
        throw new Error(`getaddrinfo ENOTFOUND ${hostname}`);
      }

      return [{ address: dnsRecords[hostname], family: 4 }];
    },
  },
});

const { extractLinkContent } = await import('../src/integrations/web/linkExtractor.js');

// Fake web: URL -> Response, and a log of every URL actually fetched.
let pages = {};
const fetchedUrls = [];

mock.method(globalThis, 'fetch', async (url) => {
  fetchedUrls.push(String(url));
  const page = pages[String(url)];

  return page ? page() : new Response('not found', { status: 404 });
});

beforeEach(() => {
  pages = {};
  fetchedUrls.length = 0;
});

test('extracts a public page', async () => {
  pages['https://public.example/post'] = () => new Response('<title>A public post</title>', { status: 200 });

  const extracted = await extractLinkContent('https://public.example/post');

  assert.equal(extracted.title, 'A public post');
});

test('refuses a hostname that resolves to a private address', async () => {
  await assert.rejects(extractLinkContent('http://internal.example/admin'), /not a public address/);
  assert.deepEqual(fetchedUrls, []);
});

test('refuses the cloud metadata address', async () => {
  await assert.rejects(extractLinkContent('http://169.254.169.254/latest/meta-data/'), /not a public address/);
  assert.deepEqual(fetchedUrls, []);
});

test('refuses IPv6 loopback', async () => {
  await assert.rejects(extractLinkContent('http://[::1]:8080/'), /not a public address/);
  assert.deepEqual(fetchedUrls, []);
});

test('refuses a public page that redirects to a private address', async () => {
  pages['https://public.example/go'] = () => new Response(null, {
    status: 302,
    headers: { location: 'http://127.0.0.1/admin' },
  });

  await assert.rejects(extractLinkContent('https://public.example/go'), /not a public address/);
  assert.deepEqual(fetchedUrls, ['https://public.example/go']);
});

test('follows a redirect to another public page', async () => {
  pages['https://public.example/old'] = () => new Response(null, {
    status: 301,
    headers: { location: '/new' },
  });
  pages['https://public.example/new'] = () => new Response('<title>Moved here</title>', { status: 200 });

  const extracted = await extractLinkContent('https://public.example/old');

  assert.equal(extracted.title, 'Moved here');
});
