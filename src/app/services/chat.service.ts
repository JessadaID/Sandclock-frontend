import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type ServiceEndpoint = 'summary_azure_tasks' | 'summary_lastweek_tasks' | 'check_leave_plan';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private baseUrl = environment.apiConfig.uri + '/api/v1/ai';

    constructor(private http: HttpClient, private authService: AuthService) { }

    /**
     * Send message to specific endpoint with custom headers and body configuration
     * @param prompt - The user's message
     * @param endpoint - Which service endpoint to call: 'azure', 'pastel', or 'office'
     */
    async sendMessageStream(prompt: string, endpoint: ServiceEndpoint = 'summary_azure_tasks'): Promise<ReadableStreamDefaultReader<Uint8Array>> {
        const apiUrl = `${this.baseUrl}/${endpoint}`;

        // Get all available tokens
        const azureToken = await this.authService.getAzureToken().toPromise();
        const m365Token = await this.authService.getM365Token().toPromise();
        const machineName = this.authService.getMachineName();
        const pastelAuthToken = this.authService.getPastelAuthToken();
        const pastelEmail = this.authService.getPastelEmail();

        // Configure headers and body based on endpoint
        const { headers, body } = this.getEndpointConfig(endpoint, {
            prompt,
            azureToken,
            m365Token,
            machineName,
            pastelAuthToken,
            pastelEmail
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.body) {
            throw new Error('ReadableStream not supported in this browser.');
        }

        return response.body.getReader();
    }

    /**
     * Get endpoint-specific configuration for headers and body
     */
    private getEndpointConfig(endpoint: ServiceEndpoint, tokens: any): { headers: Record<string, string>, body: any } {
        const baseHeaders = {
            'Content-Type': 'application/json'
        };

        switch (endpoint) {
            case 'summary_azure_tasks':
                // Azure endpoint: requires Azure token, M365 token, and machine name
                return {
                    headers: {
                        ...baseHeaders,
                        'Azure-Token': tokens.azureToken
                    },
                    body: {
                        prompt: tokens.prompt
                    }
                };

            case 'summary_lastweek_tasks':
                // Pastel endpoint: requires Pastel auth token and email
                return {
                    headers: {
                        ...baseHeaders,
                        'Pastel-Token': tokens.pastelAuthToken,
                        'Pastel-Email': tokens.pastelEmail,
                        'Azure-Token': tokens.azureToken
                    },
                    body: {
                        prompt: tokens.prompt,
                        machine_name: tokens.machineName
                    }
                };

            case 'check_leave_plan':
                return {
                    headers: {
                        ...baseHeaders,
                        'M365-Token': tokens.m365Token,
                        'Azure-Token': tokens.azureToken
                    },
                    body: {
                        date: tokens.prompt
                    }
                };

            default:
                throw new Error(`Unknown endpoint: ${endpoint}`);
        }
    }
}
