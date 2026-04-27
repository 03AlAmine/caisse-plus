import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from './shared.module';
import { SuperAdminComponent } from '../features/super-admin/super-admin.component';

const routes: Routes = [
  { path: '', component: SuperAdminComponent },
];

@NgModule({
  declarations: [SuperAdminComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class SuperAdminModule {}
