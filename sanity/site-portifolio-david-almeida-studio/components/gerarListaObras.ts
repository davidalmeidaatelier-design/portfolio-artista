import {jsPDF} from 'jspdf'

type ObraLista = {
  numeroControle?: string
  titulo?: string
  tituloEn?: string
  ano?: string
  tecnica?: string
  tecnicaEn?: string
  dimensoes?: string
  localizacao?: string
  status?: string
  imagemPrincipal?: string
}

type IdiomaLista = 'pt' | 'en'

const LARGURA_PAGINA = 297
const ALTURA_PAGINA = 210
const MARGEM = 14
const LARGURA_CONTEUDO = LARGURA_PAGINA - MARGEM * 2

function dataAtual(): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date())
}

function carregarFonte(doc: jsPDF, nome: string, caminho: string, estilo: string) {
  // O Vite serve os arquivos da pasta public diretamente pela raiz.
  // A fonte é carregada pelo navegador antes de ser registrada no jsPDF.
  return fetch(caminho)
    .then((resposta) => {
      if (!resposta.ok) {
        throw new Error(`Não foi possível carregar a fonte ${nome}.`)
      }
      return resposta.arrayBuffer()
    })
    .then((buffer) => {
      const bytes = new Uint8Array(buffer)
      let binario = ''
      const tamanho = 0x8000

      for (let i = 0; i < bytes.length; i += tamanho) {
        binario += String.fromCharCode(
          ...bytes.subarray(i, Math.min(i + tamanho, bytes.length)),
        )
      }

      const base64 = btoa(binario)
      doc.addFileToVFS(`${nome}.ttf`, base64)
      doc.addFont(`${nome}.ttf`, 'Calibri', estilo)
    })
}

function textoSeguro(valor: unknown): string {
  return String(valor ?? '').trim() || '—'
}

function quebrarTexto(doc: jsPDF, texto: string, largura: number): string[] {
  return doc.splitTextToSize(texto, largura) as string[]
}

type ImagemConvertida = {
  dataUrl: string
  largura: number
  altura: number
}

async function carregarImagem(url: string): Promise<ImagemConvertida | null> {
  try {
    const resposta = await fetch(url)

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`)
    }

    const blob = await resposta.blob()
    const objectUrl = URL.createObjectURL(blob)

    try {
      const imagem = await new Promise<HTMLImageElement>((resolve, reject) => {
        const elemento = new Image()
        elemento.onload = () => resolve(elemento)
        elemento.onerror = () =>
          reject(new Error('Não foi possível decodificar a imagem.'))
        elemento.src = objectUrl
      })

      const canvas = document.createElement('canvas')
      const larguraMaxima = 1200
      const escala = Math.min(1, larguraMaxima / imagem.naturalWidth)

      canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala))
      canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala))

      const contexto = canvas.getContext('2d')

      if (!contexto) {
        throw new Error('Não foi possível criar o canvas da imagem.')
      }

      contexto.fillStyle = '#ffffff'
      contexto.fillRect(0, 0, canvas.width, canvas.height)
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height)

      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.88),
        largura: imagem.naturalWidth,
        altura: imagem.naturalHeight,
      }
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch (erro) {
    console.warn('Não foi possível carregar a imagem da obra:', url, erro)
    return null
  }
}

function desenharCabecalho(
  doc: jsPDF,
  y: number,
  idioma: IdiomaLista,
): number {
  doc.setFillColor(35, 35, 35)
  doc.rect(MARGEM, y, LARGURA_CONTEUDO, 9, 'F')

  doc.setFont('Calibri', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)

  const colunas = [
    ['#', MARGEM + 3],
    [idioma === 'pt' ? 'Imagem' : 'Image', MARGEM + 16],
    [idioma === 'pt' ? 'Título' : 'Title', MARGEM + 38],
    [idioma === 'pt' ? 'Ano' : 'Year', MARGEM + 112],
    [idioma === 'pt' ? 'Técnica' : 'Medium', MARGEM + 128],
    [idioma === 'pt' ? 'Dimensões' : 'Dimensions', MARGEM + 180],
    [idioma === 'pt' ? 'Localização' : 'Location', MARGEM + 215],
    [idioma === 'pt' ? 'Status' : 'Status', MARGEM + 242],
  ]

  for (const [texto, x] of colunas) {
    doc.text(String(texto), Number(x), y + 6)
  }

  return y + 9
}

export async function gerarListaObras(
  obras: ObraLista[],
  idioma: IdiomaLista = 'pt',
): Promise<void> {
  if (obras.length === 0) return

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  await Promise.all([
    carregarFonte(
      doc,
      'Calibri-Regular',
      '/certificados/fonts/calibri-regular.ttf',
      'normal',
    ),
    carregarFonte(
      doc,
      'Calibri-Bold',
      '/certificados/fonts/calibri-bold.ttf',
      'bold',
    ),
  ])

  doc.setProperties({
    title: idioma === 'pt' ? 'Lista de obras' : 'List of works',
    subject:
      idioma === 'pt'
        ? 'Lista de obras selecionadas do acervo'
        : 'List of selected works from the collection',
    author: 'David Almeida Studio',
  })

  let y = MARGEM

  doc.setFont('Calibri', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(25, 25, 25)
  doc.text(
    idioma === 'pt' ? 'LISTA DE OBRAS' : 'LIST OF WORKS',
    MARGEM,
    y + 5,
  )

  doc.setFont('Calibri', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(
    idioma === 'pt'
      ? `${obras.length} obra${obras.length === 1 ? '' : 's'} selecionada${obras.length === 1 ? '' : 's'} · ${dataAtual()}`
      : `${obras.length} selected work${obras.length === 1 ? '' : 's'} · ${dataAtual()}`,
    MARGEM,
    y + 11,
  )

  y += 19
  y = desenharCabecalho(doc, y, idioma)

  doc.setFont('Calibri', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(35, 35, 35)

  const larguras = {
    titulo: 70,
    tecnica: 48,
    dimensoes: 31,
    localizacao: 24,
    status: 24,
  }

  const alturaMinima = 23
  const alturaLinha = 3.7

  for (const obra of obras) {
    const numero = textoSeguro(obra.numeroControle)
    const titulo =
      idioma === 'pt'
        ? textoSeguro(obra.titulo)
        : textoSeguro(obra.tituloEn || obra.titulo)
    const ano = textoSeguro(obra.ano)
    const tecnica =
      idioma === 'pt'
        ? textoSeguro(obra.tecnica)
        : textoSeguro(obra.tecnicaEn || obra.tecnica)
    const dimensoes = textoSeguro(obra.dimensoes)
    const localizacao = textoSeguro(obra.localizacao)
    const status = textoSeguro(obra.status)

    const linhasTitulo = quebrarTexto(doc, titulo, larguras.titulo)
    const linhasTecnica = quebrarTexto(doc, tecnica, larguras.tecnica)
    const linhasDimensoes = quebrarTexto(doc, dimensoes, larguras.dimensoes)
    const linhasLocalizacao = quebrarTexto(doc, localizacao, larguras.localizacao)
    const linhasStatus = quebrarTexto(doc, status, larguras.status)

    const imagem = obra.imagemPrincipal
      ? await carregarImagem(obra.imagemPrincipal)
      : null

    const quantidadeLinhas = Math.max(
      linhasTitulo.length,
      linhasTecnica.length,
      linhasDimensoes.length,
      linhasLocalizacao.length,
      linhasStatus.length,
      1,
    )

    const alturaTexto = quantidadeLinhas * alturaLinha + 4
    const altura = Math.max(alturaMinima, alturaTexto)

    if (y + altura > ALTURA_PAGINA - MARGEM) {
      doc.addPage()
      y = MARGEM
      y = desenharCabecalho(doc, y, idioma)
      doc.setFont('Calibri', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(35, 35, 35)
    }

    if (Math.round(y * 10) % 2 === 0) {
      doc.setFillColor(248, 248, 248)
      doc.rect(MARGEM, y, LARGURA_CONTEUDO, altura, 'F')
    }

    const blocoTexto = (linhas: string[]) =>
      Math.max(1, linhas.length) * alturaLinha

    const centralizarTexto = (
      linhas: string[],
      x: number,
      larguraBloco: number,
    ) => {
      const alturaBloco = blocoTexto(linhas)
      const deslocamento = Math.max(0, (altura - alturaBloco) / 2)
      doc.text(linhas, x, y + deslocamento + 4)
    }

    doc.text(numero, MARGEM + 3, y + altura / 2 + 1.3)
    centralizarTexto(linhasTitulo, MARGEM + 38, larguras.titulo)
    doc.text(ano, MARGEM + 112, y + altura / 2 + 1.3)
    centralizarTexto(linhasTecnica, MARGEM + 128, larguras.tecnica)
    centralizarTexto(linhasDimensoes, MARGEM + 180, larguras.dimensoes)
    centralizarTexto(linhasLocalizacao, MARGEM + 215, larguras.localizacao)
    centralizarTexto(linhasStatus, MARGEM + 242, larguras.status)

    if (imagem) {
      const caixaX = MARGEM + 13
      const caixaY = y + 2
      const caixaLargura = 23
      const caixaAltura = altura - 4

      const escala = Math.min(
        caixaLargura / imagem.largura,
        caixaAltura / imagem.altura,
      )

      const larguraImagem = imagem.largura * escala
      const alturaImagem = imagem.altura * escala

      const imagemX = caixaX + (caixaLargura - larguraImagem) / 2
      const imagemY = caixaY + (caixaAltura - alturaImagem) / 2

      doc.addImage(
        imagem.dataUrl,
        'JPEG',
        imagemX,
        imagemY,
        larguraImagem,
        alturaImagem,
      )
    } else {
      doc.setTextColor(130, 130, 130)
      doc.text('—', MARGEM + 24, y + altura / 2 + 1.3)
      doc.setTextColor(35, 35, 35)
    }

    doc.setDrawColor(225, 225, 225)
    doc.setLineWidth(0.2)
    doc.line(MARGEM, y + altura, MARGEM + LARGURA_CONTEUDO, y + altura)

    y += altura
  }

  doc.setFont('Calibri', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text(
    idioma === 'pt'
      ? 'David Almeida Studio · Lista gerada a partir da Tabela de Obras'
      : 'David Almeida Studio · List generated from the Works Table',
    MARGEM,
    ALTURA_PAGINA - 7,
  )

  doc.save(idioma === 'pt' ? 'lista-de-obras.pdf' : 'list-of-works.pdf')
}
