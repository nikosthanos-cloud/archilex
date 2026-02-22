import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, FolderOpen, ArrowLeft, Calendar, User, MapPin,
  Building2, Trash2, StickyNote, Send, Loader2, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, ClipboardList,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, ProjectNote } from "@shared/schema";

const STAGES = ["Προετοιμασία", "Υποβολή", "Σε εξέλιξη", "Εγκρίθηκε", "Ολοκληρώθηκε"] as const;

const PROJECT_TYPES = [
  "Νέα κατασκευή κατοικίας",
  "Νέα κατασκευή επαγγελματικού κτιρίου",
  "Προσθήκη / επέκταση",
  "Ανακαίνιση",
  "Τακτοποίηση αυθαιρέτων",
  "Αλλαγή χρήσης",
  "Κατεδάφιση",
  "Άλλο",
];

const createProjectSchema = z.object({
  name: z.string().min(2, "Εισάγετε όνομα έργου"),
  clientName: z.string().min(2, "Εισάγετε όνομα πελάτη"),
  address: z.string().min(3, "Εισάγετε διεύθυνση"),
  projectType: z.string().min(1, "Επιλέξτε τύπο έργου"),
  startDate: z.string().min(1, "Εισάγετε ημερομηνία έναρξης"),
  deadline: z.string().optional(),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

function getStatusInfo(project: Project): { label: string; color: string; icon: typeof Clock } {
  if (project.status === "Ολοκληρώθηκε") {
    return { label: "Ολοκληρώθηκε", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 };
  }
  if (project.deadline && new Date(project.deadline) < new Date()) {
    return { label: "Καθυστέρηση", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle };
  }
  return { label: project.status, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" });
}

function isOverdue(project: Project) {
  return project.deadline && new Date(project.deadline) < new Date() && project.status !== "Ολοκληρώθηκε";
}

function daysUntilDeadline(deadline: string) {
  const diff = new Date(deadline).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function StageProgress({ status }: { status: string }) {
  const currentIdx = STAGES.indexOf(status as typeof STAGES[number]);
  return (
    <div className="flex items-center gap-0">
      {STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={stage} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors
              ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {done && <CheckCircle2 className="w-3 h-3" />}
              {stage}
            </div>
            {i < STAGES.length - 1 && (
              <ChevronRight className={`w-3 h-3 mx-0.5 ${done ? "text-primary" : "text-muted-foreground/40"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProjectCard({ project, onClick, onDelete }: {
  project: Project;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const status = getStatusInfo(project);
  const StatusIcon = status.icon;
  const days = project.deadline ? daysUntilDeadline(project.deadline) : null;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-border/60"
      onClick={onClick}
      data-testid={`card-project-${project.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{project.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{project.clientName}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${status.color}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
              onClick={onDelete}
              data-testid={`button-delete-project-${project.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{project.address}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 shrink-0" />
            <span>{project.projectType}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Έναρξη: {formatDate(project.startDate)}</span>
          </div>
          {project.deadline && (
            <div className={`text-xs font-medium ${isOverdue(project) ? "text-red-600 dark:text-red-400" : days !== null && days <= 14 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
              {isOverdue(project)
                ? `${Math.abs(days!)}μ καθυστέρηση`
                : `${days}μ απομένουν`}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectDetail({ project, onBack, onUpdate }: {
  project: Project;
  onBack: () => void;
  onUpdate: (updated: Project) => void;
}) {
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState(project.deadline || "");

  const { data: notesData, isLoading: notesLoading } = useQuery<{ notes: ProjectNote[] }>({
    queryKey: ["/api/projects", project.id, "notes"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/notes`, { credentials: "include" });
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const res = await apiRequest("PATCH", `/api/projects/${project.id}`, data);
      return (await res.json()).project as Project;
    },
    onSuccess: (updated) => {
      onUpdate(updated);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Ενημερώθηκε επιτυχώς" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/projects/${project.id}/notes`, { content });
      return (await res.json()).note as ProjectNote;
    },
    onSuccess: () => {
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "notes"] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await apiRequest("DELETE", `/api/projects/${project.id}/notes/${noteId}`);
      return noteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "notes"] });
    },
  });

  const status = getStatusInfo(project);
  const StatusIcon = status.icon;
  const currentStageIdx = STAGES.indexOf(project.status as typeof STAGES[number]);

  function handleStatusChange(newStatus: string) {
    updateMutation.mutate({ status: newStatus });
  }

  function handleDeadlineSave() {
    updateMutation.mutate({ deadline: deadlineInput || undefined });
    setEditingDeadline(false);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
          Όλα τα Έργα
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{project.name}</h2>
        </div>
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${status.color}`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Στάδιο Αδειοδότησης</h3>
                <div className="overflow-x-auto pb-1">
                  <StageProgress status={project.status} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {STAGES.map((stage, i) => (
                    <Button
                      key={stage}
                      size="sm"
                      variant={project.status === stage ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => handleStatusChange(stage)}
                      disabled={updateMutation.isPending}
                      data-testid={`button-stage-${i}`}
                    >
                      {stage}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Πελάτης</p>
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {project.clientName}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Διεύθυνση</p>
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {project.address}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Τύπος Έργου</p>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {project.projectType}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Ημερομηνία Έναρξης</p>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {formatDateShort(project.startDate)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Προθεσμία</p>
                    {editingDeadline ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={deadlineInput}
                          onChange={(e) => setDeadlineInput(e.target.value)}
                          className="h-7 text-xs"
                          data-testid="input-deadline"
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={handleDeadlineSave} disabled={updateMutation.isPending}>
                          Αποθήκευση
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDeadline(false)}>
                          Ακύρωση
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 text-sm ${isOverdue(project) ? "text-red-600 dark:text-red-400" : ""}`}>
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {project.deadline ? formatDateShort(project.deadline) : <span className="text-muted-foreground italic">Δεν έχει οριστεί</span>}
                        </div>
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 text-xs text-muted-foreground"
                          onClick={() => setEditingDeadline(true)}
                          data-testid="button-edit-deadline"
                        >
                          Αλλαγή
                        </Button>
                      </div>
                    )}
                    {project.deadline && !editingDeadline && (
                      <p className={`text-[11px] mt-0.5 ${isOverdue(project) ? "text-red-500" : daysUntilDeadline(project.deadline) <= 14 ? "text-amber-500" : "text-muted-foreground"}`}>
                        {isOverdue(project)
                          ? `Εκπρόθεσμο κατά ${Math.abs(daysUntilDeadline(project.deadline))} ημέρες`
                          : `${daysUntilDeadline(project.deadline)} ημέρες απομένουν`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <Separator orientation="vertical" />

        <div className="w-72 shrink-0 flex flex-col min-h-0">
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
            <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">Σημειώσεις</span>
            {notesData && <Badge variant="secondary" className="ml-auto text-xs h-4">{notesData.notes.length}</Badge>}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {notesLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!notesLoading && notesData?.notes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 italic">Δεν υπάρχουν σημειώσεις ακόμα</p>
              )}
              {notesData?.notes.map((note) => (
                <div key={note.id} className="bg-muted/40 rounded-lg p-2.5 group relative" data-testid={`note-${note.id}`}>
                  <p className="text-xs leading-relaxed pr-5">{note.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{formatDate(note.createdAt.toString())}</p>
                  <Button
                    variant="ghost" size="icon"
                    className="absolute top-1.5 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    data-testid={`button-delete-note-${note.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-2 border-t border-border shrink-0">
            <div className="flex gap-1.5">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Προσθέστε σημείωση..."
                className="text-xs resize-none min-h-[60px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && noteText.trim()) {
                    addNoteMutation.mutate(noteText.trim());
                  }
                }}
                data-testid="input-note"
              />
              <Button
                size="icon"
                className="h-auto shrink-0"
                disabled={!noteText.trim() || addNoteMutation.isPending}
                onClick={() => addNoteMutation.mutate(noteText.trim())}
                data-testid="button-add-note"
              >
                {addNoteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Ctrl+Enter για αποστολή</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("Όλα");

  const { data, isLoading } = useQuery<{ projects: Project[] }>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateProjectForm) => {
      const res = await apiRequest("POST", "/api/projects", values);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.project as Project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowCreate(false);
      toast({ title: "Έργο δημιουργήθηκε!", description: project.name });
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: "Σφάλμα", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (selectedProject?.id === id) setSelectedProject(null);
      toast({ title: "Το έργο διαγράφηκε" });
    },
  });

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", clientName: "", address: "", projectType: "", startDate: "", deadline: "" },
  });

  const allProjects = data?.projects ?? [];
  const statuses = ["Όλα", ...Array.from(new Set(allProjects.map((p) => getStatusInfo(p).label)))];
  const filtered = filterStatus === "Όλα" ? allProjects : allProjects.filter((p) => getStatusInfo(p).label === filterStatus);

  const stats = {
    total: allProjects.length,
    overdue: allProjects.filter((p) => isOverdue(p)).length,
    inProgress: allProjects.filter((p) => p.status !== "Ολοκληρώθηκε" && !isOverdue(p)).length,
    done: allProjects.filter((p) => p.status === "Ολοκληρώθηκε").length,
  };

  if (selectedProject) {
    const live = allProjects.find((p) => p.id === selectedProject.id) ?? selectedProject;
    return (
      <ProjectDetail
        project={live}
        onBack={() => setSelectedProject(null)}
        onUpdate={(updated) => setSelectedProject(updated)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-semibold text-base">Έργα & Άδειες</h2>
          <p className="text-xs text-muted-foreground">Παρακολούθηση αδειοδότησης έργων</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5" data-testid="button-new-project">
          <Plus className="w-4 h-4" />
          Νέο Έργο
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 shrink-0">
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-700 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{stats.inProgress}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Σε εξέλιξη</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border/60 ${stats.overdue > 0 ? "border-red-200 dark:border-red-900" : ""}`}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stats.overdue > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"}`}>
              <AlertTriangle className={`w-4 h-4 ${stats.overdue > 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className={`text-lg font-bold leading-none ${stats.overdue > 0 ? "text-red-600 dark:text-red-400" : ""}`}>{stats.overdue}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Καθυστέρηση</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{stats.done}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ολοκληρώθηκαν</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {allProjects.length > 0 && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {statuses.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filterStatus === s ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setFilterStatus(s)}
              data-testid={`filter-${s}`}
            >
              {s}
              {s !== "Όλα" && (
                <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1">
                  {s === "Καθυστέρηση"
                    ? stats.overdue
                    : s === "Ολοκληρώθηκε"
                      ? stats.done
                      : allProjects.filter((p) => getStatusInfo(p).label === s).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && allProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <FolderOpen className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-medium mb-1">Δεν υπάρχουν έργα</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">Δημιουργήστε το πρώτο σας έργο για να ξεκινήσετε την παρακολούθηση αδειοδότησης.</p>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Νέο Έργο
            </Button>
          </div>
        )}

        {!isLoading && filtered.length === 0 && allProjects.length > 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Δεν βρέθηκαν έργα με αυτό το φίλτρο.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => setSelectedProject(project)}
              onDelete={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(project.id);
              }}
            />
          ))}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Νέο Έργο</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Όνομα Έργου</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. Κατοικία Παπαδόπουλου" className="h-8 text-xs" data-testid="input-project-name" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Πελάτης</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. Γιώργης Παπαδόπουλος" className="h-8 text-xs" data-testid="input-client-name" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Διεύθυνση / Τοποθεσία</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. Λεωφ. Κηφισίας 100, Μαρούσι" className="h-8 text-xs" data-testid="input-address" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Τύπος Έργου</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs" data-testid="select-project-type">
                          <SelectValue placeholder="Επιλέξτε..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Ημ. Έναρξης</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-8 text-xs" data-testid="input-start-date" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Προθεσμία (προαιρ.)</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-8 text-xs" data-testid="input-deadline-create" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Ακύρωση</Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending} data-testid="button-create-project">
                  {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <ClipboardList className="w-3.5 h-3.5 mr-2" />}
                  Δημιουργία
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
