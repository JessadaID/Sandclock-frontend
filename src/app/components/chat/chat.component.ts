import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

interface Message {
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked {
    @ViewChild('scrollContainer', { static: false }) private scrollContainer: ElementRef;

    messages: Message[] = [];
    newMessage: string = '';
    isLoading: boolean = false;
    userName: string = '';

    constructor(private chatService: ChatService, private authService: AuthService) { }

    ngOnInit() {
        this.userName = this.authService.getUserName();
        // Add welcome message
        this.messages.push({
            text: `Hello ${this.userName}! How can I help you today?`,
            sender: 'bot',
            timestamp: new Date()
        });
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    scrollToBottom(): void {
        try {
            this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        } catch (err) { }
    }

    async sendMessage() {
        if (!this.newMessage.trim()) return;

        const userMsg = this.newMessage;
        this.messages.push({
            text: userMsg,
            sender: 'user',
            timestamp: new Date()
        });

        this.newMessage = '';
        this.isLoading = true;

        try {
            const reader = await this.chatService.sendMessageStream(userMsg);
            const decoder = new TextDecoder();

            this.messages.push({
                text: '',
                sender: 'bot',
                timestamp: new Date()
            });

            const botMessageIndex = this.messages.length - 1;
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');

                // Keep the last partial line in the buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                    const dataStr = trimmedLine.slice(6); // Remove 'data: ' prefix
                    if (dataStr === '[DONE]') continue;

                    let data: any;
                    try {
                        data = JSON.parse(dataStr);
                    } catch (e) {
                        // Fallback: Try to parse Ruby Hash string format using regex
                        // Pattern: Looks for text: "..." inside the string
                        if (dataStr.includes(':content_block_delta') && dataStr.includes(':text_delta')) {
                            const match = dataStr.match(/text:\s*"((?:[^"\\]|\\.)*)"/);
                            if (match) {
                                try {
                                    // Use JSON.parse to handle unescaping of the string content
                                    const textContent = JSON.parse(`"${match[1]}"`);
                                    data = {
                                        type: 'content_block_delta',
                                        delta: {
                                            type: 'text_delta',
                                            text: textContent
                                        }
                                    };
                                } catch (innerError) {
                                    console.warn('Failed to parse extracted text:', innerError);
                                }
                            }
                        }

                        if (!data) {
                            console.log('Failed line:', dataStr);
                            console.warn('Error parsing stream data:', e);
                            continue;
                        }
                    }

                    // Handle text delta
                    if (data.type === 'content_block_delta' && data.delta && data.delta.type === 'text_delta') {
                        this.messages[botMessageIndex].text += data.delta.text;
                        this.scrollToBottom();
                    }
                }
            }

            this.isLoading = false;

        } catch (error) {
            this.isLoading = false;
            this.messages.push({
                text: 'Sorry, I encountered an error communicating with the server.',
                sender: 'bot',
                timestamp: new Date()
            });
            console.error('Chat error:', error);
        }
    }

    logout() {
        this.authService.logout();
    }
}
