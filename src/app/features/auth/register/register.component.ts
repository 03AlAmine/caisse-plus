import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
    organisationNom: ['', [Validators.required, Validators.minLength(3)]],
  }, { validators: this.passwordMatchValidator });

  loading = false;
  errorMessage = '';
  showPassword = false;
  step = 1;

  get displayName() { return this.form.get('displayName')!; }
  get email() { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }
  get organisationNom() { return this.form.get('organisationNom')!; }

  private passwordMatchValidator(control: AbstractControl) {
    const pwd = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return pwd === confirm ? null : { passwordMismatch: true };
  }

  nextStep(): void {
    this.displayName.markAsTouched();
    this.email.markAsTouched();
    this.password.markAsTouched();
    this.confirmPassword.markAsTouched();
    if (this.displayName.valid && this.email.valid && this.password.valid && !this.form.hasError('passwordMismatch')) {
      this.step = 2;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    try {
      await this.auth.register(
        this.email.value, this.password.value,
        this.displayName.value, this.organisationNom.value,
      );
      this.auth.isAuthenticated$.subscribe(isAuth => {
        if (isAuth) this.router.navigate(['/dashboard']);
      });
    } catch (err: any) {
      this.errorMessage = this.getFirebaseError(err.code);
      this.step = 1;
      this.loading = false;
    }
  }

  private getFirebaseError(code: string): string {
    const errors: Record<string, string> = {
      'auth/email-already-in-use': 'Un compte existe déjà avec cet email.',
      'auth/invalid-email': 'Adresse email invalide.',
      'auth/weak-password': 'Le mot de passe est trop faible.',
    };
    return errors[code] ?? 'Une erreur est survenue.';
  }
}
