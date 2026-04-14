import { Router } from 'express';
import { getSitemap, getRobots } from './sitemap.controller';

const router = Router();

router.get('/sitemap.xml', getSitemap);
router.get('/robots.txt', getRobots);

export default router;
