"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, Clock } from "lucide-react"

interface BookingItemProps {
  slotNumber: string
  date: string
  time: string
  price: number
  status: "PENDING" | "CONFIRMED" | "CANCELLED"
  contactName: string
  contactPhone: string
  role: "renter" | "owner"
}

export function BookingItem({
  slotNumber,
  date,
  time,
  price,
  status,
  contactName,
  contactPhone,
  role,
}: BookingItemProps) {
  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    CONFIRMED: "bg-success/10 text-success border-success/20",
    CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">Slot {slotNumber}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {date} • {time}
              </span>
            </div>
          </div>
          <Badge variant="outline" className={statusColors[status]}>
            {status}
          </Badge>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">{role === "renter" ? "Owner" : "Renter"}</p>
            <p className="font-medium">{contactName}</p>
            <p className="text-sm text-muted-foreground">{contactPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-primary">₱{price}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-transparent"
            onClick={() => window.open(`tel:${contactPhone}`)}
          >
            <Phone className="w-4 h-4 mr-2" />
            Call {role === "renter" ? "Owner" : "Renter"}
          </Button>
          {status === "PENDING" && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive bg-transparent">
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
