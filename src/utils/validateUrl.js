import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

// Loopback, private, link-local (incl. cloud metadata), CGNAT, multicast and other non-public ranges.
// BlockList also applies the IPv4 rules to IPv4-mapped IPv6 addresses (::ffff:a.b.c.d).
const nonPublicAddresses = new BlockList();

for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3],
]) {
  nonPublicAddresses.addSubnet(network, prefix, 'ipv4');
}

for (const [network, prefix] of [
  ['::', 127], ['64:ff9b::', 96], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
]) {
  nonPublicAddresses.addSubnet(network, prefix, 'ipv6');
}

// Parses a URL and only allows public web links (http/https). Returns the normalized URL string.
export function validateUrl(url) {
  const parsed = new URL(url);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported.');
  }

  return parsed.toString();
}

// Resolves the URL's host and rejects it unless every address is public, so fetches cannot reach internal services.
export async function assertPublicUrl(url) {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true });

  for (const { address, family } of addresses) {
    if (nonPublicAddresses.check(address, family === 6 ? 'ipv6' : 'ipv4')) {
      throw new Error(`${host} is not a public address.`);
    }
  }
}
