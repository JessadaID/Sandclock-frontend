import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService, ServiceEndpoint } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChangeDetectorRef } from '@angular/core';

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
    currentView: 'welcome' | 'results' | 'datepicker' = 'welcome';
    currentActionTitle: string = '';
    currentEndpoint: ServiceEndpoint = 'summary_azure_tasks'; // Track which endpoint to use
    azureToken: string = '';
    m365Token: string = '';
    showTokenPanel: boolean = false;

    // Date picker properties
    selectedDate: Date | null = null;
    currentMonth: number = new Date().getMonth();
    currentYear: number = new Date().getFullYear();
    calendarDays: (number | null)[] = [];
    monthNames: string[] = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    dayNames: string[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    constructor(
        private chatService: ChatService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef) { }

    predefinedPrompts = {
        // todayWork: "Fetch all my active work items (including Tasks, and Bugs) and Pull Requests that were created or updated today across all projects in Azure DevOps. Focus only on items assigned to me or where I am the author.",
        todayWork: "ดึงข้อมูลงานที่มีสถานะเป็น Active หรือ Pull Request ทั้งหมดที่สร้างหรืออัปเดตในวันนี้ใน Azure DevOps",
        weekWork: "Summarize all my activities in 'Banana Pastel' from the past week. List everything I have worked on, including status changes and any completed items.",
        leavePlan: "ฉันสามารถลางานวันที่ 22 มกราคม 2026 ได้ใหม จาก banana office",
        timeNow: "ตอนนี้เวลากี่โมงแล้ว"
    };

    pastelAuthToken: string = '';
    pastelEmail: string = '';
    machineName: string = '';


    usePrompt(promptType: string) {
        this.newMessage = (this.predefinedPrompts as any)[promptType] || '';
        this.sendMessage();
    }

    handleAction(action: string, title: string) {
        this.currentActionTitle = title;

        // Set the appropriate endpoint based on action
        switch (action) {
            case 'todayWork':
                this.currentEndpoint = 'summary_azure_tasks';
                break;
            case 'weekWork':
                this.currentEndpoint = 'summary_lastweek_tasks';
                break;
            case 'leavePlan':
                this.currentEndpoint = 'check_leave_plan';
                break;
            default:
                this.currentEndpoint = 'summary_azure_tasks';
        }

        // If action is leavePlan, show date picker first
        if (action === 'leavePlan') {
            this.currentView = 'datepicker';
            this.generateCalendar();
        } else {
            this.currentView = 'results';
            this.messages = [];
            this.usePrompt(action);
        }
    }

    goBack() {
        this.currentView = 'welcome';
        this.currentActionTitle = '';
        this.messages = [];
        this.selectedDate = null;
    }

    goBackFromDatePicker() {
        this.currentView = 'welcome';
        this.currentActionTitle = '';
        this.selectedDate = null;
    }

    generateCalendar() {
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
        let firstDayOfWeek = firstDay.getDay();
        // Convert to Monday = 0, Sunday = 6
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        this.calendarDays = [];

        // Add empty slots for days before the first day of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            this.calendarDays.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            this.calendarDays.push(day);
        }
    }

    previousMonth() {
        if (this.currentMonth === 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else {
            this.currentMonth--;
        }
        this.generateCalendar();
    }

    nextMonth() {
        if (this.currentMonth === 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else {
            this.currentMonth++;
        }
        this.generateCalendar();
    }

    selectDate(day: number | null) {
        if (day === null) return;

        this.selectedDate = new Date(this.currentYear, this.currentMonth, day);
    }

    isSelectedDate(day: number | null): boolean {
        if (!day || !this.selectedDate) return false;

        return this.selectedDate.getDate() === day &&
            this.selectedDate.getMonth() === this.currentMonth &&
            this.selectedDate.getFullYear() === this.currentYear;
    }

    confirmDate() {
        if (!this.selectedDate) {
            alert('กรุณาเลือกวันที่ต้องการลา');
            return;
        }

        // Format date in YYYY-MM-DD for backend compatibility
        const year = this.selectedDate.getFullYear();
        const month = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
        const day = this.selectedDate.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Update the prompt with selected date
        this.predefinedPrompts.leavePlan = dateStr;

        // Switch to results view and send the message
        this.currentView = 'results';
        this.messages = [];
        this.usePrompt('leavePlan');
    }

    ngOnInit() {
        this.userName = this.authService.getUserName();
        this.loadTokens();
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
        if (!this.newMessage.trim()) {
            return;
        }

        const userMsg = this.newMessage;
        this.messages.push({
            text: userMsg,
            sender: 'user',
            timestamp: new Date()
        });

        this.newMessage = '';
        this.isLoading = true;

        // เพิ่ม bot message เปล่า
        this.messages.push({
            text: '',
            sender: 'bot',
            timestamp: new Date()
        });

        const botMessageIndex = this.messages.length - 1;

        try {
            const reader = await this.chatService.sendMessageStream(userMsg, this.currentEndpoint);
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) continue;

                    const dataStr = line.substring(6).trim();

                    if (dataStr === '[DONE]') {
                        console.log('Received [DONE] signal');
                        continue;
                    }

                    try {
                        const data = JSON.parse(dataStr);

                        // Handle different event types
                        if (data.type === 'content_block_delta') {
                            if (data.delta && data.delta.text) {
                                this.messages[botMessageIndex].text += data.delta.text;
                                this.cdr.detectChanges();
                            }
                        } else if (data.type === 'error') {
                            console.error('Stream error:', data.error);
                            this.messages[botMessageIndex].text += '\n\n❌ Error: ' + data.error;
                            this.cdr.detectChanges();
                        }

                    } catch (parseError) {
                        console.error('Failed to parse JSON:', dataStr, parseError);
                    }
                }
            }

            this.isLoading = false;

        } catch (error) {
            console.error('❌ Error in sendMessage:', error);
            this.isLoading = false;

            if (this.messages[botMessageIndex].text === '') {
                this.messages[botMessageIndex].text = 'Sorry, I encountered an error communicating with the server.';
            }
        }
    }

    logout() {
        this.authService.logout();
    }

    // Convert simple Markdown to HTML
    parseMarkdown(text: string): string {
        if (!text) return '';

        let html = text;

        // Convert **bold** to <strong>bold</strong>
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        return html;
    }

    async loadTokens() {
        try {
            this.azureToken = await this.authService.getAzureToken().toPromise();
            this.m365Token = await this.authService.getM365Token().toPromise();
            this.pastelAuthToken = this.authService.getPastelAuthToken();
            this.pastelEmail = this.authService.getPastelEmail();
            this.machineName = this.authService.getMachineName();
        } catch (error) {
            console.error('Error loading tokens:', error);
        }
    }

    toggleTokenPanel() {
        this.showTokenPanel = !this.showTokenPanel;
        if (this.showTokenPanel) {
            this.loadTokens();
        }
    }

    copyToken(token: string, tokenType: string) {
        navigator.clipboard.writeText(token).then(() => {
            alert(`${tokenType} token copied!`);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }
}
