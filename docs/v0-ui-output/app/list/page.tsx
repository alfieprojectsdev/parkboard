"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { ArrowLeft, Check } from "lucide-react"
import Link from "next/link"

export default function ListPage() {
  const [slotNumber, setSlotNumber] = useState("")
  const [type, setType] = useState<"Covered" | "Open">("Covered")
  const [price, setPrice] = useState("50")
  const [description, setDescription] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      // Reset form
      setSlotNumber("")
      setPrice("50")
      setDescription("")
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-foreground">List Your Parking Slot</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Quick Listing</CardTitle>
            <CardDescription>Fill in the details below to list your parking slot</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Slot Number */}
              <div className="space-y-2">
                <Label htmlFor="slot-number">
                  Slot Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="slot-number"
                  placeholder="e.g., A-10, B-05"
                  value={slotNumber}
                  onChange={(e) => setSlotNumber(e.target.value)}
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>
                  Type <span className="text-destructive">*</span>
                </Label>
                <RadioGroup value={type} onValueChange={(value: any) => setType(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Covered" id="covered" />
                    <Label htmlFor="covered" className="font-normal cursor-pointer">
                      Covered (Protected from weather)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Open" id="open" />
                    <Label htmlFor="open" className="font-normal cursor-pointer">
                      Open (Outdoor parking)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price">
                  Price per Hour <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                  <Input
                    id="price"
                    type="number"
                    placeholder="50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-8"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Typical rate: ₱40-60/hour</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Near elevator, well-lit area, easy access"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={submitted}
              >
                {submitted ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Listed Successfully!
                  </>
                ) : (
                  "Publish Listing"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Tips for a great listing:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Use your actual slot number for easy identification</li>
            <li>• Price competitively (₱40-60/hour is typical)</li>
            <li>• Mention nearby landmarks (elevator, entrance, etc.)</li>
            <li>• You can edit your listing anytime</li>
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
