import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import {
  VocabulaireMetier,
  VOCABULAIRE_DEFAUT,
} from '../models/templates.data';

import { TemplateComportement } from '../models/templates.data';

@Injectable({ providedIn: 'root' })
export class VocabulaireService {
  private auth = inject(AuthService);

  private vocabulaireSubject = new BehaviorSubject<VocabulaireMetier>(
    VOCABULAIRE_DEFAUT,
  );
  vocabulaire$ = this.vocabulaireSubject.asObservable();

  private loaded = false;
  // Dans VocabulaireService
  private comportementSubject =
    new BehaviorSubject<TemplateComportement | null>(null);
  comportement$ = this.comportementSubject.asObservable();

  get comportement(): TemplateComportement {
    return (
      this.comportementSubject.value || {
        transfertActif: true,
        budgetParCategorie: true,
        soldeMinimumActif: true,
        multiCaisse: true,
        rapportsAvances: true,
        validationActive: true,
      }
    );
  }

  /**
   * Charge le vocabulaire depuis le template de l'organisation
   */
  async loadVocabulaire(): Promise<void> {
    if (this.loaded) return;

    try {
      const v = await this.auth.getVocabulaire();
      this.vocabulaireSubject.next(v);

      const comportement = await this.auth.getComportement();
      this.comportementSubject.next(comportement);

      this.loaded = true;
    } catch (error) {
      console.error('Erreur chargement vocabulaire:', error);
    }
  }
  /**
   * Récupère le vocabulaire actuel (synchrone)
   */
  get vocabulaire(): VocabulaireMetier {
    return this.vocabulaireSubject.value;
  }

  /**
   * Traduit un type d'opération avec le vocabulaire métier
   */
  traduireType(type: string): string {
    return type === 'entree'
      ? this.vocabulaire.entree
      : this.vocabulaire.sortie;
  }
}
