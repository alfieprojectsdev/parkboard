"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ParkingCard } from "@/components/parking-card"
import { BookingModal } from "@/components/booking-modal"
import { BottomNav } from "@/components/bottom-nav"
import { PlusCircle, Search } from "lucide-react"
import Link from "next/link"

// Mock data - replace with real data fetching
const mockSlots = [
  {
    id: "1",
    slotNumber: "A-10",
    type: "Covered" as const,
    pricePerHour: 50,
    description: "Near elevator, well-lit area",
    available: true,
  },
  {
    id: "2",
    slotNumber: "B-05",
    type: "Covered" as const,
    pricePerHour: 50,
    description: "Ground floor, easy access",
    available: true,
  },
  {
    id: "3",
    slotNumber: "C-12",
    type: "Open" as const,
    pricePerHour: 40,
    description: "Outdoor parking, spacious",
    available: true,
  },
  {
    id: "4",
    slotNumber: "A-15",
    type: "Covered" as const,
    pricePerHour: 55,
    description: "Premium spot near entrance",
    available: false,
  },
]

export default function HomePage() {
  const [selectedSlot, setSelectedSlot] = useState<(typeof mockSlots)[0] | null>(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  const handleBookSlot = (slot: (typeof mockSlots)[0]) => {
    setSelectedSlot(slot)
    setBookingModalOpen(true)
  }

  const availableCount = mockSlots.filter((s) => s.available).length

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">ParkShare</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden md:flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button size="sm" asChild className="hidden md:flex">
              <Link href="/login">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 text-balance">
              Find parking in your condo
            </h2>
            <p className="text-lg text-muted-foreground text-pretty">Rent or list parking slots with your neighbors</p>
          </div>

          {/* Quick Actions */}
          <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Button size="lg" className="h-auto py-6 bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link href="/list">
                <div className="flex flex-col items-center gap-2">
                  <PlusCircle className="w-6 h-6" />
                  <div>
                    <div className="font-semibold text-lg">List Your Slot</div>
                    <div className="text-sm opacity-90">Earn from unused parking</div>
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-auto py-6 bg-transparent"
              onClick={() => {
                document.getElementById("available-slots")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <Search className="w-6 h-6" />
                <div>
                  <div className="font-semibold text-lg">Find Parking</div>
                  <div className="text-sm text-muted-foreground">Browse available slots</div>
                </div>
              </div>
            </Button>
          </div>
        </div>
      </section>

      {/* Available Slots */}
      <section id="available-slots" className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-foreground">Available Now</h3>
              <p className="text-muted-foreground">{availableCount} slots available</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockSlots.map((slot) => (
              <ParkingCard key={slot.id} {...slot} onBook={() => handleBookSlot(slot)} />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Booking Modal */}
      {selectedSlot && (
        <BookingModal
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          slotNumber={selectedSlot.slotNumber}
          pricePerHour={selectedSlot.pricePerHour}
          type={selectedSlot.type}
        />
      )}
    </div>
  )
}
