"use client"

import { useState, useEffect } from "react"

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function ColorPicker({ 
  label, 
  value, 
  onChange, 
  className = "" 
}: ColorPickerProps) {
  const [isValidColor, setIsValidColor] = useState(true)

  // Validate hex color format
  useEffect(() => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    setIsValidColor(hexRegex.test(value))
  }, [value])

  const handleTextChange = (newValue: string) => {
    // Auto-add # if not present
    if (newValue && !newValue.startsWith('#')) {
      newValue = '#' + newValue
    }
    onChange(newValue)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      
      <div className="flex items-center gap-3">
        {/* Color Swatch */}
        <div className="relative">
          <input
            type="color"
            value={isValidColor ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border border-border overflow-hidden shrink-0"
            style={{ backgroundColor: isValidColor ? value : "#000000" }}
          />
        </div>

        {/* Hex Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="#000000"
          className={`flex-1 px-3 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-ring transition-all outline-none font-mono text-sm ${
            isValidColor 
              ? "border-border focus:border-ring" 
              : "border-destructive focus:border-destructive focus:ring-destructive/20"
          }`}
        />
      </div>
      
      {!isValidColor && (
        <p className="text-xs text-destructive">Invalid hex color</p>
      )}
    </div>
  )
}