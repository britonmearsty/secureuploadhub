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

interface SubscriptionRenewedEmailProps {
  userFirstname?: string;
  planName: string;
  amount: number;
  currency: string;
  renewedAt: Date;
  nextBillingDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  dashboardUrl: string;
  invoiceUrl?: string;
}

export const SubscriptionRenewedEmail = ({
  userFirstname,
  planName,
  amount,
  currency,
  renewedAt,
  nextBillingDate,
  currentPeriodStart,
  currentPeriodEnd,
  dashboardUrl,
  invoiceUrl,
}: SubscriptionRenewedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your {planName} subscription has been renewed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Heading style={logo}>✅ SecureUploadHub</Heading>
        </Section>

        <Heading style={h1}>Subscription Renewed</Heading>

        <Text style={text}>
          {userFirstname ? `Hi ${userFirstname}` : "Hello"},
        </Text>

        <Text style={text}>
          Great news! Your <strong>{planName}</strong> subscription has been successfully renewed. 
          Your premium features will continue without interruption.
        </Text>

        <Section style={detailsContainer}>
          <Text style={detailsTitle}>Renewal Details:</Text>

          <Section style={detailRow}>
            <Text style={detailLabel}>Plan</Text>
            <Text style={detailValue}>{planName}</Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Amount Charged</Text>
            <Text style={detailValue}>
              {currency} {amount.toFixed(2)}
            </Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Renewed On</Text>
            <Text style={detailValue}>
              {renewedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Current Period</Text>
            <Text style={detailValue}>
              {currentPeriodStart.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              -{" "}
              {currentPeriodEnd.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Next Billing Date</Text>
            <Text style={detailValue}>
              {nextBillingDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </Section>
        </Section>

        <Section style={successContainer}>
          <Text style={successText}>
            <strong>All set!</strong> Your subscription is active and all premium features are available. 
            Thank you for continuing to trust SecureUploadHub with your file sharing needs.
          </Text>
        </Section>

        <Section style={btnContainer}>
          <Button style={button} href={dashboardUrl}>
            Access Dashboard
          </Button>
        </Section>

        {invoiceUrl && (
          <Section style={btnContainer}>
            <Link href={invoiceUrl} style={secondaryButton}>
              Download Invoice
            </Link>
          </Section>
        )}

        <Hr style={hr} />

        <Text style={footer}>
          Your subscription will automatically renew on {nextBillingDate.toLocaleDateString()}. 
          You can manage your subscription settings in your dashboard at any time.
        </Text>

        <Text style={footer}>
          Questions about your subscription? Our support team is here to help.
        </Text>

        <Link href="https://secureuploadhub.com" style={footerLink}>
          SecureUploadHub
        </Link>
      </Container>
    </Body>
  </Html>
);

export default SubscriptionRenewedEmail;

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

const successContainer = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
  border: "1px solid #22c55e",
};

const successText = {
  color: "#15803d",
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