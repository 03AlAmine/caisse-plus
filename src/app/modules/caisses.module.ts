import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from './shared.module';
import { CaisseListComponent } from '../features/caisses/caisse-list/caisse-list.component';
import { CaisseFormComponent } from '../features/caisses/caisse-form/caisse-form.component';
import { CaisseDetailComponent } from '../features/caisses/caisse-detail/caisse-detail.component';

const routes: Routes = [
  { path: '', component: CaisseListComponent },
  { path: 'nouveau', component: CaisseFormComponent },
  { path: ':id', component: CaisseDetailComponent },
  { path: ':id/modifier', component: CaisseFormComponent },
];

@NgModule({
  declarations: [
    CaisseListComponent,
    CaisseFormComponent,
    CaisseDetailComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class CaissesModule {}
