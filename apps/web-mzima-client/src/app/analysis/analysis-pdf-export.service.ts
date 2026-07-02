import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.addVirtualFileSystem(pdfFonts as any);

const IMAGE_WIDTH = 500;

/**
 * Ports the old UNICC fork's Analysis Templates "Export All" PDF export
 * (post-analysis.component.ts's generatePdf(): html2canvas snapshot +
 * pdfmake), using the same two open-source libraries — Flexmonster itself
 * is still not ported, see LIBERIA_CUSTOM.md.
 */
@Injectable({
  providedIn: 'root',
})
export class AnalysisPdfExportService {
  public async exportChartsToPdf(
    containerEl: HTMLElement,
    title: string,
    dateRangeText: string,
    fileName = 'analysis-report.pdf',
  ): Promise<void> {
    const canvas = await html2canvas(containerEl);
    const image = canvas.toDataURL('image/png');
    const ratio = canvas.height / canvas.width;

    pdfMake
      .createPdf({
        content: [
          { text: title, style: 'header' },
          ...(dateRangeText ? [{ text: dateRangeText, style: 'subheader' }] : []),
          { image, width: IMAGE_WIDTH, height: IMAGE_WIDTH * ratio },
        ],
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 8] },
          subheader: { fontSize: 11, color: '#666666', margin: [0, 0, 0, 16] },
        },
      })
      .download(fileName);
  }
}
