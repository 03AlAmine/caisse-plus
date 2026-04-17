import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { CaisseListComponent } from './caisse-list/caisse-list.component';
import { CaisseFormComponent } from './caisse-form/caisse-form.component';
import { CaisseDetailComponent } from './caisse-detail/caisse-detail.component';

const routes: Routes = [
  { path: '', component: CaisseListComponent },
  { path: 'nouveau', component: CaisseFormComponent },
  { path: ':id', component: CaisseDetailComponent },
  { path: ':id/modifier', component: CaisseFormComponent },
];

@NgModule({
  declarations: [CaisseListComponent, CaisseFormComponent, CaisseDetailComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class CaissesModule {}
