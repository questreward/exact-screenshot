// Génère dans le navigateur un PDF A4 prêt à imprimer de la carte CIVITAS (format carte bancaire 85,6 × 54 mm).
export async function buildCardPdf(el: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const canvas = await html2canvas(el, { scale: 4, backgroundColor: "#ffffff", useCORS: true });
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const w = 85.6, h = 54, x = (210 - w) / 2, y = 40;
  pdf.setFontSize(14); pdf.setFont("helvetica", "bold");
  pdf.text("DOCUMENT FICTIF — CIVITAS", 105, 25, { align: "center" });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h);
  pdf.setLineDashPattern([1, 1], 0); pdf.setDrawColor(150); pdf.rect(x - 2, y - 2, w + 4, h + 4);
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  pdf.text("Découper le long des pointillés.", 105, y + h + 8, { align: "center" });
  pdf.text("Document de jeu sans aucune valeur officielle. Ne peut servir de pièce d'identité.", 105, y + h + 14, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.text("DOCUMENT FICTIF — CIVITAS", 105, 285, { align: "center" });
  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
