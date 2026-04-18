import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from './shared.module';
import { ParametresComponent } from '../features/parametres/parametres.component';
import { UtilisateursComponent } from '../features/utilisateurs/utilisateurs.component';
import { CategoriesParamComponent } from '../features/categories/categories-param.component';
import { OrganisationComponent } from '../features/organisation/organisation.component';

const routes: Routes = [
  {
    path: '',
    component: ParametresComponent,
    children: [
      { path: 'utilisateurs', component: UtilisateursComponent },
      { path: 'categories', component: CategoriesParamComponent },
      { path: 'organisation', component: OrganisationComponent },
      { path: '', redirectTo: 'utilisateurs', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  declarations: [
    ParametresComponent,
    UtilisateursComponent,
    CategoriesParamComponent,
    OrganisationComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class ParametresModule {}
