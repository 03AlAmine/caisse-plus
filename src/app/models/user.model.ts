export type UserRole = 'admin' | 'tresorier' | 'auditeur' | 'utilisateur';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  organisationId: string;
  photoURL?: string;
  createdAt: Date;
  actif: boolean;
}

export interface Organisation {
  id?: string;
  nom: string;
  description?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  createdAt: Date;
  ownerId: string;
}

// ─── Matrice complète des permissions ───────────────────────────────────────
export const PERMISSIONS = {
  // Caisses
  CAISSE_LIRE:       ['admin', 'tresorier', 'auditeur', 'utilisateur'],
  CAISSE_CREER:      ['admin', 'tresorier'],
  CAISSE_MODIFIER:   ['admin', 'tresorier'],
  CAISSE_SUPPRIMER:  ['admin'],
  CAISSE_TRANSFERER: ['admin', 'tresorier'],

  // Opérations
  OPERATION_LIRE:    ['admin', 'tresorier', 'auditeur', 'utilisateur'],
  OPERATION_CREER:   ['admin', 'tresorier', 'utilisateur'],
  OPERATION_VALIDER: ['admin', 'tresorier'],
  OPERATION_REJETER: ['admin', 'tresorier'],
  OPERATION_MODIFIER:['admin', 'tresorier'],

  // Budgets
  BUDGET_LIRE:       ['admin', 'tresorier', 'auditeur', 'utilisateur'],
  BUDGET_GERER:      ['admin', 'tresorier'],

  // Rapports
  RAPPORT_LIRE:      ['admin', 'tresorier', 'auditeur'],
  RAPPORT_EXPORTER:  ['admin', 'tresorier'],

  // Paramètres
  PARAM_UTILISATEURS:['admin'],
  PARAM_CATEGORIES:  ['admin', 'tresorier'],
  PARAM_ORGANISATION:['admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Helper pour vérifier une permission
export function peutFaire(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

// Description des rôles pour l'UI
export const ROLE_DESCRIPTIONS: Record<UserRole, { label: string; description: string; couleur: string }> = {
  admin: {
    label: 'Administrateur',
    description: 'Accès complet. Gère les utilisateurs, valide tout, configure l\'organisation.',
    couleur: '#0f4c75',
  },
  tresorier: {
    label: 'Trésorier',
    description: 'Gère les caisses et opérations. Valide les dépenses. Génère les rapports.',
    couleur: '#10B981',
  },
  auditeur: {
    label: 'Auditeur',
    description: 'Lecture seule. Consulte les caisses, opérations et rapports sans modifier.',
    couleur: '#8B5CF6',
  },
  utilisateur: {
    label: 'Utilisateur',
    description: 'Saisit des opérations uniquement. Les montants ≥ 100 000 FCFA passent en attente.',
    couleur: '#6b7280',
  },
};
