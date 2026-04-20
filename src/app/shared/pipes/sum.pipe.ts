import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sum' })
export class SumPipe implements PipeTransform {
  transform(values: number[]): number {
    if (!values?.length) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0));
  }
}
