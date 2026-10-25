import { assertPublicUrl } from '../../utils/validateUrl.js';

const MAX_TEXT_LENGTH = 12000;
const MAX_REDIRECTS = 5;

function decodeHtml(text = '') {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ');
}

function getMetaContent(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return null;
}

function getReadableText(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  ).slice(0, MAX_TEXT_LENGTH);
}

export function classifySourceType(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'github.com') {
    return 'github';
  }

  if (host.includes('instagram.com')) {
    return 'instagram';
  }

  if (host === 'x.com' || host.includes('twitter.com')) {
    return 'twitter';
  }

  return 'website';
}

function extractPageMetadata(html) {
  const title = getMetaContent(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ]);
  const description = getMetaContent(html, [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*>/i,
  ]);

  return {
    title,
    description,
    text: getReadableText(html),
  };
}

function getGithubRepoPath(url) {
  if (url.hostname.replace(/^www\./, '').toLowerCase() !== 'github.com') {
    return null;
  }

  const [owner, repo] = url.pathname.split('/').filter(Boolean);

  return owner && repo ? `${owner}/${repo}` : null;
}

async function fetchGithubReadme(url) {
  const repoPath = getGithubRepoPath(url);

  if (!repoPath) {
    return null;
  }

  const response = await fetch(`https://api.github.com/repos/${repoPath}/readme`, {
    headers: {
      accept: 'application/vnd.github.raw+json',
      'user-agent': 'notion-telebot',
    },
  });

  if (!response.ok) {
    return null;
  }

  return await response.text();
}

export function extractUrls(text) {
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];

  return [...new Set(matches.map((url) => url.replace(/[),.;!?]+$/, '')))];
}

// Fetches a page, following redirects by hand so every hop is checked for a public address.
async function fetchPublicPage(url) {
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicUrl(currentUrl);

    const response = await fetch(currentUrl, {
      redirect: 'manual',
      headers: {
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 notion-telebot link capture',
      },
    });
    const location = response.headers.get('location');

    if (response.status < 300 || response.status >= 400 || !location) {
      return response;
    }

    currentUrl = new URL(location, currentUrl);
  }

  throw new Error('Too many redirects.');
}

export async function extractLinkContent(rawUrl) {
  const url = new URL(rawUrl);
  const sourceType = classifySourceType(url);
  let readme = null;

  if (sourceType === 'github') {
    readme = await fetchGithubReadme(url);
  }

  const response = await fetchPublicPage(url);

  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}.`);
  }

  const html = await response.text();
  const metadata = extractPageMetadata(html);
  const readableText = readme || metadata.text;
  const extractionStatus = readableText && readableText.length > 300 ? 'saved' : 'limited';

  return {
    url: url.toString(),
    domain: url.hostname.replace(/^www\./, ''),
    sourceType,
    title: metadata.title || url.hostname,
    description: metadata.description,
    text: readableText,
    extractionStatus,
  };
}
