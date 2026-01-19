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

interface SubscriptionCancelledEmailProps {
  userFirstname?: string;
  planName: string;
  cancelledAt: Date;
  accessUntil?: Date;
  reason?: string;
  dashboardUrl: string;
  reactivateUrl?: string;
}

export const SubscriptionCancelledEmail = ({
  userFirstname,
  planName,
  cancelledAt,
  accessUntil,
  reason,
  dashboardUrl,
  reactivateUrl,
}: SubscriptionCancelledEmailProps) => (
  <Html>
    <Head />
    <Preview>Your {planName} subscription has been cancelled</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Heading style={logo}>📋 SecureUploadHub</Heading>
        </Section>

        <Heading style={h1}>Subscription Cancelled</Heading>

        <Text style={text}>
          {userFirstname ? `Hi ${userFirstname}` : "Hello"},
        </Text>

        <Text style={text}>
          We're sorry to see you go. Your <strong>{planName}</strong> subscription has been cancelled.
        </Text>

        <Section style={detailsContainer}>
          <Text style={detailsTitle}>Cancellation Details:</Text>

          <Section style={detailRow}>
            <Text style={detailLabel}>Plan</Text>
            <Text style={detailValue}>{planName}</Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Cancelled On</Text>
            <Text style={detailValue}>
              {cancelledAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Section>

          {accessUntil && (
            <Section style={detailRow}>
              <Text style={detailLabel}>Access Until</Text>
              <Text style={detailValue}>
                {accessUntil.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </Section>
          )}

          {reason && (
            <Section style={detailRow}>
              <Text style={detailLabel}>Reason</Text>
              <Text style={detailValue}>{reason}</Text>
            </Section>
          )}
        </Section>

        {accessUntil && (
          <Section style={warningContainer}>
            <Text style={warningText}>
              <strong>Important:</strong> You'll continue to have access to your premium features until{" "}
              {accessUntil.toLocaleDateString()}. After that, your account will be downgraded to the free plan.
            </Text>
          </Section>
        )}

        <Section style={btnContainer}>
          <Button style={button} href={dashboardUrl}>
            View Dashboard
          </Button>
        </Section>

        {reactivateUrl && (
          <Section style={btnContainer}>
            <Link href={reactivateUrl} style={secondaryButton}>
              Reactivate Subscription
            </Link>
          </Section>
        )}

        <Hr style={hr} />

        <Text style={footer}>
          We'd love to have you back! If you change your mind, you can reactivate your subscription at any time.
        </Text>

        <Text style={footer}>
          If you cancelled by mistake or need help, please contact our support team.
        </Text>

        <Link href="https://secureuploadhub.com" style={footerLink}>
          SecureUploadHub
        </Link>
      </Container>
    </Body>
  </Html>
);

export default SubscriptionCancelledEmail;

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
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
  border: "1px solid #f59e0b",
};

const warningText = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const btnContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#7c3aed",
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
  backgroundColor: "#22c55e",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "10px 24px",
  lineHeight: "100%",
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