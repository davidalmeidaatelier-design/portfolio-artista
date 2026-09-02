import {useEffect, useRef, useState} from 'react'
import {
  ArrayOfObjectsInputProps,
  insert,
  setIfMissing,
  useClient,
} from 'sanity'

const MAX_FILES = 30
const PAGE_SIZE = 100

type Asset = {
  _id: string
  url?: string
  originalFilename?: string
  _createdAt?: string
}

function randomKey() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function MultiImageInput(props: ArrayOfObjectsInputProps) {
  const {onChange, renderDefault, value = []} = props

  const client = useClient({
    apiVersion: '2026-03-01',
  })

  const inputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  /*
   * ---------------------------------------------------------
   * IMAGENS JÁ PRESENTES NO CAMPO
   * ---------------------------------------------------------
   */

  const existingAssetIds = new Set(
    value
      .map((item: any) => item?.asset?._ref)
      .filter(Boolean),
  )

  /*
   * ---------------------------------------------------------
   * UPLOAD DE NOVAS IMAGENS
   * ---------------------------------------------------------
   */

  async function handleFiles(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) return

    if (files.length > MAX_FILES) {
      window.alert(
        'Você pode selecionar no máximo 30 imagens por vez.',
      )

      event.target.value = ''
      return
    }

    setUploading(true)

    try {
      const uploadedAssets = await Promise.all(
        files.map((file) =>
          client.assets.upload('image', file, {
            filename: file.name,
          }),
        ),
      )

      const items = uploadedAssets.map((asset) => ({
        _type: 'image',
        _key: randomKey(),
        asset: {
          _type: 'reference',
          _ref: asset._id,
        },
      }))

      onChange([
        setIfMissing([]),
        insert(items, 'after', [-1]),
      ])
    } catch (error) {
      console.error('Erro ao enviar imagens:', error)

      window.alert(
        'Não foi possível enviar uma ou mais imagens.',
      )
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  /*
   * ---------------------------------------------------------
   * ABRIR BIBLIOTECA
   * ---------------------------------------------------------
   */

  async function openLibrary() {
    setLibraryOpen(true)
    setSelectedAssets([])
    setSearch('')
    setVisibleCount(PAGE_SIZE)

    setLoadingLibrary(true)

    try {
      const result = await client.fetch<Asset[]>(
        `*[
          _type == "sanity.imageAsset"
        ] | order(_createdAt desc) {
          _id,
          url,
          originalFilename,
          _createdAt
        }`,
      )

      setAssets(result)
    } catch (error) {
      console.error(
        'Erro ao carregar biblioteca de imagens:',
        error,
      )

      window.alert(
        'Não foi possível carregar a biblioteca de imagens.',
      )

      setLibraryOpen(false)
    } finally {
      setLoadingLibrary(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * SELEÇÃO DE IMAGENS DA BIBLIOTECA
   * ---------------------------------------------------------
   */

  function toggleAsset(assetId: string) {
    setSelectedAssets((current) => {
      if (current.includes(assetId)) {
        return current.filter((id) => id !== assetId)
      }

      if (current.length >= MAX_FILES) {
        window.alert(
          'Você pode adicionar no máximo 30 imagens por vez.',
        )

        return current
      }

      return [...current, assetId]
    })
  }

  /*
   * ---------------------------------------------------------
   * ADICIONAR IMAGENS SELECIONADAS
   * ---------------------------------------------------------
   */

  function addSelectedAssets() {
    if (selectedAssets.length === 0) {
      setLibraryOpen(false)
      return
    }

    const newAssets = selectedAssets.filter(
      (assetId) => !existingAssetIds.has(assetId),
    )

    if (newAssets.length === 0) {
      window.alert(
        'As imagens selecionadas já estão neste campo.',
      )

      setLibraryOpen(false)
      return
    }

    const items = newAssets.map((assetId) => ({
      _type: 'image',
      _key: randomKey(),
      asset: {
        _type: 'reference',
        _ref: assetId,
      },
    }))

    onChange([
      setIfMissing([]),
      insert(items, 'after', [-1]),
    ])

    setSelectedAssets([])
    setLibraryOpen(false)
  }

  /*
   * ---------------------------------------------------------
   * FILTRO DA BIBLIOTECA
   * ---------------------------------------------------------
   */

  const filteredAssets = assets.filter((asset) => {
    if (!search.trim()) return true

    const filename =
      asset.originalFilename?.toLowerCase() || ''

    return filename.includes(search.toLowerCase())
  })

  const visibleAssets = filteredAssets.slice(
    0,
    visibleCount,
  )

  /*
   * ---------------------------------------------------------
   * ESC PARA FECHAR A BIBLIOTECA
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!libraryOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setLibraryOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [libraryOpen])

  /*
   * ---------------------------------------------------------
   * INTERFACE
   * ---------------------------------------------------------
   */

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: uploading ? '#eee' : '#fff',
            padding: '8px 14px',
            cursor: uploading ? 'wait' : 'pointer',
            fontSize: '14px',
          }}
        >
          {uploading
            ? 'Enviando imagens…'
            : 'Adicionar imagens'}
        </button>

        <button
          type="button"
          disabled={uploading}
          onClick={openLibrary}
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#fff',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Selecionar da biblioteca
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          style={{display: 'none'}}
        />
      </div>

      {/*
       * Mantém a interface padrão do Sanity:
       * miniaturas, arrastar para reordenar, remover etc.
       *
       * O botão padrão de adicionar item é ocultado porque
       * agora temos nossos dois botões personalizados.
       */}

      {renderDefault({
        ...props,
        arrayFunctions: () => null,
      })}

      {/*
       * -------------------------------------------------------
       * MODAL DA BIBLIOTECA
       * -------------------------------------------------------
       */}

      {libraryOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px',
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLibraryOpen(false)
            }
          }}
        >
          <div
            style={{
              width: 'min(1100px, 100%)',
              maxHeight: '90vh',
              background: '#fff',
              borderRadius: '6px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow:
                '0 20px 60px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/*
             * CABEÇALHO
             */}

            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '15px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  Biblioteca de imagens
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    color: '#666',
                  }}
                >
                  {selectedAssets.length} selecionada
                  {selectedAssets.length === 1
                    ? ''
                    : 's'}{' '}
                  · máximo de 30 por vez
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                style={{
                  border: 0,
                  background: 'transparent',
                  fontSize: '24px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
                aria-label="Fechar biblioteca"
              >
                ×
              </button>
            </div>

            {/*
             * BUSCA
             */}

            <div
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid #ddd',
              }}
            >
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setVisibleCount(PAGE_SIZE)
                }}
                placeholder="Pesquisar pelo nome do arquivo…"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/*
             * CONTEÚDO
             */}

            <div
              style={{
                overflowY: 'auto',
                padding: '20px',
                minHeight: '300px',
              }}
            >
              {loadingLibrary ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#666',
                  }}
                >
                  Carregando biblioteca…
                </div>
              ) : visibleAssets.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#666',
                  }}
                >
                  {search
                    ? 'Nenhuma imagem encontrada.'
                    : 'A biblioteca ainda está vazia.'}
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {visibleAssets.map((asset) => {
                      const selected =
                        selectedAssets.includes(asset._id)

                      const alreadyAdded =
                        existingAssetIds.has(asset._id)

                      return (
                        <button
                          key={asset._id}
                          type="button"
                          onClick={() =>
                            !alreadyAdded &&
                            toggleAsset(asset._id)
                          }
                          disabled={alreadyAdded}
                          style={{
                            position: 'relative',
                            border: selected
                              ? '3px solid #111'
                              : '1px solid #ddd',
                            borderRadius: '4px',
                            background: '#f7f7f7',
                            padding: 0,
                            overflow: 'hidden',
                            cursor: alreadyAdded
                              ? 'default'
                              : 'pointer',
                            opacity: alreadyAdded
                              ? 0.45
                              : 1,
                            textAlign: 'left',
                          }}
                        >
                          {asset.url ? (
                            <img
                              src={asset.url}
                              alt={
                                asset.originalFilename ||
                                'Imagem'
                              }
                              style={{
                                width: '100%',
                                height: '150px',
                                display: 'block',
                                objectFit: 'contain',
                                background: '#eee',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                height: '150px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent:
                                  'center',
                                color: '#999',
                              }}
                            >
                              Sem prévia
                            </div>
                          )}

                          <div
                            style={{
                              padding: '8px',
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow:
                                'ellipsis',
                            }}
                          >
                            {asset.originalFilename ||
                              'Imagem sem nome'}
                          </div>

                          {selected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: '#111',
                                color: '#fff',
                                display: 'flex',
                                alignItems:
                                  'center',
                                justifyContent:
                                  'center',
                                fontSize: '15px',
                                fontWeight: 600,
                              }}
                            >
                              ✓
                            </div>
                          )}

                          {alreadyAdded && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                background:
                                  'rgba(0,0,0,0.7)',
                                color: '#fff',
                                padding:
                                  '4px 7px',
                                borderRadius:
                                  '3px',
                                fontSize: '11px',
                              }}
                            >
                              Já adicionada
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {visibleCount <
                    filteredAssets.length && (
                    <div
                      style={{
                        textAlign: 'center',
                        marginTop: '20px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleCount(
                            (count) =>
                              count + PAGE_SIZE,
                          )
                        }
                        style={{
                          border:
                            '1px solid #ccc',
                          borderRadius: '4px',
                          background: '#fff',
                          padding:
                            '8px 14px',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        Carregar mais
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/*
             * RODAPÉ
             */}

            <div
              style={{
                borderTop: '1px solid #ddd',
                padding: '15px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  color: '#666',
                }}
              >
                {filteredAssets.length} imagem
                {filteredAssets.length === 1
                  ? ''
                  : 'ns'}{' '}
                na biblioteca
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setLibraryOpen(false)
                  }
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    background: '#fff',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    selectedAssets.length === 0
                  }
                  onClick={addSelectedAssets}
                  style={{
                    border: '1px solid #111',
                    borderRadius: '4px',
                    background:
                      selectedAssets.length === 0
                        ? '#eee'
                        : '#111',
                    color:
                      selectedAssets.length === 0
                        ? '#999'
                        : '#fff',
                    padding: '8px 14px',
                    cursor:
                      selectedAssets.length === 0
                        ? 'default'
                        : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Adicionar selecionadas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
