import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.module').then(m => m.AuthModule),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
      },
      {
        path: 'caisses',
        loadChildren: () =>
          import('./features/caisses/caisses.module').then(m => m.CaissesModule),
      },
      {
        path: 'operations',
        loadChildren: () =>
          import('./features/operations/operations.module').then(m => m.OperationsModule),
      },
      {
        path: 'budgets',
        loadChildren: () =>
          import('./features/budgets/budgets.module').then(m => m.BudgetsModule),
      },
      {
        path: 'rapports',
        loadChildren: () =>
          import('./features/rapports/rapports.module').then(m => m.RapportsModule),
      },
      {
        path: 'parametres',
        canActivate: [RoleGuard],
        data: { roles: ['admin'] },
        loadChildren: () =>
          import('./features/parametres/parametres.module').then(m => m.ParametresModule),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
