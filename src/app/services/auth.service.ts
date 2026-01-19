import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private loggedIn = new BehaviorSubject<boolean>(false);
    public loggedIn$ = this.loggedIn.asObservable();

    constructor(private authService: MsalService) {
        this.checkAccount();
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
            },
            error: (error) => console.error('Login error:', error)
        });
    }

    logout() {
        this.authService.logoutPopup({
            mainWindowRedirectUri: "/"
        });
        this.loggedIn.next(false);
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

    getUserName(): string {
        const account = this.authService.instance.getActiveAccount();
        return account ? account.name || 'User' : 'User';
    }
}
