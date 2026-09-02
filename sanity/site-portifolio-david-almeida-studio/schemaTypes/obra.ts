import {defineField, defineType} from 'sanity'
import {MultiImageInput} from '../components/MultiImageInput'
/**
 * Schema do documento "Obra" — versão alinhada ao frontend Astro já existente.
 *
 * Mudanças em relação à versão anterior (pós-importação da planilha):
 * - titulo e tecnica agora são bilíngues (localeString: { pt, en })
 * - dimensao virou dimensoes (nome que o frontend já usa)
 * - imagem (única) virou imagens[] (array de { arquivo, alt }), permitindo
 *   mais de uma imagem por obra, começando pela principal (imagens[0])
 * - novo campo slug (usado nas URLs /obras/[serie]/[obra])
 * - novos campos públicos: descricao (bilíngue), disponivelParaVenda,
 *   preco (venda de prints — NÃO confundir com valorVenda, que é o valor
 *   interno da obra original), formatosPrint, projeto (referência)
 * - novo campo ordem (posição da obra dentro da série, grupo "publicacao")
 *
 * Os campos do grupo "interno" continuam existindo e preservam os dados
 * da planilha original — nada foi removido, só reorganizado.
 */
export default defineType({
  name: 'obra',
  title: 'Obra',
  type: 'document',

  groups: [
    {name: 'publico', title: 'Informações públicas', default: true},
    {name: 'publicacao', title: 'Publicação'},
    {name: 'interno', title: 'Controle interno do ateliê'},
  ],

  fields: [
  // ---------- CAMPOS PÚBLICOS ----------
  defineField({
    name: 'titulo',
    title: 'Título',
    type: 'localeString',
    group: 'publico',
    validation: (Rule) => Rule.required(),
  }),

  defineField({
    name: 'slug',
    title: 'Slug (URL)',
    type: 'slug',
    options: {source: 'titulo.pt'},
    group: 'publico',
    validation: (Rule) => Rule.required(),
  }),

  defineField({
    name: 'ano',
    title: 'Ano',
    type: 'string',
    description: 'Texto livre — pode ser um ano único ou um intervalo, ex: "2020-2025"',
    group: 'publico',
  }),

  defineField({
    name: 'tecnica',
    title: 'Técnica',
    type: 'localeString',
    group: 'publico',
  }),

  defineField({
    name: 'dimensoes',
    title: 'Dimensões',
    type: 'string',
    description: 'Como está na planilha, ex: "160x140 cm"',
    group: 'publico',
  }),

  defineField({
  name: 'imagens',
  title: 'Imagens',
  type: 'array',
  group: 'publico',
  components: {
    input: MultiImageInput,
  },
  of: [
      {
        type: 'image',
        options: {hotspot: true},
      },
    ],
    description: 'A primeira imagem da lista é a principal (usada no grid e na página da obra).',
  }),
    defineField({
      name: 'descricao',
      title: 'Descrição',
      type: 'localeText',
      group: 'publico',
    }),
    defineField({
      name: 'disponivelParaVenda',
      title: 'Disponível para venda (prints)',
      type: 'boolean',
      initialValue: false,
      group: 'publico',
    }),
    defineField({
      name: 'preco',
      title: 'Preço (prints)',
      type: 'string',
      description: 'Preço público de venda de prints desta obra — não confundir com o valor de venda interno da obra original.',
      group: 'publico',
      hidden: ({document}) => !document?.disponivelParaVenda,
    }),
    defineField({
      name: 'formatosPrint',
      title: 'Formatos de print disponíveis',
      type: 'array',
      of: [{type: 'string'}],
      group: 'publico',
      hidden: ({document}) => !document?.disponivelParaVenda,
    }),
    defineField({
      name: 'projeto',
      title: 'Projeto/Exposição relacionado',
      type: 'reference',
      to: [{type: 'projeto'}],
      group: 'publico',
    }),

    // ---------- PUBLICAÇÃO ----------
    defineField({
      name: 'publicado',
      title: 'Publicado no site',
      type: 'boolean',
      description: 'Só obras marcadas como publicadas aparecem no site. Confirme a série antes de marcar.',
      initialValue: false,
      group: 'publicacao',
    }),
    defineField({
      name: 'serie',
      title: 'Série (confirmada)',
      type: 'reference',
      to: [{type: 'serie'}],
      description: 'Série definitiva usada pelo site. Confirme antes de publicar.',
      group: 'publicacao',
    }),
    defineField({
      name: 'serieSugerida',
      title: 'Série sugerida (importação automática)',
      type: 'string',
      description: 'Preenchido automaticamente na importação, só para referência — não é usado pelo site.',
      readOnly: true,
      group: 'publicacao',
    }),
    defineField({
      name: 'ordem',
      title: 'Ordem dentro da série',
      type: 'number',
      description: 'Controla a posição desta obra na grade da série no site.',
      group: 'publicacao',
    }),

    // ---------- CONTROLE INTERNO DO ATELIÊ ----------
    defineField({name: 'numeroControle', title: 'Nº de controle (planilha)', type: 'string', group: 'interno'}),
    defineField({name: 'peso', title: 'Peso', type: 'string', group: 'interno'}),
    defineField({name: 'localizacao', title: 'Localização', type: 'string', group: 'interno'}),
    defineField({name: 'dataInfo', title: 'Data info', type: 'string', group: 'interno'}),
    defineField({name: 'status', title: 'Status', type: 'string', group: 'interno'}),
    defineField({name: 'idGalerias', title: 'ID galerias', type: 'string', group: 'interno'}),
    defineField({name: 'valorVenda', title: 'Valor de venda (obra original)', type: 'string', group: 'interno'}),
    defineField({name: 'obs', title: 'Observações', type: 'text', rows: 2, group: 'interno'}),
    defineField({name: 'cliente', title: 'Cliente', type: 'string', group: 'interno'}),
    defineField({name: 'imagemAltaResolucao', title: 'Imagem em resolução high', type: 'url', group: 'interno'}),
    defineField({name: 'imagemTiff', title: 'Imagem em resolução tiff', type: 'url', group: 'interno'}),
    defineField({name: 'imagemLow', title: 'Imagem em resolução low', type: 'url', group: 'interno'}),
    defineField({name: 'imagemWeb', title: 'Imagem em resolução web', type: 'url', group: 'interno'}),
    defineField({
      name: 'exposicoes',
      title: 'Exposições (histórico da planilha)',
      type: 'array',
      of: [{type: 'string'}],
      group: 'interno',
    }),
  ],

  preview: {
    select: {
      title: 'titulo.pt',
      subtitle: 'ano',
     media: 'imagens.0',
      publicado: 'publicado',
    },
    prepare({title, subtitle, media, publicado}) {
      return {
        title,
        subtitle: `${subtitle || 'sem ano'} ${publicado ? '· publicado' : '· rascunho'}`,
        media,
      }
    },
  },
})
