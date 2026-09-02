import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

// Modo híbrido: tudo estático por padrão (rápido, barato),
// exceto páginas que marcarem `export const prerender = false`
// — é ali que futuramente entram checkout/Stripe para venda de obras.
export default defineConfig({
  output: 'hybrid',
  adapter: vercel(),
  i18n: {
    locales: ['pt', 'en'],
    defaultLocale: 'pt',
    routing: {
      prefixDefaultLocale: false, // pt fica em "/", inglês em "/en/"
    },
  },
  image: {
    // usa o pipeline nativo de otimização (sharp) para qualquer imagem
    // local; imagens vindas do Sanity já chegam otimizadas pelo CDN deles
  },
});
