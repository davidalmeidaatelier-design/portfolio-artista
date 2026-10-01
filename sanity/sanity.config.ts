import {defineConfig} from 'sanity'
import {buildTheme} from '@sanity/themer'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {TabelaObrasTool} from './components/TabelaObras'

const theme = buildTheme({
  accent: '#333333',
  text: '#333333',
  background: {
    light: '#ffffff',
    dark: '#ffffff',
  },
  contrast: 100,
})

export default defineConfig({
  name: 'default',
  title: 'Site Portifólio David Almeida Studio',

  projectId: 'uo844pwh',
  dataset: 'production',

  theme,

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },

  tools: (prev) => [
    ...prev,
    {
      name: 'tabela-obras',
      title: 'Tabela de obras',
      component: TabelaObrasTool,
    },
  ],
})