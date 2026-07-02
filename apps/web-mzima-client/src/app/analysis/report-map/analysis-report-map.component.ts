import { Component, Input, OnChanges } from '@angular/core';
import { GeoJSON, geoJSON, Map as LeafletMap, MapOptions, tileLayer } from 'leaflet';
import * as shp from 'shpjs';

// Both county and district boundaries live in the same County2 shapefile —
// each polygon is a district, carrying its parent county name as a property
// (see ushahidi-api's GeoLookupHelper.php, which reads the same file).
const BOUNDARY_SHAPEFILE_NAME = 'County2';

const LIBERIA_BOUNDARIES_URI = 'assets/shapefiles/liberia/administrative-levels.zip';
// Same sequential palette used by the report builder's ngx-charts, low to high count.
const CHOROPLETH_SCALE = ['#FFEBBB', '#F9CE7B', '#F1A661', '#E67E4D', '#D6553A'];

interface ReportChartInput {
  group_by: string;
  data: { name: string; value: number }[];
}

/**
 * Small, standalone Leaflet choropleth for the Analysis Report Builder's
 * "Show map" toggle — replaces the old UNICC fork's Flexmonster-toolbar map
 * view (post-filters.component.ts's onShowMap()). Reuses the same Liberia
 * shapefile asset and shpjs parsing approach as the main map.component.ts's
 * addBoundaryLayers(), but is purely presentational (driven by @Input(),
 * no dependency on MainViewComponent/global filter state) since it only
 * needs to color counties/districts by report count, not render posts.
 * See ushahidi-client/LIBERIA_CUSTOM.md.
 */
@Component({
  selector: 'app-analysis-report-map',
  templateUrl: './analysis-report-map.component.html',
  styleUrls: ['./analysis-report-map.component.scss'],
})
export class AnalysisReportMapComponent implements OnChanges {
  @Input() charts: ReportChartInput[] = [];

  public leafletOptions: MapOptions = {
    minZoom: 1,
    maxZoom: 18,
    scrollWheelZoom: true,
    layers: [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')],
    // Liberia default view, matching docs/MIGRATION_PLAN.md Phase 4 config.
    center: [6.75, -9.78],
    zoom: 8,
  };

  private map?: LeafletMap;
  private boundaryLayer?: GeoJSON;

  ngOnChanges(): void {
    if (this.map) {
      this.renderChoropleth();
    }
  }

  public onMapReady(map: LeafletMap): void {
    this.map = map;
    this.renderChoropleth();
  }

  private get activeChart(): ReportChartInput | undefined {
    return this.charts.find(
      (chart) => chart.group_by === 'county' || chart.group_by === 'district',
    );
  }

  private renderChoropleth(): void {
    const chart = this.activeChart;
    if (!this.map || !chart) {
      return;
    }

    const nameProperty = chart.group_by === 'county' ? 'FIRST_CCNA' : 'DNAME';
    const counts = new Map<string, number>(
      chart.data.map((row): [string, number] => [row.name.trim().toLowerCase(), row.value]),
    );
    const maxCount = Math.max(1, ...chart.data.map((row) => row.value));

    shp(LIBERIA_BOUNDARIES_URI).then((data: any) => {
      const collections = Array.isArray(data) ? data : [data];
      const collection = collections.find((c: any) => c.fileName === BOUNDARY_SHAPEFILE_NAME);
      if (!collection) {
        return;
      }

      if (this.boundaryLayer) {
        this.map!.removeLayer(this.boundaryLayer);
      }

      this.boundaryLayer = geoJSON(collection, {
        style: (feature) => {
          const name = (feature?.properties?.[nameProperty] ?? '').trim().toLowerCase();
          const value = counts.get(name) ?? 0;
          return {
            color: '#666',
            weight: 1,
            fillColor: this.colorForValue(value, maxCount),
            fillOpacity: 0.75,
          };
        },
        onEachFeature: (feature, layer) => {
          const name = feature?.properties?.[nameProperty] ?? '';
          const value = counts.get(name.trim().toLowerCase()) ?? 0;
          layer.bindTooltip(`${name}: ${value}`);
        },
      }).addTo(this.map!);
    });
  }

  private colorForValue(value: number, maxCount: number): string {
    if (value === 0) {
      return '#f2f2f2';
    }
    const bucket = Math.min(
      CHOROPLETH_SCALE.length - 1,
      Math.floor((value / maxCount) * CHOROPLETH_SCALE.length),
    );
    return CHOROPLETH_SCALE[bucket];
  }
}
