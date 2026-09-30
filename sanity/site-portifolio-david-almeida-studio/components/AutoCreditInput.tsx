import {useEffect, useState} from 'react'
import {set, StringInputProps, useClient, useFormValue} from 'sanity'

type Options = {
  imagesField?: string
}

export function AutoCreditInput(props: StringInputProps) {
  const {value, onChange, elementProps, schemaType} = props

  const client = useClient({
    apiVersion: '2026-03-01',
  })

  const imagesField =
    (schemaType.options as Options | undefined)?.imagesField

  const images = useFormValue(
    imagesField ? [imagesField] : [],
  ) as any[] | undefined

  const firstAssetRef = images?.[0]?.asset?._ref

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (value || !firstAssetRef) return

    let cancelled = false

    setLoading(true)

    client
      .fetch<string | null>(
        `*[_id == $assetId][0].originalFilename`,
        {
          assetId: firstAssetRef,
        },
      )
      .then((filename) => {
        if (!cancelled && !value && filename) {
          onChange(set(filename))
        }
      })
      .catch((error) => {
        console.error(
          'Não foi possível obter o nome do arquivo da imagem:',
          error,
        )
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [client, firstAssetRef, value, onChange])

  return (
    <div>
      <input
        {...elementProps}
        value={value || ''}
        onChange={(event) =>
          onChange(set(event.currentTarget.value))
        }
      />

      {loading && (
        <div
          style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '6px',
          }}
        >
          Preenchendo automaticamente com o nome da primeira imagem…
        </div>
      )}
    </div>
  )
}