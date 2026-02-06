import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private loggedIn = new BehaviorSubject<boolean>(false);
    public loggedIn$ = this.loggedIn.asObservable();
    private pastelAuthToken: string = '';
    private pastelEmail: string = '';

    constructor(
        private authService: MsalService,
        private http: HttpClient
    ) {
        this.checkAccount();
        this.loadPastelTokensFromStorage();
    }

    private loadPastelTokensFromStorage() {
        const storedToken = localStorage.getItem('pastel_auth_token');
        const storedEmail = localStorage.getItem('pastel_email');
        if (storedToken) {
            this.pastelAuthToken = storedToken;
        }
        if (storedEmail) {
            this.pastelEmail = storedEmail;
        }
    }

    checkAccount() {
        const activeAccount = this.authService.instance.getActiveAccount();
        this.loggedIn.next(!!activeAccount);
    }

    login() {
        this.authService.loginPopup({
            scopes: environment.apiConfig.m365_scopes
        }).subscribe({
            next: (result: AuthenticationResult) => {
                this.authService.instance.setActiveAccount(result.account);
                this.checkAccount();
                // Login to Banana API after M365 login
                this.loginToBananaApi(result.accessToken);
            },
            error: (error) => console.error('Login error:', error)
        });
    }

    private loginToBananaApi(m365Token: string) {
        const bananaLoginUrl = `${environment.apiConfig.bananaApiUrl}/api/users/sign_in_365`;
        const payload = {
            user_login: {
                token: m365Token,
                machine_name: this.getMachineName(),
                confrim: true
            }
        };

        this.http.post<{ auth_token: string, email: string }>(bananaLoginUrl, payload)
            .subscribe({
                next: (response) => {
                    this.pastelAuthToken = response.auth_token;
                    this.pastelEmail = response.email;
                    // Store in localStorage
                    localStorage.setItem('pastel_auth_token', response.auth_token);
                    localStorage.setItem('pastel_email', response.email);
                    console.log('Banana API login successful:', response.email);
                },
                error: (error) => console.error('Banana API login error:', error)
            });
    }

    logout() {
        this.authService.logoutPopup({
            mainWindowRedirectUri: "/"
        });
        this.loggedIn.next(false);
        this.pastelAuthToken = '';
        this.pastelEmail = '';
        // Clear from localStorage
        localStorage.removeItem('pastel_auth_token');
        localStorage.removeItem('pastel_email');
    }

    getM365Token(): Observable<string> {
        return new Observable<string>(observer => {
            const account = this.authService.instance.getActiveAccount();
            if (account) {
                this.authService.acquireTokenSilent({
                    account: account,
                    scopes: environment.apiConfig.m365_scopes
                }).subscribe({
                    next: result => {
                        observer.next(result.accessToken);
                        observer.complete();
                    },
                    error: error => observer.error(error)
                });
            } else {
                observer.error('No active account');
            }
        });
    }

    getAzureToken(): Observable<string> {
        // You might need to implement silent token acquisition here if needed for interceptors
        // But MsalInterceptor handles this mostly automatically.
        // This is a placeholder if manual token retrieval is needed.
        return new Observable<string>(observer => {
            const account = this.authService.instance.getActiveAccount();
            if (account) {
                this.authService.acquireTokenSilent({
                    account: account,
                    scopes: environment.apiConfig.azure_scopes
                }).subscribe({
                    next: result => {
                        observer.next(result.accessToken);
                        observer.complete();
                    },
                    error: error => observer.error(error)
                });
            } else {
                observer.error('No active account');
            }
        });
    }

    getPastelAuthToken(): string {
        return this.pastelAuthToken;
    }

    getPastelEmail(): string {
        return this.pastelEmail;
    }

    getMachineName(): string {
        return window.location.hostname;
    }

    getUserName(): string {
        const account = this.authService.instance.getActiveAccount();
        return account ? account.name || 'User' : 'User';
    }
}
