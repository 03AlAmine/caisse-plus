import { Component, Input, OnDestroy, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, inject, NgZone } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Enregistrer tous les composants Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  template: `<canvas #chartCanvas></canvas>`,
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  @Input() type: ChartType = 'bar';
  @Input() data!: ChartConfiguration['data'];
  @Input() options?: ChartConfiguration['options'];
  @Input() height?: number;
  @Input() width?: number;

  private chart?: Chart;

  ngAfterViewInit(): void {
    // Exécuter en dehors de NgZone pour éviter les cycles de détection de changements
    this.ngZone.runOutsideAngular(() => {
      // Petit délai pour s'assurer que le DOM est complètement prêt
      setTimeout(() => {
        this.createChart();
      }, 50);
    });
  }

  private createChart(): void {
    if (!this.canvasRef?.nativeElement) {
      console.warn('ChartComponent: Canvas non disponible');
      return;
    }

    // Vérifier que les données sont valides
    if (!this.data?.labels?.length || !this.data?.datasets?.length) {
      console.warn('ChartComponent: Données du graphique invalides ou vides');
      return;
    }

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.warn('ChartComponent: Contexte 2D non disponible');
      return;
    }

    // Détruire le graphique existant si présent
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }

    try {
      const config: ChartConfiguration = {
        type: this.type,
        data: this.data,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: {
            duration: 200 // Animation courte pour éviter les blocages
          },
          ...this.getDefaultOptions(),
          ...this.options
        }
      };

      this.chart = new Chart(ctx, config);

      // Forcer une détection de changements après création
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('ChartComponent: Erreur lors de la création du graphique:', error);
    }
  }

  private getDefaultOptions(): ChartConfiguration['options'] {
    // Valeurs par défaut sécurisées
    let gray600 = '#4A5068';
    let navy800 = '#112240';

    if (typeof window !== 'undefined' && typeof getComputedStyle !== 'undefined') {
      try {
        const styles = getComputedStyle(document.documentElement);
        gray600 = styles.getPropertyValue('--gray-600').trim() || gray600;
        navy800 = styles.getPropertyValue('--navy-800').trim() || navy800;
      } catch (e) {
        // Utiliser les valeurs par défaut
      }
    }

    return {
      plugins: {
        legend: {
          labels: {
            font: { family: 'Plus Jakarta Sans, sans-serif', size: 12 },
            color: gray600
          }
        },
        tooltip: {
          backgroundColor: navy800,
          titleFont: { family: 'Plus Jakarta Sans, sans-serif', weight: 'bold' },
          bodyFont: { family: 'DM Mono, monospace' },
          padding: 12,
          cornerRadius: 8
        }
      },
      // Désactiver les animations pendant le développement si nécessaire
      // animation: false
    };
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
  }
}
