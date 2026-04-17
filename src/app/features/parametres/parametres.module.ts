import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ParametresComponent } from './parametres.component';
import { UtilisateursComponent } from '../utilisateurs/utilisateurs.component';
import { CategoriesParamComponent } from '../categories/categories-param.component';
import { OrganisationComponent } from '../organisation/organisation.component';

const routes: Routes = [
  {
    path: '', component: ParametresComponent,
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
