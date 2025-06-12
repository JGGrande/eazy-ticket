import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src'],
  outDir: 'build',
  format: ['cjs'],
  loader: {
    '.sql': 'text',
  },
})
