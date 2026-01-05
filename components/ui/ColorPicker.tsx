"use client"

import { useState, useEffect } from "react"
import { Palette, Copy, Check } from "lucide-react"

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  presets?: string[]
  className?: string
}

export default function ColorPicker({ 
  label, 
  value, 
  onChange, 
  presets = [
    "hsl(var(--primary))", 
    "hsl(var(--secondary))", 
    "hsl(var(--destructive))", 
    "hsl(var(--success))", 
    "hsl(var(--warning))", 
    "hsl(var(--accent))"
  ], 
  className = "" 
}: ColorPickerProps) {
  const [copied, setCopied] = useState(false)
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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy color:', err)
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        {label}
      </label>
      
      {/* Color Picker Row */}
      <div className="flex items-center gap-3">
        {/* Visual Color Picker */}
        <div className="relative group">
          <input
            type="color"
            value={isValidColor ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="w-14 h-14 rounded-2xl cursor-pointer border-2 border-white shadow-lg overflow-hidden shrink-0 transition-all hover:scale-105 hover:shadow-xl"
            style={{ backgroundColor: isValidColor ? value : "#000000" }}
          />
          <div className="absolute inset-0 rounded-2xl border border-border pointer-events-none" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Palette className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
        </div>

        {/* Hex Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="#000000"
            className={`w-full px-4 py-3 bg-card border rounded-xl focus:ring-2 focus:ring-ring transition-all outline-none font-mono text-sm uppercase tracking-wider ${
              isValidColor 
                ? "border-border focus:border-ring" 
                : "border-destructive focus:border-destructive focus:ring-destructive/20"
            }`}
          />
          {!isValidColor && (
            <p className="text-xs text-destructive mt-1">Invalid hex color format</p>
          )}
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={copyToClipboard}
          className="p-3 bg-muted hover:bg-muted/80 rounded-xl transition-all border border-border hover:border-muted-foreground"
          title="Copy color code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Color Presets */}
      <div className="flex items-center gap-2 pt-2">
        <span className="text-xs text-muted-foreground font-medium">Presets:</span>
        <div className="flex gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                value === preset 
                  ? "border-ring shadow-md" 
                  : "border-card hover:border-border shadow-sm"
              }`}
              style={{ backgroundColor: preset }}
              title={preset}
            />
          ))}
        </div>
      </div>
    </div>
  )
}