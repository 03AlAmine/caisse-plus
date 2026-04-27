import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth.module').then((m) => m.AuthModule),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./modules/dashboard.module').then((m) => m.DashboardModule),
      },
      {
        path: 'caisses',
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'tresorier', 'auditeur', 'utilisateur'] },
        loadChildren: () =>
          import('./modules/caisses.module').then((m) => m.CaissesModule),
      },
      {
        path: 'operations',
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'tresorier', 'auditeur', 'utilisateur'] },
        loadChildren: () =>
          import('./modules/operations.module').then((m) => m.OperationsModule),
      },
      {
        path: 'budgets',
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'tresorier', 'auditeur', 'utilisateur'] },
        loadChildren: () =>
          import('./modules/budgets.module').then((m) => m.BudgetsModule),
      },
      {
        path: 'rapports',
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'tresorier', 'auditeur'] },
        loadChildren: () =>
          import('./modules/rapports.module').then((m) => m.RapportsModule),
      },
      // ✅ Route profil corrigée
      {
        path: 'profil',
        loadChildren: () =>
          import('./modules/profil.module').then((m) => m.ProfilModule),
      },
      {
        path: 'parametres',
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'tresorier', 'auditeur', 'utilisateur'] },
        loadChildren: () =>
          import('./modules/parametres.module').then((m) => m.ParametresModule),
      },
      {
        path: 'super-admin',
        canActivate: [RoleGuard],
        data: { roles: ['superadmin'] },
        loadChildren: () =>
          import('./modules/super-admin.module').then(
            (m) => m.SuperAdminModule,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: '404',
        loadChildren: () =>
          import('./modules/not-found.module').then((m) => m.NotFoundModule),
      },
      { path: '**', redirectTo: '404' },
    ],
  },
  { path: '**', redirectTo: '/404' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
