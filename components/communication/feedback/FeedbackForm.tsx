'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Star, Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { FeedbackCategory } from '@/lib/communication-types'

interface FeedbackFormProps {
  onFeedbackSubmitted?: () => void
}

export default function FeedbackForm({ onFeedbackSubmitted }: FeedbackFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
    category: '' as FeedbackCategory | ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    
    if (formData.rating === 0 || !formData.category) {
      setError('Please provide a rating and select a category')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/communication/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit feedback')
      }

      // Reset form and show success
      setFormData({
        rating: 0,
        comment: '',
        category: ''
      })
      setSuccess(true)
      onFeedbackSubmitted?.()
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  const StarRating = () => {
    const ratingLabels = {
      1: 'Very Poor',
      2: 'Poor', 
      3: 'Average',
      4: 'Good',
      5: 'Excellent'
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1 rounded-lg transition-all duration-200 ${
                star <= formData.rating
                  ? 'text-warning hover:text-warning/80'
                  : 'text-muted-foreground hover:text-muted-foreground/80'
              }`}
            >
              <Star className={`h-8 w-8 ${star <= formData.rating ? 'fill-current' : ''}`} />
            </motion.button>
          ))}
        </div>
        {formData.rating > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <span className="text-sm font-medium text-foreground">
              {formData.rating} star{formData.rating !== 1 ? 's' : ''}
            </span>
            <span className="text-sm text-muted-foreground">
              - {ratingLabels[formData.rating as keyof typeof ratingLabels]}
            </span>
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          Rating *
        </Label>
        <StarRating />
        <p className="text-sm text-muted-foreground">
          How would you rate your overall experience?
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm font-medium text-foreground">
          Category *
        </Label>
        <Select 
          value={formData.category} 
          onValueChange={(value: FeedbackCategory) => setFormData(prev => ({ ...prev, category: value }))}
          required
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder="Select feedback category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GENERAL">General Experience</SelectItem>
            <SelectItem value="BUG_REPORT">Bug Report</SelectItem>
            <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
            <SelectItem value="UI_UX">User Interface & Experience</SelectItem>
            <SelectItem value="PERFORMANCE">Performance</SelectItem>
            <SelectItem value="BILLING">Billing & Pricing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment" className="text-sm font-medium text-foreground">
          Comments (Optional)
        </Label>
        <Textarea
          id="comment"
          placeholder="Tell us more about your experience..."
          value={formData.comment}
          onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
          rows={4}
          className="bg-card border-border focus:ring-ring resize-none"
        />
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2 text-destructive text-sm"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-success/10 border border-success/20 rounded-xl flex items-center gap-2 text-success text-sm"
        >
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Thank you for your feedback! We appreciate your input.
        </motion.div>
      )}

      <Button 
        type="submit" 
        disabled={formData.rating === 0 || !formData.category || loading}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Submit Feedback
          </>
        )}
      </Button>
    </form>
  )
}