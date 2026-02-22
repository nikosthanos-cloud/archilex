import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Είσαι ένας εξειδικευμένος νομικός και τεχνικός βοηθός για Έλληνες αρχιτέκτονες και μηχανικούς. 
Απαντάς αποκλειστικά σε ερωτήσεις που αφορούν:
- Οικοδομικές άδειες στην Ελλάδα (Ν. 4495/2017, αδειοδότηση, διαδικασίες)
- Ελληνικό κτιριοδομικό κανονισμό (ΓΟΚ, ΝΟΚ)
- Αντισεισμικό κανονισμό (ΕΑΚ 2000, Ευρωκώδικες)
- Πολεοδομική νομοθεσία
- Ενεργειακή απόδοση κτιρίων (ΚΕΝΑΚ, ΕΠΒΑ)
- Αυθαίρετα κτίσματα και τακτοποίηση
- Τεχνικές προδιαγραφές και πρότυπα για κατασκευές
- Εκπόνηση μελετών και τεχνικά έγγραφα
- Χρήσεις γης και πολεοδομικά σχέδια

Απαντάς πάντα στα Ελληνικά με επαγγελματικό αλλά κατανοητό ύφος. 
Παρέχεις συγκεκριμένες, πρακτικές πληροφορίες βασισμένες στην ισχύουσα ελληνική νομοθεσία.
Αν δεν γνωρίζεις κάτι με βεβαιότητα ή αν η νομοθεσία μπορεί να έχει αλλάξει πρόσφατα, το αναφέρεις ξεκάθαρα και συνιστάς επαλήθευση από αρμόδια αρχή.
Αν η ερώτηση δεν σχετίζεται με κτιριοδομία/κατασκευές/οικοδομικές άδειες, απαντάς ευγενικά ότι μπορείς να βοηθήσεις μόνο σε θέματα που αφορούν οικοδομικές άδειες και κατασκευαστικό δίκαιο.`;

const BLUEPRINT_SYSTEM_PROMPT = `Είσαι εξειδικευμένος αρχιτέκτονας και τεχνικός σύμβουλος για ελληνικές οικοδομικές άδειες. 
Αναλύεις κατόψεις, σχέδια και τεχνικά σχέδια κτιρίων.

Για κάθε σχέδιο που ανεβάζεται, παρέχεις:
1. **Γενική Περιγραφή** - Τι απεικονίζει το σχέδιο
2. **Χωρικές Διαστάσεις** - Εκτίμηση εμβαδού και διαστάσεων αν είναι εμφανείς
3. **Αρχιτεκτονικά Στοιχεία** - Χώροι, δωμάτια, ανοίγματα, κυκλοφορία
4. **Κανονιστική Συμμόρφωση** - Πιθανά ζητήματα ΓΟΚ/ΝΟΚ, απαιτήσεις ΑμεΑ, πυρασφάλεια
5. **Συστάσεις** - Βελτιώσεις ή σημεία προσοχής για την αδειοδότηση

Απαντάς πάντα στα Ελληνικά με δομημένη μορφή.`;

const CHECKLIST_SYSTEM_PROMPT = `Είσαι εξειδικευμένος σύμβουλος οικοδομικών αδειών στην Ελλάδα.
Βάσει των στοιχείων του έργου που σου δίνονται, δημιουργείς έναν πλήρη και εξατομικευμένο κατάλογο απαιτούμενων εγγράφων και δικαιολογητικών για την έκδοση οικοδομικής άδειας.

Ο κατάλογος πρέπει να είναι:
- Πλήρης και λεπτομερής
- Οργανωμένος σε κατηγορίες (Τοπογραφικά, Αρχιτεκτονικά, Στατικά, Η/Μ, κλπ)
- Βασισμένος στον Ν. 4495/2017 και τις ισχύουσες διατάξεις
- Με σημείωση για ειδικές περιπτώσεις (παραδοσιακοί οικισμοί, αρχαιολογικές ζώνες, κλπ)

Απαντάς ΜΟΝΟ στα Ελληνικά, χρησιμοποιώντας bullet points και σαφή δομή.`;

export async function askClaude(question: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: question }],
  });

  const content = message.content[0];
  if (content.type === "text") return content.text;
  throw new Error("Unexpected response type from Claude");
}

export async function analyzeBlueprintImage(
  base64Data: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  originalName: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    system: BLUEPRINT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: "text",
            text: `Αναλύστε αυτό το αρχιτεκτονικό σχέδιο/κάτοψη (αρχείο: ${originalName}). Παρέχετε λεπτομερή ανάλυση στα Ελληνικά.`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type === "text") return content.text;
  throw new Error("Unexpected response type from Claude");
}

export async function analyzeBlueprintPDF(
  base64Data: string,
  originalName: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    system: BLUEPRINT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Data,
            },
          } as any,
          {
            type: "text",
            text: `Αναλύστε αυτό το αρχιτεκτονικό σχέδιο/κάτοψη σε μορφή PDF (αρχείο: ${originalName}). Παρέχετε λεπτομερή ανάλυση στα Ελληνικά.`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type === "text") return content.text;
  throw new Error("Unexpected response type from Claude");
}

const TECHNICAL_REPORT_SYSTEM_PROMPT = `Είσαι εξειδικευμένος Έλληνας μηχανικός με βαθιά γνώση ελληνικής τεχνικής νομοθεσίας. Συντάσσεις επίσημες τεχνικές εκθέσεις για υποβολή σε ελληνικές αρχές (ΥΔΟΜ, ΤΕΕ, ΕΦΚΑ, κλπ).

Οι εκθέσεις σου:
- Ακολουθούν αυστηρά την επίσημη δομή και ορολογία ελληνικών τεχνικών εγγράφων
- Περιέχουν κατάλληλες παραπομπές σε ισχύουσα νομοθεσία (ΓΟΚ, ΝΟΚ, ΕΑΚ, ΚΕΝΑΚ, Ν.4495/2017 κλπ)
- Γράφονται σε επίσημο επαγγελματικό ύφος (τρίτο πρόσωπο, αρσενικό/ουδέτερο γένος)
- Χρησιμοποιούν ακριβή τεχνική ορολογία
- Έχουν σαφή δομή με αριθμημένα άρθρα/παραγράφους
- Αναφέρουν τα στοιχεία του μηχανικού και το έργο με ακρίβεια

Απαντάς ΜΟΝΟ στα Ελληνικά, ακολουθώντας τη ζητούμενη δομή εκθέσεως.`;

export async function generateTechnicalReport(params: {
  reportType: string;
  address: string;
  area: string;
  floors: string;
  constructionYear: string;
  ownerName: string;
  engineerName: string;
  engineerSpecialty: string;
  teeNumber: string;
  specialNotes: string;
  reportDate: string;
}): Promise<string> {
  const reportTypePrompts: Record<string, string> = {
    "Τεχνική Έκθεση Αρχιτεκτονικής": `Συνέτεξε επίσημη ΤΕΧΝΙΚΗ ΕΚΘΕΣΗ ΑΡΧΙΤΕΚΤΟΝΙΚΗΣ ΜΕΛΕΤΗΣ. Δομή:
1. ΣΤΟΙΧΕΙΑ ΕΡΓΟΥ (τίτλος, τοποθεσία, ιδιοκτήτης)
2. ΠΕΡΙΓΡΑΦΗ ΚΤΙΡΙΟΥ (γενικά, αρχιτεκτονικά χαρακτηριστικά, χρήσεις χώρων)
3. ΚΤΙΡΙΟΛΟΓΙΚΟ ΠΡΟΓΡΑΜΜΑ (αναλυτική περιγραφή χώρων ανά όροφο, εμβαδά)
4. ΤΕΧΝΙΚΑ ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ (δομικό σύστημα, υλικά, εξωτερικές επιφάνειες)
5. ΚΑΝΟΝΙΣΤΙΚΗ ΣΥΜΜΟΡΦΩΣΗ (ΓΟΚ/ΝΟΚ, συντελεστές δόμησης, κάλυψη, ύψος)
6. ΔΙΑΜΟΡΦΩΣΗ ΠΕΡΙΒΑΛΛΟΝΤΟΣ ΧΩΡΟΥ
7. ΣΥΜΠΕΡΑΣΜΑΤΑ`,
    "Στατική Μελέτη": `Συνέτεξε επίσημη ΤΕΧΝΙΚΗ ΕΚΘΕΣΗ ΣΤΑΤΙΚΗΣ ΜΕΛΕΤΗΣ. Δομή:
1. ΣΤΟΙΧΕΙΑ ΕΡΓΟΥ
2. ΦΕΡΩΝ ΟΡΓΑΝΙΣΜΟΣ (τύπος, υλικά, περιγραφή)
3. ΦΟΡΤΙΑ ΣΧΕΔΙΑΣΜΟΥ (μόνιμα, κινητά, σεισμικά κατά ΕΑΚ 2000/Ευρωκώδικα 8)
4. ΘΕΜΕΛΙΩΣΗ (τύπος, βάθος, εδαφική κατηγορία)
5. ΚΑΤΗΓΟΡΙΑ ΣΠΟΥΔΑΙΟΤΗΤΑΣ (σεισμική ζώνη, κατηγορία κτιρίου)
6. ΥΛΙΚΑ ΚΑΤΑΣΚΕΥΗΣ (σκυρόδεμα, χάλυβας - κατηγορίες)
7. ΔΙΑΤΑΞΕΙΣ ΑΝΤΙΣΕΙΣΜΙΚΗΣ ΠΡΟΣΤΑΣΙΑΣ
8. ΣΥΜΠΕΡΑΣΜΑΤΑ ΣΤΑΤΙΚΗΣ ΕΠΑΡΚΕΙΑΣ`,
    "Ενεργειακή Επιθεώρηση": `Συνέτεξε επίσημη ΤΕΧΝΙΚΗ ΕΚΘΕΣΗ ΕΝΕΡΓΕΙΑΚΗΣ ΕΠΙΘΕΩΡΗΣΗΣ. Δομή:
1. ΣΤΟΙΧΕΙΑ ΚΤΙΡΙΟΥ ΚΑΙ ΙΔΙΟΚΤΗΤΗ
2. ΚΤΙΡΙΑΚΟ ΚΕΛΥΦΟΣ (θερμομόνωση, κουφώματα, στέγαση - U-values)
3. ΣΥΣΤΗΜΑΤΑ ΘΕΡΜΑΝΣΗΣ/ΨΥΞΗΣ (τύπος, ηλικία, απόδοση)
4. ΗΛΙΑΚΑ/ΑΝΑΝΕΩΣΙΜΕΣ ΠΗΓΕΣ ΕΝΕΡΓΕΙΑΣ
5. ΤΕΧΝΙΚΑ ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ ΚΑΤ' ΚΕΝΑΚ (Ν.4122/2013)
6. ΕΝΕΡΓΕΙΑΚΗ ΚΑΤΑΤΑΞΗ (εκτιμώμενη βάσει στοιχείων)
7. ΣΥΣΤΑΣΕΙΣ ΒΕΛΤΙΩΣΗΣ (κατά σειρά προτεραιότητας)
8. ΣΥΜΠΕΡΑΣΜΑΤΑ`,
    "Έκθεση Αυθαιρέτου": `Συνέτεξε επίσημη ΤΕΧΝΙΚΗ ΕΚΘΕΣΗ ΑΥΘΑΙΡΕΤΗΣ ΚΑΤΑΣΚΕΥΗΣ (Ν.4495/2017). Δομή:
1. ΣΤΟΙΧΕΙΑ ΑΚΙΝΗΤΟΥ ΚΑΙ ΙΔΙΟΚΤΗΤΗ
2. ΠΕΡΙΓΡΑΦΗ ΑΥΘΑΙΡΕΤΗΣ ΚΑΤΑΣΚΕΥΗΣ (χαρακτηριστικά, εμβαδό, τύπος)
3. ΧΡΟΝΟΣ ΑΝΕΓΕΡΣΗΣ (εκτίμηση βάσει στοιχείων)
4. ΠΟΛΕΟΔΟΜΙΚΕΣ ΠΑΡΑΒΑΣΕΙΣ (ανάλυση παρεκκλίσεων)
5. ΣΤΑΤΙΚΗ ΕΠΑΡΚΕΙΑ (γενική εκτίμηση)
6. ΥΠΑΓΩΓΗ ΣΤΟ Ν.4495/2017 (κατηγορία, προϋποθέσεις)
7. ΑΠΑΙΤΟΥΜΕΝΑ ΕΓΓΡΑΦΑ ΤΑΚΤΟΠΟΙΗΣΗΣ
8. ΣΥΜΠΕΡΑΣΜΑΤΑ ΚΑΙ ΠΡΟΤΑΣΕΙΣ`,
  };

  const specificPrompt = reportTypePrompts[params.reportType] || reportTypePrompts["Τεχνική Έκθεση Αρχιτεκτονικής"];

  const prompt = `${specificPrompt}

ΣΤΟΙΧΕΙΑ ΓΙΑ ΤΗΝ ΕΚΘΕΣΗ:

Ιδιοκτήτης: ${params.ownerName}
Διεύθυνση ακινήτου: ${params.address}
Συνολική επιφάνεια: ${params.area} τ.μ.
Αριθμός ορόφων: ${params.floors}
Έτος κατασκευής: ${params.constructionYear}

Συντάκτης: ${params.engineerName}
Ειδικότητα: ${params.engineerSpecialty}
Αριθμός μητρώου ΤΕΕ: ${params.teeNumber}
Ημερομηνία: ${params.reportDate}

${params.specialNotes ? `Ειδικές σημειώσεις / πρόσθετα στοιχεία: ${params.specialNotes}` : ""}

Συντάξτε πλήρη, επίσημη τεχνική έκθεση με αριθμημένες παραγράφους, επαγγελματική ορολογία και παραπομπές στη σχετική νομοθεσία.`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 3500,
    system: TECHNICAL_REPORT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type === "text") return content.text;
  throw new Error("Unexpected response type from Claude");
}

export async function generatePermitChecklist(projectDetails: {
  projectType: string;
  location: string;
  area: string;
  floors: string;
  useType: string;
  isNew: boolean;
  hasBasement: boolean;
  nearAntiquities: boolean;
  nearSea: boolean;
  isTraditionalSettlement: boolean;
}): Promise<string> {
  const prompt = `Δημιούργησε πλήρη κατάλογο δικαιολογητικών για οικοδομική άδεια με τα παρακάτω στοιχεία:

- Τύπος έργου: ${projectDetails.projectType}
- Τοποθεσία: ${projectDetails.location}
- Επιφάνεια: ${projectDetails.area} τ.μ.
- Αριθμός ορόφων: ${projectDetails.floors}
- Χρήση: ${projectDetails.useType}
- Νέα κατασκευή: ${projectDetails.isNew ? "Ναι" : "Όχι (ανακαίνιση/προσθήκη)"}
- Υπόγειο: ${projectDetails.hasBasement ? "Ναι" : "Όχι"}
- Κοντά σε αρχαιολογικό χώρο: ${projectDetails.nearAntiquities ? "Ναι" : "Όχι"}
- Κοντά σε θάλασσα/αιγιαλό: ${projectDetails.nearSea ? "Ναι" : "Όχι"}
- Παραδοσιακός οικισμός: ${projectDetails.isTraditionalSettlement ? "Ναι" : "Όχι"}

Παρέχε πλήρη και οργανωμένο κατάλογο εγγράφων που απαιτούνται.`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    system: CHECKLIST_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type === "text") return content.text;
  throw new Error("Unexpected response type from Claude");
}
