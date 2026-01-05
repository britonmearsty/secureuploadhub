'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Star, Send } from 'lucide-react'
import { FeedbackCategory } from '@/lib/communication-types'

interface FeedbackFormProps {
  onFeedbackSubmitted?: () => void
}

export default function FeedbackForm({ onFeedbackSubmitted }: FeedbackFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
    category: '' as FeedbackCategory | ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.rating === 0 || !formData.category) {
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

      // Reset form
      setFormData({
        rating: 0,
        comment: '',
        category: ''
      })
      onFeedbackSubmitted?.()
      // TODO: Show success toast
    } catch (error) {
      console.error('Error submitting feedback:', error)
      // TODO: Show error toast
    } finally {
      setLoading(false)
    }
  }

  const StarRating = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
            className={`p-1 rounded transition-colors ${
              star <= formData.rating
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <Star className="h-6 w-6 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {formData.rating > 0 && (
            <>
              {formData.rating} star{formData.rating !== 1 ? 's' : ''}
              {formData.rating === 5 && ' - Excellent!'}
              {formData.rating === 4 && ' - Good'}
              {formData.rating === 3 && ' - Average'}
              {formData.rating === 2 && ' - Poor'}
              {formData.rating === 1 && ' - Very Poor'}
            </>
          )}
        </span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Rating *</Label>
        <StarRating />
        <p className="text-sm text-gray-500">
          How would you rate your overall experience?
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select 
          value={formData.category} 
          onValueChange={(value: FeedbackCategory) => setFormData(prev => ({ ...prev, category: value }))}
          required
        >
          <SelectTrigger>
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
        <Label htmlFor="comment">Comments (Optional)</Label>
        <Textarea
          id="comment"
          placeholder="Tell us more about your experience..."
          value={formData.comment}
          onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
          rows={4}
        />
      </div>

      <Button 
        type="submit" 
        disabled={formData.rating === 0 || !formData.category || loading}
        className="w-full"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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