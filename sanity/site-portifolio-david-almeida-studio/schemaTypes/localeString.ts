import { defineType, defineField } from 'sanity';

// Campo reutilizável: texto curto em PT + EN lado a lado no editor
export const localeString = defineType({
  name: 'localeString',
  title: 'Texto (PT/EN)',
  type: 'object',
  fields: [
    defineField({ name: 'pt', title: 'Português', type: 'string' }),
    defineField({ name: 'en', title: 'English', type: 'string' }),
  ],
});

// Mesma ideia, para textos longos (rich text)
export const localeText = defineType({
  name: 'localeText',
  title: 'Texto longo (PT/EN)',
  type: 'object',
  fields: [
    defineField({ name: 'pt', title: 'Português', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'en', title: 'English', type: 'array', of: [{ type: 'block' }] }),
  ],
});
