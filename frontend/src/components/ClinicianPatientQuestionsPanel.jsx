import React, { useMemo, useState } from "react";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";
import { Button } from "@/components/ui/button.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { usePatientQuestions } from "@/context/PatientQuestionsContext.jsx";

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export default function ClinicianPatientQuestionsPanel({ encounterId }) {
  const { getForEncounter, answerQuestion } = usePatientQuestions();
  const list = getForEncounter(encounterId);
  const [drafts, setDrafts] = useState({});

  const sorted = useMemo(() => [...list].sort((a, b) => b.askedAt - a.askedAt), [list]);

  const setDraft = (id, value) => {
    setDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const submitAnswer = (questionId) => {
    const text = drafts[questionId] ?? "";
    answerQuestion(encounterId, questionId, text);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  return (
    <DashboardPanelCard
      title="Patient Questions"
      description="Questions submitted from the patient view. Respond as the care team."
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No patient questions yet for this encounter.</p>
      ) : (
        <ScrollArea className="h-[min(360px,55vh)]">
          <div className="space-y-4 pr-3">
            {sorted.map((q) => (
              <div key={q.id} className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[0.65rem] text-muted-foreground">Asked {formatTime(q.askedAt)}</p>
                <p className="mt-1 text-sm text-foreground">{q.text}</p>
                {q.doctorAnswer && q.answeredAt ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-[0.65rem] text-muted-foreground">Your reply · {formatTime(q.answeredAt)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{q.doctorAnswer}</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <textarea
                      className="health-input min-h-[5rem] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Answer as the doctor…"
                      value={drafts[q.id] ?? ""}
                      onChange={(e) => setDraft(q.id, e.target.value)}
                      rows={4}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={!(drafts[q.id] ?? "").trim()}
                      onClick={() => submitAnswer(q.id)}
                    >
                      Send answer
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </DashboardPanelCard>
  );
}
