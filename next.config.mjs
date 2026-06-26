import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import crypto from 'crypto';

// Generate sw.js from the template on every build so the service worker
// cache name changes, forcing browsers to pick up new code immediately.
const buildId = crypto.randomBytes(6).toString('hex');
const templatePath = resolve(process.cwd(), 'public/sw.template.js');
const swPath = resolve(process.cwd(), 'public/sw.js');
const template = readFileSync(templatePath, 'utf8');
writeFileSync(swPath, template.replace(/__BUILD_ID__/g, buildId), 'utf8');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
