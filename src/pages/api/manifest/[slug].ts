import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug is required' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: salon, error } = await supabase
    .from('salons')
    .select('name, logo_url, primary_color')
    .eq('slug', slug)
    .single();

  if (error || !salon) {
    return res.status(404).json({ error: 'Salon not found' });
  }

  const manifest = {
    name: salon.name,
    short_name: salon.name,
    description: `Agende seu horário em ${salon.name}`,
    start_url: `/s/${slug}`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: salon.primary_color || '#000000',
    icons: [
      {
        src: salon.logo_url || '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: salon.logo_url || '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    categories: ['beauty', 'lifestyle'],
    orientation: 'portrait'
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
  res.status(200).json(manifest);
}
