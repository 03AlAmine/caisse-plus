import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { RapportsComponent } from './rapports.component';

const routes: Routes = [
  { path: '', component: RapportsComponent },
];

@NgModule({
  declarations: [RapportsComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class RapportsModule {}
