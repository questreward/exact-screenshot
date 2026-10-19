// PDF A4 d'un document CIVITAS, toujours marqué « DOCUMENT FICTIF — CIVITAS ».
export async function buildDocPdf(el: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const maxW = 180, maxH = 250;
  let w = maxW, h = (canvas.height / canvas.width) * w;
  if (h > maxH) { h = maxH; w = (canvas.width / canvas.height) * h; }
  pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
  pdf.text("DOCUMENT FICTIF — CIVITAS", 105, 14, { align: "center" });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", (210 - w) / 2, 20, w, h);
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  pdf.text("Document de jeu sans aucune valeur officielle.", 105, 280, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.text("DOCUMENT FICTIF — CIVITAS", 105, 288, { align: "center" });
  return pdf.output("blob");
}
