import { TemplateComportement } from "./templates.data";

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'tresorier'
  | 'auditeur'
  | 'utilisateur';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  organisationId: string;
  photoURL?: string;
  createdAt: Date;
  actif: boolean;
  // Champs d'invitation
  invitedBy?: string;
  invitedAt?: Date;
  emailVerified?: boolean;
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
  membres?: string[];
  actif?: boolean;
  invitationCode?: string;
  invitationCodeExpiresAt?: Date;
  comportement?: TemplateComportement;
}

// ─── Matrice complète des permissions ───────────────────────────────────────
export const PERMISSIONS = {
  // Super Admin — accès à tout
  SUPER_ADMIN: ['superadmin'],

  // Caisses
  CAISSE_LIRE: ['superadmin', 'admin', 'tresorier', 'auditeur', 'utilisateur'],
  CAISSE_CREER: ['superadmin', 'admin', 'tresorier'],
  CAISSE_MODIFIER: ['superadmin', 'admin', 'tresorier'],
  CAISSE_SUPPRIMER: ['superadmin', 'admin'],
  CAISSE_TRANSFERER: ['superadmin', 'admin', 'tresorier'],

  // Opérations
  OPERATION_LIRE: [
    'superadmin',
    'admin',
    'tresorier',
    'auditeur',
    'utilisateur',
  ],
  OPERATION_CREER: ['superadmin', 'admin', 'tresorier', 'utilisateur'],
  OPERATION_VALIDER: ['superadmin', 'admin', 'tresorier'],
  OPERATION_REJETER: ['superadmin', 'admin', 'tresorier'],
  OPERATION_MODIFIER: ['superadmin', 'admin', 'tresorier'],

  // Budgets
  BUDGET_LIRE: ['superadmin', 'admin', 'tresorier', 'auditeur', 'utilisateur'],
  BUDGET_GERER: ['superadmin', 'admin', 'tresorier'],

  // Rapports
  RAPPORT_LIRE: ['superadmin', 'admin', 'tresorier', 'auditeur'],
  RAPPORT_EXPORTER: ['superadmin', 'admin', 'tresorier'],

  // Paramètres
  PARAM_UTILISATEURS: ['superadmin', 'admin'],
  PARAM_CATEGORIES: ['superadmin', 'admin', 'tresorier'],
  PARAM_ORGANISATION: ['superadmin', 'admin'],
  PARAM_PREFERENCES: ['superadmin', 'admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Helper pour vérifier une permission
export function peutFaire(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

// Description des rôles pour l'UI
export const ROLE_DESCRIPTIONS: Record<
  UserRole,
  { label: string; description: string; couleur: string }
> = {
  superadmin: {
    label: 'Super Administrateur',
    description: 'Accès global à toutes les organisations. Gère la plateforme.',
    couleur: '#000000',
  },
  admin: {
    label: 'Administrateur',
    description:
      "Accès complet. Gère les utilisateurs, valide tout, configure l'organisation.",
    couleur: '#0F172A',
  },
  tresorier: {
    label: 'Trésorier',
    description:
      'Gère les caisses et opérations. Valide les dépenses. Génère les rapports.',
    couleur: '#059669',
  },
  auditeur: {
    label: 'Auditeur',
    description:
      'Lecture seule. Consulte les caisses, opérations et rapports sans modifier.',
    couleur: '#7C3AED',
  },
  utilisateur: {
    label: 'Utilisateur',
    description:
      'Saisit des opérations uniquement. Les montants ≥ 100 000 FCFA passent en attente.',
    couleur: '#6B7280',
  },
};
