import jsPDF from 'jspdf';
import { Measure } from '@/types';
import { transposeMeasures } from './noteUtils';

interface PdfOptions {
  title: string;
  composer?: string;
  key: string;
  targetKey: string;
  tempo: number;
  timeSignature: string;
  measures: Measure[];
  lyrics?: string;
  svgElement: SVGElement;
}

export async function generatePDF(options: PdfOptions): Promise<void> {
  const { title, key, targetKey, tempo, timeSignature, svgElement } = options;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(options.title || 'Untitled', pdfWidth / 2, 40, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const metaLine = `Key: ${targetKey !== key ? `${targetKey} (transposed from ${key})` : key}  |  Tempo: ${tempo} BPM  |  Time: ${timeSignature}`;
  pdf.text(metaLine, pdfWidth / 2, 60, { align: 'center' });

  // Convert SVG to PNG via canvas
  const canvas = document.createElement('canvas');
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });

  const imgData = canvas.toDataURL('image/png');
  const imgAspect = canvas.height / canvas.width;
  const imgWidth = pdfWidth - 80;
  const imgHeight = imgWidth * imgAspect;
  const maxHeight = pdfHeight - 100;

  if (imgHeight <= maxHeight) {
    pdf.addImage(imgData, 'PNG', 40, 75, imgWidth, imgHeight);
  } else {
    // Multi-page: clip and offset using canvas slices
    const scale = canvas.width / imgWidth;
    const slicePixels = Math.round(maxHeight * scale);
    const pages = Math.ceil(canvas.height / slicePixels);
    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(slicePixels, canvas.height - i * slicePixels);
      const sliceCtx = sliceCanvas.getContext('2d')!;
      sliceCtx.drawImage(canvas, 0, i * slicePixels, sliceCanvas.width, sliceCanvas.height, 0, 0, sliceCanvas.width, sliceCanvas.height);
      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHeight = (sliceCanvas.height / scale);
      pdf.addImage(sliceData, 'PNG', 40, 75, imgWidth, sliceHeight);
    }
  }

  // Lyrics page
  if (options.lyrics?.trim()) {
    pdf.addPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Lyrics', 40, 40);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const lines = pdf.splitTextToSize(options.lyrics, pdfWidth - 80);
    pdf.text(lines, 40, 65);
  }

  pdf.save(`${title.replace(/[^a-z0-9]/gi, '_')}_${targetKey}.pdf`);
}
