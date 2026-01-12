import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

    constructor(private auth: AuthService, private router: Router) { }

    ngOnInit() {
        this.auth.loggedIn$.subscribe(isLoggedIn => {
            if (isLoggedIn) {
                this.router.navigate(['/chat']);
            }
        });
    }

    login() {
        this.auth.login();
    }
}
