import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const sanity = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: import.meta.env.SANITY_API_VERSION || '2024-01-01',
  useCdn: true, // conteúdo lido do CDN — rápido e gratuito nesse volume
});

const builder = imageUrlBuilder(sanity);
export const urlFor = (source: any) => builder.image(source);

// --- Queries GROQ ---
// Cada campo bilíngue vem como { pt, en } — resolvemos o idioma no componente.
// Todas as queries públicas filtram por publicado == true.

// OBRAS — dentro de cada série, ordenadas por ano decrescente (mais
// recente primeiro), para dar a sensação de rolagem cronológica contínua
// entre séries (que já vêm ordenadas por período mais recente primeiro).
export const QUERY_OBRAS_POR_SERIE = /* groq */ `
  *[_type == "serie"] | order(periodo.anoInicio desc) {
    _id, titulo, slug, "capa": capa.asset->url,
    "obras": *[_type == "obra" && references(^._id) && publicado == true] | order(ano desc) {
      _id, titulo, slug, ano, tecnica, dimensoes,
      "imagemPrincipal": imagens[0].arquivo.asset->url,
      "aspectRatio": imagens[0].arquivo.asset->metadata.dimensions
    }
  }
`;

export const QUERY_OBRA_POR_SLUG = /* groq */ `
  *[_type == "obra" && slug.current == $slug && publicado == true][0] {
    _id, titulo, ano, tecnica, dimensoes, descricao,
    disponivelParaVenda, preco, formatosPrint,
    vinculadaLoja, disponibilidade,
    imagens[] { "url": arquivo.asset->url, alt },
    serie->{ titulo, slug },
    projeto->{ titulo, slug }
  }
`;

// PROJETOS — só os registros com categoria "projeto" (Exposições tem
// suas próprias queries abaixo, embora usem o mesmo tipo "projeto").
export const QUERY_PROJETOS = /* groq */ `
  *[_type == "projeto" && categoria == "projeto" && publicado == true] | order(dataInicio desc) {
    _id, titulo, slug, status, dataInicio, dataFim, local,
    "capa": imagensMontagem[0].asset->url
  }
`;

export const QUERY_PROJETO_POR_SLUG = /* groq */ `
  *[_type == "projeto" && slug.current == $slug && categoria == "projeto" && publicado == true][0] {
    titulo, status, dataInicio, dataFim, local, texto, videos,
    imagensObras[] { "url": asset->url },
    imagensMontagem[] { "url": asset->url },
    obrasRelacionadas[]->{ titulo, slug, "imagem": imagens[0].arquivo.asset->url, serie->{slug} }
  }
`;

// EXPOSIÇÕES — mesma base de dados de "projeto", filtrando categoria
// "exposicao". Traz as 4 categorias de imagem e os textos relacionados
// (buscados a partir do Texto, que aponta de volta pra cá).
export const QUERY_EXPOSICOES = /* groq */ `
  *[_type == "projeto" && categoria == "exposicao" && publicado == true] | order(dataInicio desc) {
    _id, titulo, slug, status, dataInicio, dataFim, local,
    "capa": imagensMontagem[0].asset->url
  }
`;

export const QUERY_EXPOSICAO_POR_SLUG = /* groq */ `
  *[_type == "projeto" && slug.current == $slug && categoria == "exposicao" && publicado == true][0] {
titulo, status, dataInicio, dataFim, local,
"textoPt": texto.pt,
"textoEn": texto.en,
videos,
    imagensMontagem[] { "url": asset->url },
    imagensDetalhe[] { "url": asset->url },
    imagensOutras[] { "url": asset->url },
    imagensObras[] { "url": asset->url },
    obrasRelacionadas[]->{ titulo, slug, "imagem": imagens[0].arquivo.asset->url, serie->{slug} },
    "textosRelacionados": *[
  _type == "texto" &&
  publicado == true &&
  projetoRelacionado._ref == ^._id
] {
  titulo, slug, autor
}
  }
`;

// AGENDA — todo o arquivo cronológico (passado, atual e futuro). Nada é
// removido com o tempo; a página decide como diferenciar visualmente.
export const QUERY_AGENDA = /* groq */ `
  *[_type == "evento" && publicado == true] | order(data desc) {
    data, tipo, titulo, descricao, linkExterno,
    projetoRelacionado->{ titulo, slug }
  }
`;

// TEXTOS
export const QUERY_TEXTOS = /* groq */ `
  *[_type == "texto" && publicado == true] | order(_createdAt desc) {
    titulo, slug, autor, "capa": imagemCapa.asset->url,
    projetoRelacionado->{ titulo, slug }
  }
`;

export const QUERY_TEXTO_POR_SLUG = /* groq */ `
  *[_type == "texto" && slug.current == $slug && publicado == true][0] {
    titulo, autor, corpo, "capa": imagemCapa.asset->url,
    projetoRelacionado->{ titulo, slug }
  }
`;

// SOBRE (singleton)
export const QUERY_SOBRE = /* groq */ `
  *[_type == "sobre"][0] {
    texto, miniBio, curriculo, "imagem": imagem.asset->url
  }
`;

// HOME — hierarquia: exposição em destaque > conteúdo recente > obras.
export const QUERY_EXPOSICAO_DESTAQUE = /* groq */ `
  *[_type == "projeto" && categoria == "exposicao" && publicado == true] | order(dataInicio desc) [0] {
    titulo, slug, local, dataInicio, dataFim, texto,
    "capa": imagensMontagem[0].asset->url
  }
`;

export const QUERY_OBRA_RECENTE = /* groq */ `
  *[_type == "obra" && publicado == true] | order(ano desc) [0] {
    titulo, slug, ano, "imagemPrincipal": imagens[0].arquivo.asset->url,
    serie->{slug}
  }
`;

export const QUERY_TEXTO_RECENTE = /* groq */ `
  *[_type == "texto" && publicado == true] | order(_createdAt desc) [0] {
    titulo, slug, autor
  }
`;

export const QUERY_AGENDA_RECENTE = /* groq */ `
  *[_type == "evento" && publicado == true] | order(data desc) [0] {
    titulo, data, tipo, projetoRelacionado->{slug}
  }
`;

// Campos "localeText" guardam rich text estruturado (array de blocos),
// não uma string simples. Essa função extrai o texto de cada bloco em
// parágrafos simples — suficiente para o texto corrido usado no site.
// Para formatação rica (negrito, links, listas), seria preciso um
// renderizador de Portable Text de verdade (@portabletext/to-html).
export function blocksToParagraphs(blocks: any): string[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((b: any) => b?._type === 'block')
    .map((b: any) => (b.children || []).map((c: any) => c.text || '').join(''))
    .filter((texto: string) => texto.trim() !== '');
}
