const fs = require('fs');
const { createCanvas, DOMMatrix, ImageData, Path2D } = require('@napi-rs/canvas');

globalThis.DOMMatrix ??= DOMMatrix;
globalThis.ImageData ??= ImageData;
globalThis.Path2D ??= Path2D;

const MAX_PDF_PAGES = 4;
const OCR_SCALE = 2;

let pdfJsPromise;

function isPdf(mimeType) {
  return mimeType === 'application/pdf';
}

function isImage(mimeType) {
  return typeof mimeType === 'string' && mimeType.startsWith('image/');
}

function normalizeText(text) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfJsPromise;
}

async function recognizeImageBuffer(buffer) {
  const { createWorker } = require('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    return data?.text || '';
  } finally {
    await worker.terminate();
  }
}

async function extractTextFromImage(filePath) {
  const buffer = fs.readFileSync(filePath);
  return recognizeImageBuffer(buffer);
}

async function extractTextFromPdf(filePath) {
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfjsLib = await loadPdfJs();
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBuffer,
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  });

  const pdfDocument = await loadingTask.promise;
  const pageLimit = Math.min(pdfDocument.numPages, MAX_PDF_PAGES);
  const extractedPages = [];

  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    try {
      const viewport = page.getViewport({ scale: OCR_SCALE });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext('2d');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: context, viewport }).promise;
      const pageText = await recognizeImageBuffer(canvas.toBuffer('image/png'));
      if (pageText.trim()) {
        extractedPages.push(pageText);
      }
    } finally {
      page.cleanup();
    }
  }

  return extractedPages.join('\n');
}

const METRIC_DEFINITIONS = [
  { metricType: 'blood_glucose', unit: 'mg/dL', patterns: [/(?:blood\s*)?glucose(?:\s*(?:level|reading|result))?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?/i, /(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?\s*(?:blood\s*)?glucose/i] },
  { metricType: 'fasting_glucose', unit: 'mg/dL', patterns: [/(?:fasting|fasting\s+blood)\s*glucose(?:\s*(?:level|reading|result))?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?/i] },
  { metricType: 'hba1c', unit: '%', patterns: [/(?:hba1c|hb1ac|a1c|glycated\s+hemoglobin)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(%|mmol\/mol)?/i] },
  { metricType: 'cholesterol_total', unit: 'mg/dL', patterns: [/(?:total\s+cholesterol|cholesterol\s+total)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?/i] },
  { metricType: 'cholesterol_ldl', unit: 'mg/dL', patterns: [/(?:ldl(?:\s+cholesterol)?|cholesterol\s+ldl)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?/i] },
  { metricType: 'cholesterol_hdl', unit: 'mg/dL', patterns: [/(?:hdl(?:\s+cholesterol)?|cholesterol\s+hdl)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?/i] },
  { metricType: 'triglycerides', unit: 'mg/dL', patterns: [/(?:triglycerides?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?/i] },
  { metricType: 'hemoglobin', unit: 'g/dL', patterns: [/(?:hemoglobin|hb)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(g\/?dL|g\/?L)?/i] },
  { metricType: 'hematocrit', unit: '%', patterns: [/(?:hematocrit|hct)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(%|ratio)?/i] },
  { metricType: 'wbc_count', unit: '10^3/uL', patterns: [/(?:wbc(?:\s+count)?|white\s+blood\s+cells?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(10\^?3\/?uL|10\^?9\/?L|cells\/?uL)?/i] },
  { metricType: 'rbc_count', unit: '10^6/uL', patterns: [/(?:rbc(?:\s+count)?|red\s+blood\s+cells?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(10\^?6\/?uL|10\^?12\/?L|million\/?uL)?/i] },
  { metricType: 'platelet_count', unit: '10^3/uL', patterns: [/(?:platelet(?:\s+count)?|platelets)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(10\^?3\/?uL|10\^?9\/?L|cells\/?uL)?/i] },
  { metricType: 'creatinine', unit: 'mg/dL', patterns: [/(?:creatinine)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|umol\/?L|µmol\/?L)?/i] },
  { metricType: 'urea', unit: 'mg/dL', patterns: [/(?:urea|blood\s+urea)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?/i] },
  { metricType: 'uric_acid', unit: 'mg/dL', patterns: [/(?:uric\s+acid)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?/i] },
  { metricType: 'alt', unit: 'U/L', patterns: [/(?:alt|sgpt)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(u\/?l|iu\/?l)?/i] },
  { metricType: 'ast', unit: 'U/L', patterns: [/(?:ast|sgot)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(u\/?l|iu\/?l)?/i] },
  { metricType: 'tsh', unit: 'uIU/mL', patterns: [/(?:tsh)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(uiu\/?ml|miu\/?l)?/i] },
  { metricType: 't3', unit: 'ng/dL', patterns: [/(?:t3|tri\s*iodothyronine)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(ng\/?dl|pg\/?ml|nmol\/?l)?/i] },
  { metricType: 't4', unit: 'ug/dL', patterns: [/(?:t4|thyroxine)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(ug\/?dl|µg\/?dl|nmol\/?l)?/i] },
  { metricType: 'bilirubin_total', unit: 'mg/dL', patterns: [/(?:total\s+bilirubin|bilirubin\s+total)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|umol\/?L|µmol\/?L)?/i] },
  { metricType: 'weight', unit: 'kg', patterns: [/(?:weight)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(kg|lb|lbs)?/i] },
  { metricType: 'bmi', unit: 'kg/m2', patterns: [/(?:bmi)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(kg\/?m(?:2|²))?/i] },
  { metricType: 'sodium', unit: 'mmol/L', patterns: [/(?:sodium|na)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mmol\/?l|meq\/?l)?/i] },
  { metricType: 'potassium', unit: 'mmol/L', patterns: [/(?:potassium|k)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mmol\/?l|meq\/?l)?/i] },
  { metricType: 'calcium', unit: 'mg/dL', patterns: [/(?:calcium)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?/i] },
  { metricType: 'magnesium', unit: 'mg/dL', patterns: [/(?:magnesium)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg\/?dL|mmol\/?L)?/i] },
  { metricType: 'vitamin_d', unit: 'ng/mL', patterns: [/(?:vitamin\s*d|25\s*\(oh\)\s*vitamin\s*d)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(ng\/?ml|nmol\/?l)?/i] },
  { metricType: 'vitamin_b12', unit: 'pg/mL', patterns: [/(?:vitamin\s*b12|b12)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(pg\/?ml|pmol\/?l)?/i] },
];

function buildMetric(metricType, rawValue, rawUnit, fallbackUnit) {
  const value = Number.parseFloat(String(rawValue).replace(/,/g, ''));
  if (Number.isNaN(value)) return null;

  return {
    metricType,
    value,
    unit: rawUnit || fallbackUnit,
  };
}

function extractBloodPressure(text) {
  const patterns = [
    /(?:blood\s*pressure|bp)\s*[:\-]?\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*(?:mmhg)?/i,
    /(\d{2,3})\s*\/\s*(\d{2,3})\s*(?:mmhg)?\s*(?:blood\s*pressure|bp)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const systolic = Number.parseFloat(match[1]);
    const diastolic = Number.parseFloat(match[2]);

    if (Number.isNaN(systolic) || Number.isNaN(diastolic)) continue;

    return [
      { metricType: 'systolic_bp', value: systolic, unit: 'mmHg' },
      { metricType: 'diastolic_bp', value: diastolic, unit: 'mmHg' },
    ];
  }

  return [];
}

function extractMetricsFromText(text) {
  const normalizedText = normalizeText(text);
  const metrics = [];
  const seenMetricTypes = new Set();

  for (const definition of METRIC_DEFINITIONS) {
    for (const pattern of definition.patterns) {
      const match = normalizedText.match(pattern);
      if (!match) continue;

      const metric = buildMetric(definition.metricType, match[1], match[2], definition.unit);
      if (!metric || seenMetricTypes.has(metric.metricType)) continue;

      seenMetricTypes.add(metric.metricType);
      metrics.push(metric);
      break;
    }
  }

  for (const metric of extractBloodPressure(normalizedText)) {
    if (seenMetricTypes.has(metric.metricType)) continue;
    seenMetricTypes.add(metric.metricType);
    metrics.push(metric);
  }

  return metrics;
}

async function extractTextFromReport(filePath, mimeType) {
  if (isPdf(mimeType)) {
    return extractTextFromPdf(filePath);
  }

  if (isImage(mimeType)) {
    return extractTextFromImage(filePath);
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

async function extractMetricsFromReport(filePath, mimeType) {
  const ocrText = await extractTextFromReport(filePath, mimeType);
  const extractedMetrics = extractMetricsFromText(ocrText);

  return {
    ocrText: normalizeText(ocrText),
    extractedMetrics,
  };
}

module.exports = {
  extractMetricsFromReport,
  extractMetricsFromText,
};