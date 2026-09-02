import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'serie',
  title: 'Série',
  type: 'document',
  fields: [
    defineField({ name: 'titulo', type: 'localeString' }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'titulo.pt' }, validation: (r) => r.required() }),
    defineField({ name: 'descricao', type: 'localeText' }),
    defineField({
      name: 'periodo',
      title: 'Período',
      type: 'object',
      fields: [
        { name: 'anoInicio', type: 'number' },
        { name: 'anoFim', type: 'number' },
      ],
    }),
    defineField({ name: 'capa', title: 'Imagem de capa', type: 'image' }),
  ],
  preview: { select: { title: 'titulo.pt', media: 'capa' } },
});
