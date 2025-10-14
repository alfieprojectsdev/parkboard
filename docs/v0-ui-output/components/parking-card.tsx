"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

interface ParkingCardProps {
  id: string
  slotNumber: string
  type: "Covered" | "Open"
  pricePerHour: number
  description?: string
  available: boolean
  onBook?: () => void
}

export function ParkingCard({ slotNumber, type, pricePerHour, description, available, onBook }: ParkingCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg text-foreground">Slot {slotNumber}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={type === "Covered" ? "default" : "secondary"} className="text-xs">
                {type === "Covered" && <Shield className="w-3 h-3 mr-1" />}
                {type}
              </Badge>
              {available && (
                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                  Available
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">₱{pricePerHour}</div>
            <div className="text-xs text-muted-foreground">/hour</div>
          </div>
        </div>

        {description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>}

        <Button
          onClick={onBook}
          disabled={!available}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          size="lg"
        >
          {available ? "Book Now" : "Unavailable"}
        </Button>
      </CardContent>
    </Card>
  )
}
