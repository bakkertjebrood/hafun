export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Nautar',
      meta: [
        { name: 'description', content: 'Marina management, op stroom' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
        }
      ],
      htmlAttrs: {
        lang: 'nl'
      }
    }
  },

  routeRules: {
    '/api/**': { cors: true }
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'nautar-dev-secret-change-in-production',
    databaseUrl: process.env.DATABASE_URL || ''
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
