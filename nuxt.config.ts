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
        { name: 'description', content: 'Marina management, op stroom' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'theme-color', content: '#00A9A5' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'mask-icon', href: '/favicon.svg', color: '#00A9A5' },
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
    databaseUrl: process.env.DATABASE_URL || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    postmarkApiKey: process.env.POSTMARK_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || 'no-reply@nautar.nl',
    appUrl: process.env.APP_URL || '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
    public: {
      googleEnabled: !!process.env.GOOGLE_CLIENT_ID,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || ''
    }
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
