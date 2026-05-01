import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CaisseService } from '../../../services/caisse.service';
import { OperationService } from '../../../services/operation.service';
import { firstValueFrom } from 'rxjs';

interface Step {
  id: string;
  label: string;
  description: string;
  icon: string;
  done: boolean;
  loading: boolean;
  action: string;
  route: string;
}

@Component({
  selector: 'app-getting-started-checklist',
  template: `
    <div class="checklist-card card animate-fade-in" *ngIf="showChecklist">
      <div class="checklist-card__header">
        <div class="checklist-card__title">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 2l2.5 5 5.5.5-4 3.5 1 5.5L9 13.5 4.5 16.5l1-5.5-4-3.5 5.5-.5L9 2z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>
          <span>Pour bien démarrer</span>
        </div>
        <span class="checklist-card__progress"
          >{{ completedSteps }}/{{ steps.length }}</span
        >
      </div>

      <div class="checklist-card__steps">
        <div
          class="checklist-step"
          *ngFor="let step of steps; let i = index"
          [class.checklist-step--done]="step.done"
          [class.checklist-step--loading]="step.loading"
          [class.checklist-step--current]="
            !step.done && !step.loading && (i === 0 || steps[i - 1].done)
          "
        >
          <div class="checklist-step__icon">
            <!-- Done -->
            <svg
              *ngIf="step.done"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle cx="8" cy="8" r="6" fill="#10B981" />
              <path
                d="M4 8l3 3 5-5"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <!-- Loading spinner -->
            <span *ngIf="step.loading" class="checklist-step__spinner"></span>
            <!-- Number -->
            <span *ngIf="!step.done && !step.loading" class="checklist-step__number">{{
              i + 1
            }}</span>
          </div>
          <div class="checklist-step__content">
            <span class="checklist-step__label">{{ step.label }}</span>
            <span class="checklist-step__desc">{{ step.description }}</span>
          </div>
          <a
            *ngIf="!step.done && !step.loading && (i === 0 || steps[i - 1].done)"
            class="checklist-step__action"
            [routerLink]="step.route"
            (click)="dismiss()"
          >
            {{ step.action }}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 6h6M6 3l3 3-3 3"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>

      <div class="checklist-card__footer">
        <button class="checklist-card__dismiss" (click)="dismiss()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 2l8 8M10 2L2 10"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          Masquer
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .checklist-card {
        margin-bottom: var(--space-4);
        overflow: hidden;
      }

      .checklist-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-3) var(--space-4);
        background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        border-bottom: 1px solid #fde68a;
      }

      .checklist-card__title {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-sm);
        font-weight: 700;
        color: #92400e;
      }

      .checklist-card__progress {
        font-size: var(--text-xs);
        font-weight: 700;
        color: #92400e;
        background: rgba(146, 64, 14, 0.1);
        padding: 2px 8px;
        border-radius: var(--radius-full);
      }

      .checklist-card__steps {
        padding: var(--space-2) 0;
      }

      .checklist-step {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-2) var(--space-4);
        transition: background var(--duration-fast);
      }

      .checklist-step:hover {
        background: var(--gray-50);
      }

      .checklist-step--done .checklist-step__label,
      .checklist-step--done .checklist-step__desc {
        opacity: 0.5;
        text-decoration: line-through;
      }

      .checklist-step--loading .checklist-step__label,
      .checklist-step--loading .checklist-step__desc {
        opacity: 0.4;
      }

      .checklist-step__icon {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .checklist-step__number {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--gray-100);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        color: var(--gray-500);
      }

      .checklist-step--current .checklist-step__number {
        background: var(--navy-100);
        color: var(--navy-700);
      }

      /* Spinner pour l'état loading */
      .checklist-step__spinner {
        display: block;
        width: 16px;
        height: 16px;
        border: 2px solid var(--gray-200);
        border-top-color: var(--gray-400);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .checklist-step__content {
        flex: 1;
        min-width: 0;
      }

      .checklist-step__label {
        display: block;
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--gray-800);
        margin-bottom: 1px;
      }

      .checklist-step__desc {
        font-size: var(--text-xs);
        color: var(--gray-400);
      }

      .checklist-step__action {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--navy-600);
        text-decoration: none;
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        flex-shrink: 0;
        margin-top: 2px;
        transition: all var(--duration-fast);
      }

      .checklist-step__action:hover {
        background: var(--navy-50);
        color: var(--navy-800);
      }

      .checklist-card__footer {
        display: flex;
        justify-content: flex-end;
        padding: var(--space-2) var(--space-4);
        border-top: 1px solid var(--gray-50);
      }

      .checklist-card__dismiss {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        font-size: 11px;
        color: var(--gray-400);
        background: none;
        border: none;
        cursor: pointer;
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
      }

      .checklist-card__dismiss:hover {
        background: var(--gray-50);
        color: var(--gray-600);
      }
    `,
  ],
})
export class GettingStartedChecklistComponent implements OnInit {
  private auth = inject(AuthService);
  private caisseService = inject(CaisseService);
  private opService = inject(OperationService);

  showChecklist = false; // masqué jusqu'à confirmation (pas de flash)
  steps: Step[] = [];

  ngOnInit(): void {
    this.initChecklist();
  }

  get completedSteps(): number {
    return this.steps.filter((s) => s.done).length;
  }

  private initChecklist(): void {
    // 1. Vérifier si déjà masqué — sortie immédiate, aucun appel réseau
    const dismissed = localStorage.getItem('checklist_dismissed');
    if (dismissed) {
      return;
    }

    // 2. Afficher immédiatement le composant avec les étapes en état "loading"
    this.steps = this.buildSteps({
      hasCompleteProfile: false,
      hasCaisses: false,
      hasOperations: false,
    });
    this.steps.forEach((s) => (s.loading = true));
    this.showChecklist = true;

    // 3. Charger toutes les données en parallèle
    this.loadProgress();
  }

  private async loadProgress(): Promise<void> {
    try {
      // Appels parallèles — au lieu de séquentiels
      const [org, caisseCount, operationCount] = await Promise.all([
        this.auth.getCurrentOrganisation(),
        firstValueFrom(this.caisseService.getAll()).then((c) => c.length),
        firstValueFrom(this.opService.getAll()).then((o) => o.length),
      ]);

      const hasCompleteProfile = !!(
        org?.description ||
        org?.adresse ||
        org?.telephone ||
        org?.email
      );
      const hasCaisses = caisseCount > 0;
      const hasOperations = operationCount > 0;

      // Mettre à jour les étapes avec les vraies données
      this.steps = this.buildSteps({ hasCompleteProfile, hasCaisses, hasOperations });

      // Masquer automatiquement si tout est complété
      if (this.completedSteps === this.steps.length) {
        this.showChecklist = false;
      }
    } catch (err) {
      // En cas d'erreur, on retire l'état loading pour ne pas bloquer l'UI
      this.steps.forEach((s) => (s.loading = false));
      console.error('Erreur chargement checklist:', err);
    }
  }

  private buildSteps(state: {
    hasCompleteProfile: boolean;
    hasCaisses: boolean;
    hasOperations: boolean;
  }): Step[] {
    return [
      {
        id: 'profile',
        label: 'Complétez votre profil',
        description:
          'Ajoutez la description et les contacts de votre organisation',
        icon: 'user',
        done: state.hasCompleteProfile,
        loading: false,
        action: 'Compléter',
        route: '/parametres/organisation?completer=true',
      },
      {
        id: 'caisse',
        label: 'Créez votre première caisse',
        description:
          'Une caisse est nécessaire pour enregistrer des opérations',
        icon: 'wallet',
        done: state.hasCaisses,
        loading: false,
        action: 'Créer',
        route: '/caisses/nouveau',
      },
      {
        id: 'operation',
        label: 'Enregistrez votre première opération',
        description:
          'Ajoutez une entrée ou une sortie pour commencer le suivi',
        icon: 'plus',
        done: state.hasOperations,
        loading: false,
        action: 'Ajouter',
        route: '/operations/nouveau',
      },
    ];
  }

  dismiss(): void {
    this.showChecklist = false;
    localStorage.setItem('checklist_dismissed', 'true');
  }
}
