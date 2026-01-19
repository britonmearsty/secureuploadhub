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

interface SubscriptionExpiredEmailProps {
  userFirstname?: string;
  planName: string;
  expiredAt: Date;
  gracePeriodEnd?: Date;
  reactivateUrl: string;
  dashboardUrl: string;
  freeFeatures: string[];
}

export const SubscriptionExpiredEmail = ({
  userFirstname,
  planName,
  expiredAt,
  gracePeriodEnd,
  reactivateUrl,
  dashboardUrl,
  freeFeatures = [],
}: SubscriptionExpiredEmailProps) => (
  <Html>
    <Head />
    <Preview>Your {planName} subscription has expired</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Heading style={logo}>⏰ SecureUploadHub</Heading>
        </Section>

        <Heading style={h1}>Subscription Expired</Heading>

        <Text style={text}>
          {userFirstname ? `Hi ${userFirstname}` : "Hello"},
        </Text>

        <Text style={text}>
          Your <strong>{planName}</strong> subscription has expired. Your account has been downgraded 
          to our free plan, but you can reactivate your premium subscription at any time.
        </Text>

        <Section style={detailsContainer}>
          <Text style={detailsTitle}>Expiration Details:</Text>

          <Section style={detailRow}>
            <Text style={detailLabel}>Plan</Text>
            <Text style={detailValue}>{planName}</Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Expired On</Text>
            <Text style={detailValue}>
              {expiredAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Section>

          {gracePeriodEnd && (
            <Section style={detailRow}>
              <Text style={detailLabel}>Grace Period Ended</Text>
              <Text style={detailValue}>
                {gracePeriodEnd.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </Section>
          )}
        </Section>

        <Section style={warningContainer}>
          <Text style={warningText}>
            <strong>Account Status:</strong> Your account is now on the free plan. 
            Some features and data may be limited or inaccessible until you reactivate your subscription.
          </Text>
        </Section>

        {freeFeatures.length > 0 && (
          <Section style={detailsContainer}>
            <Text style={detailsTitle}>What's Still Available (Free Plan):</Text>
            <Section style={featuresList}>
              {freeFeatures.map((feature, index) => (
                <Text key={index} style={featureItem}>
                  ✓ {feature}
                </Text>
              ))}
            </Section>
          </Section>
        )}

        <Section style={btnContainer}>
          <Button style={button} href={reactivateUrl}>
            Reactivate Subscription
          </Button>
        </Section>

        <Section style={btnContainer}>
          <Link href={dashboardUrl} style={secondaryButton}>
            View Dashboard
          </Link>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          <strong>Don't worry!</strong> Your data is safe and will be restored when you reactivate your subscription.
        </Text>

        <Text style={footer}>
          We'd love to have you back as a premium member. If you have any questions about reactivating 
          your subscription or need help, please contact our support team.
        </Text>

        <Link href="https://secureuploadhub.com" style={footerLink}>
          SecureUploadHub
        </Link>
      </Container>
    </Body>
  </Html>
);

export default SubscriptionExpiredEmail;

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

const featuresList = {
  margin: "8px 0 0 0",
};

const featureItem = {
  color: "#a1a1aa",
  fontSize: "14px",
  margin: "4px 0",
  lineHeight: "20px",
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
  backgroundColor: "#22c55e",
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