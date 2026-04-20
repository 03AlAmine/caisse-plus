import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from './shared.module';
import { ParametresComponent } from '../features/settings/parametres.component';
import { UtilisateursComponent } from '../features/utilisateurs/utilisateurs.component';
import { CategoriesParamComponent } from '../features/settings/categories/categories-param.component';
import { OrganisationComponent } from '../features/settings/organisation/organisation.component';
import { PreferencesComponent } from '../features/settings/preferences/preferences.component';

const routes: Routes = [
  {
    path: '',
    component: ParametresComponent,
    children: [
      { path: 'utilisateurs', component: UtilisateursComponent },
      { path: 'categories', component: CategoriesParamComponent },
      { path: 'organisation', component: OrganisationComponent },
      { path: 'preferences', component: PreferencesComponent },
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
    PreferencesComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class ParametresModule {}
