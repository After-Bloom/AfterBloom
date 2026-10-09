"use client";
import { PageHead } from "@/components/ui";
import { ProQuestions, useProQuestions } from "@/components/ProQuestions";

// Ask Bloom questions that patients chose to send to their care team. Reply within 24 hours.
export default function Questions() {
  const pq = useProQuestions();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHead title="Questions" sub="Questions your patients chose to send from Ask Bloom. Please reply within 24 hours." tag="Sample profile" />
      <ProQuestions items={pq.items} reload={pq.reload} />
    </div>
  );
}
