import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from './shared.module';
import { BudgetListComponent } from '../features/budgets/budget-list/budget-list.component';
import { BudgetFormComponent } from '../features/budgets/budget-form/budget-form.component';

const routes: Routes = [
  { path: '', component: BudgetListComponent },
  { path: 'nouveau', component: BudgetFormComponent },
  { path: ':id/modifier', component: BudgetFormComponent },
];

@NgModule({
  declarations: [BudgetListComponent, BudgetFormComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class BudgetsModule {}
