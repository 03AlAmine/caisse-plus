import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { OperationListComponent } from './operation-list/operation-list.component';
import { OperationFormComponent } from './operation-form/operation-form.component';

const routes: Routes = [
  { path: '', component: OperationListComponent },
  { path: 'nouveau', component: OperationFormComponent },
  { path: ':id/modifier', component: OperationFormComponent },
];

@NgModule({
  declarations: [OperationListComponent, OperationFormComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class OperationsModule {}
