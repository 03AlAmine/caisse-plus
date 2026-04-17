import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
  }
}
