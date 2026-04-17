import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Firestore, doc, getDoc, updateDoc, Timestamp } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

interface Organisation {
  id?: string;
  nom: string;
  description?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  createdAt?: Date;
  ownerId?: string;
}

@Component({
  selector: 'app-organisation',
  templateUrl: './organisation.component.html',
  styleUrls: ['./organisation.component.scss'],
})
export class OrganisationComponent implements OnInit {
  private firestore = inject(Firestore);
  auth = inject(AuthService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);

  form!: FormGroup;
  organisation: Organisation | null = null;
  loading = false;
  saving = false;
  isEditing = false;

  ngOnInit(): void {
    this.initForm();
    this.loadOrganisation();
  }

  private initForm(): void {
    this.form = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      adresse: ['', Validators.maxLength(200)],
      telephone: ['', Validators.pattern(/^[+\d\s-]+$/)],
      email: ['', [Validators.email, Validators.maxLength(100)]],
    });
  }

  private async loadOrganisation(): Promise<void> {
    this.loading = true;
    try {
      const orgId = this.auth.organisationId;
      if (!orgId) {
        this.toastr.error('ID organisation non trouvé');
        return;
      }

      const snap = await getDoc(doc(this.firestore, `organisations/${orgId}`));
      if (snap.exists()) {
        this.organisation = { id: snap.id, ...snap.data() } as Organisation;
        this.form.patchValue({
          nom: this.organisation.nom,
          description: this.organisation.description || '',
          adresse: this.organisation.adresse || '',
          telephone: this.organisation.telephone || '',
          email: this.organisation.email || '',
        });
      }
    } catch (error) {
      this.toastr.error('Erreur lors du chargement des informations');
    } finally {
      this.loading = false;
    }
  }

  enableEditing(): void {
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
    // Restaurer les valeurs originales
    if (this.organisation) {
      this.form.patchValue({
        nom: this.organisation.nom,
        description: this.organisation.description || '',
        adresse: this.organisation.adresse || '',
        telephone: this.organisation.telephone || '',
        email: this.organisation.email || '',
      });
    }
  }

  async onSave(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      const orgId = this.auth.organisationId;
      if (!orgId) throw new Error('ID organisation non trouvé');

      await updateDoc(doc(this.firestore, `organisations/${orgId}`), {
        ...this.form.value,
        updatedAt: Timestamp.now(),
      });

      this.toastr.success('Informations mises à jour avec succès');
      this.isEditing = false;
      await this.loadOrganisation();
    } catch (error) {
      this.toastr.error('Erreur lors de la sauvegarde');
    } finally {
      this.saving = false;
    }
  }
}
