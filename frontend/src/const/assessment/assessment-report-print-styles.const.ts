export const ASSESSMENT_REPORT_PRINT_GLOBAL_STYLE = `@media print{@page{size:A4 landscape;margin:0}html:has([data-assessment-print-root]),html:has([data-assessment-print-root]) body,html:has([data-assessment-print-root]) #root{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}[data-assessment-print-page-wrapper]:has([data-assessment-print-root]),[data-assessment-print-root],[data-assessment-print-pages],[data-assessment-print-root] *{-webkit-print-color-adjust:exact;print-color-adjust:exact}[data-assessment-print-preview-banner]{display:none}[data-assessment-print-root] .bg-clip-text.text-transparent{display:inline-block;width:fit-content;max-width:100%}}`;

export const ASSESSMENT_REPORT_PRINT_SNAPSHOT_STYLES = `
@media print {
  @page {
    size: A4 landscape;
    margin: 0;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  [data-assessment-print-preview-banner] {
    display: none !important;
  }
  [data-assessment-print-page-wrapper] {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    min-height: 0 !important;
    width: 100% !important;
  }
  [data-assessment-print-pdf="true"] {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    display: block !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  [data-assessment-print-pdf="true"] [data-assessment-print-pages] {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    display: block !important;
    background: #fff !important;
  }
  [data-assessment-print-pdf="true"] [data-print-page-sheet] {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-sizing: border-box !important;
    width: 100vw !important;
    height: 100vh !important;
    min-height: 100vh !important;
    max-height: 100vh !important;
    overflow: hidden !important;
    position: relative !important;
    page-break-after: always !important;
    break-after: page !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  [data-assessment-print-pdf="true"] [data-print-page-sheet]:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
  [data-assessment-print-pdf="true"] [data-print-page-sheet] * {
    break-after: avoid !important;
    page-break-after: avoid !important;
  }
  [data-assessment-print-pdf="true"] [data-print-page-sheet] {
    break-after: page !important;
    page-break-after: always !important;
  }
  [data-assessment-print-pdf="true"] [data-print-page] {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    box-sizing: border-box !important;
    width: 877px !important;
    height: 620px !important;
    min-width: 877px !important;
    min-height: 620px !important;
    max-width: 877px !important;
    max-height: 620px !important;
    margin: 0 !important;
    padding: 12px !important;
    overflow: hidden !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    zoom: 1 !important;
    transform: scale(min(calc(100vw / 877), calc(100vh / 620))) !important;
    transform-origin: center center !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    break-after: avoid !important;
    page-break-after: avoid !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  [data-assessment-print-pdf="true"] img[data-print-cover-image] {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
    object-fit: cover !important;
    object-position: center center !important;
  }
  [data-assessment-print-pdf="true"] img:not([data-print-cover-image]) {
    max-width: 100% !important;
    object-fit: contain !important;
  }
  [data-assessment-print-pdf="true"] .bg-clip-text.text-transparent {
    display: inline-block !important;
    width: fit-content !important;
    max-width: 100% !important;
  }
}
`;
