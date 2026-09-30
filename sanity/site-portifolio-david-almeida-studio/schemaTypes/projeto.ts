import {defineType, defineField} from 'sanity'
import {MultiImageInput} from '../components/MultiImageInput'
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
      name: 'categoria',
      title: 'Categoria',
      type: 'string',
      options: {
        list: [
          {
            title: 'Exposição',
            value: 'exposicao',
          },
          {
            title: 'Projeto',
            value: 'projeto',
          },
        ],
      },
    }),

    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'Passado', value: 'passado'},
          {title: 'Atual', value: 'atual'},
          {
            title: 'Futuro / em desenvolvimento',
            value: 'futuro',
          },
        ],
      },
      validation: (r) => r.required(),
    }),

    defineField({
      name: 'publicado',
      title: 'Publicado',
      type: 'boolean',
      initialValue: false,
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

    // --------------------------------------------------
    // IMAGENS DAS OBRAS
    // --------------------------------------------------

    defineField({
      name: 'imagensObras',
      title: 'Imagens das obras',
      type: 'array',
      components: {
        input: MultiImageInput,
      },
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
        },
      ],
    }),

    defineField({
      name: 'creditoFotosObras',
      title: 'Crédito das fotografias das obras',
      type: 'string',
      options: {
        imagesField: 'imagensObras',
      },
      components: {
        input: AutoCreditInput,
      },
      description:
        'Preenchido automaticamente com o nome do primeiro arquivo de imagem. Você pode editar este campo livremente.',
    }),

    // --------------------------------------------------
    // IMAGENS DA MONTAGEM / VISTAS
    // --------------------------------------------------

    defineField({
      name: 'imagensMontagem',
      title: 'Imagens da montagem/exposição',
      type: 'array',
      components: {
        input: MultiImageInput,
      },
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
        },
      ],
    }),

    defineField({
      name: 'creditoFotosVistas',
      title: 'Crédito das fotografias das vistas',
      type: 'string',
      options: {
        imagesField: 'imagensMontagem',
      },
      components: {
        input: AutoCreditInput,
      },
      description:
        'Preenchido automaticamente com o nome do primeiro arquivo de imagem. Você pode editar este campo livremente.',
    }),

    // --------------------------------------------------
    // IMAGENS DE DETALHE
    // --------------------------------------------------

    defineField({
      name: 'imagensDetalhe',
      title: 'Imagens de detalhe',
      type: 'array',
      components: {
        input: MultiImageInput,
      },
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
        },
      ],
    }),

    defineField({
      name: 'creditoFotosDetalhes',
      title: 'Crédito das fotografias de detalhes',
      type: 'string',
      options: {
        imagesField: 'imagensDetalhe',
      },
      components: {
        input: AutoCreditInput,
      },
      description:
        'Preenchido automaticamente com o nome do primeiro arquivo de imagem. Você pode editar este campo livremente.',
    }),

    // --------------------------------------------------
    // OUTRAS IMAGENS
    // --------------------------------------------------

    defineField({
      name: 'imagensOutras',
      title: 'Outras imagens',
      type: 'array',
      components: {
        input: MultiImageInput,
      },
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
        },
      ],
    }),

    defineField({
      name: 'creditoFotosOutras',
      title: 'Crédito das outras fotografias',
      type: 'string',
      options: {
        imagesField: 'imagensOutras',
      },
      components: {
        input: AutoCreditInput,
      },
      description:
        'Preenchido automaticamente com o nome do primeiro arquivo de imagem. Você pode editar este campo livremente.',
    }),

    // --------------------------------------------------
    // VÍDEOS
    // --------------------------------------------------

    defineField({
      name: 'videos',
      title: 'Vídeos (URLs de embed)',
      type: 'array',
      of: [
        {
          type: 'url',
        },
      ],
    }),

    // --------------------------------------------------
    // OBRAS RELACIONADAS
    // --------------------------------------------------

    defineField({
      name: 'obrasRelacionadas',
      title: 'Obras relacionadas',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [
            {
              type: 'obra',
            },
          ],
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

    prepare: ({title, status, media}) => ({
      title,
      subtitle: status,
      media,
    }),
  },
})