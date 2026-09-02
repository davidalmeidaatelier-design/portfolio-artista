/**
 * Migra as obras já existentes no Sanity para o novo formato de schema:
 * - titulo (string) -> titulo { pt, en: '' }
 * - tecnica (string) -> tecnica { pt, en: '' }
 * - dimensao (string) -> dimensoes (string) [renomeado]
 * - imagem (única, quase sempre vazia) -> imagens[] (array)
 * - adiciona slug (gerado a partir do título + número de controle)
 * - adiciona campos novos com valor padrão: disponivelParaVenda: false,
 *   formatosPrint: [], ordem (a partir do numeroControle quando numérico)
 *
 * NADA é apagado: todos os campos internos (peso, localizacao, cliente,
 * valorVenda, etc.) são copiados sem alteração. Os campos antigos
 * (titulo, tecnica, dimensao, imagem) só são removidos DEPOIS de o valor
 * novo ser gravado com sucesso no mesmo documento.
 *
 * COMO USAR (dentro da pasta do Sanity Studio, com o mesmo .env já usado
 * na importação da planilha):
 *
 *   node migrar-obras.js            → modo simulação (não altera nada)
 *   node migrar-obras.js --confirmar → aplica a migração de verdade
 *   node migrar-obras.js --verificar → checa a integridade após migrar
 */

require('dotenv').config()
const {createClient} = require('@sanity/client')

const CONFIRMAR = process.argv.includes('--confirmar')
const VERIFICAR = process.argv.includes('--verificar')

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

function slugify(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function buscarObrasAntigas() {
  // Só pega obras que ainda estão no formato antigo (titulo como string)
  return client.fetch(
    `*[_type == "obra" && !defined(titulo.pt)]{
      _id, _rev, titulo, tecnica, dimensao, ano, numeroControle, imagem,
      "temSlug": defined(slug.current)
    }`
  )
}

function montarPatch(obra, slugsUsados) {
  let base = slugify(obra.titulo || 'obra')
  if (!base) base = 'obra'
  let candidato = obra.numeroControle ? `${base}-${obra.numeroControle}` : base
  // garante unicidade mesmo se dois títulos+número colidirem por algum motivo
  let sufixo = 1
  let slugFinal = candidato
  while (slugsUsados.has(slugFinal)) {
    sufixo += 1
    slugFinal = `${candidato}-${sufixo}`
  }
  slugsUsados.add(slugFinal)

  const ordemNumerica = obra.numeroControle && !isNaN(Number(obra.numeroControle))
    ? Number(obra.numeroControle)
    : undefined

  const setPayload = {
    titulo: {pt: obra.titulo || '', en: ''},
    tecnica: {pt: obra.tecnica || '', en: ''},
    dimensoes: obra.dimensao || '',
    slug: {_type: 'slug', current: slugFinal},
    disponivelParaVenda: false,
    formatosPrint: [],
  }
  if (ordemNumerica !== undefined) setPayload.ordem = ordemNumerica

  // Se por acaso já existir uma imagem única antiga com arquivo de verdade,
  // preserva movendo para o array novo. Caso contrário, array vazio.
  if (obra.imagem && obra.imagem.asset) {
    setPayload.imagens = [{_type: 'imagemObra', _key: 'img0', arquivo: obra.imagem, alt: {pt: '', en: ''}}]
  } else {
    setPayload.imagens = []
  }

  const unsetPayload = ['dimensao']
  // só remove o campo antigo "imagem" e "tecnica"/"titulo" (string) depois
  // de confirmarmos que o set acima já gravou os novos com sucesso —
  // por isso unset acontece na MESMA transação de patch (atômica).
  unsetPayload.push('imagem')

  return {id: obra._id, set: setPayload, unset: unsetPayload}
}

async function migrar() {
  const obras = await buscarObrasAntigas()
  console.log(`Encontradas ${obras.length} obras no formato antigo (de um total esperado de 425).`)

  if (obras.length === 0) {
    console.log('Nada para migrar — todas as obras já estão no formato novo, ou não há obras.')
    return
  }

  const slugsUsados = new Set()
  const patches = obras.map((o) => montarPatch(o, slugsUsados))

  if (!CONFIRMAR) {
    console.log('\nModo simulação (nada foi alterado no Sanity).')
    console.log('Exemplo das 3 primeiras obras que seriam migradas:')
    console.log(JSON.stringify(patches.slice(0, 3), null, 2))
    console.log('\nSe estiver correto, rode de novo com --confirmar.')
    return
  }

  console.log('\nMigrando obras (patch atômico por documento)...')
  let feitas = 0
  for (const p of patches) {
    await client.patch(p.id).set(p.set).unset(p.unset).commit()
    feitas++
    if (feitas % 25 === 0) console.log(`  ${feitas}/${patches.length}...`)
  }
  console.log(`\nPronto! ${feitas} obras migradas para o novo formato.`)
  console.log('Rode "node migrar-obras.js --verificar" para checar a integridade.')
}

async function verificar() {
  const total = await client.fetch(`count(*[_type == "obra"])`)
  const comTituloNovo = await client.fetch(`count(*[_type == "obra" && defined(titulo.pt)])`)
  const comSlug = await client.fetch(`count(*[_type == "obra" && defined(slug.current)])`)
  const semDimensoesNemDimensao = await client.fetch(
    `count(*[_type == "obra" && !defined(dimensoes) && !defined(dimensao)])`
  )
  const aindaComCampoAntigo = await client.fetch(
    `count(*[_type == "obra" && (defined(dimensao) || !(titulo._type == "object"))])`
  )
  // conferência de campos internos preservados (amostra)
  const amostraInterna = await client.fetch(
    `*[_type == "obra" && defined(numeroControle)][0...3]{numeroControle, peso, localizacao, cliente, valorVenda, exposicoes}`
  )

  console.log('--- Verificação de integridade ---')
  console.log(`Total de obras:                         ${total}`)
  console.log(`Com título novo ({pt,en}):               ${comTituloNovo}`)
  console.log(`Com slug definido:                       ${comSlug}`)
  console.log(`Sem "dimensoes" nem "dimensao" (deveria ser 0 ou baixo): ${semDimensoesNemDimensao}`)
  console.log(`Ainda com campo antigo (deveria ser 0):   ${aindaComCampoAntigo}`)
  console.log('\nAmostra de campos internos preservados (3 obras):')
  console.log(JSON.stringify(amostraInterna, null, 2))

  if (total !== 425) {
    console.log(`\n⚠️  Atenção: esperava 425 obras, encontrei ${total}. Verifique antes de prosseguir.`)
  } else {
    console.log('\n✅ Contagem total de obras confere (425).')
  }
}

async function main() {
  if (VERIFICAR) {
    await verificar()
  } else {
    await migrar()
  }
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
