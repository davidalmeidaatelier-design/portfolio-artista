import React, {useEffect, useMemo, useState} from 'react'
import {useClient} from 'sanity'
import {useRouter} from 'sanity/router'
import {gerarCertificados} from './gerarCertificado'

/**
 * Ferramenta interna do Sanity Studio:
 * tabela de controle e consulta do acervo de obras.
 *
 * A tabela consulta todas as obras, incluindo rascunhos,
 * e permite pesquisa e filtros combinados.
 *
 * Clicar em uma linha abre a obra na tela normal de edição.
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
  projetoTitulo?: string
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
  {chave: 'projetoTitulo', titulo: 'Projeto'},
  {chave: 'publicado', titulo: 'Publicado'},
]

type Filtros = {
  serie: string[]
  serieSugerida: string[]
  ano: string[]
  tecnica: string[]
  localizacao: string[]
  status: string[]
  cliente: string[]
  exposicao: string[]
  projeto: string[]
  publicado: string[]
  imagemAlta: string[]
  imagemTiff: string[]
  imagemLow: string[]
  imagemWeb: string[]
}

const FILTROS_INICIAIS: Filtros = {
  serie: [],
  serieSugerida: [],
  ano: [],
  tecnica: [],
  localizacao: [],
  status: [],
  cliente: [],
  exposicao: [],
  projeto: [],
  publicado: [],
  imagemAlta: [],
  imagemTiff: [],
  imagemLow: [],
  imagemWeb: [],
}

function normalizar(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function opcoesUnicas(
  obras: ObraRow[],
  campo: keyof ObraRow,
): string[] {
  return Array.from(
    new Set(
      obras
        .map((obra) => obra[campo])
        .filter((valor): valor is string => {
          return typeof valor === 'string' && valor.trim() !== ''
        })
        .map((valor) => valor.trim()),
    ),
  ).sort((a, b) =>
    a.localeCompare(b, 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

function opcoesExposicoes(obras: ObraRow[]): string[] {
  return Array.from(
    new Set(
      obras.flatMap((obra) =>
        Array.isArray(obra.exposicoes)
          ? obra.exposicoes
              .filter(
                (exposicao): exposicao is string =>
                  typeof exposicao === 'string' &&
                  exposicao.trim() !== '',
              )
              .map((exposicao) => exposicao.trim())
          : [],
      ),
    ),
  ).sort((a, b) =>
    a.localeCompare(b, 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

export function TabelaObrasTool() {
  const baseClient = useClient({apiVersion: API_VERSION})

  const client = useMemo(
    () => baseClient.withConfig({perspective: 'previewDrafts'}),
    [baseClient],
  )

  const router = useRouter()

  const [obras, setObras] = useState<ObraRow[]>([])
  const [carregando, setCarregando] = useState(true)

  const [busca, setBusca] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [obrasSelecionadas, setObrasSelecionadas] = useState<string[]>([])
  const [mostrarExportacao, setMostrarExportacao] = useState(false)
  const [mostrarIdiomaCertificado, setMostrarIdiomaCertificado] =
    useState(false)
  const [gerandoCertificados, setGerandoCertificados] = useState(false)

  const [filtros, setFiltros] = useState<Filtros>(
    FILTROS_INICIAIS,
  )

  useEffect(() => {
    setCarregando(true)

    client
      .fetch<ObraRow[]>(
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
          "projetoTitulo": projeto->titulo.pt,
          publicado
        }`,
      )
      .then((res) => {
        const ordenadas = [...res].sort((a, b) => {
          const numeroA = Number(a.numeroControle)
          const numeroB = Number(b.numeroControle)

          const aValido = Number.isFinite(numeroA)
          const bValido = Number.isFinite(numeroB)

          if (!aValido && !bValido) {
            return String(a.numeroControle || '').localeCompare(
              String(b.numeroControle || ''),
              'pt-BR',
              {numeric: true},
            )
          }

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

  const opcoes = useMemo(
    () => ({
      series: opcoesUnicas(obras, 'serieTitulo'),
      seriesSugeridas: opcoesUnicas(obras, 'serieSugerida'),
      anos: opcoesUnicas(obras, 'ano'),
      tecnicas: opcoesUnicas(obras, 'tecnica'),
      localizacoes: opcoesUnicas(obras, 'localizacao'),
      status: opcoesUnicas(obras, 'status'),
      clientes: opcoesUnicas(obras, 'cliente'),
      exposicoes: opcoesExposicoes(obras),
      projetos: opcoesUnicas(obras, 'projetoTitulo'),
    }),
    [obras],
  )

  const temFiltrosAtivos =
    busca.trim() !== '' ||
    Object.values(filtros).some((valores) => valores.length > 0)

  const filtrosAtivosCount =
    (busca.trim() !== '' ? 1 : 0) +
    Object.values(filtros).reduce((total, valores) => total + valores.length, 0)

  const filtradas = useMemo(() => {
    const buscaNormalizada = normalizar(busca)

    return obras.filter((o) => {
      /*
       * BUSCA GERAL
       *
       * A busca deixa de olhar somente título e número.
       * Ela percorre os principais campos textuais da ficha interna.
       */
      if (buscaNormalizada !== '') {
        const alvo = [
          o.numeroControle,
          o.titulo,
          o.dimensoes,
          o.ano,
          o.tecnica,
          o.peso,
          o.localizacao,
          o.dataInfo,
          o.status,
          o.idGalerias,
          o.valorVenda,
          o.obs,
          o.cliente,
          o.exposicoes?.join(' '),
          o.serieSugerida,
          o.serieTitulo,
          o.projetoTitulo,
        ]
          .filter(Boolean)
          .map(normalizar)
          .join(' ')

        if (!alvo.includes(buscaNormalizada)) {
          return false
        }
      }

      const correspondeAoFiltro = (valorObra: unknown, valoresSelecionados: string[]) => {
        if (valoresSelecionados.length === 0) return true
        const valorNormalizado = normalizar(valorObra)
        return valoresSelecionados.some(
          (valor) => normalizar(valor) === valorNormalizado,
        )
      }

      if (!correspondeAoFiltro(o.serieTitulo, filtros.serie)) {
        return false
      }

      if (!correspondeAoFiltro(o.serieSugerida, filtros.serieSugerida)) {
        return false
      }

      if (!correspondeAoFiltro(o.ano, filtros.ano)) {
        return false
      }

      if (!correspondeAoFiltro(o.tecnica, filtros.tecnica)) {
        return false
      }

      if (!correspondeAoFiltro(o.localizacao, filtros.localizacao)) {
        return false
      }

      if (!correspondeAoFiltro(o.status, filtros.status)) {
        return false
      }

      if (!correspondeAoFiltro(o.cliente, filtros.cliente)) {
        return false
      }

      if (filtros.exposicao.length > 0) {
        const exposicoesNormalizadas = (o.exposicoes || []).map(normalizar)
        const possuiExposicao = filtros.exposicao.some((exposicao) =>
          exposicoesNormalizadas.includes(normalizar(exposicao)),
        )

        if (!possuiExposicao) {
          return false
        }
      }

      if (!correspondeAoFiltro(o.projetoTitulo, filtros.projeto)) {
        return false
      }

      if (filtros.publicado.length > 0) {
        const publicadoSelecionado =
          (filtros.publicado.includes('sim') && o.publicado === true) ||
          (filtros.publicado.includes('nao') && o.publicado !== true)

        if (!publicadoSelecionado) {
          return false
        }
      }

      const correspondeSimNao = (
        valoresSelecionados: string[],
        possuiValor: boolean,
      ) => {
        if (valoresSelecionados.length === 0) return true
        return (
          (valoresSelecionados.includes('sim') && possuiValor) ||
          (valoresSelecionados.includes('nao') && !possuiValor)
        )
      }

      if (!correspondeSimNao(filtros.imagemAlta, Boolean(o.imagemAltaResolucao))) {
        return false
      }

      if (!correspondeSimNao(filtros.imagemTiff, Boolean(o.imagemTiff))) {
        return false
      }

      if (!correspondeSimNao(filtros.imagemLow, Boolean(o.imagemLow))) {
        return false
      }

      if (!correspondeSimNao(filtros.imagemWeb, Boolean(o.imagemWeb))) {
        return false
      }

      return true
    })
  }, [obras, busca, filtros])

  function alternarFiltro(campo: keyof Filtros, valor: string) {
    setFiltros((atual) => {
      const selecionados = atual[campo]
      const existe = selecionados.some(
        (item) => normalizar(item) === normalizar(valor),
      )

      return {
        ...atual,
        [campo]: existe
          ? selecionados.filter(
              (item) => normalizar(item) !== normalizar(valor),
            )
          : [...selecionados, valor],
      }
    })
  }

  function alternarSelecao(id: string) {
    setObrasSelecionadas((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id],
    )
  }

  function selecionarFiltradas() {
    setObrasSelecionadas((atuais) => {
      const idsFiltrados = filtradas.map((obra) => obra._id)
      const todasSelecionadas = idsFiltrados.every((id) =>
        atuais.includes(id),
      )

      if (todasSelecionadas) {
        return atuais.filter((id) => !idsFiltrados.includes(id))
      }

      return Array.from(new Set([...atuais, ...idsFiltrados]))
    })
  }

  function limparSelecao() {
    setObrasSelecionadas([])
    setMostrarExportacao(false)
  }

  function limparFiltros() {
    setBusca('')
    setFiltros(FILTROS_INICIAIS)
  }

  function abrirObra(id: string) {
    const idPublicado = id.replace(/^drafts\./, '')

    router.navigateIntent('edit', {
      id: idPublicado,
      type: 'obra',
    })
  }

  async function emitirCertificados(idioma: 'pt' | 'en') {
    if (obrasSelecionadasValidas.length === 0 || gerandoCertificados) {
      return
    }

    setGerandoCertificados(true)
    setMostrarIdiomaCertificado(false)
    setMostrarExportacao(false)

    try {
      await gerarCertificados(
        client,
        obrasSelecionadasValidas,
        idioma,
      )
    } catch (erro) {
      // eslint-disable-next-line no-console
      console.error('Não foi possível gerar os certificados:', erro)
      window.alert(
        'Não foi possível gerar os certificados. Verifique o console do navegador para mais detalhes.',
      )
    } finally {
      setGerandoCertificados(false)
    }
  }

  function SelectFiltro({
    label,
    values,
    onToggle,
    options,
  }: {
    label: string
    values: string[]
    onToggle: (value: string) => void
    options: string[]
  }) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          minWidth: 190,
          flex: '1 1 190px',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#555',
          }}
        >
          {label}
          {values.length > 0 ? ` (${values.length})` : ''}
        </span>

        <div
          style={{
            border: '1px solid #ccc',
            borderRadius: 4,
            background: '#fff',
            maxHeight: 150,
            overflowY: 'auto',
          }}
        >
          {options.length === 0 ? (
            <div style={{padding: '7px 8px', fontSize: 12, color: '#999'}}>
              Nenhuma opção disponível
            </div>
          ) : (
            options.map((option) => {
              const selecionado = values.includes(option)

              return (
                <label
                  key={option}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                    background: selecionado ? '#f0f0f0' : '#fff',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selecionado}
                    onChange={() => onToggle(option)}
                    style={{
                      appearance: 'auto',
                      WebkitAppearance: 'checkbox',
                      width: 16,
                      height: 16,
                      margin: 0,
                      opacity: 1,
                      accentColor: '#2563eb',
                      flexShrink: 0,
                    }}
                  />
                  <span>{option}</span>
                </label>
              )
            })
          )}
        </div>
      </div>
    )
  }

  const todasFiltradasSelecionadas =
    filtradas.length > 0 &&
    filtradas.every((obra) => obrasSelecionadas.includes(obra._id))

  const obrasSelecionadasValidas = obrasSelecionadas.filter((id) =>
    obras.some((obra) => obra._id === id),
  )

  return (
    <div
      style={{
        padding: 16,
        height: '100%',
        overflow: 'auto',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            Controle interno de obras
          </h2>

          <p
            style={{
              margin: '5px 0 0',
              color: '#777',
              fontSize: 12,
            }}
          >
            Pesquisa e gerenciamento do acervo
          </p>
        </div>

        <div
          style={{
            fontSize: 12,
            color: '#777',
            whiteSpace: 'nowrap',
          }}
        >
          {carregando
            ? 'Carregando...'
            : `${filtradas.length} de ${obras.length} obras`}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <input
          placeholder="Buscar em todo o acervo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            padding: '9px 10px',
            width: 380,
            maxWidth: '100%',
            fontSize: 14,
            border: '1px solid #bbb',
            borderRadius: 4,
            boxSizing: 'border-box',
          }}
        />

        <button
          type="button"
          onClick={() => setMostrarFiltros((valor) => !valor)}
          style={{
            padding: '9px 12px',
            border: '1px solid #bbb',
            borderRadius: 4,
            background: mostrarFiltros ? '#f0f0f0' : '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {mostrarFiltros ? 'Ocultar filtros' : 'Filtros'}
          {filtrosAtivosCount > 0
            ? ` (${filtrosAtivosCount})`
            : ''}
        </button>

        <div style={{position: 'relative'}}>
          <button
            type="button"
            disabled={obrasSelecionadasValidas.length === 0}
            onClick={() => setMostrarExportacao((valor) => !valor)}
            style={{
              padding: '9px 12px',
              border: '1px solid #bbb',
              borderRadius: 4,
              background:
                obrasSelecionadasValidas.length > 0 ? '#fff' : '#f5f5f5',
              color:
                obrasSelecionadasValidas.length > 0 ? '#222' : '#999',
              cursor:
                obrasSelecionadasValidas.length > 0 ? 'pointer' : 'default',
              fontSize: 13,
            }}
          >
            Exportar
            {obrasSelecionadasValidas.length > 0
              ? ` (${obrasSelecionadasValidas.length})`
              : ''}
          </button>

          {mostrarExportacao && obrasSelecionadasValidas.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 5px)',
                left: 0,
                minWidth: 230,
                padding: 6,
                border: '1px solid #ccc',
                borderRadius: 5,
                background: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  padding: '7px 8px 5px',
                  fontSize: 11,
                  color: '#777',
                  fontWeight: 600,
                }}
              >
                DOCUMENTOS
              </div>

              <button
                type="button"
                disabled={gerandoCertificados}
                onClick={() => {
                  setMostrarExportacao(false)
                  setMostrarIdiomaCertificado(true)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px',
                  border: 'none',
                  borderRadius: 3,
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: gerandoCertificados ? 'default' : 'pointer',
                  fontSize: 13,
                  opacity: gerandoCertificados ? 0.5 : 1,
                }}
              >
                Certificado de autenticidade
              </button>
            </div>
          )}
        </div>

        {mostrarIdiomaCertificado && obrasSelecionadasValidas.length > 0 && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="idioma-certificado-titulo"
              style={{
                width: 360,
                maxWidth: 'calc(100vw - 32px)',
                padding: 20,
                border: '1px solid #ccc',
                borderRadius: 8,
                background: '#fff',
                boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
              }}
            >
              <div
                id="idioma-certificado-titulo"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Certificado de autenticidade
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: '#666',
                  lineHeight: 1.5,
                  marginBottom: 16,
                }}
              >
                Escolha o idioma para os{' '}
                {obrasSelecionadasValidas.length === 1
                  ? 'certificado'
                  : 'certificados'}{' '}
                selecionado
                {obrasSelecionadasValidas.length === 1 ? '' : 's'}.
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMostrarIdiomaCertificado(false)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #bbb',
                    borderRadius: 4,
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => void emitirCertificados('en')}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #bbb',
                    borderRadius: 4,
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  English
                </button>

                <button
                  type="button"
                  onClick={() => void emitirCertificados('pt')}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #222',
                    borderRadius: 4,
                    background: '#222',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Português
                </button>
              </div>
            </div>
          </div>
        )}

        {gerandoCertificados && (
          <div
            style={{
              marginBottom: 10,
              padding: '8px 10px',
              border: '1px solid #ddd',
              borderRadius: 5,
              background: '#fafafa',
              fontSize: 12,
              color: '#555',
            }}
          >
            Gerando certificados...
          </div>
        )}

        {obrasSelecionadasValidas.length > 0 && (
          <button
            type="button"
            onClick={limparSelecao}
            style={{
              padding: '9px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#666',
              fontSize: 12,
            }}
          >
            Limpar seleção
          </button>
        )}

        {temFiltrosAtivos && (
          <button
            type="button"
            onClick={limparFiltros}
            style={{
              padding: '9px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#666',
              fontSize: 12,
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {obrasSelecionadasValidas.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
            padding: '8px 10px',
            border: '1px solid #ddd',
            borderRadius: 5,
            background: '#fafafa',
            fontSize: 12,
            color: '#555',
          }}
        >
          <strong>
            {obrasSelecionadasValidas.length} obra
            {obrasSelecionadasValidas.length === 1 ? '' : 's'} selecionada
            {obrasSelecionadasValidas.length === 1 ? '' : 's'}
          </strong>
          <span>
            A seleção permanece mesmo quando você altera os filtros.
          </span>
        </div>
      )}

      {mostrarFiltros && (
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: 12,
            marginBottom: 14,
            background: '#fafafa',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <SelectFiltro
              label="Série confirmada"
              values={filtros.serie}
              onToggle={(valor) => alternarFiltro('serie', valor)}
              options={opcoes.series}
            />

            <SelectFiltro
              label="Série sugerida"
              values={filtros.serieSugerida}
              onToggle={(valor) => alternarFiltro('serieSugerida', valor)}
              options={opcoes.seriesSugeridas}
            />

            <SelectFiltro
              label="Ano"
              values={filtros.ano}
              onToggle={(valor) => alternarFiltro('ano', valor)}
              options={opcoes.anos}
            />

            <SelectFiltro
              label="Técnica"
              values={filtros.tecnica}
              onToggle={(valor) => alternarFiltro('tecnica', valor)}
              options={opcoes.tecnicas}
            />

            <SelectFiltro
              label="Localização"
              values={filtros.localizacao}
              onToggle={(valor) => alternarFiltro('localizacao', valor)}
              options={opcoes.localizacoes}
            />

            <SelectFiltro
              label="Status"
              values={filtros.status}
              onToggle={(valor) => alternarFiltro('status', valor)}
              options={opcoes.status}
            />

            <SelectFiltro
              label="Cliente"
              values={filtros.cliente}
              onToggle={(valor) => alternarFiltro('cliente', valor)}
              options={opcoes.clientes}
            />

            <SelectFiltro
              label="Exposição"
              values={filtros.exposicao}
              onToggle={(valor) => alternarFiltro('exposicao', valor)}
              options={opcoes.exposicoes}
            />

            <SelectFiltro
              label="Projeto"
              values={filtros.projeto}
              onToggle={(valor) => alternarFiltro('projeto', valor)}
              options={opcoes.projetos}
            />

            <SelectFiltro
              label="Publicado no site"
              values={filtros.publicado}
              onToggle={(valor) => alternarFiltro('publicado', valor)}
              options={['sim', 'nao']}
            />

            <SelectFiltro
              label="Imagem high"
              values={filtros.imagemAlta}
              onToggle={(valor) => alternarFiltro('imagemAlta', valor)}
              options={['sim', 'nao']}
            />

            <SelectFiltro
              label="Imagem TIFF"
              values={filtros.imagemTiff}
              onToggle={(valor) => alternarFiltro('imagemTiff', valor)}
              options={['sim', 'nao']}
            />

            <SelectFiltro
              label="Imagem low"
              values={filtros.imagemLow}
              onToggle={(valor) => alternarFiltro('imagemLow', valor)}
              options={['sim', 'nao']}
            />

            <SelectFiltro
              label="Imagem web"
              values={filtros.imagemWeb}
              onToggle={(valor) => alternarFiltro('imagemWeb', valor)}
              options={['sim', 'nao']}
            />
          </div>

          {temFiltrosAtivos && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: '1px solid #e5e5e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: '#666',
                }}
              >
                {filtradas.length} obra
                {filtradas.length === 1 ? '' : 's'} encontrada
                {filtradas.length === 1 ? '' : 's'}
              </span>

              <button
                type="button"
                onClick={limparFiltros}
                style={{
                  border: '1px solid #ccc',
                  background: '#fff',
                  borderRadius: 4,
                  padding: '6px 9px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Limpar tudo
              </button>
            </div>
          )}
        </div>
      )}

      {carregando ? (
        <p>Carregando obras...</p>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #e5e5e5',
            borderRadius: 4,
          }}
        >
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              fontSize: 13,
              background: '#fff',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'center',
                    borderBottom: '2px solid #ccc',
                    padding: '7px 8px',
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    background: '#fff',
                    zIndex: 2,
                    width: 34,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={todasFiltradasSelecionadas}
                    onChange={selecionarFiltradas}
                    disabled={filtradas.length === 0}
                    aria-label="Selecionar todas as obras filtradas"
                    style={{
                      appearance: 'auto',
                      WebkitAppearance: 'checkbox',
                      opacity: 1,
                      visibility: 'visible',
                      display: 'inline-block',
                      width: 16,
                      height: 16,
                      margin: 0,
                      cursor: filtradas.length === 0 ? 'default' : 'pointer',
                    }}
                  />
                </th>
                {COLUNAS.map((c) => (
                  <th
                    key={String(c.chave)}
                    style={{
                      textAlign: 'left',
                      borderBottom: '2px solid #ccc',
                      padding: '7px 10px',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      background: '#fff',
                      zIndex: 1,
                      fontWeight: 600,
                    }}
                  >
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUNAS.length + 1}
                    style={{
                      padding: 30,
                      textAlign: 'center',
                      color: '#777',
                    }}
                  >
                    Nenhuma obra encontrada com os critérios
                    selecionados.
                  </td>
                </tr>
              ) : (
                filtradas.map((o) => (
                  <tr
                    key={o._id}
                    onClick={() => abrirObra(o._id)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        'rgba(150, 150, 150, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        'transparent'
                    }}
                  >
                    <td
                      style={{
                        padding: '6px 8px',
                        textAlign: 'center',
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={obrasSelecionadas.includes(o._id)}
                        onChange={() => alternarSelecao(o._id)}
                        aria-label={`Selecionar ${o.titulo || o.numeroControle || 'obra'}`}
                        style={{
                          appearance: 'auto',
                          WebkitAppearance: 'checkbox',
                          opacity: 1,
                          visibility: 'visible',
                          display: 'inline-block',
                          width: 16,
                          height: 16,
                          margin: 0,
                          cursor: 'pointer',
                        }}
                      />
                    </td>
                    {COLUNAS.map((c) => {
                      const valor = o[c.chave]

                      if (c.chave === 'imagemPrincipal') {
                        return (
                          <td
                            key={String(c.chave)}
                            style={{
                              padding: '6px 10px',
                            }}
                          >
                            {valor ? (
                              <img
                                src={`${valor}?w=60&h=60&fit=crop`}
                                alt=""
                                style={{
                                  width: 40,
                                  height: 40,
                                  objectFit: 'cover',
                                  display: 'block',
                                  borderRadius: 2,
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  opacity: 0.4,
                                }}
                              >
                                —
                              </span>
                            )}
                          </td>
                        )
                      }

                      let exibicao: string

                      if (c.chave === 'publicado') {
                        exibicao = valor ? '✓' : '—'
                      } else if (Array.isArray(valor)) {
                        exibicao = valor.join(', ')
                      } else {
                        exibicao = (valor as string) || ''
                      }

                      return (
                        <td
                          key={String(c.chave)}
                          style={{
                            padding: '6px 10px',
                            whiteSpace:
                              c.chave === 'obs'
                                ? 'normal'
                                : 'nowrap',
                            maxWidth:
                              c.chave === 'obs'
                                ? 300
                                : undefined,
                          }}
                        >
                          {exibicao || (
                            <span
                              style={{
                                opacity: 0.35,
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <p
        style={{
          marginTop: 12,
          color: '#888',
          fontSize: 12,
        }}
      >
        {filtradas.length} de {obras.length} obras.
        Clique em uma linha para abrir e editar.
      </p>
    </div>
  )
}

export default TabelaObrasTool