import { Request, Response } from 'express';
import { Product } from '../products/../models/Product';
import { Category } from '../categories/../models/Category';

const BASE_URL = 'https://v2enterprise.in';

export const getSitemap = async (req: Request, res: Response) => {
    try {
        const products = await Product.find({ status: { $in: ['ACTIVE', 'Active'] } }).select('_id updatedAt');
        const categories = await Category.find({ status: 'ACTIVE' }).select('name slug updatedAt');

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/shop</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${BASE_URL}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;

        // Add Categories
        categories.forEach(cat => {
            xml += `  <url>
    <loc>${BASE_URL}/category/${encodeURIComponent(cat.slug || cat.name)}</loc>
    <lastmod>${(cat as any).updatedAt ? (cat as any).updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        });

        // Add Products
        products.forEach(prod => {
            xml += `  <url>
    <loc>${BASE_URL}/product/${prod._id}</loc>
    <lastmod>${prod.updatedAt ? prod.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
        });

        xml += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.status(200).send(xml);
    } catch (error) {
        console.error('Sitemap generation error:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const getRobots = (req: Request, res: Response) => {
    const robots = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
    res.header('Content-Type', 'text/plain');
    res.status(200).send(robots);
};
