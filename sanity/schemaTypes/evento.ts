import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'evento',
  title: 'Evento de trajetória',
  type: 'document',
  fields: [
    defineField({ name: 'data', title: 'Data (ano ou ano-mês)', type: 'date', validation: (r) => r.required() }),
    defineField({
      name: 'tipo',
      type: 'string',
      options: { list: [
        { title: 'Exposição', value: 'exposicao' },
        { title: 'Residência', value: 'residencia' },
        { title: 'Publicação', value: 'publicacao' },
        { title: 'Outro', value: 'outro' },
      ] },
    }),
    defineField({ name: 'titulo', type: 'localeString' }),
    defineField({ name: 'descricao', type: 'localeString' }),
    defineField({ name: 'projetoRelacionado', type: 'reference', to: [{ type: 'projeto' }] }),
    defineField({ name: 'linkExterno', type: 'url' }),
  ],
  preview: { select: { title: 'titulo.pt', subtitle: 'data' } },
});
