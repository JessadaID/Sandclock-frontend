import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private apiUrl = environment.apiConfig.uri + '/api/v1/chat';

    constructor(private http: HttpClient, private authService: AuthService) { }

    async sendMessageStream(prompt: string): Promise<ReadableStreamDefaultReader<Uint8Array>> {
        const token = await this.authService.getToken().toPromise();
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'PAT': token
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.body) {
            throw new Error('ReadableStream not supported in this browser.');
        }

        return response.body.getReader();
    }
}
