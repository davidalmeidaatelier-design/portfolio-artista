/**
 * Importa as obras da planilha de catalogação (CSV) para o Sanity.
 *
 * O QUE ESSE SCRIPT FAZ:
 * - Lê o CSV exportado do Excel.
 * - Cria um documento "obra" para cada linha, com TODOS os dados
 *   (públicos + controle interno do ateliê).
 * - Calcula uma "série sugerida" (campo serieSugerida) a partir da
 *   técnica e do ano mais recente da obra — sem publicar nada.
 * - Cria as obras com `publicado: false`. Ninguém vê nada no site até
 *   você revisar a série sugerida, preencher o campo "serie" de verdade
 *   e marcar "publicado" manualmente no Studio.
 *
 * O QUE ESSE SCRIPT NÃO FAZ:
 * - Não publica nada automaticamente.
 * - Não sobe imagens (a planilha não tem arquivos de imagem, só links
 *   confidenciais do Drive, que ficam de fora por decisão sua).
 *
 * COMO USAR:
 * 1. Dentro da pasta do Sanity Studio, rode:
 *      npm install @sanity/client papaparse dotenv
 * 2. Gere um token de escrita em manage.sanity.io > seu projeto > API > Tokens
 *    (permissão "Editor" é suficiente) e crie um arquivo .env nessa pasta com:
 *      SANITY_PROJECT_ID=seu_project_id
 *      SANITY_DATASET=production
 *      SANITY_TOKEN=seu_token_aqui
 * 3. Rode:
 *      node importar-obras.js "/caminho/para/00_David-Almeida_catalogacao_-_relacao-completa.csv"
 *
 * O script pede confirmação antes de criar os documentos de verdade — na
 * primeira rodada ele só MOSTRA o que faria (modo simulação / dry run).
 * Para de fato criar os documentos, rode de novo com --confirmar no final:
 *      node importar-obras.js "caminho.csv" --confirmar
 */

require('dotenv').config()
const fs = require('fs')
const Papa = require('papaparse')
const {createClient} = require('@sanity/client')

const CONFIRMAR = process.argv.includes('--confirmar')
const CAMINHO_CSV = process.argv[2]

if (!CAMINHO_CSV) {
  console.error('Uso: node importar-obras.js "caminho/para/arquivo.csv" [--confirmar]')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ---------- REGRAS DE CLASSIFICAÇÃO DE SÉRIE ----------

function extrairAnoMaisRecente(anoTexto) {
  if (!anoTexto) return null
  const numeros = String(anoTexto).match(/\d{4}/g)
  if (!numeros) return null
  return Math.max(...numeros.map(Number))
}

function classificarSerie(tecnicaTexto, tituloTexto, anoTexto) {
  const tecnica = (tecnicaTexto || '').toLowerCase()
  const titulo = (tituloTexto || '').toLowerCase()
  const anoFinal = extrairAnoMaisRecente(anoTexto)

  // 1. Monotipia
  if (tecnica.includes('monotipia')) {
    return 'Monotipias'
  }

  // 2. Gravuras (múltiplo sobre papel)
  const termosGravura = [
    'água tinta',
    'agua tinta',
    'água-tinta',
    'água forte',
    'agua forte',
    'ponta seca',
    'gravura',
    'litogravura',
    'litografia',
    'xilogravura',
  ]
  if (termosGravura.some((t) => tecnica.includes(t))) {
    return 'Gravuras'
  }

  // 3. Objetos e esculturas:
  //    - cerâmica, EXCETO "óleo sobre cerâmica" (essa vai para pinturas)
  //    - título contém fragmento / escultura / objeto
  //    - técnica em branco, ou só descreve material (sem termo de técnica)
  const ehCeramica = tecnica.includes('cerâmica') || tecnica.includes('ceramica')
  const ehOleoSobreCeramica = ehCeramica && tecnica.includes('óleo')
  const tituloIndicaObjeto = ['fragmento', 'escultura', 'objeto'].some((t) =>
    titulo.includes(t)
  )
  const tecnicaEmBranco = tecnica.trim() === ''

  if ((ehCeramica && !ehOleoSobreCeramica) || tituloIndicaObjeto || tecnicaEmBranco) {
    return 'Objetos e esculturas'
  }

  // 4. Demais casos (inclusive óleo sobre cerâmica): pinturas por data,
  //    usando o ano mais recente da obra.
  if (anoFinal === null) return 'Pinturas anteriores' // fallback se não der pra saber o ano

  if (anoFinal < 2018) return 'Pinturas anteriores'
  if (anoFinal <= 2019) return 'Pinturas 2018-2020'
  if (anoFinal <= 2021) return 'Pinturas de 2020-2022'
  if (anoFinal <= 2023) return 'Pinturas de 2022-2024'
  return 'Pinturas recentes'
}

// ---------- LEITURA E MAPEAMENTO DO CSV ----------
// A planilha tem uma linha de título ("DAVID ALMEIDA - OBRAS") e depois o
// cabeçalho de verdade. Por isso lemos sem header automático e pulamos as
// duas primeiras linhas, usando a posição de cada coluna.

const COLUNAS = {
  numero: 0,
  imagem: 1,
  titulo: 2,
  dimensao: 3,
  ano: 4,
  tecnica: 5,
  peso: 6,
  localizacao: 7,
  dataInfo: 8,
  status: 9,
  idGalerias: 10,
  // 11 = coluna sem nome na planilha original, ignorada
  valorVenda: 12,
  obs: 13,
  cliente: 14,
  imagemAltaResolucao: 15,
  imagemTiff: 16,
  imagemLow: 17,
  imagemWeb: 18,
  exposicoes1: 19,
  exposicoes2: 20,
}

function lerLinhas(caminho) {
  const conteudo = fs.readFileSync(caminho, 'utf-8')
  const {data} = Papa.parse(conteudo, {skipEmptyLines: true})
  return data.slice(2) // pula a linha de título e a linha de cabeçalho
}

function linhaParaObra(linha) {
  const titulo = (linha[COLUNAS.titulo] || '').trim()
  const tecnica = (linha[COLUNAS.tecnica] || '').trim()
  const ano = (linha[COLUNAS.ano] || '').trim()
  const dimensao = (linha[COLUNAS.dimensao] || '').trim()

  if (!titulo) return null // linha vazia/lixo, ignora

  const serieSugerida = classificarSerie(tecnica, titulo, ano)

  const exposicoes = [linha[COLUNAS.exposicoes1], linha[COLUNAS.exposicoes2]]
    .map((v) => (v || '').trim())
    .filter(Boolean)

  return {
    _type: 'obra',
    titulo,
    dimensao,
    ano,
    tecnica,
    publicado: false,
    serieSugerida,

    numeroControle: (linha[COLUNAS.numero] || '').trim(),
    peso: (linha[COLUNAS.peso] || '').trim(),
    localizacao: (linha[COLUNAS.localizacao] || '').trim(),
    dataInfo: (linha[COLUNAS.dataInfo] || '').trim(),
    status: (linha[COLUNAS.status] || '').trim(),
    idGalerias: (linha[COLUNAS.idGalerias] || '').trim(),
    valorVenda: (linha[COLUNAS.valorVenda] || '').trim(),
    obs: (linha[COLUNAS.obs] || '').trim(),
    cliente: (linha[COLUNAS.cliente] || '').trim(),
    imagemAltaResolucao: (linha[COLUNAS.imagemAltaResolucao] || '').trim(),
    imagemTiff: (linha[COLUNAS.imagemTiff] || '').trim(),
    imagemLow: (linha[COLUNAS.imagemLow] || '').trim(),
    imagemWeb: (linha[COLUNAS.imagemWeb] || '').trim(),
    exposicoes,
  }
}

// ---------- EXECUÇÃO ----------

async function main() {
  const linhas = lerLinhas(CAMINHO_CSV)
  const obras = linhas.map(linhaParaObra).filter(Boolean)

  console.log(`Encontradas ${obras.length} obras na planilha.\n`)

  // Resumo de quantas obras caíram em cada série sugerida
  const contagem = {}
  for (const obra of obras) {
    contagem[obra.serieSugerida] = (contagem[obra.serieSugerida] || 0) + 1
  }
  console.log('Distribuição por série sugerida:')
  for (const [serie, qtd] of Object.entries(contagem)) {
    console.log(`  ${serie}: ${qtd}`)
  }

  if (!CONFIRMAR) {
    console.log('\nModo simulação (nada foi criado no Sanity).')
    console.log('Revise a distribuição acima. Se estiver correta, rode de novo com --confirmar.')
    console.log('\nExemplo das 3 primeiras obras que seriam criadas:')
    console.log(JSON.stringify(obras.slice(0, 3), null, 2))
    return
  }

  console.log('\nCriando documentos no Sanity...')
  let criadas = 0
  for (const obra of obras) {
    await client.create(obra)
    criadas++
    if (criadas % 25 === 0) console.log(`  ${criadas}/${obras.length}...`)
  }
  console.log(`\nPronto! ${criadas} obras criadas como rascunho (publicado: false).`)
  console.log('Agora revise cada uma no Studio, confirme a série e publique quando quiser.')
}

main().catch((err) => {
  console.error('Erro ao importar:', err)
  process.exit(1)
})
