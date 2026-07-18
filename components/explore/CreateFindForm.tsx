"use client";

import { useState } from "react";
import { Check, MapPin } from "lucide-react";
import { kochiMetroStations } from "@/data/kochi-metro-stations";
import { bestTimeOptions, categoryLabels, costLabels, environmentLabels, exploreCategories, costTypes, environmentTypes } from "@/lib/explore/types";
import { createFindInputSchema } from "@/lib/explore/schemas";
import type { CreateFindInput } from "@/lib/explore/submissions";
import { ErrorMessage } from "@/components/ui/error-message";

export function CreateFindForm({ submitting, onSubmit }: { submitting: boolean; onSubmit: (input: CreateFindInput) => Promise<void> }) {
  const [error, setError] = useState("");
  const [bestTimes, setBestTimes] = useState<string[]>([]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    const parsed = createFindInputSchema.safeParse({
      title: form.get("title"), stationId: form.get("stationId"), description: form.get("description"),
      category: form.get("category"), walkingMinutes: Number(form.get("walkingMinutes")),
      walkingTimeType: form.get("walkingTimeType"), costType: form.get("costType"), bestTimes,
      environment: form.get("environment"), latitude: Number(form.get("latitude")), longitude: Number(form.get("longitude")),
      mapsLink: form.get("mapsLink") || undefined, accessibilityNote: form.get("accessibilityNote") || null,
      confirmed: form.get("confirmed") === "on",
    });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the form and try again."); return; }
    try { await onSubmit(parsed.data); } catch { setError("We could not submit this Find. Check your details and connection."); }
  };
  return <form className="create-find-form" onSubmit={(event) => void submit(event)}>
    <label>Place name<input name="title" minLength={3} maxLength={70} required/></label>
    <label>Nearest metro station<select name="stationId" required defaultValue=""><option value="" disabled>Select a verified station</option>{kochiMetroStations.map((station) => <option value={station.id} key={station.id}>{station.name}</option>)}</select></label>
    <label>Short description<textarea name="description" minLength={30} maxLength={500} rows={5} required placeholder="Describe what makes this place useful or worth discovering."/></label>
    <div className="form-grid">
      <label>Category<select name="category">{exploreCategories.map((value) => <option value={value} key={value}>{categoryLabels[value]}</option>)}</select></label>
      <label>Walking time<input name="walkingMinutes" type="number" min={1} max={25} defaultValue={10} required inputMode="numeric"/></label>
      <label>Walking time type<select name="walkingTimeType"><option value="estimated">Estimated</option><option value="verified">Verified</option></select></label>
      <label>Cost<select name="costType">{costTypes.map((value) => <option value={value} key={value}>{costLabels[value]}</option>)}</select></label>
      <label>Setting<select name="environment">{environmentTypes.map((value) => <option value={value} key={value}>{environmentLabels[value]}</option>)}</select></label>
    </div>
    <fieldset><legend>Best times</legend><div className="option-grid">{bestTimeOptions.map((value) => <label key={value}><input type="checkbox" checked={bestTimes.includes(value)} onChange={(event) => setBestTimes((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))}/><span>{value}</span></label>)}</div></fieldset>
    <div className="form-grid">
      <label>Latitude<input name="latitude" type="number" step="any" required inputMode="decimal"/></label>
      <label>Longitude<input name="longitude" type="number" step="any" required inputMode="decimal"/></label>
    </div>
    <label>Google Maps link (optional)<span className="input-with-icon"><MapPin size={17}/><input name="mapsLink" type="url" placeholder="https://maps.google.com/…"/></span></label>
    <label>Accessibility note (optional)<textarea name="accessibilityNote" maxLength={200} rows={3}/></label>
    <label className="guidelines-confirm"><input name="confirmed" type="checkbox" required/><span><Check size={17}/>I confirm this is a real, public place near the selected station, contains no private information, is not a paid advertisement, private residence, or restricted area.</span></label>
    {error && <ErrorMessage message={error}/>}
    <button className="primary-button w-full" disabled={submitting}>{submitting ? "Submitting for review…" : "Submit Find for Review"}</button>
  </form>;
}
