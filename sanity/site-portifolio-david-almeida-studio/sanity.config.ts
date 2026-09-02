import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {TabelaObrasTool} from './components/TabelaObras'

export default defineConfig({
 name: 'default',
 title: 'Site Portifólio David Almeida Studio',

 projectId: 'uo844pwh',
 dataset: 'production',

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
