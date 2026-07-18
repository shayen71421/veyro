import { VeyroCard } from "@/components/ui/veyro-card";
export function StatCard({ value, label }: { value: string | number; label: string }) { return <VeyroCard className="stat-card" data-animate><strong>{value}</strong><span>{label}</span></VeyroCard>; }
