export type OperationType = 'entree' | 'sortie' | 'transfert';
export type OperationStatut = 'validee' | 'en_attente' | 'rejetee';
export type OperationSens = 'entree' | 'sortie'; // direction réelle d'un transfert

export interface Operation {
  id?: string;
  numeroPiece?: string; // ex: "CA-18976" pour caisse, "CP-0559" pour grands comptes
  libelle: string;
  montant: number;
  type: OperationType;
  sens?: OperationSens; // 'sortie' sur la caisse source, 'entree' sur la caisse destination
  statut: OperationStatut;
  caisseId: string;
  caisseNom?: string;
  categorieId?: string;
  categorieNom?: string;
  responsableId: string;
  responsableNom?: string;
  date: Date;
  createdAt: Date;
  updatedAt?: Date;
  justificatifs?: string[];
  notes?: string;
  transfertCaisseDestId?: string;
  transfertCaisseDestNom?: string;
  organisationId: string;
}
