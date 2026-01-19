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

interface SubscriptionActivatedEmailProps {
  userFirstname?: string;
  planName: string;
  planPrice: number;
  currency: string;
  nextBillingDate: Date;
  dashboardUrl: string;
  features: string[];
}

export const SubscriptionActivatedEmail = ({
  userFirstname,
  planName,
  planPrice,
  currency,
  nextBillingDate,
  dashboardUrl,
  features = [],
}: SubscriptionActivatedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your {planName} subscription is now active!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Heading style={logo}>🎉 SecureUploadHub</Heading>
        </Section>

        <Heading style={h1}>Subscription Activated!</Heading>

        <Text style={text}>
          {userFirstname ? `Hi ${userFirstname}` : "Hello"},
        </Text>

        <Text style={text}>
          Great news! Your <strong>{planName}</strong> subscription has been successfully activated. 
          You now have access to all the premium features.
        </Text>

        <Section style={detailsContainer}>
          <Text style={detailsTitle}>Subscription Details:</Text>

          <Section style={detailRow}>
            <Text style={detailLabel}>Plan</Text>
            <Text style={detailValue}>{planName}</Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Price</Text>
            <Text style={detailValue}>
              {currency} {planPrice.toFixed(2)} / month
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

          {features.length > 0 && (
            <Section style={detailRow}>
              <Text style={detailLabel}>Features Included</Text>
              <Section style={featuresList}>
                {features.map((feature, index) => (
                  <Text key={index} style={featureItem}>
                    ✓ {feature}
                  </Text>
                ))}
              </Section>
            </Section>
          )}
        </Section>

        <Section style={btnContainer}>
          <Button style={button} href={dashboardUrl}>
            Access Your Dashboard
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Your subscription will automatically renew on {nextBillingDate.toLocaleDateString()}. 
          You can manage your subscription settings in your dashboard at any time.
        </Text>

        <Text style={footer}>
          If you have any questions, please don't hesitate to contact our support team.
        </Text>

        <Link href="https://secureuploadhub.com" style={footerLink}>
          SecureUploadHub
        </Link>
      </Container>
    </Body>
  </Html>
);

export default SubscriptionActivatedEmail;

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