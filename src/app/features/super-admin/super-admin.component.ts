import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SuperAdminService, OrganisationInfo, StatGlobales } from '../../services/super-admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.component.html',
  styleUrls: ['./super-admin.component.scss'],
})
export class SuperAdminComponent implements OnInit {
  private auth = inject(AuthService);
  private superAdminService = inject(SuperAdminService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  loading = true;
  statsGlobales: StatGlobales | null = null;
  organisations: OrganisationInfo[] = [];
  filteredOrganisations: OrganisationInfo[] = [];
  selectedOrg: OrganisationInfo | null = null;
  selectedOrgUsers: any[] = [];
  filtreSearch = '';
  showOrgDetail = false;

  ngOnInit(): void {
    if (!this.superAdminService.isSuperAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      const [stats, orgs] = await Promise.all([
        this.superAdminService.getStatistiquesGlobales(),
        this.superAdminService.getAllOrganisations(),
      ]);

      this.statsGlobales = stats;

      // Charger les stats pour chaque organisation
      for (const org of orgs) {
        const orgStats = await this.superAdminService.getOrganisationStats(org.id);
        org.nbCaisses = orgStats.nbCaisses;
        org.nbOperations = orgStats.nbOperations;
        org.nbBudgets = orgStats.nbBudgets;
        org.soldeTotal = orgStats.soldeTotal;
      }

      this.organisations = orgs;
      this.applyFilter();
    } catch (error) {
      console.error('Erreur chargement super admin:', error);
      this.toastr.error('Erreur lors du chargement des données');
    } finally {
      this.loading = false;
    }
  }

  applyFilter(): void {
    if (!this.filtreSearch) {
      this.filteredOrganisations = this.organisations;
      return;
    }
    const search = this.filtreSearch.toLowerCase();
    this.filteredOrganisations = this.organisations.filter(org =>
      org.nom.toLowerCase().includes(search) ||
      org.id.toLowerCase().includes(search)
    );
  }

  async viewOrganisation(org: OrganisationInfo): Promise<void> {
    this.selectedOrg = org;
    this.showOrgDetail = true;
    this.selectedOrgUsers = await this.superAdminService.getOrganisationUsers(org.id);
  }

  closeDetail(): void {
    this.showOrgDetail = false;
    this.selectedOrg = null;
    this.selectedOrgUsers = [];
  }

  async toggleOrgStatus(org: OrganisationInfo): Promise<void> {
    const action = org.actif ? 'désactiver' : 'réactiver';
    if (!confirm(`Voulez-vous vraiment ${action} l'organisation "${org.nom}" ?`)) return;

    try {
      await this.superAdminService.toggleOrganisation(org.id, !org.actif);
      org.actif = !org.actif;
      this.toastr.success(`Organisation ${action.slice(0, -1)}ée avec succès`);
    } catch (error) {
      this.toastr.error('Erreur lors de la modification');
    }
  }

  getTemplateName(templateId?: string): string {
    const names: Record<string, string> = {
      entreprise: 'Entreprise',
      commerce: 'Commerce',
      textile: 'Textile',
      restauration: 'Restauration',
      artisanat: 'Artisanat',
      ong: 'ONG',
      agriculture: 'Agriculture',
      transport: 'Transport',
      libre: 'Libre',
    };
    return names[templateId || ''] || 'Inconnu';
  }
}
