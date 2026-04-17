import { Pipe, PipeTransform } from '@angular/core';
import { BudgetAvecStats } from '../../models/budget.model';

@Pipe({ name: 'alertesFn' })
export class AlertesPipe implements PipeTransform {
  transform(budgets: BudgetAvecStats[]): BudgetAvecStats[] {
    return budgets.filter(b => b.estEnAlerte);
  }
}
