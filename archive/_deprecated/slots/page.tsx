// app/slots/page.tsx
import { supabase } from "@/lib/supabase";
import AuthWrapper from "@/components/AuthWrapper";
import SlotGrid from "@/components/SlotGrid";
import BookingForm from "@/components/BookingForm";

export default async function SlotsPage() {
  // Get logged-in user session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return (
      <div className="p-8 text-red-600 font-bold">
        ❌ Error fetching session
        <pre>{JSON.stringify(sessionError, null, 2)}</pre>
      </div>
    );
  }

  if (!session?.user) {
    return <AuthWrapper />;
  }

  const userId = session.user.id;

  // Fetch available slots
  const { data: slots, error } = await supabase
    .from("parking_slots")
    .select("*")
    .eq("status", "available")
    .order("slot_number", { ascending: true });

  if (error) {
    return (
      <div className="p-8 text-red-600 font-bold">
        ❌ Supabase Error
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  // Handler when booking is submitted
  // TODO: refactor handleBooking and handleCancel later to use React state instead of window.location.reload() for smoother UX.
  const handleBooking = async (slotId: string, startTime: string, endTime: string) => {
    const { error } = await supabase.from("bookings").insert([
      {
        slot_id: slotId,
        user_id: userId,
        start_time: startTime,
        end_time: endTime,
        status: "confirmed",
      },
    ]);

    if (error) {
      alert("Error creating booking: " + error.message);
      return;
    }

    alert("Booking successful!");
    window.location.href = "/bookings"; // redirect to bookings page
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Available Slots</h1>

      <SlotGrid slots={slots} />

      <div className="mt-8">
        <BookingForm slots={slots} onSubmit={handleBooking} />
      </div>
    </main>
  );
}
