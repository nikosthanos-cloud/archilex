import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { FileText, Download, Loader2, Sparkles, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from "docx";

const REPORT_TYPES = [
  "Τεχνική Έκθεση Αρχιτεκτονικής",
  "Στατική Μελέτη",
  "Ενεργειακή Επιθεώρηση",
  "Έκθεση Αυθαιρέτου",
];

const SPECIALTIES = [
  "Αρχιτέκτονας Μηχανικός",
  "Πολιτικός Μηχανικός",
  "Μηχανολόγος Μηχανικός",
  "Ηλεκτρολόγος Μηχανικός",
  "Τοπογράφος Μηχανικός",
  "Χημικός Μηχανικός",
  "Μηχανικός Περιβάλλοντος",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateGR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function markdownToPlain(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    .replace(/\|.*\|/g, "")
    .replace(/---+/g, "")
    .replace(/&gt;/g, ">")
    .trim();
}

function buildDocxParagraphs(text: string) {
  const lines = text.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^#{1,2}\s/.test(line)) {
      const content = line.replace(/^#{1,2}\s+/, "");
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: content, bold: true, size: 28, font: "Arial" })],
          spacing: { before: 280, after: 120 },
        })
      );
    } else if (/^###\s/.test(line)) {
      const content = line.replace(/^###\s+/, "");
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: content, bold: true, size: 24, font: "Arial" })],
          spacing: { before: 200, after: 80 },
        })
      );
    } else if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s+/, "");
      const boldMatch = content.match(/^\*\*(.*?)\*\*(.*)/);
      const runs = boldMatch
        ? [
            new TextRun({ text: boldMatch[1], bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: boldMatch[2] || "", size: 22, font: "Arial" }),
          ]
        : [new TextRun({ text: content.replace(/\*\*(.*?)\*\*/g, "$1"), size: 22, font: "Arial" })];
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: runs,
          spacing: { before: 60, after: 60 },
        })
      );
    } else if (/^[-*]\s/.test(line)) {
      const content = line.replace(/^[-*]\s+/, "");
      const clean = content.replace(/\*\*(.*?)\*\*/g, "$1");
      paragraphs.push(
        new Paragraph({
          bullet: { level: 1 },
          children: [new TextRun({ text: clean, size: 22, font: "Arial" })],
          spacing: { before: 40, after: 40 },
        })
      );
    } else if (line.trim() === "" || line === "---") {
      paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { before: 60, after: 60 } }));
    } else {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const runs: TextRun[] = parts.map((part, i) =>
        new TextRun({ text: part, bold: i % 2 === 1, size: 22, font: "Arial" })
      );
      paragraphs.push(
        new Paragraph({
          children: runs,
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 60, after: 60 },
        })
      );
    }
  }
  return paragraphs;
}

export default function TechnicalReports() {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  const [reportType, setReportType] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [floors, setFloors] = useState("");
  const [constructionYear, setConstructionYear] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [engineerName, setEngineerName] = useState("");
  const [engineerSpecialty, setEngineerSpecialty] = useState("");
  const [teeNumber, setTeeNumber] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [reportDate, setReportDate] = useState(todayISO());
  const [generatedReport, setGeneratedReport] = useState("");

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports/generate", {
        reportType, address, area, floors, constructionYear,
        ownerName, engineerName, engineerSpecialty, teeNumber,
        specialNotes, reportDate: formatDateGR(reportDate),
      });
      const data = await res.json();
      if (!res.ok) throw { message: data.error, limitReached: data.limitReached };
      return data;
    },
    onSuccess: (data) => {
      setGeneratedReport(data.report);
      refreshUser();
    },
    onError: (err: any) => {
      if (err.limitReached) {
        toast({ title: "Όριο χρήσεων μηνός", description: err.message, variant: "destructive" });
      } else {
        toast({ title: "Σφάλμα", description: err.message || "Αποτυχία δημιουργίας έκθεσης.", variant: "destructive" });
      }
    },
  });

  const canGenerate =
    reportType && address && area && floors && constructionYear &&
    ownerName && engineerName && engineerSpecialty && teeNumber && reportDate;

  async function exportPDF() {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const imgW = pageW - 2 * margin;
      const imgH = (canvas.height * imgW) / canvas.width;
      let yPos = margin;
      let remaining = imgH;
      let sourceY = 0;
      while (remaining > 0) {
        const sliceH = Math.min(remaining, pageH - 2 * margin);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = (sliceH / imgW) * canvas.width;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
        const sliceData = sliceCanvas.toDataURL("image/png");
        pdf.addImage(sliceData, "PNG", margin, yPos, imgW, sliceH);
        remaining -= sliceH;
        sourceY += sliceCanvas.height;
        if (remaining > 0) {
          pdf.addPage();
          yPos = margin;
        }
      }
      const safeType = reportType.replace(/\s+/g, "_");
      pdf.save(`${safeType}_${formatDateGR(reportDate).replace(/\//g, "-")}.pdf`);
    } catch {
      toast({ title: "Σφάλμα", description: "Αποτυχία εξαγωγής PDF.", variant: "destructive" });
    }
  }

  async function exportWord() {
    try {
      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 60, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, color: "1e3a5f" },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: "ARCHILEX", bold: true, size: 32, color: "FFFFFF", font: "Arial" }),
                    ],
                    spacing: { before: 120, after: 40 },
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: "Πλατφόρμα Τεχνικών Εκθέσεων", size: 20, color: "CCDDFF", font: "Arial" }),
                    ],
                    spacing: { before: 0, after: 120 },
                  }),
                ],
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: `Ημερομηνία: ${formatDateGR(reportDate)}`, size: 20, font: "Arial" })],
                    spacing: { before: 80, after: 40 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: `Μηχανικός: ${engineerName}`, size: 20, font: "Arial" })],
                    spacing: { before: 0, after: 40 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: `ΤΕΕ: ${teeNumber}`, size: 20, font: "Arial" })],
                    spacing: { before: 0, after: 80 },
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const titleParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: reportType.toUpperCase(), bold: true, size: 32, font: "Arial", color: "1e3a5f" })],
        spacing: { before: 400, after: 200 },
      });

      const infoParagraphs = [
        new Paragraph({
          children: [
            new TextRun({ text: "Ακίνητο: ", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: address, size: 22, font: "Arial" }),
          ],
          spacing: { before: 80, after: 40 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Ιδιοκτήτης: ", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: ownerName, size: 22, font: "Arial" }),
          ],
          spacing: { before: 40, after: 40 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Επιφάνεια: ", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: `${area} τ.μ.`, size: 22, font: "Arial" }),
          ],
          spacing: { before: 40, after: 160 },
        }),
      ];

      const separatorParagraph = new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1e3a5f" } },
        children: [new TextRun("")],
        spacing: { before: 160, after: 160 },
      });

      const reportParagraphs = buildDocxParagraphs(generatedReport);

      const sigParagraphs = [
        separatorParagraph,
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `${engineerName}`, bold: true, size: 22, font: "Arial" })],
          spacing: { before: 400, after: 40 },
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: engineerSpecialty, size: 20, font: "Arial" })],
          spacing: { before: 0, after: 40 },
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `ΑΜ ΤΕΕ: ${teeNumber}`, size: 20, font: "Arial" })],
          spacing: { before: 0, after: 40 },
        }),
      ];

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 },
              },
            },
            children: [
              headerTable,
              titleParagraph,
              ...infoParagraphs,
              separatorParagraph,
              ...reportParagraphs,
              ...sigParagraphs,
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeType = reportType.replace(/\s+/g, "_");
      a.download = `${safeType}_${formatDateGR(reportDate).replace(/\//g, "-")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast({ title: "Σφάλμα", description: "Αποτυχία εξαγωγής Word.", variant: "destructive" });
    }
  }

  function renderMarkdown(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (/^#{1,2}\s/.test(line)) {
        const content = line.replace(/^#{1,2}\s+/, "");
        return (
          <h2 key={i} className="text-base font-bold text-[#1e3a5f] mt-5 mb-2 uppercase tracking-wide border-b border-blue-200 pb-1">
            {content}
          </h2>
        );
      }
      if (/^###\s/.test(line)) {
        const content = line.replace(/^###\s+/, "");
        return <h3 key={i} className="text-sm font-semibold text-[#1e3a5f] mt-3 mb-1">{content}</h3>;
      }
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s+/, "");
        return (
          <div key={i} className="flex gap-2 text-sm my-0.5">
            <span className="text-blue-600 font-semibold flex-shrink-0">{line.match(/^\d+/)![0]}.</span>
            <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
          </div>
        );
      }
      if (/^[-*]\s/.test(line)) {
        const content = line.replace(/^[-*]\s+/, "");
        return (
          <div key={i} className="flex gap-2 text-sm my-0.5 pl-3">
            <span className="text-blue-400 flex-shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
          </div>
        );
      }
      if (line.trim() === "" || line === "---") {
        return <div key={i} className="h-2" />;
      }
      return (
        <p key={i} className="text-sm text-gray-800 leading-relaxed my-0.5"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
      );
    });
  }

  return (
    <div className="flex gap-4 h-full min-h-0">
      <div className="w-80 flex-shrink-0 overflow-y-auto">
        <Card className="border border-gray-200">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Παράμετροι Έκθεσης
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-700">Τύπος Έκθεσης *</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="select-report-type" className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Επιλέξτε τύπο..." />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Στοιχεία Έργου</p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">Διεύθυνση Ακινήτου *</Label>
                  <Input data-testid="input-address" value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="πχ. Ερμού 12, Αθήνα" className="mt-1 h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-600">Επιφάνεια (τ.μ.) *</Label>
                    <Input data-testid="input-area" value={area} onChange={e => setArea(e.target.value)}
                      placeholder="πχ. 120" type="number" className="mt-1 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Αριθμός Ορόφων *</Label>
                    <Input data-testid="input-floors" value={floors} onChange={e => setFloors(e.target.value)}
                      placeholder="πχ. 2" type="number" className="mt-1 h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Έτος Κατασκευής *</Label>
                  <Input data-testid="input-construction-year" value={constructionYear} onChange={e => setConstructionYear(e.target.value)}
                    placeholder="πχ. 1990" type="number" className="mt-1 h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Ονοματεπώνυμο Ιδιοκτήτη *</Label>
                  <Input data-testid="input-owner-name" value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    placeholder="πχ. Γεώργιος Παπαδόπουλος" className="mt-1 h-8 text-xs" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Στοιχεία Μηχανικού</p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">Ονοματεπώνυμο *</Label>
                  <Input data-testid="input-engineer-name" value={engineerName} onChange={e => setEngineerName(e.target.value)}
                    placeholder="πχ. Νίκος Θανός" className="mt-1 h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Ειδικότητα *</Label>
                  <Select value={engineerSpecialty} onValueChange={setEngineerSpecialty}>
                    <SelectTrigger data-testid="select-specialty" className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Επιλέξτε..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Αρ. Μητρώου ΤΕΕ *</Label>
                  <Input data-testid="input-tee-number" value={teeNumber} onChange={e => setTeeNumber(e.target.value)}
                    placeholder="πχ. 123456" className="mt-1 h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Ημερομηνία Έκθεσης *</Label>
                  <Input data-testid="input-report-date" value={reportDate} onChange={e => setReportDate(e.target.value)}
                    type="date" className="mt-1 h-8 text-xs" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-2">
              <Label className="text-xs text-gray-600">Ειδικές Σημειώσεις / Πρόσθετα Στοιχεία</Label>
              <Textarea data-testid="textarea-notes" value={specialNotes} onChange={e => setSpecialNotes(e.target.value)}
                placeholder="Προαιρετικά στοιχεία που να συμπεριληφθούν στην έκθεση..."
                className="mt-1 text-xs resize-none" rows={3} />
            </div>

            <Button
              data-testid="button-generate-report"
              onClick={() => generateMutation.mutate()}
              disabled={!canGenerate || generateMutation.isPending}
              className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7c] text-white h-9 text-sm"
            >
              {generateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Δημιουργία...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Δημιουργία Έκθεσης</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!generatedReport && !generateMutation.isPending ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400 max-w-xs">
              <FileText className="w-14 h-14 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-500 mb-1">Καμία έκθεση ακόμη</p>
              <p className="text-xs">Συμπληρώστε τα στοιχεία αριστερά και πατήστε «Δημιουργία Έκθεσης».</p>
            </div>
          </div>
        ) : generateMutation.isPending ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-[#1e3a5f]" />
              <p className="text-sm font-medium">Το AI συντάσσει την έκθεση...</p>
              <p className="text-xs text-gray-400 mt-1">Αυτό μπορεί να διαρκέσει μέχρι 30 δευτερόλεπτα.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-sm font-semibold text-[#1e3a5f]">{reportType}</h3>
              <div className="flex gap-2">
                <Button
                  data-testid="button-export-pdf"
                  variant="outline"
                  size="sm"
                  onClick={exportPDF}
                  className="text-xs h-8 border-gray-300"
                >
                  <Download className="w-3 h-3 mr-1.5" />
                  Εξαγωγή PDF
                </Button>
                <Button
                  data-testid="button-export-word"
                  variant="outline"
                  size="sm"
                  onClick={exportWord}
                  className="text-xs h-8 border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <FileDown className="w-3 h-3 mr-1.5" />
                  Εξαγωγή Word
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div
                ref={reportRef}
                className="bg-white border border-gray-200 rounded-lg p-6 min-h-full"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-[#1e3a5f]">
                  <div>
                    <div className="text-lg font-bold text-[#1e3a5f] tracking-wide">ARCHILEX</div>
                    <div className="text-xs text-gray-500">Πλατφόρμα Τεχνικών Εκθέσεων</div>
                  </div>
                  <div className="text-right text-xs text-gray-600 space-y-0.5">
                    <div><span className="font-medium">Ημερομηνία:</span> {formatDateGR(reportDate)}</div>
                    <div><span className="font-medium">Μηχανικός:</span> {engineerName}</div>
                    <div><span className="font-medium">ΑΜ ΤΕΕ:</span> {teeNumber}</div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <h1 className="text-base font-bold text-[#1e3a5f] uppercase tracking-widest">{reportType}</h1>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded text-xs">
                  <div><span className="font-semibold text-gray-500">Ακίνητο:</span><div className="text-gray-800 mt-0.5">{address}</div></div>
                  <div><span className="font-semibold text-gray-500">Ιδιοκτήτης:</span><div className="text-gray-800 mt-0.5">{ownerName}</div></div>
                  <div><span className="font-semibold text-gray-500">Επιφάνεια:</span><div className="text-gray-800 mt-0.5">{area} τ.μ. / {floors} όροφ.</div></div>
                </div>

                <div className="text-sm leading-relaxed">
                  {renderMarkdown(generatedReport)}
                </div>

                <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end">
                  <div className="text-right text-xs text-gray-700 space-y-0.5">
                    <div className="font-semibold">{engineerName}</div>
                    <div className="text-gray-500">{engineerSpecialty}</div>
                    <div className="text-gray-500">ΑΜ ΤΕΕ: {teeNumber}</div>
                    <div className="mt-4 border-t border-gray-400 pt-1 text-gray-400 text-center min-w-[140px]">Υπογραφή</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
