import { defineType, defineField } from 'sanity';

export const sobre = defineType({
  name: 'sobre',
  title: 'Sobre',
  type: 'document',
  fields: [
    defineField({ name: 'texto', type: 'localeText' }),
    defineField({ name: 'imagem', type: 'image' }),
  ],
});

export const configuracoes = defineType({
  name: 'configuracoes',
  title: 'Configurações do site',
  type: 'document',
  fields: [
    defineField({ name: 'instagram', type: 'url' }),
    defineField({ name: 'youtube', type: 'url' }),
    defineField({ name: 'newsletter', type: 'url' }),
  ],
});
