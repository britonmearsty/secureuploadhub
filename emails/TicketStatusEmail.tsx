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

interface TicketStatusEmailProps {
  userName: string
  ticketId: string
  subject: string
  oldStatus: string
  newStatus: string
  adminName?: string
  dashboardUrl: string
}

export const TicketStatusEmail = ({
  userName = 'User',
  ticketId = 'TICKET-123',
  subject = 'Test Ticket',
  oldStatus = 'OPEN',
  newStatus = 'RESOLVED',
  adminName,
  dashboardUrl = 'https://app.secureuploadhub.com/dashboard/support'
}: TicketStatusEmailProps) => {
  const previewText = `Your ticket status has been updated to: ${newStatus.replace('_', ' ')}`

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-600'
      case 'IN_PROGRESS': return 'bg-yellow-600'
      case 'WAITING_FOR_USER': return 'bg-orange-600'
      case 'RESOLVED': return 'bg-green-600'
      case 'CLOSED': return 'bg-gray-600'
      default: return 'bg-blue-600'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
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
                <div className={`${getStatusColor(newStatus)} text-white p-3 rounded-lg inline-block mb-4`}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </Section>
            
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Ticket Status Updated
            </Heading>
            
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {userName},
            </Text>
            
            <Text className="text-black text-[14px] leading-[24px]">
              The status of your support ticket has been updated.
            </Text>

            <Section className="bg-gray-50 rounded-lg p-4 my-6">
              <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                <strong>Ticket:</strong> {ticketId} - {subject}
              </Text>
              {adminName && (
                <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                  <strong>Updated by:</strong> {adminName}
                </Text>
              )}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(oldStatus)}`}>
                    {formatStatus(oldStatus)}
                  </span>
                </div>
                <span className="text-gray-400">→</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(newStatus)}`}>
                    {formatStatus(newStatus)}
                  </span>
                </div>
              </div>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              {newStatus === 'RESOLVED' && 'Your ticket has been resolved! Please review the solution and let us know if you need any additional assistance.'}
              {newStatus === 'CLOSED' && 'Your ticket has been closed. If you need further assistance, please create a new ticket.'}
              {newStatus === 'IN_PROGRESS' && 'Our team is actively working on your ticket. We\'ll keep you updated on our progress.'}
              {newStatus === 'WAITING_FOR_USER' && 'We need additional information from you to proceed. Please check your ticket and provide the requested details.'}
              {!['RESOLVED', 'CLOSED', 'IN_PROGRESS', 'WAITING_FOR_USER'].includes(newStatus) && 'You can view the full details and any updates in your dashboard.'}
            </Text>

            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-blue-600 rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={dashboardUrl}
              >
                View Ticket Details
              </Button>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              Thank you for using SecureUploadHub. We're here to help!
            </Text>

            <Text className="text-black text-[14px] leading-[24px]">
              Best regards,<br />
              The SecureUploadHub Support Team
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default TicketStatusEmail