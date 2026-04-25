// ═══════════════════════════════════════════════════════════════════════
// Templates d'activité — CAISSE+
// ═══════════════════════════════════════════════════════════════════════

export interface CategorieTemplate {
  nom: string;
  type: 'entree' | 'sortie';
  couleur: string;
}

export interface CaisseSuggeree {
  nom: string;
  type: 'principale' | 'secondaire';
  description?: string;
  couleur?: string;
}

export interface ActiviteTemplate {
  id: string;
  nom: string;
  description: string;
  secteur: string;
  icone: string; // Identifiant SVG (nom du fichier ou identifiant)
  couleur: string;
  categoriesEntree: CategorieTemplate[];
  categoriesSortie: CategorieTemplate[];
  caissesSuggerees: CaisseSuggeree[];
  motsCles: string[];
}

export const TEMPLATES: ActiviteTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // 1. ENTREPRISE / CABINET / BUREAU
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'entreprise',
    nom: 'Entreprise / Cabinet',
    description: 'Gestion financière pour entreprise, cabinet, bureau administratif',
    secteur: 'Services',
    icone: 'building',
    couleur: '#0F172A',
    motsCles: ['entreprise', 'cabinet', 'bureau', 'administration', 'gestion', 'comptabilité'],
    categoriesEntree: [
      { nom: 'Règlement facture', type: 'entree', couleur: '#10B981' },
      { nom: 'Retrait banque', type: 'entree', couleur: '#059669' },
      { nom: 'Cotisation', type: 'entree', couleur: '#3B82F6' },
      { nom: 'Subvention', type: 'entree', couleur: '#6366F1' },
      { nom: 'Don', type: 'entree', couleur: '#8B5CF6' },
      { nom: 'Prestation service', type: 'entree', couleur: '#EC4899' },
      { nom: 'Remboursement', type: 'entree', couleur: '#14B8A6' },
      { nom: 'Autres (Entrée)', type: 'entree', couleur: '#6B7280' },
    ],
    categoriesSortie: [
      { nom: 'Alimentation caisse secondaire', type: 'sortie', couleur: '#F59E0B' },
      { nom: 'Alimentation caisse LIS sécurité', type: 'sortie', couleur: '#D97706' },
      { nom: 'Débours', type: 'sortie', couleur: '#EF4444' },
      { nom: 'Impôts', type: 'sortie', couleur: '#DC2626' },
      { nom: 'CSS - IPRES', type: 'sortie', couleur: '#B91C1C' },
      { nom: 'IPM', type: 'sortie', couleur: '#F97316' },
      { nom: 'Carburant', type: 'sortie', couleur: '#EAB308' },
      { nom: 'Crédit & Sonatel', type: 'sortie', couleur: '#06B6D4' },
      { nom: 'Restauration', type: 'sortie', couleur: '#14B8A6' },
      { nom: 'Transport', type: 'sortie', couleur: '#8B5CF6' },
      { nom: 'Produit de nettoyage', type: 'sortie', couleur: '#0EA5E9' },
      { nom: 'Réparation moto', type: 'sortie', couleur: '#7C3AED' },
      { nom: 'Réparation véhicule', type: 'sortie', couleur: '#6366F1' },
      { nom: 'Woyofal', type: 'sortie', couleur: '#EC4899' },
      { nom: 'Fournitures bureau', type: 'sortie', couleur: '#2563EB' },
      { nom: 'Timbre / Banque', type: 'sortie', couleur: '#9333EA' },
      { nom: 'Communication', type: 'sortie', couleur: '#0891B2' },
      { nom: 'Autres (Sortie)', type: 'sortie', couleur: '#6B7280' },
    ],
    caissesSuggerees: [
      { nom: 'Caisse principale', type: 'principale', description: 'Caisse centrale de l\'organisation', couleur: '#0F172A' },
      { nom: 'Caisse LIS sécurité', type: 'secondaire', description: 'Caisse dédiée à la sécurité', couleur: '#F59E0B' },
      { nom: 'Caisse secondaire', type: 'secondaire', description: 'Budget pour activités spécifiques', couleur: '#7C3AED' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 2. COMMERCE GÉNÉRAL / QUINCAILLERIE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'commerce',
    nom: 'Commerce Général',
    description: 'Gestion de boutique, quincaillerie, vente de matériaux et outillage',
    secteur: 'Commerce',
    icone: 'store',
    couleur: '#D97706',
    motsCles: ['commerce', 'boutique', 'quincaillerie', 'matériaux', 'outillage', 'vente', 'magasin'],
    categoriesEntree: [
      { nom: 'Vente marchandises', type: 'entree', couleur: '#10B981' },
      { nom: 'Vente matériaux', type: 'entree', couleur: '#059669' },
      { nom: 'Vente outillage', type: 'entree', couleur: '#047857' },
      { nom: 'Vente accessoires', type: 'entree', couleur: '#3B82F6' },
      { nom: 'Prestation service', type: 'entree', couleur: '#6366F1' },
      { nom: 'Livraison', type: 'entree', couleur: '#8B5CF6' },
      { nom: 'Dépôt-vente', type: 'entree', couleur: '#EC4899' },
      { nom: 'Autres (Entrée)', type: 'entree', couleur: '#6B7280' },
    ],
    categoriesSortie: [
      { nom: 'Achat marchandises', type: 'sortie', couleur: '#EF4444' },
      { nom: 'Achat matériaux', type: 'sortie', couleur: '#DC2626' },
      { nom: 'Achat outillage', type: 'sortie', couleur: '#B91C1C' },
      { nom: 'Achat accessoires', type: 'sortie', couleur: '#F97316' },
      { nom: 'Transport marchandises', type: 'sortie', couleur: '#EAB308' },
      { nom: 'Loyer boutique', type: 'sortie', couleur: '#D97706' },
      { nom: 'Électricité / Eau', type: 'sortie', couleur: '#06B6D4' },
      { nom: 'Entretien local', type: 'sortie', couleur: '#14B8A6' },
      { nom: 'Taxe marché', type: 'sortie', couleur: '#8B5CF6' },
      { nom: 'Emballage / Sachets', type: 'sortie', couleur: '#7C3AED' },
      { nom: 'Sécurité / Gardiennage', type: 'sortie', couleur: '#9333EA' },
      { nom: 'Publicité / Enseigne', type: 'sortie', couleur: '#2563EB' },
      { nom: 'Carburant', type: 'sortie', couleur: '#0EA5E9' },
      { nom: 'Communication', type: 'sortie', couleur: '#0891B2' },
      { nom: 'Autres (Sortie)', type: 'sortie', couleur: '#6B7280' },
    ],
    caissesSuggerees: [
      { nom: 'Caisse principale', type: 'principale', description: 'Caisse centrale du commerce', couleur: '#D97706' },
      { nom: 'Caisse dépôt', type: 'secondaire', description: 'Fonds de caisse pour le dépôt', couleur: '#7C3AED' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 3. TEXTILE / COUTURE / MODE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'textile',
    nom: 'Textile / Couture',
    description: 'Gestion d\'atelier de couture, vente de tissus, confection, retouche',
    secteur: 'Artisanat',
    icone: 'fabric',
    couleur: '#EC4899',
    motsCles: ['textile', 'couture', 'tissus', 'vêtements', 'confection', 'retouche', 'mode', 'atelier'],
    categoriesEntree: [
      { nom: 'Vente tissus', type: 'entree', couleur: '#10B981' },
      { nom: 'Vente vêtements', type: 'entree', couleur: '#059669' },
      { nom: 'Confection sur mesure', type: 'entree', couleur: '#3B82F6' },
      { nom: 'Retouche', type: 'entree', couleur: '#6366F1' },
      { nom: 'Vente accessoires', type: 'entree', couleur: '#8B5CF6' },
      { nom: 'Location tenues', type: 'entree', couleur: '#EC4899' },
      { nom: 'Formation couture', type: 'entree', couleur: '#14B8A6' },
      { nom: 'Autres (Entrée)', type: 'entree', couleur: '#6B7280' },
    ],
    categoriesSortie: [
      { nom: 'Achat tissus', type: 'sortie', couleur: '#EF4444' },
      { nom: 'Achat fil / boutons', type: 'sortie', couleur: '#DC2626' },
      { nom: 'Achat fermetures', type: 'sortie', couleur: '#B91C1C' },
      { nom: 'Achat doublures', type: 'sortie', couleur: '#F97316' },
      { nom: 'Achat machines', type: 'sortie', couleur: '#EAB308' },
      { nom: 'Entretien machines', type: 'sortie', couleur: '#D97706' },
      { nom: 'Location atelier', type: 'sortie', couleur: '#06B6D4' },
      { nom: 'Électricité / Eau', type: 'sortie', couleur: '#14B8A6' },
      { nom: 'Transport', type: 'sortie', couleur: '#8B5CF6' },
      { nom: 'Publicité', type: 'sortie', couleur: '#7C3AED' },
      { nom: 'Communication', type: 'sortie', couleur: '#0891B2' },
      { nom: 'Autres (Sortie)', type: 'sortie', couleur: '#6B7280' },
    ],
    caissesSuggerees: [
      { nom: 'Caisse principale', type: 'principale', description: 'Caisse centrale de l\'atelier', couleur: '#EC4899' },
      { nom: 'Caisse matériel', type: 'secondaire', description: 'Budget machines et outillage', couleur: '#7C3AED' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. ALIMENTATION / RESTAURATION
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'restauration',
    nom: 'Alimentation / Restauration',
    description: 'Gestion de restaurant, service traiteur, vente de plats et boissons',
    secteur: 'Restauration',
    icone: 'restaurant',
    couleur: '#EF4444',
    motsCles: ['restaurant', 'alimentation', 'traiteur', 'plats', 'boissons', 'cuisine', 'restauration'],
    categoriesEntree: [
      { nom: 'Vente plats', type: 'entree', couleur: '#10B981' },
      { nom: 'Vente boissons', type: 'entree', couleur: '#059669' },
      { nom: 'Livraison', type: 'entree', couleur: '#3B82F6' },
      { nom: 'Service traiteur', type: 'entree', couleur: '#6366F1' },
      { nom: 'Location salle', type: 'entree', couleur: '#8B5CF6' },
      { nom: 'Animation', type: 'entree', couleur: '#EC4899' },
      { nom: 'Vente à emporter', type: 'entree', couleur: '#14B8A6' },
      { nom: 'Autres (Entrée)', type: 'entree', couleur: '#6B7280' },
    ],
    categoriesSortie: [
      { nom: 'Achat ingrédients', type: 'sortie', couleur: '#EF4444' },
      { nom: 'Achat viande / poisson', type: 'sortie', couleur: '#DC2626' },
      { nom: 'Achat légumes', type: 'sortie', couleur: '#B91C1C' },
      { nom: 'Achat boissons', type: 'sortie', couleur: '#F97316' },
      { nom: 'Achat emballages', type: 'sortie', couleur: '#EAB308' },
      { nom: 'Gaz / Charbon', type: 'sortie', couleur: '#D97706' },
      { nom: 'Transport', type: 'sortie', couleur: '#06B6D4' },
      { nom: 'Loyer restaurant', type: 'sortie', couleur: '#14B8A6' },
      { nom: 'Matériel cuisine', type: 'sortie', couleur: '#8B5CF6' },
      { nom: 'Entretien local', type: 'sortie', couleur: '#7C3AED' },
      { nom: 'Électricité / Eau', type: 'sortie', couleur: '#0EA5E9' },
      { nom: 'Publicité', type: 'sortie', couleur: '#2563EB' },
      { nom: 'Communication', type: 'sortie', couleur: '#0891B2' },
      { nom: 'Autres (Sortie)', type: 'sortie', couleur: '#6B7280' },
    ],
    caissesSuggerees: [
      { nom: 'Caisse principale', type: 'principale', description: 'Caisse centrale du restaurant', couleur: '#EF4444' },
      { nom: 'Caisse approvisionnement', type: 'secondaire', description: 'Budget achats ingrédients', couleur: '#10B981' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 5. ARTISANAT / PRESTATION DE SERVICE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'artisanat',
    nom: 'Artisanat / Prestation',
    description: 'Gestion d\'activité artisanale, prestation de service, maintenance',
    secteur: 'Artisanat',
    icone: 'tools',
    couleur: '#F59E0B',
    motsCles: ['artisanat', 'prestation', 'service', 'maintenance', 'réparation', 'plomberie', 'électricité'],
    categoriesEntree: [
      { nom: 'Prestation service', type: 'entree', couleur: '#10B981' },
      { nom: 'Vente produits finis', type: 'entree', couleur: '#059669' },
      { nom: 'Contrat maintenance', type: 'entree', couleur: '#3B82F6' },
      { nom: 'Installation', type: 'entree', couleur: '#6366F1' },
      { nom: 'Dépannage urgence', type: 'entree', couleur: '#8B5CF6' },
      { nom: 'Formation', type: 'entree', couleur: '#EC4899' },
      { nom: 'Location matériel', type: 'entree', couleur: '#14B8A6' },
      { nom: 'Autres (Entrée)', type: 'entree', couleur: '#6B7280' },
    ],
    categoriesSortie: [
      { nom: 'Achat matières premières', type: 'sortie', couleur: '#EF4444' },
      { nom: 'Achat pièces détachées', type: 'sortie', couleur: '#DC2626' },
      { nom: 'Outillage', type: 'sortie', couleur: '#B91C1C' },
      { nom: 'Équipement protection', type: 'sortie', couleur: '#F97316' },
      { nom: 'Déplacement', type: 'sortie', couleur: '#EAB308' },
      { nom: 'Carburant', type: 'sortie', couleur: '#D97706' },
      { nom: 'Location atelier', type: 'sortie', couleur: '#06B6D4' },
      { nom: 'Publicité', type: 'sortie', couleur: '#8B5CF6' },
      { nom: 'Licence / Brevet', type: 'sortie', couleur: '#7C3AED' },
      { nom: 'Assurance professionnelle', type: 'sortie', couleur: '#9333EA' },
      { nom: 'Communication', type: 'sortie', couleur: '#0891B2' },
      { nom: 'Autres (Sortie)', type: 'sortie', couleur: '#6B7280' },
    ],
    caissesSuggerees: [
      { nom: 'Caisse principale', type: 'principale', description: 'Caisse centrale de l\'activité', couleur: '#F59E0B' },
      { nom: 'Caisse outillage', type: 'secondaire', description: 'Budget équipement et outils', couleur: '#7C3AED' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 6. ONG / ASSOCIATION
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'ong',
    nom: 'ONG / Association',
    description: 'Gestion financière pour ONG, association, organisation à but non lucratif',
    secteur: 'Social',
    icone: 'heart',
    couleur: '#10B981',
    motsCles: ['ong', 'association', 'organisation', 'but non lucratif', 'social', 'humanitaire', 'communautaire'],
    categoriesEntree: [
      { nom: 'Cotisation membres', type: 'entree', couleur: '#10B981' },
      { nom: 'Don', type: 'entree', couleur: '#059669' },
      { nom: 'Subvention', type: 'entree', couleur: '#3B82F6' },
      { nom: 'Financement projet', type: 'entree', couleur: '#6366F1' },
      { nom: 'Collecte fonds', type: 'entree', couleur: '#8B5CF6' },
      { nom: 'Parrainage', type: 'entree', couleur: '#EC4899' },
      { nom: 'Événement caritatif', type: 'entree', couleur: '#14B8A6' },
      { nom: 'Autres (Entrée)', type: 'entree', couleur: '#6B7280' },
    ],
    categoriesSortie: [
      { nom: 'Projet humanitaire', type: 'sortie', couleur: '#EF4444' },
      { nom: 'Aide bénéficiaires', type: 'sortie', couleur: '#DC2626' },
      { nom: 'Matériel projet', type: 'sortie', couleur: '#B91C1C' },
      { nom: 'Transport mission', type: 'sortie', couleur: '#F97316' },
      { nom: 'Logement mission', type: 'sortie', couleur: '#EAB308' },
      { nom: 'Formation', type: 'sortie', couleur: '#D97706' },
      { nom: 'Sensibilisation', type: 'sortie', couleur: '#06B6D4' },
      { nom: 'Frais administratifs', type: 'sortie', couleur: '#14B8A6' },
      { nom: 'Communication', type: 'sortie', couleur: '#8B5CF6' },
      { nom: 'Location bureau', type: 'sortie', couleur: '#7C3AED' },
      { nom: 'Électricité / Eau', type: 'sortie', couleur: '#0EA5E9' },
      { nom: 'Autres (Sortie)', type: 'sortie', couleur: '#6B7280' },
    ],
    caissesSuggerees: [
      { nom: 'Caisse principale', type: 'principale', description: 'Fonds général de l\'organisation', couleur: '#10B981' },
      { nom: 'Caisse projets', type: 'secondaire', description: 'Budget projets humanitaires', couleur: '#3B82F6' },
      { nom: 'Caisse fonctionnement', type: 'secondaire', description: 'Frais administratifs', couleur: '#7C3AED' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 7. AGRICULTURE / ÉLEVAGE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'agriculture',
    nom: 'Agriculture / Élevage',
    description: 'Gestion d\'exploitation agricole, élevage, production végétale',
    secteur: 'Agriculture',
    icone: 'plant',
    couleur: '#059669',
    motsCles: ['agriculture', 'élevage', 'ferme', 'production', 'végétale', 'animaux', 'récolte'],
    categoriesEntree: [
      { nom: 'Vente récolte', type: 'entree', couleur: '#10B981' },
      { nom: 'Vente bétail', type: 'entree', couleur: '#059669' },
      { nom: 'Vente produits laitiers', type: 'entree', couleur: '#047857' },
      { nom: 'Vente œufs / volaille', type: 'entree', couleur: '#3B82F6' },
      { nom: 'Subvention agricole', type: 'entree', couleur: '#6366F1' },
      { nom: 'Location matériel', type: 'entree', couleur: '#8B5CF6' },
      { nom: 'Autres (Entrée)', type: 'entree', couleur: '#6B7280' },
    ],
    categoriesSortie: [
      { nom: 'Achat semences', type: 'sortie', couleur: '#EF4444' },
      { nom: 'Achat engrais', type: 'sortie', couleur: '#DC2626' },
      { nom: 'Achat pesticides', type: 'sortie', couleur: '#B91C1C' },
      { nom: 'Achat aliments bétail', type: 'sortie', couleur: '#F97316' },
      { nom: 'Achat animaux', type: 'sortie', couleur: '#EAB308' },
      { nom: 'Carburant', type: 'sortie', couleur: '#D97706' },
      { nom: 'Entretien matériel', type: 'sortie', couleur: '#06B6D4' },
      { nom: 'Main d\'œuvre temporaire', type: 'sortie', couleur: '#14B8A6' },
      { nom: 'Transport', type: 'sortie', couleur: '#8B5CF6' },
      { nom: 'Eau / Irrigation', type: 'sortie', couleur: '#0EA5E9' },
      { nom: 'Vétérinaire', type: 'sortie', couleur: '#7C3AED' },
      { nom: 'Autres (Sortie)', type: 'sortie', couleur: '#6B7280' },
    ],
    caissesSuggerees: [
      { nom: 'Caisse principale', type: 'principale', description: 'Caisse centrale de l\'exploitation', couleur: '#059669' },
      { nom: 'Caisse intrants', type: 'secondaire', description: 'Budget semences, engrais, aliments', couleur: '#D97706' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 8. TRANSPORT / LOGISTIQUE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'transport',
    nom: 'Transport / Logistique',
    description: 'Gestion de transport, livraison, logistique, coursier',
    secteur: 'Transport',
    icone: 'truck',
    couleur: '#2563EB',
    motsCles: ['transport', 'logistique', 'livraison', 'coursier', 'véhicules', 'chauffeur'],
    categoriesEntree: [
      { nom: 'Course / Livraison', type: 'entree', couleur: '#10B981' },
      { nom: 'Contrat transport', type: 'entree', couleur: '#059669' },
      { nom: 'Location véhicule', type: 'entree', couleur: '#3B82F6' },
      { nom: 'Déménagement', type: 'entree', couleur: '#6366F1' },
      { nom: 'Autres (Entrée)', type: 'entree', couleur: '#6B7280' },
    ],
    categoriesSortie: [
      { nom: 'Carburant', type: 'sortie', couleur: '#EF4444' },
      { nom: 'Entretien véhicule', type: 'sortie', couleur: '#DC2626' },
      { nom: 'Pièces détachées', type: 'sortie', couleur: '#B91C1C' },
      { nom: 'Assurance véhicule', type: 'sortie', couleur: '#F97316' },
      { nom: 'Péage / Stationnement', type: 'sortie', couleur: '#EAB308' },
      { nom: 'Visite technique', type: 'sortie', couleur: '#D97706' },
      { nom: 'Salaire chauffeur', type: 'sortie', couleur: '#06B6D4' },
      { nom: 'Communication', type: 'sortie', couleur: '#0891B2' },
      { nom: 'Autres (Sortie)', type: 'sortie', couleur: '#6B7280' },
    ],
    caissesSuggerees: [
      { nom: 'Caisse principale', type: 'principale', description: 'Caisse centrale de transport', couleur: '#2563EB' },
      { nom: 'Caisse carburant', type: 'secondaire', description: 'Budget carburant et entretien', couleur: '#EF4444' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 9. LIBRE / PERSONNALISÉ
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'libre',
    nom: 'Libre / Personnalisé',
    description: 'Configuration libre, vous créez vos propres catégories et caisses',
    secteur: 'Général',
    icone: 'custom',
    couleur: '#6B7280',
    motsCles: ['libre', 'personnalisé', 'custom', 'flexible'],
    categoriesEntree: [
      { nom: 'Entrée 1', type: 'entree', couleur: '#10B981' },
      { nom: 'Entrée 2', type: 'entree', couleur: '#3B82F6' },
      { nom: 'Autres (Entrée)', type: 'entree', couleur: '#6B7280' },
    ],
    categoriesSortie: [
      { nom: 'Sortie 1', type: 'sortie', couleur: '#EF4444' },
      { nom: 'Sortie 2', type: 'sortie', couleur: '#D97706' },
      { nom: 'Autres (Sortie)', type: 'sortie', couleur: '#6B7280' },
    ],
    caissesSuggerees: [
      { nom: 'Ma caisse', type: 'principale', description: 'Caisse principale', couleur: '#0F172A' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Retourne un template par son ID
 */
export function getTemplateById(id: string): ActiviteTemplate | undefined {
  return TEMPLATES.find(t => t.id === id);
}

/**
 * Retourne tous les templates sauf "libre"
 */
export function getTemplatesSectoriels(): ActiviteTemplate[] {
  return TEMPLATES.filter(t => t.id !== 'libre');
}

/**
 * Fusionne les catégories d'entrée et de sortie d'un template
 */
export function getAllCategoriesFromTemplate(template: ActiviteTemplate): CategorieTemplate[] {
  return [
    ...template.categoriesEntree,
    ...template.categoriesSortie,
  ];
}

/**
 * Cherche un template par mot-clé
 */
export function searchTemplateByKeyword(keyword: string): ActiviteTemplate | undefined {
  const kw = keyword.toLowerCase().trim();
  return TEMPLATES.find(t =>
    t.motsCles.some(mc => mc.includes(kw)) ||
    t.nom.toLowerCase().includes(kw) ||
    t.description.toLowerCase().includes(kw)
  );
}
