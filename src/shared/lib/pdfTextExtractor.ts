import * as pdfjsLib from "pdfjs-dist";

// Configure the worker source for pdf.js to use local file
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export interface PDFExtractionResult {
  text: string;
  fileSizeMB: number;
  textSizeMB: number;
}

export interface PDFSizeValidation {
  valid: boolean;
  error?: string;
  fileSizeMB: number;
  textSizeMB: number;
}

const MAX_TEXT_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_FILE_SIZE_MB = 10; // 10MB

/**
 * Extracts text from a PDF file
 * @param file - The PDF file to extract text from
 * @returns The extracted text and size information
 */
export async function extractTextFromPDF(
  file: File
): Promise<PDFExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let totalText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    totalText += pageText + "\n";
  }

  const textSize = new TextEncoder().encode(totalText).length;
  const fileSizeMB = file.size / (1024 * 1024);
  const textSizeMB = textSize / (1024 * 1024);

  return {
    text: totalText,
    fileSizeMB,
    textSizeMB,
  };
}

/**
 * Validates PDF file and extracted text size
 * @param fileSizeMB - File size in MB
 * @param textSizeMB - Extracted text size in MB
 * @returns Validation result with error message if invalid
 */
export function validatePDFSize(
  fileSizeMB: number,
  textSizeMB: number
): PDFSizeValidation {
  const textSizeBytes = textSizeMB * 1024 * 1024;

  if (fileSizeMB > MAX_FILE_SIZE_MB || textSizeBytes > MAX_TEXT_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size: ${fileSizeMB.toFixed(1)}MB (limit: ${MAX_FILE_SIZE_MB}MB)\nText size: ${textSizeMB.toFixed(1)}MB (limit: 2MB)`,
      fileSizeMB,
      textSizeMB,
    };
  }

  return {
    valid: true,
    fileSizeMB,
    textSizeMB,
  };
}

/**
 * Extracts and validates text from a PDF file
 * @param file - The PDF file to process
 * @returns The extracted text if valid, throws error if invalid
 */
export async function extractAndValidatePDFText(file: File): Promise<string> {
  const result = await extractTextFromPDF(file);
  const validation = validatePDFSize(result.fileSizeMB, result.textSizeMB);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return result.text;
}
