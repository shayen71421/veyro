import { TrainFront } from "lucide-react";
import { VeyroCard } from "@/components/ui/veyro-card";
export function EmptyState() { return <VeyroCard className="center py-12 veyro-empty-state"><TrainFront className="text-accent" size={36}/><h2 className="mt-4 text-lg font-semibold">No journeys yet</h2><p className="muted mt-1">Your metro stories will appear here after your first scan.</p></VeyroCard>; }
