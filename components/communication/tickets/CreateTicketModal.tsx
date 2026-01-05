'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Send, Loader2, AlertCircle } from 'lucide-react'
import { Priority } from '@/lib/communication-types'

interface CreateTicketModalProps {
  onTicketCreated?: () => void
}

export default function CreateTicketModal({ onTicketCreated }: CreateTicketModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'MEDIUM' as Priority
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.subject.trim() || !formData.description.trim() || !formData.category) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/communication/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create ticket')
      }

      // Reset form and close modal
      setFormData({
        subject: '',
        description: '',
        category: '',
        priority: 'MEDIUM'
      })
      setOpen(false)
      onTicketCreated?.()
    } catch (error) {
      console.error('Error creating ticket:', error)
      setError(error instanceof Error ? error.message : 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  const priorityColors = {
    LOW: 'text-muted-foreground',
    MEDIUM: 'text-primary',
    HIGH: 'text-warning',
    URGENT: 'text-destructive'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg border-border">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold text-foreground">Create Support Ticket</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium text-foreground">
              Subject *
            </Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="bg-card border-border focus:ring-ring"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium text-foreground">
                Category *
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                required
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Support</SelectItem>
                  <SelectItem value="technical">Technical Issue</SelectItem>
                  <SelectItem value="billing">Billing & Account</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-medium text-foreground">
                Priority
              </Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: Priority) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">
                    <span className={priorityColors.LOW}>Low</span>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <span className={priorityColors.MEDIUM}>Medium</span>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <span className={priorityColors.HIGH}>High</span>
                  </SelectItem>
                  <SelectItem value="URGENT">
                    <span className={priorityColors.URGENT}>Urgent</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Please provide detailed information about your issue..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="bg-card border-border focus:ring-ring resize-none"
              required
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

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
              className="border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}