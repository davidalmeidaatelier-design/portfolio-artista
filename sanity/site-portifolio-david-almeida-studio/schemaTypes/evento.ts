import {defineType, defineField} from 'sanity';

/**
 * "Evento de agenda" (nome interno continua 'evento', só o rótulo mudou).
 * Vira a base da seção Agenda — arquivo cronológico de eventos passados,
 * atuais e futuros. Eventos passados nunca são removidos.
 *
 * Nada dos campos antigos foi removido — só adicionamos:
 * - publicado (novo — não havia nenhum documento existente, nada a migrar)
 * - novas opções em "tipo": abertura, conversa, palestra, lançamento,
 *   participação em evento (as 4 opções antigas continuam)
 */
export default defineType({
  name: 'evento',
  title: 'Evento de agenda',
  type: 'document',
  fields: [
    defineField({name: 'data', title: 'Data (ano ou ano-mês)', type: 'date', validation: (r) => r.required()}),
    defineField({
      name: 'tipo',
      type: 'string',
      options: {list: [
        {title: 'Exposição', value: 'exposicao'},
        {title: 'Residência', value: 'residencia'},
        {title: 'Publicação', value: 'publicacao'},
        {title: 'Abertura', value: 'abertura'},
        {title: 'Conversa', value: 'conversa'},
        {title: 'Palestra', value: 'palestra'},
        {title: 'Lançamento', value: 'lancamento'},
        {title: 'Participação em evento', value: 'participacao'},
        {title: 'Outro', value: 'outro'},
      ]},
    }),
    defineField({name: 'titulo', type: 'localeString'}),
    defineField({name: 'descricao', type: 'localeString'}),

    defineField({
      name: 'publicado',
      title: 'Publicado no site',
      type: 'boolean',
      initialValue: false,
      description: 'Só registros marcados como publicados aparecem na Agenda do site.',
    }),

    defineField({name: 'projetoRelacionado', title: 'Projeto/Exposição relacionado', type: 'reference', to: [{type: 'projeto'}]}),
    defineField({name: 'linkExterno', type: 'url'}),
  ],
  preview: {select: {title: 'titulo.pt', subtitle: 'data'}},
});
