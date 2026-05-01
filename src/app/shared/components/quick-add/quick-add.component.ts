import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CaisseService } from '../../../services/caisse.service';
import { CategorieService } from '../../../services/categorie.service';
import { OperationService } from '../../../services/operation.service';
import { AuthService } from '../../../services/auth.service';
import { VocabulaireService } from '../../../services/vocabulaire.service';
import { ToastrService } from 'ngx-toastr';
import { Caisse } from '../../../models/caisse.model';
import { Categorie } from '../../../models/categorie.model';
import { VocabulaireMetier } from '../../../models/templates.data';
import { animate, style, transition, trigger } from '@angular/animations';
import { take } from 'rxjs/operators';
import { ConnectivityService } from '../../../services/connectivity.service';

@Component({
  selector: 'app-quick-add',
  templateUrl: './quick-add.component.html',
  styleUrls: ['./quick-add.component.scss'],
  animations: [
    trigger('fabIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('overlayIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
    trigger('panelIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate(
          '250ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),
  ],
})
export class QuickAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private caisseService = inject(CaisseService);
  private categorieService = inject(CategorieService);
  private opService = inject(OperationService);
  private auth = inject(AuthService);
  private vocabulaireService = inject(VocabulaireService);
  comportement$ = this.vocabulaireService.comportement$;
  private connectivity = inject(ConnectivityService);

  private toastr = inject(ToastrService);
  private router = inject(Router);

  @ViewChild('montantInput') montantInputRef!: ElementRef;

  isOpen = false;
  loading = false;
  caisses: Caisse[] = [];
  categories: Categorie[] = [];
  showAllCategories = false;
  hasCaisses = true;
  form!: FormGroup;

  get v(): VocabulaireMetier {
    return this.vocabulaireService.vocabulaire;
  }

  get panelTitle(): string {
    const type = this.form?.get('type')?.value;
    if (type === 'entree') return this.v.entreeAction;
    return this.v.sortieAction;
  }

  get libellePlaceholder(): string {
    const type = this.form?.get('type')?.value;
    if (type === 'entree') return `Ex: ${this.v.entree} de tissus...`;
    return `Ex: Achat carburant...`;
  }

  get submitLabel(): string {
    const type = this.form?.get('type')?.value;
    if (type === 'entree') return `Enregistrer ${this.v.entree.toLowerCase()}`;
    return `Enregistrer ${this.v.sortie.toLowerCase()}`;
  }

  get selectedCaisse(): Caisse | undefined {
    const id = this.form?.get('caisseId')?.value;
    return this.caisses.find((c) => c.id === id);
  }

  get showSoldeError(): boolean {
    const type = this.form?.get('type')?.value;
    const montant = this.form?.get('montant')?.value || 0;
    if (
      type === 'sortie' &&
      this.selectedCaisse &&
      montant > this.selectedCaisse.solde
    )
      return true;
    return false;
  }

  get visibleCategories(): Categorie[] {
    if (this.showAllCategories) return this.categories;
    return this.categories.slice(0, 6);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.setupTypeListener();
  }

  private initForm(): void {
    this.form = this.fb.group({
      type: ['sortie', Validators.required],
      montant: ['', [Validators.required, Validators.min(1)]],
      libelle: ['', [Validators.required, Validators.minLength(3)]],
      categorieId: ['', Validators.required],
      caisseId: ['', Validators.required],
    });
  }

  private setupTypeListener(): void {
    this.form
      .get('type')
      ?.valueChanges.subscribe((type: string) => this.loadCategories(type));
  }

  private loadData(): void {
    this.caisseService
      .getAll()
      .pipe(take(1))
      .subscribe((c) => {
        const actives = c.filter((caisse) => caisse.actif === true);
        this.hasCaisses = actives.length > 0;
        this.caisses = actives;

        if (this.hasCaisses) {
          const lastCaisseId = localStorage.getItem(
            'caisseplus_last_caisse_id',
          );
          if (lastCaisseId && this.caisses.find((c) => c.id === lastCaisseId)) {
            this.form.get('caisseId')?.setValue(lastCaisseId);
          } else if (this.caisses.length > 0) {
            this.form.get('caisseId')?.setValue(this.caisses[0].id);
          }
        }
      });
    this.loadCategories('sortie');
  }

  private loadCategories(type: string): void {
    this.categorieService
      .getByType(type as 'entree' | 'sortie')
      .pipe(take(1))
      .subscribe((cats) => {
        this.categories = cats;
        if (cats.length > 0 && !this.form.get('categorieId')?.value)
          this.form.get('categorieId')?.setValue(cats[0].id);
      });
  }

  selectCaisse(c: Caisse): void {
    this.form.get('caisseId')?.setValue(c.id);
  }

  selectCategorie(cat: Categorie): void {
    this.form.get('categorieId')?.setValue(cat.id);

    const libelleControl = this.form.get('libelle');
    if (!libelleControl?.value || libelleControl?.value === '') {
      libelleControl?.setValue(cat.nom);
    }
  }

  setType(type: string): void {
    this.form.get('type')?.setValue(type);
  }

  open(): void {
    this.isOpen = true;
    const lastId = localStorage.getItem('caisseplus_last_caisse_id');
    const defaultId =
      lastId && this.caisses.find((c) => c.id === lastId)
        ? lastId
        : this.caisses[0]?.id || '';
    this.form.reset({ type: 'sortie', caisseId: defaultId });
    setTimeout(() => this.montantInputRef?.nativeElement?.focus(), 300);
  }

  close(): void {
    this.isOpen = false;
    this.showAllCategories = false;
  }

  @HostListener('document:keydown.escape') onEscape(): void {
    this.close();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.showSoldeError) {
      this.form.markAllAsTouched();
      return;
    }

    // ✅ Vérifier la connexion
    if (!this.connectivity.isOnline) {
      this.toastr.warning(
        "Vous êtes hors ligne. L'opération sera enregistrée localement et synchronisée une fois connecté.",
        'Mode hors ligne',
        { timeOut: 5000 },
      );
    }

    this.loading = true;

    this.loading = true;
    const val = this.form.value;
    const caisse = this.selectedCaisse;
    const categorie = this.categories.find((c) => c.id === val.categorieId);
    try {
      await this.opService.create({
        libelle: val.libelle,
        montant: Math.round(Number(val.montant)),
        type: val.type,
        caisseId: val.caisseId,
        caisseNom: caisse?.nom || '',
        categorieId: val.categorieId,
        categorieNom: categorie?.nom || '',
        date: new Date(),
        statut: 'validee',
        responsableId: this.auth.currentUser?.uid || '',
      });
      const label = val.type === 'entree' ? this.v.entree : this.v.sortie;
      localStorage.setItem('caisseplus_last_caisse_id', val.caisseId);

      this.toastr.success(`${label} enregistrée avec succès !`, 'Succès');
      this.close();
      this.form.reset({ type: val.type, caisseId: val.caisseId });
    } catch (err: any) {
      this.toastr.error(err.message || 'Erreur');
    } finally {
      this.loading = false;
    }
  }
}
