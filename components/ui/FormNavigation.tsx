"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react"

interface FormStep {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isValid?: boolean
  isRequired?: boolean
}

interface FormNavigationProps {
  steps: FormStep[]
  currentStep: string
  onStepChange: (stepId: string) => void
  onNext?: () => void
  onPrevious?: () => void
  onSubmit?: () => void
  isSubmitting?: boolean
  canProceed?: boolean
  className?: string
}

export default function FormNavigation({
  steps,
  currentStep,
  onStepChange,
  onNext,
  onPrevious,
  onSubmit,
  isSubmitting = false,
  canProceed = true,
  className = ""
}: FormNavigationProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentIndex === steps.length - 1

  const getStepStatus = (step: FormStep, index: number) => {
    if (index < currentIndex) {
      return step.isValid !== false ? "completed" : "error"
    }
    if (index === currentIndex) {
      return "current"
    }
    return "upcoming"
  }

  const handleStepClick = (step: FormStep, index: number) => {
    // Allow navigation to previous steps or current step
    if (index <= currentIndex) {
      onStepChange(step.id)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon
          const status = getStepStatus(step, index)
          const isClickable = index <= currentIndex

          return (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStepClick(step, index)}
                disabled={!isClickable}
                className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  status === "completed"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : status === "current"
                    ? "bg-primary border-primary text-primary-foreground"
                    : status === "error"
                    ? "bg-destructive border-destructive text-destructive-foreground"
                    : "bg-muted border-border text-muted-foreground"
                } ${isClickable ? "hover:scale-105 cursor-pointer" : "cursor-not-allowed"}`}
              >
                {status === "completed" ? (
                  <Check className="w-5 h-5" />
                ) : status === "error" ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                
                {status === "current" && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 1.2, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </button>

              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 transition-colors ${
                  index < currentIndex ? "bg-emerald-500" : "bg-border"
                }`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Labels */}
      <div className="flex items-center justify-between text-sm">
        {steps.map((step, index) => {
          const status = getStepStatus(step, index)
          return (
            <div
              key={`${step.id}-label`}
              className={`text-center transition-colors ${
                status === "current"
                  ? "text-foreground font-semibold"
                  : status === "completed"
                  ? "text-emerald-600 font-medium"
                  : status === "error"
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }`}
            >
              <div className="font-medium">{step.label}</div>
              {step.isRequired && status === "upcoming" && (
                <div className="text-xs text-muted-foreground mt-0.5">Required</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstStep || isSubmitting}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            isFirstStep || isSubmitting
              ? "text-muted-foreground cursor-not-allowed"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="text-sm text-muted-foreground">
          Step {currentIndex + 1} of {steps.length}
        </div>

        {isLastStep ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canProceed || isSubmitting}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-semibold transition-all ${
              canProceed && !isSubmitting
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                Creating...
              </>
            ) : (
              <>
                Create Portal
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed || isSubmitting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              canProceed && !isSubmitting
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}