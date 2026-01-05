import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components'

interface FeedbackResponseEmailProps {
  userName: string
  feedbackId: string
  category: string
  rating: number
  status: string
  adminNotes?: string
  dashboardUrl: string
}

export const FeedbackResponseEmail = ({
  userName = 'User',
  feedbackId = 'FB-123',
  category = 'GENERAL',
  rating = 5,
  status = 'REVIEWED',
  adminNotes,
  dashboardUrl = 'https://app.secureuploadhub.com/support'
}: FeedbackResponseEmailProps) => {
  const previewText = `Thank you for your feedback! We've ${status.toLowerCase()} your submission.`

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REVIEWED': return 'bg-blue-600'
      case 'IMPLEMENTED': return 'bg-green-600'
      case 'REJECTED': return 'bg-red-600'
      default: return 'bg-gray-600'
    }
  }

  const formatCategory = (category: string) => {
    return category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ))
  }

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px]">
            <Section className="mt-[32px]">
              <div className="text-center">
                <div className="bg-purple-600 text-white p-3 rounded-lg inline-block mb-4">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            </Section>
            
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Thank You for Your Feedback!
            </Heading>
            
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {userName},
            </Text>
            
            <Text className="text-black text-[14px] leading-[24px]">
              Thank you for taking the time to share your feedback with us. Your input is valuable and helps us improve our service.
            </Text>

            <Section className="bg-gray-50 rounded-lg p-4 my-6">
              <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                <strong>Feedback Details:</strong>
              </Text>
              <Text className="text-black text-[14px] leading-[24px] m-0">
                <strong>ID:</strong> {feedbackId}
              </Text>
              <Text className="text-black text-[14px] leading-[24px] m-0">
                <strong>Category:</strong> {formatCategory(category)}
              </Text>
              <Text className="text-black text-[14px] leading-[24px] m-0 flex items-center gap-2">
                <strong>Rating:</strong> 
                <span className="flex">{renderStars(rating)}</span>
                <span>({rating}/5)</span>
              </Text>
              <Text className="text-black text-[14px] leading-[24px] m-0 flex items-center gap-2">
                <strong>Status:</strong>
                <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(status)}`}>
                  {status}
                </span>
              </Text>
            </Section>

            {adminNotes && (
              <Section className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6">
                <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                  <strong>Response from our team:</strong>
                </Text>
                <Text className="text-black text-[14px] leading-[24px] m-0">
                  {adminNotes}
                </Text>
              </Section>
            )}

            <Text className="text-black text-[14px] leading-[24px]">
              {status === 'IMPLEMENTED' && 'Great news! We\'ve implemented your suggestion. You should see the improvements in your next session.'}
              {status === 'REVIEWED' && 'We\'ve carefully reviewed your feedback and will consider it for future improvements.'}
              {status === 'REJECTED' && 'While we appreciate your feedback, we\'ve decided not to implement this particular suggestion at this time.'}
              {!['IMPLEMENTED', 'REVIEWED', 'REJECTED'].includes(status) && 'We\'re currently reviewing your feedback and will update you on any actions taken.'}
            </Text>

            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-purple-600 rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={dashboardUrl}
              >
                Submit More Feedback
              </Button>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              We're always looking for ways to improve. Feel free to share more feedback anytime!
            </Text>

            <Text className="text-black text-[14px] leading-[24px]">
              Best regards,<br />
              The SecureUploadHub Team
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default FeedbackResponseEmail