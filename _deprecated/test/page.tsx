import { supabase } from "@/lib/supabase";

export default async function TestPage() {
  const { data: slots, error } = await supabase
    .from("parking_slots")
    .select("*")
    .limit(5);

  if (error) {
    return (
      <div className="p-8 text-red-600">
        <h1>❌ Supabase Error</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">✅ Supabase Test</h1>
      <ul className="mt-4 space-y-2">
  {slots?.length ? (
    slots.map((slot, index) => (
      <li
        key={slot.id ?? `slot-${index}`} // fallback to index if id is missing
        className="border p-2 rounded"
      >
        {slot.slot_number || "Unnamed Slot"} — {slot.description || "No description"}
      </li>
    ))
  ) : (
    <li>No slots found.</li>
  )}
</ul>
    </main>
  );
}
