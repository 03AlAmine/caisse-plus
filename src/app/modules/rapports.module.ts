import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from './shared.module';
import { RapportsComponent } from '../features/reports/rapports.component';

const routes: Routes = [{ path: '', component: RapportsComponent }];

@NgModule({
  declarations: [RapportsComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class RapportsModule {}
