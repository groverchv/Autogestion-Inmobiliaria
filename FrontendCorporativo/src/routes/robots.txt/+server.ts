import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

const SITE = env.PUBLIC_SITE_URL || 'http://localhost:5174';

export const GET: RequestHandler = () => {
	const txt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/

Sitemap: ${SITE}/sitemap.xml
`;
	return new Response(txt, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
