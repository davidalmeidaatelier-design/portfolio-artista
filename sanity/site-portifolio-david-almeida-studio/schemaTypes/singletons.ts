import {defineType, defineField} from 'sanity';

/**
 * Sobre: o campo "texto" antigo é mantido exatamente como está (passa a
 * funcionar como a biografia completa). Só adicionamos miniBio e
 * curriculo, novos e opcionais — nada é renomeado nem removido.
 *
 * Configurações do site: sem alteração nesta etapa.
 */
export const sobre = defineType({
  name: 'sobre',
  title: 'Sobre',
  type: 'document',
  fields: [
    defineField({
      name: 'texto',
      title: 'Biografia completa',
      type: 'localeText',
    }),
    defineField({
      name: 'miniBio',
      title: 'Mini bio (versão curta)',
      type: 'localeText',
      description: 'Versão resumida, para usos onde a biografia completa é longa demais (ex: rodapé, releases).',
    }),
    defineField({
      name: 'curriculo',
      title: 'Currículo',
      type: 'localeText',
      description: 'Texto do currículo. Um PDF para download pode ser adicionado aqui futuramente.',
    }),
    defineField({name: 'imagem', type: 'image'}),
  ],
});

export const configuracoes = defineType({
  name: 'configuracoes',
  title: 'Configurações do site',
  type: 'document',
  fields: [
    defineField({name: 'instagram', type: 'url'}),
    defineField({name: 'youtube', type: 'url'}),
    defineField({name: 'newsletter', type: 'url'}),
  ],
});
