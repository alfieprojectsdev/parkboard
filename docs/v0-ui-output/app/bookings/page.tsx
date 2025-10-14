"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookingItem } from "@/components/booking-item"
import { BottomNav } from "@/components/bottom-nav"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

// Mock data
const mockRenterBookings = [
  {
    id: "1",
    slotNumber: "A-10",
    date: "Tomorrow",
    time: "9:00 AM - 5:00 PM",
    price: 400,
    status: "CONFIRMED" as const,
    contactName: "Jane Santos",
    contactPhone: "+639171234567",
  },
  {
    id: "2",
    slotNumber: "B-05",
    date: "Jan 15",
    time: "8:00 AM - 6:00 PM",
    price: 500,
    status: "PENDING" as const,
    contactName: "Mark Cruz",
    contactPhone: "+639181234567",
  },
]

const mockOwnerBookings = [
  {
    id: "3",
    slotNumber: "C-12",
    date: "Today",
    time: "10:00 AM - 4:00 PM",
    price: 240,
    status: "CONFIRMED" as const,
    contactName: "John Reyes",
    contactPhone: "+639191234567",
  },
]

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState("renter")

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-foreground">My Bookings</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="renter">As Renter ({mockRenterBookings.length})</TabsTrigger>
            <TabsTrigger value="owner">As Owner ({mockOwnerBookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="renter" className="space-y-4">
            {mockRenterBookings.length > 0 ? (
              mockRenterBookings.map((booking) => <BookingItem key={booking.id} {...booking} role="renter" />)
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No bookings yet</p>
                <Button asChild>
                  <Link href="/">Browse Available Slots</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="owner" className="space-y-4">
            {mockOwnerBookings.length > 0 ? (
              mockOwnerBookings.map((booking) => <BookingItem key={booking.id} {...booking} role="owner" />)
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No bookings yet</p>
                <Button asChild>
                  <Link href="/list">List Your Parking Slot</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  )
}
