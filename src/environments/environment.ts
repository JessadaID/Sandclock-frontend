
export const environment = {
  production: false,
  msalConfig: {
    auth: {
      clientId: '7cc36a4e-dabd-4ae8-b318-fce392b1893f', // Replace with your Azure AD App Client ID
      authority: 'https://login.microsoftonline.com/c70ad7a7-3297-49cc-aa05-725ddcb5f870', // Replace with your Tenant ID or use 'common'
      redirectUri: 'http://localhost:4200',
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false,
    }
  },
  apiConfig: {
    azure_scopes: ['https://app.vssps.visualstudio.com/vso.work'],
    m365_scopes: ['User.Read'], // Azure DevOps scope (GUID is the resource ID for Azure DevOps)
    uri: 'https://felicia-unconvinced-ginger.ngrok-free.dev', // Replace with your API base URL
    bananaApiUrl: 'https://banana-staging.bananabreaking.com'
  }
};
