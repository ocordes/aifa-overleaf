const i18n = require('i18next')
const fsBackend = require('i18next-fs-backend')
const middleware = require('i18next-http-middleware')
const path = require('path')
const Settings = require('settings-sharelatex')
const { URL } = require('url')

const logger = require('logger-sharelatex')

const fallbackLanguageCode = Settings.i18n.defaultLng || 'en'

const availableLanguageCodes = []
const availableHosts = new Map()
const subdomainConfigs = new Map()
Object.values(Settings.i18n.subdomainLang || {}).forEach(function(spec) {
  availableLanguageCodes.push(spec.lngCode)
  // prebuild a host->lngCode mapping for the usage at runtime in the
  //  middleware
  availableHosts.set(new URL(spec.url).host, spec.lngCode)

  // prebuild a lngCode -> language config mapping; some subdomains should
  //  not appear in the language picker
  if (!spec.hide) {
    subdomainConfigs.set(spec.lngCode, spec)
  }
})
if (!availableLanguageCodes.includes(fallbackLanguageCode)) {
  // always load the fallback locale
  availableLanguageCodes.push(fallbackLanguageCode)
}

i18n
  .use(fsBackend)
  .use(middleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(__dirname, '../../../locales/__lng__.json')
    },

    // Load translation files synchronously: https://www.i18next.com/overview/configuration-options#initimmediate
    initImmediate: false,

    // We use the legacy v1 JSON format, so configure interpolator to use
    // underscores instead of curly braces
    interpolation: {
      prefix: '__',
      suffix: '__',
      unescapeSuffix: 'HTML',
      // Disable escaping of interpolated values for backwards compatibility.
      // We escape the value after it's translated in web, so there's no
      // security risk
      escapeValue: Settings.i18n.escapeHTMLInVars,
      // Disable nesting in interpolated values, preventing user input
      // injection via another nested value
      skipOnVariables: true
    },

    preload: availableLanguageCodes,
    supportedLngs: availableLanguageCodes,
    fallbackLng: fallbackLanguageCode
  })

// Make custom language detector for Accept-Language header
const headerLangDetector = new middleware.LanguageDetector(i18n.services, {
  order: ['header']
})

function setLangBasedOnDomainMiddleware(req, res, next) {
  // Determine language from subdomain
  let lang = availableHosts.get(req.headers.host)
  if (lang === undefined) {
    // if host has not a valid language entry, try the x-forwarded-host, e.g. from traefik
    // do it only if available
    if ('x-forwarded-host' in req.headers) {
      lang = availableHosts.get(req.headers['x-forwarded-host'])
    }
  }
  if (lang) {
    req.i18n.changeLanguage(lang)
  }

  // expose the language code to pug
  res.locals.currentLngCode = req.language

  // If the set language is different from the language detection (based on
  // the Accept-Language header), then set flag which will show a banner
  // offering to switch to the appropriate library
  const detectedLanguageCode = headerLangDetector.detect(req, res)
  if (req.language !== detectedLanguageCode) {
    res.locals.suggestedLanguageSubdomainConfig = subdomainConfigs.get(
      detectedLanguageCode
    )
  }

  // Decorate req.i18n with translate function alias for backwards
  // compatibility usage in requests
  req.i18n.translate = req.i18n.t
  next()
}

// Decorate i18n with translate function alias for backwards compatibility
// in direct usage
i18n.translate = i18n.t

module.exports = {
  i18nMiddleware: middleware.handle(i18n),
  setLangBasedOnDomainMiddleware,
  i18n
}
