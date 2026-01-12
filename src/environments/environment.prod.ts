export const environment = {
  production: true,
  msalConfig: {
    auth: {
      clientId: 'YOUR_CLIENT_ID_HERE',
      authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID_HERE',
      redirectUri: 'YOUR_PRODUCTION_URL_HERE',
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false,
    }
  },
  apiConfig: {
    scopes: ['vso.work'],
    uri: 'YOUR_API_BASE_URL_HERE'
  }
};
