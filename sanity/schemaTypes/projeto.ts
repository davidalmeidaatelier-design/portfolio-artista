import {defineType, defineField} from 'sanity'
import {AutoCreditInput} from '../components/AutoCreditInput'

export default defineType({
  name: 'projeto',
  title: 'Projeto / Exposição',
  type: 'document',

  fields: [
    defineField({
      name: 'titulo',
      type: 'localeString',
    }),

    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: 'titulo.pt',
      },
      validation: (r) => r.required(),
    }),

    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {
            title: 'Passado',
            value: 'passado',
          },
          {
            title: 'Atual',
            value: 'atual',
          },
          {
            title: 'Futuro / em desenvolvimento',
            value: 'futuro',
          },
        ],
      },
      validation: (r) => r.required(),
    }),

    defineField({
      name: 'dataInicio',
      type: 'date',
    }),

    defineField({
      name: 'dataFim',
      type: 'date',
    }),

    defineField({
      name: 'local',
      title: 'Local / instituição',
      type: 'localeString',
    }),

    defineField({
      name: 'texto',
      title: 'Texto de apresentação',
      type: 'localeText',
    }),

    // ---------------------------------------------------------
    // IMAGENS DAS OBRAS
    // ---------------------------------------------------------

    defineField({
      name: 'imagensObras',
      title: 'Imagens das obras',
      type: 'array',
      of: [{type: 'image'}],
    }),

    defineField({
      name: 'creditoFotosObras',
      title: 'Crédito de fotos — obras',
      type: 'string',
      components: {
        input: AutoCreditInput,
      },
      options: {
        imagesField: 'imagensObras',
      },
      description:
        'Preenchido automaticamente com o nome do primeiro arquivo de imagem. Editável.',
    }),

    // ---------------------------------------------------------
    // VISTAS / MONTAGEM
    // ---------------------------------------------------------

    defineField({
      name: 'imagensMontagem',
      title: 'Imagens da montagem/exposição',
      type: 'array',
      of: [{type: 'image'}],
    }),

    defineField({
      name: 'creditoFotosVistas',
      title: 'Crédito de fotos — vistas da exposição',
      type: 'string',
      components: {
        input: AutoCreditInput,
      },
      options: {
        imagesField: 'imagensMontagem',
      },
      description:
        'Preenchido automaticamente com o nome do primeiro arquivo de imagem. Editável.',
    }),

    // ---------------------------------------------------------
    // DETALHES
    // ---------------------------------------------------------

    defineField({
      name: 'imagensDetalhe',
      title: 'Imagens de detalhe',
      type: 'array',
      of: [{type: 'image'}],
    }),

    defineField({
      name: 'creditoFotosDetalhes',
      title: 'Crédito de fotos — detalhes',
      type: 'string',
      components: {
        input: AutoCreditInput,
      },
      options: {
        imagesField: 'imagensDetalhe',
      },
      description:
        'Preenchido automaticamente com o nome do primeiro arquivo de imagem. Editável.',
    }),

    // ---------------------------------------------------------
    // OUTRAS IMAGENS
    // ---------------------------------------------------------

    defineField({
      name: 'imagensOutras',
      title: 'Outras imagens',
      type: 'array',
      of: [{type: 'image'}],
    }),

    defineField({
      name: 'creditoFotosOutras',
      title: 'Crédito de fotos — outras imagens',
      type: 'string',
      components: {
        input: AutoCreditInput,
      },
      options: {
        imagesField: 'imagensOutras',
      },
      description:
        'Preenchido automaticamente com o nome do primeiro arquivo de imagem. Editável.',
    }),

    // ---------------------------------------------------------
    // OUTROS CAMPOS
    // ---------------------------------------------------------

    defineField({
      name: 'videos',
      title: 'Vídeos (URLs de embed)',
      type: 'array',
      of: [{type: 'url'}],
    }),

    defineField({
      name: 'obrasRelacionadas',
      title: 'Obras relacionadas',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{type: 'obra'}],
        },
      ],
    }),
  ],

  preview: {
    select: {
      title: 'titulo.pt',
      status: 'status',
      media: 'imagensMontagem.0',
    },

    prepare: ({
      title,
      status,
      media,
    }) => ({
      title,
      subtitle: status,
      media,
    }),
  },
})