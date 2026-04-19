import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
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

/** Patient: submit a question for the care team (stored locally until a clinician answers). */
export function PatientAskTeamCard({ encounterId }) {
  const { askQuestion } = usePatientQuestions();
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const id = askQuestion(encounterId, text);
    if (id) {
      setText("");
      setSent(true);
      window.setTimeout(() => setSent(false), 4000);
    }
  };

  return (
    <Card className="gap-0 border-border py-0">
      <CardHeader className="pb-3 pt-6">
        <CardTitle>Ask Your Care Team</CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        <form className="flex flex-col gap-2" onSubmit={submit}>
          <textarea
            className="health-input min-h-[5rem] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a question for your doctor or nurse…"
            rows={4}
          />
          <Button type="submit" variant="primary" disabled={!text.trim()}>
            Send question
          </Button>
          {sent ? <p className="text-xs text-muted-foreground">Sent. Your team can reply when they review messages.</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

/** Patient: doctor answers surfaced here (same encounter). */
export function PatientAnsweredQuestionsCard({ encounterId }) {
  const { getForEncounter } = usePatientQuestions();
  const all = getForEncounter(encounterId);
  const answered = all.filter((q) => q.doctorAnswer && q.answeredAt);

  return (
    <Card className="gap-0 border-border py-0">
      <CardHeader className="pb-3 pt-6">
        <CardTitle>Answered Questions</CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        {answered.length === 0 ? (
          <p className="text-sm text-muted-foreground">When your care team answers a question, it will appear here.</p>
        ) : (
          <ScrollArea className="h-[min(280px,50vh)]">
            <div className="space-y-4 pr-3">
              {answered.map((q) => (
                <div key={q.id} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[0.65rem] text-muted-foreground">{formatTime(q.answeredAt)}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Your question</p>
                  <p className="text-sm text-foreground">{q.text}</p>
                  <p className="mt-2 text-sm font-medium text-foreground">Care team reply</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{q.doctorAnswer}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
