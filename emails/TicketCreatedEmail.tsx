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

interface TicketCreatedEmailProps {
  userName: string
  ticketId: string
  subject: string
  category: string
  priority: string
  dashboardUrl: string
}

export const TicketCreatedEmail = ({
  userName = 'User',
  ticketId = 'TICKET-123',
  subject = 'Test Ticket',
  category = 'general',
  priority = 'MEDIUM',
  dashboardUrl = 'https://app.secureuploadhub.com/dashboard/communication'
}: TicketCreatedEmailProps) => {
  const previewText = `Your support ticket has been created: ${subject}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px]">
            <Section className="mt-[32px]">
              <div className="text-center">
                <div className="bg-blue-600 text-white p-3 rounded-lg inline-block mb-4">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </Section>
            
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Support Ticket Created
            </Heading>
            
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {userName},
            </Text>
            
            <Text className="text-black text-[14px] leading-[24px]">
              Your support ticket has been successfully created. Our team will review it and respond as soon as possible.
            </Text>

            <Section className="bg-gray-50 rounded-lg p-4 my-6">
              <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                <strong>Ticket Details:</strong>
              </Text>
              <Text className="text-black text-[14px] leading-[24px] m-0">
                <strong>ID:</strong> {ticketId}
              </Text>
              <Text className="text-black text-[14px] leading-[24px] m-0">
                <strong>Subject:</strong> {subject}
              </Text>
              <Text className="text-black text-[14px] leading-[24px] m-0">
                <strong>Category:</strong> {category}
              </Text>
              <Text className="text-black text-[14px] leading-[24px] m-0">
                <strong>Priority:</strong> {priority}
              </Text>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              You can track the progress of your ticket and add additional information by visiting your dashboard.
            </Text>

            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-blue-600 rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={dashboardUrl}
              >
                View Ticket
              </Button>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              If you have any urgent concerns, please don't hesitate to contact our support team directly.
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

export default TicketCreatedEmail