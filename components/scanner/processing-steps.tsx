"use client";

import { Check, LoaderCircle } from "lucide-react";
import type { ProcessingStep } from "@/types";

const steps: { id: ProcessingStep; label: string }[] = [
  { id: "qr", label: "QR detected" },
  { id: "ocr", label: "Reading ticket" },
  { id: "stations", label: "Identifying stations" },
];

export function ProcessingSteps({ current }: { current: ProcessingStep }) {
  const index = steps.findIndex((step) => step.id === current);
  return <div className="processing-steps">{steps.map((step, itemIndex) =>
    <div key={step.id} className={itemIndex <= index ? "reached" : ""}>
      {itemIndex < index
        ? <Check size={18}/>
        : itemIndex === index
          ? <LoaderCircle className="animate-spin" size={18}/>
          : <i/>}
      <span>{step.label}</span>
    </div>)}</div>;
}
