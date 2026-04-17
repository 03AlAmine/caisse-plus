import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = false;
  errorMessage = '';
  showPassword = false;

  get email() { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.errorMessage = '';
    try {
      await this.auth.login(this.email.value, this.password.value);
      // Attendre que Firebase confirme l'auth avant de naviguer
      this.auth.isAuthenticated$.pipe().subscribe(isAuth => {
        if (isAuth) this.router.navigate(['/dashboard']);
      });
    } catch (err: any) {
      this.errorMessage = this.getFirebaseError(err.code);
      this.loading = false;
    }
  }

  async onForgotPassword(): Promise<void> {
    if (!this.email.value) {
      this.errorMessage = 'Saisissez votre email pour réinitialiser le mot de passe.';
      return;
    }
    try {
      await this.auth.resetPassword(this.email.value);
      alert('Email de réinitialisation envoyé !');
    } catch {
      this.errorMessage = 'Impossible d\'envoyer l\'email de réinitialisation.';
    }
  }

  private getFirebaseError(code: string): string {
    const errors: Record<string, string> = {
      'auth/user-not-found': 'Aucun compte associé à cet email.',
      'auth/wrong-password': 'Mot de passe incorrect.',
      'auth/invalid-credential': 'Email ou mot de passe incorrect.',
      'auth/invalid-email': 'Adresse email invalide.',
      'auth/user-disabled': 'Ce compte a été désactivé.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    };
    return errors[code] ?? 'Une erreur est survenue. Veuillez réessayer.';
  }
}
