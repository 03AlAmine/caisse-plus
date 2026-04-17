export type BudgetPeriode = 'mensuel' | 'annuel';

// Interface pure — pas de getters, compatible Firestore
export interface Budget {
  id?: string;
  nom: string;
  caisseId: string;
  caisseNom?: string;
  categorieId?: string;
  categorieNom?: string;
  montantPrevu: number;
  montantDepense: number;
  periode: BudgetPeriode;
  mois?: number;  // 1-12 si periode = 'mensuel'
  annee: number;
  seuilAlerte: number; // % ex: 80
  organisationId: string;
  actif: boolean;
  createdAt?: any;
}

// Version enrichie calculée côté service — jamais stockée en Firestore
export interface BudgetStats {
  tauxConsommation: number;  // montantDepense / montantPrevu * 100
  estEnAlerte: boolean;       // tauxConsommation >= seuilAlerte
  restant: number;            // montantPrevu - montantDepense
}

export type BudgetAvecStats = Budget & BudgetStats;

// Calcule les stats à partir d'un Budget brut
export function calculerStatsBudget(b: Budget): BudgetStats {
  const taux = b.montantPrevu > 0
    ? Math.round((b.montantDepense / b.montantPrevu) * 100)
    : 0;
  return {
    tauxConsommation: taux,
    estEnAlerte: taux >= b.seuilAlerte,
    restant: b.montantPrevu - b.montantDepense,
  };
}
