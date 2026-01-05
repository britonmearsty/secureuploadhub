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

interface TicketReplyEmailProps {
  userName: string
  ticketId: string
  subject: string
  message: string
  isAdminReply: boolean
  senderName: string
  dashboardUrl: string
}

export const TicketReplyEmail = ({
  userName = 'User',
  ticketId = 'TICKET-123',
  subject = 'Test Ticket',
  message = 'This is a test message',
  isAdminReply = true,
  senderName = 'Support Team',
  dashboardUrl = 'https://app.secureuploadhub.com/dashboard/support'
}: TicketReplyEmailProps) => {
  const previewText = `New ${isAdminReply ? 'reply from support' : 'message'} on your ticket: ${subject}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px]">
            <Section className="mt-[32px]">
              <div className="text-center">
                <div className={`${isAdminReply ? 'bg-green-600' : 'bg-blue-600'} text-white p-3 rounded-lg inline-block mb-4`}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
              </div>
            </Section>
            
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              {isAdminReply ? 'New Reply from Support' : 'Message Received'}
            </Heading>
            
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {userName},
            </Text>
            
            <Text className="text-black text-[14px] leading-[24px]">
              {isAdminReply 
                ? 'You have received a new reply from our support team on your ticket.'
                : 'Your message has been received and added to your support ticket.'
              }
            </Text>

            <Section className="bg-gray-50 rounded-lg p-4 my-6">
              <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                <strong>Ticket:</strong> {ticketId} - {subject}
              </Text>
              <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                <strong>From:</strong> {senderName}
              </Text>
              <div className="border-l-4 border-blue-500 pl-4 mt-4">
                <Text className="text-black text-[14px] leading-[24px] m-0 whitespace-pre-wrap">
                  {message}
                </Text>
              </div>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              {isAdminReply 
                ? 'You can reply to this message or view the full conversation in your dashboard.'
                : 'Our support team will review your message and respond as soon as possible.'
              }
            </Text>

            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-blue-600 rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={dashboardUrl}
              >
                {isAdminReply ? 'Reply to Ticket' : 'View Ticket'}
              </Button>
            </Section>

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

export default TicketReplyEmail