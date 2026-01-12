// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

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
    scopes: ['499b84ac-1321-427f-aa17-267ca6975798/vso.work'], // Azure DevOps scope (GUID is the resource ID for Azure DevOps)
    uri: 'https://felicia-unconvinced-ginger.ngrok-free.dev' // Replace with your API base URL
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
