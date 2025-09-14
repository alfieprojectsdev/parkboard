// app/bookings/page.tsx
import { supabase } from "@/lib/supabase";
import AuthWrapper from "@/components/AuthWrapper";
import UserBookingsList from "@/components/UserBookingsList";

export default async function BookingsPage() {
  // Get the currently logged-in user
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
    return <AuthWrapper />; // redirect or show login if not signed in
  }

  const userId = session.user.id;

  // Fetch the user's bookings
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: true });

  if (error) {
    return (
      <div className="p-8 text-red-600 font-bold">
        ❌ Supabase Error
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  // Handler for cancelling a booking
  // TODO: refactor handleBooking and handleCancel later to use React state instead of window.location.reload() for smoother UX
  const handleCancel = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) {
      alert("Error cancelling booking: " + error.message);
      return;
    }

    // Ideally, refetch bookings here; for now, simple page reload
    // handleCancel updates the booking’s status to "cancelled"; 
    // TODO: replace the window.location.reload() with a reactive state update 
    window.location.reload();
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
      <UserBookingsList bookings={bookings} onCancel={handleCancel} />
    </main>
  );
}
