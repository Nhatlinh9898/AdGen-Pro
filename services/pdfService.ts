
// This service handles client-side PDF processing
// It relies on pdfjs-dist being available in the importmap

export const convertPdfToImages = async (file: File): Promise<string[]> => {
  try {
    // Dynamic import to use the version from importmap
    // @ts-ignore
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    
    // Explicitly set the worker source to the CDN URL matching the version
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const imageUrls: string[] = [];
    const totalPages = pdf.numPages;

    // Limit to first 8 pages to prevent performance issues in browser
    const pagesToProcess = Math.min(totalPages, 8);

    for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale for better quality
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Convert to JPEG for efficiency
            imageUrls.push(canvas.toDataURL('image/jpeg', 0.8));
        }
    }
    
    return imageUrls;
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error("Failed to parse PDF. Please ensure it is a valid PDF file.");
  }
};
