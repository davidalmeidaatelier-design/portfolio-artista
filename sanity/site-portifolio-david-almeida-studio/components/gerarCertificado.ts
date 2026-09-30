import {jsPDF} from 'jspdf'

type IdiomaCertificado = 'pt' | 'en'

type LocaleValue =
  | string
  | {
      pt?: string
      en?: string
    }
  | null
  | undefined

export type ObraCertificado = {
  _id: string
  numeroControle?: string | number
  titulo?: LocaleValue
  ano?: string | number
  tecnica?: LocaleValue
  dimensoes?: string
  imagemPrincipal?: string
}

type SanityClientLike = {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>
}

const LARGURA_PAGINA = 210
const ALTURA_PAGINA = 297
const MARGEM = 20
const LARGURA_CONTEUDO = LARGURA_PAGINA - MARGEM * 2

const FONTES = {
  regular: '/certificados/fonts/calibri-regular.ttf',
  bold: '/certificados/fonts/calibri-bold.ttf',
  italic: '/certificados/fonts/calibri-italic.ttf',
  boldItalic: '/certificados/fonts/calibri-bold-italic.ttf',
}

const LOGO = '/certificados/logo.png'

function obterTexto(valor: LocaleValue, idioma: IdiomaCertificado): string {
  if (!valor) return ''

  if (typeof valor === 'string') return valor

  return valor[idioma] || valor.pt || valor.en || ''
}

function dataPorExtenso(idioma: IdiomaCertificado): string {
  const agora = new Date()

  return new Intl.DateTimeFormat(
    idioma === 'pt' ? 'pt-BR' : 'en-US',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(agora)
}

function anoEmissao(): number {
  return new Date().getFullYear()
}

function arrayBufferParaBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const tamanho = 0x8000
  let resultado = ''

  for (let i = 0; i < bytes.length; i += tamanho) {
    const bloco = bytes.subarray(i, i + tamanho)
    resultado += String.fromCharCode(...bloco)
  }

  return btoa(resultado)
}

async function carregarArquivoComoBase64(url: string): Promise<string> {
  const resposta = await fetch(url)

  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar o arquivo: ${url}`)
  }

  return arrayBufferParaBase64(await resposta.arrayBuffer())
}

async function carregarImagemComoDataUrl(url: string): Promise<string> {
  const resposta = await fetch(url)

  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar a imagem da obra.`)
  }

  const blob = await resposta.blob()

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem da obra.'))
    reader.readAsDataURL(blob)
  })
}

function formatoImagem(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG'
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP'
  return 'JPEG'
}

async function carregarImagemComDimensoes(
  dataUrl: string,
): Promise<{dataUrl: string; largura: number; altura: number; formato: 'PNG' | 'JPEG' | 'WEBP'}> {
  return await new Promise((resolve, reject) => {
    const imagem = new Image()

    imagem.onload = () => {
      resolve({
        dataUrl,
        largura: imagem.naturalWidth || imagem.width,
        altura: imagem.naturalHeight || imagem.height,
        formato: formatoImagem(dataUrl),
      })
    }

    imagem.onerror = () => reject(new Error('Não foi possível processar a imagem da obra.'))
    imagem.src = dataUrl
  })
}

function ajustarImagem(
  larguraOriginal: number,
  alturaOriginal: number,
  larguraMaxima: number,
  alturaMaxima: number,
) {
  const proporcao = Math.min(
    larguraMaxima / larguraOriginal,
    alturaMaxima / alturaOriginal,
  )

  return {
    largura: larguraOriginal * proporcao,
    altura: alturaOriginal * proporcao,
  }
}

async function registrarFontes(doc: jsPDF) {
  const fontes = [
    {url: FONTES.regular, arquivo: 'calibri-regular.ttf', estilo: 'normal'},
    {url: FONTES.bold, arquivo: 'calibri-bold.ttf', estilo: 'bold'},
    {url: FONTES.italic, arquivo: 'calibri-italic.ttf', estilo: 'italic'},
    {
      url: FONTES.boldItalic,
      arquivo: 'calibri-bold-italic.ttf',
      estilo: 'bolditalic',
    },
  ] as const

  for (const fonte of fontes) {
    const base64 = await carregarArquivoComoBase64(fonte.url)
    doc.addFileToVFS(fonte.arquivo, base64)
    doc.addFont(fonte.arquivo, 'Calibri', fonte.estilo)
  }
}

async function carregarLogo(): Promise<string> {
  return carregarImagemComoDataUrl(LOGO)
}

function desenharBorda(doc: jsPDF) {
  doc.setDrawColor(25, 25, 25)
  doc.setLineWidth(0.35)
  doc.rect(10, 10, 190, 277)
}

function desenharCabecalho(
  doc: jsPDF,
  logoDataUrl: string,
  idioma: IdiomaCertificado,
) {
  const logoLargura = 30
  const logoAltura = 30
  const logoX = (LARGURA_PAGINA - logoLargura) / 2

  doc.addImage(logoDataUrl, 'PNG', logoX, 18, logoLargura, logoAltura)

  doc.setFont('Calibri', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(25, 25, 25)
  doc.text(
    idioma === 'pt'
      ? 'CERTIFICADO DE AUTENTICIDADE'
      : 'CERTIFICATE OF AUTHENTICITY',
    LARGURA_PAGINA / 2,
    58,
    {align: 'center'},
  )
}

function desenharCampo(
  doc: jsPDF,
  rotulo: string,
  valor: string,
  x: number,
  y: number,
) {
  doc.setFont('Calibri', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(85, 85, 85)
  doc.text(rotulo.toUpperCase(), x, y)

  doc.setFont('Calibri', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(20, 20, 20)
  doc.text(valor || '—', x, y + 5)
}

function desenharTextoQuebrado(
  doc: jsPDF,
  texto: string,
  x: number,
  y: number,
  largura: number,
): number {
  doc.setFont('Calibri', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(45, 45, 45)

  const linhas = doc.splitTextToSize(texto, largura)
  doc.text(linhas, x, y)

  return y + linhas.length * 5
}

export async function buscarObrasParaCertificado(
  client: SanityClientLike,
  ids: string[],
): Promise<ObraCertificado[]> {
  if (ids.length === 0) return []

  return client.fetch<ObraCertificado[]>(
    `*[_type == "obra" && _id in $ids] | order(numeroControle asc) {
      _id,
      numeroControle,
      titulo,
      ano,
      tecnica,
      dimensoes,
      "imagemPrincipal": imagens[0].arquivo.asset->url
    }`,
    {ids},
  )
}

export async function gerarCertificado(
  obra: ObraCertificado,
  idioma: IdiomaCertificado,
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  await registrarFontes(doc)

  const logoDataUrl = await carregarLogo()

  doc.setFont('Calibri', 'normal')
  desenharBorda(doc)
  desenharCabecalho(doc, logoDataUrl, idioma)

  const titulo = obterTexto(obra.titulo, idioma)
  const tecnica = obterTexto(obra.tecnica, idioma)
  const ano = String(obra.ano || '')
  const dimensoes = obra.dimensoes || ''
  const numero = String(obra.numeroControle || '').trim()
  const codigo = `DA-${anoEmissao()}-${numero || 'SEM-NUMERO'}`

  let y = 70

  if (obra.imagemPrincipal) {
    try {
      const dataUrl = await carregarImagemComoDataUrl(obra.imagemPrincipal)
      const imagem = await carregarImagemComDimensoes(dataUrl)
      const tamanho = ajustarImagem(
        imagem.largura,
        imagem.altura,
        150,
        72,
      )

      const x = (LARGURA_PAGINA - tamanho.largura) / 2
      const yImagem = y

      doc.addImage(
        imagem.dataUrl,
        imagem.formato,
        x,
        yImagem,
        tamanho.largura,
        tamanho.altura,
      )

      y = yImagem + 80
    } catch (erro) {
      console.error('Não foi possível inserir a imagem da obra:', erro)
      y += 8
    }
  } else {
    y += 8
  }

  doc.setDrawColor(190, 190, 190)
  doc.setLineWidth(0.25)
  doc.line(MARGEM, y, LARGURA_PAGINA - MARGEM, y)
  y += 11

  doc.setFont('Calibri', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(20, 20, 20)
  doc.text(titulo || '—', LARGURA_PAGINA / 2, y, {
    align: 'center',
    maxWidth: LARGURA_CONTEUDO,
  })
  y += 13

  desenharCampo(
    doc,
    idioma === 'pt' ? 'Ano' : 'Year',
    ano,
    MARGEM,
    y,
  )

  desenharCampo(
    doc,
    idioma === 'pt' ? 'Técnica' : 'Medium',
    tecnica,
    MARGEM + 58,
    y,
  )

  desenharCampo(
    doc,
    idioma === 'pt' ? 'Dimensões' : 'Dimensions',
    dimensoes,
    MARGEM + 128,
    y,
  )

  y += 25

  const texto =
    idioma === 'pt'
      ? 'Certificamos que a obra acima identificada é uma obra original de autoria de David Almeida, conforme os registros do acervo do artista.'
      : 'We certify that the work identified above is an original work by David Almeida, according to the artist’s collection records.'

  y = desenharTextoQuebrado(doc, texto, MARGEM, y, LARGURA_CONTEUDO)

  y += 13

  doc.setFont('Calibri', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(85, 85, 85)
  doc.text('CODE', MARGEM, y)

  doc.setFont('Calibri', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(20, 20, 20)
  doc.text(codigo, MARGEM, y + 5)

  doc.setFont('Calibri', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(85, 85, 85)
  doc.text(
    idioma === 'pt' ? 'DATA DE EMISSÃO' : 'DATE OF ISSUE',
    MARGEM + 75,
    y,
  )

  doc.setFont('Calibri', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(20, 20, 20)
  doc.text(dataPorExtenso(idioma), MARGEM + 75, y + 5)

  const assinaturaY = 255

  doc.setDrawColor(40, 40, 40)
  doc.setLineWidth(0.3)
  doc.line(62, assinaturaY, 148, assinaturaY)

  doc.setFont('Calibri', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(
    idioma === 'pt' ? 'Assinatura' : 'Signature',
    LARGURA_PAGINA / 2,
    assinaturaY + 6,
    {align: 'center'},
  )

  doc.setFont('Calibri', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text(
    'DAVID ALMEIDA STUDIO',
    LARGURA_PAGINA / 2,
    279,
    {align: 'center'},
  )

  const nomeArquivo = `certificado-${codigo}.pdf`
  doc.save(nomeArquivo)
}

export async function gerarCertificados(
  client: SanityClientLike,
  ids: string[],
  idioma: IdiomaCertificado,
): Promise<void> {
  const obras = await buscarObrasParaCertificado(client, ids)

  for (const obra of obras) {
    await gerarCertificado(obra, idioma)
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}
