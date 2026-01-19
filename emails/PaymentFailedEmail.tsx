import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface PaymentFailedEmailProps {
  userFirstname?: string;
  planName: string;
  amount: number;
  currency: string;
  failedAt: Date;
  retryDate?: Date;
  gracePeriodEnd?: Date;
  updatePaymentUrl: string;
  dashboardUrl: string;
  reason?: string;
}

export const PaymentFailedEmail = ({
  userFirstname,
  planName,
  amount,
  currency,
  failedAt,
  retryDate,
  gracePeriodEnd,
  updatePaymentUrl,
  dashboardUrl,
  reason,
}: PaymentFailedEmailProps) => (
  <Html>
    <Head />
    <Preview>Payment failed for your {planName} subscription</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Heading style={logo}>⚠️ SecureUploadHub</Heading>
        </Section>

        <Heading style={h1}>Payment Failed</Heading>

        <Text style={text}>
          {userFirstname ? `Hi ${userFirstname}` : "Hello"},
        </Text>

        <Text style={text}>
          We were unable to process your payment for your <strong>{planName}</strong> subscription. 
          Please update your payment method to continue enjoying our premium features.
        </Text>

        <Section style={detailsContainer}>
          <Text style={detailsTitle}>Payment Details:</Text>

          <Section style={detailRow}>
            <Text style={detailLabel}>Plan</Text>
            <Text style={detailValue}>{planName}</Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Amount</Text>
            <Text style={detailValue}>
              {currency} {amount.toFixed(2)}
            </Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Failed On</Text>
            <Text style={detailValue}>
              {failedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Section>

          {reason && (
            <Section style={detailRow}>
              <Text style={detailLabel}>Reason</Text>
              <Text style={detailValue}>{reason}</Text>
            </Section>
          )}

          {retryDate && (
            <Section style={detailRow}>
              <Text style={detailLabel}>Next Retry</Text>
              <Text style={detailValue}>
                {retryDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </Section>
          )}
        </Section>

        {gracePeriodEnd && (
          <Section style={warningContainer}>
            <Text style={warningText}>
              <strong>Action Required:</strong> Your subscription will be suspended on{" "}
              {gracePeriodEnd.toLocaleDateString()} if payment is not resolved. 
              Please update your payment method to avoid service interruption.
            </Text>
          </Section>
        )}

        <Section style={btnContainer}>
          <Button style={button} href={updatePaymentUrl}>
            Update Payment Method
          </Button>
        </Section>

        <Section style={btnContainer}>
          <Link href={dashboardUrl} style={secondaryButton}>
            View Dashboard
          </Link>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          <strong>Common reasons for payment failure:</strong>
        </Text>
        <Text style={footer}>
          • Insufficient funds in your account<br />
          • Expired or invalid payment method<br />
          • Bank security restrictions<br />
          • Incorrect billing information
        </Text>

        <Text style={footer}>
          If you continue to experience issues, please contact our support team for assistance.
        </Text>

        <Link href="https://secureuploadhub.com" style={footerLink}>
          SecureUploadHub
        </Link>
      </Container>
    </Body>
  </Html>
);

export default PaymentFailedEmail;

const main = {
  backgroundColor: "#0a0a0a",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  backgroundColor: "#111111",
  borderRadius: "12px",
  border: "1px solid #333",
  maxWidth: "580px",
};

const logoContainer = {
  marginBottom: "32px",
};

const logo = {
  color: "#fff",
  fontSize: "24px",
  fontWeight: "700",
  letterSpacing: "-0.5px",
  margin: "0",
};

const h1 = {
  color: "#fff",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.1",
  margin: "0 0 24px",
};

const text = {
  color: "#a1a1aa",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const detailsContainer = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #333",
};

const detailsTitle = {
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 16px",
};

const detailRow = {
  marginBottom: "12px",
};

const detailLabel = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
};

const detailValue = {
  color: "#a1a1aa",
  fontSize: "14px",
  margin: "0",
  wordBreak: "break-word" as const,
};

const warningContainer = {
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
  border: "1px solid #ef4444",
};

const warningText = {
  color: "#dc2626",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const btnContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#ef4444",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
  lineHeight: "100%",
};

const secondaryButton = {
  backgroundColor: "#333",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "10px 24px",
  lineHeight: "100%",
  border: "1px solid #555",
};

const hr = {
  borderColor: "#333",
  margin: "40px 0 20px",
};

const footerLink = {
  color: "#a1a1aa",
  fontSize: "14px",
  textDecoration: "underline",
};

const footer = {
  color: "#71717a",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "10px 0",
};