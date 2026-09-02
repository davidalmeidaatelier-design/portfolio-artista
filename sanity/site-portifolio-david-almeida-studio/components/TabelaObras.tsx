import React, {useEffect, useMemo, useState} from 'react'
import {useClient} from 'sanity'
import {useRouter} from 'sanity/router'

/**
 * Tool customizada do Sanity Studio: mostra todas as obras numa tabela
 * parecida com a planilha de controle interno do ateliê.
 *
 * Só é visível dentro do Studio (não é exposta no site público). Clicar
 * numa linha abre a obra na tela normal de edição.
 */

const API_VERSION = '2024-01-01'

type ObraRow = {
  _id: string
  numeroControle?: string
  titulo?: string
  dimensoes?: string
  ano?: string
  tecnica?: string
  imagemPrincipal?: string
  peso?: string
  localizacao?: string
  dataInfo?: string
  status?: string
  idGalerias?: string
  valorVenda?: string
  obs?: string
  cliente?: string
  imagemAltaResolucao?: string
  imagemTiff?: string
  imagemLow?: string
  imagemWeb?: string
  exposicoes?: string[]
  serieSugerida?: string
  serieTitulo?: string
  publicado?: boolean
}

const COLUNAS: {chave: keyof ObraRow; titulo: string}[] = [
  {chave: 'numeroControle', titulo: '#'},
  {chave: 'titulo', titulo: 'Título'},
  {chave: 'imagemPrincipal', titulo: 'Imagem'},
  {chave: 'dimensoes', titulo: 'Dimensão'},
  {chave: 'ano', titulo: 'Ano'},
  {chave: 'tecnica', titulo: 'Técnica'},
  {chave: 'peso', titulo: 'Peso'},
  {chave: 'localizacao', titulo: 'Localização'},
  {chave: 'dataInfo', titulo: 'Data info'},
  {chave: 'status', titulo: 'Status'},
  {chave: 'idGalerias', titulo: 'ID galerias'},
  {chave: 'valorVenda', titulo: 'Valor de venda'},
  {chave: 'obs', titulo: 'Obs'},
  {chave: 'cliente', titulo: 'Cliente'},
  {chave: 'imagemAltaResolucao', titulo: 'Imagem alta resolução'},
  {chave: 'imagemTiff', titulo: 'Imagem tiff'},
  {chave: 'imagemLow', titulo: 'Imagem low'},
  {chave: 'imagemWeb', titulo: 'Imagem web'},
  {chave: 'exposicoes', titulo: 'Exposições'},
  {chave: 'serieSugerida', titulo: 'Série sugerida'},
  {chave: 'serieTitulo', titulo: 'Série (confirmada)'},
  {chave: 'publicado', titulo: 'Publicado'},
]

export function TabelaObrasTool() {
  const baseClient = useClient({apiVersion: API_VERSION})
  const client = useMemo(
    () => baseClient.withConfig({perspective: 'previewDrafts'}),
    [baseClient]
  )
  const router = useRouter()
  const [obras, setObras] = useState<ObraRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    setCarregando(true)
    client
      .fetch(
        `*[_type == "obra"] {
          _id,
          numeroControle,
          "titulo": titulo.pt,
          "imagemPrincipal": imagens[0].arquivo.asset->url,
          dimensoes,
          ano,
          "tecnica": tecnica.pt,
          peso,
          localizacao,
          dataInfo,
          status,
          idGalerias,
          valorVenda,
          obs,
          cliente,
          imagemAltaResolucao,
          imagemTiff,
          imagemLow,
          imagemWeb,
          exposicoes,
          serieSugerida,
          "serieTitulo": serie->titulo.pt,
          publicado
        }`
      )
      .then((res: ObraRow[]) => {
  const ordenadas = [...res].sort((a, b) => {
    const numeroA = Number(a.numeroControle)
    const numeroB = Number(b.numeroControle)

    const aValido = Number.isFinite(numeroA)
    const bValido = Number.isFinite(numeroB)

    if (!aValido && !bValido) return 0
    if (!aValido) return 1
    if (!bValido) return -1

    return numeroA - numeroB
  })

  setObras(ordenadas)
  setCarregando(false)
})

      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(err)
        setCarregando(false)
      })
  }, [client])

  const filtradas = obras.filter((o) => {
    if (busca.trim() === '') return true
    const alvo = `${o.titulo || ''} ${o.numeroControle || ''}`.toLowerCase()
    return alvo.includes(busca.toLowerCase())
  })

  function abrirObra(id: string) {
    const idPublicado = id.replace(/^drafts\./, '')
    router.navigateIntent('edit', {id: idPublicado, type: 'obra'})
  }

  return (
    <div style={{padding: 16, height: '100%', overflow: 'auto', fontFamily: 'sans-serif'}}>
      <h2 style={{marginBottom: 8}}>Controle interno de obras</h2>
      <input
        placeholder="Buscar por título ou número..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{padding: 8, marginBottom: 12, width: 320, fontSize: 14}}
      />
      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <div style={{overflowX: 'auto'}}>
          <table style={{borderCollapse: 'collapse', width: '100%', fontSize: 13}}>
            <thead>
              <tr>
                {COLUNAS.map((c) => (
                  <th
                    key={String(c.chave)}
                    style={{
                      textAlign: 'left',
                      borderBottom: '2px solid #ccc',
                      padding: '6px 10px',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      background: 'white',
                    }}
                  >
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((o) => (
                <tr
                  key={o._id}
                  onClick={() => abrirObra(o._id)}
                  style={{cursor: 'pointer', borderBottom: '1px solid #eee'}}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(150, 150, 150, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {COLUNAS.map((c) => {
                    const valor = o[c.chave]
                    if (c.chave === 'imagemPrincipal') {
                      return (
                        <td key={String(c.chave)} style={{padding: '6px 10px'}}>
                          {valor ? (
                            <img
                              src={`${valor}?w=60&h=60&fit=crop`}
                              alt=""
                              style={{width: 40, height: 40, objectFit: 'cover', display: 'block'}}
                            />
                          ) : (
                            <span style={{opacity: 0.4}}>—</span>
                          )}
                        </td>
                      )
                    }
                    let exibicao: string
                    if (c.chave === 'publicado') {
                      exibicao = valor ? '✅' : '—'
                    } else if (Array.isArray(valor)) {
                      exibicao = valor.join(', ')
                    } else {
                      exibicao = (valor as string) || ''
                    }
                    return (
                      <td key={String(c.chave)} style={{padding: '6px 10px', whiteSpace: 'nowrap'}}>
                        {exibicao}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{marginTop: 12, color: '#888', fontSize: 12}}>
        {filtradas.length} de {obras.length} obras. Clique em uma linha para abrir e editar.
      </p>
    </div>
  )
}

export default TabelaObrasTool
