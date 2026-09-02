import {defineType, defineField} from 'sanity';

/**
 * "Texto" — novo tipo do zero. Arquivo geral de textos relacionados à
 * produção do artista. Pode ou não estar ligado a um Projeto/Exposição
 * (a relação vive aqui, como referência — igual ao padrão já usado em
 * Evento — para não precisar editar o Projeto toda vez que um texto for
 * criado).
 */
export default defineType({
  name: 'texto',
  title: 'Texto',
  type: 'document',
  fields: [
    defineField({name: 'titulo', type: 'localeString', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'titulo.pt'}, validation: (r) => r.required()}),
    defineField({name: 'autor', title: 'Autor', type: 'string', description: 'Ex: "pelo próprio artista", nome de um crítico/curador convidado, etc.'}),
    defineField({name: 'corpo', title: 'Corpo do texto', type: 'localeText'}),
    defineField({name: 'imagemCapa', title: 'Imagem de capa', type: 'image'}),
    defineField({
      name: 'projetoRelacionado',
      title: 'Projeto/Exposição relacionado (opcional)',
      type: 'reference',
      to: [{type: 'projeto'}],
      description: 'Deixe vazio se o texto não for específico de uma exposição/projeto.',
    }),
    defineField({
      name: 'publicado',
      title: 'Publicado no site',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {title: 'titulo.pt', subtitle: 'autor', media: 'imagemCapa'},
  },
});
