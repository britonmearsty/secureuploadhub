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

interface WelcomeEmailProps {
  userFirstname?: string;
  dashboardUrl?: string;
}

export const WelcomeEmail = ({
  userFirstname = "User",
  dashboardUrl = "https://secureuploadhub.com/dashboard",
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to SecureUploadHub</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Heading style={logo}>🔒 SecureUploadHub</Heading>
        </Section>

        <Heading style={h1}>Welcome, {userFirstname}!</Heading>

        <Text style={text}>
          Thank you for joining SecureUploadHub. We're excited to help you securely share and manage your files.
        </Text>

        <Section style={featureContainer}>
          <Text style={featureTitle}>Here's what you can do:</Text>

          <Section style={featureItem}>
            <Text style={featureBullet}>📤 Create secure upload portals</Text>
            <Text style={featureDesc}>
              Set up custom portals with password protection and expiration dates
            </Text>
          </Section>

          <Section style={featureItem}>
            <Text style={featureBullet}>🔐 Control access</Text>
            <Text style={featureDesc}>
              Manage who can upload files and track all activity in real-time
            </Text>
          </Section>

          <Section style={featureItem}>
            <Text style={featureBullet}>📊 Get insights</Text>
            <Text style={featureDesc}>
              Monitor file uploads, storage usage, and portal analytics
            </Text>
          </Section>

          <Section style={featureItem}>
            <Text style={featureBullet}>🛡️ Bank-level security</Text>
            <Text style={featureDesc}>
              AES-256 encryption ensures your files are always protected
            </Text>
          </Section>
        </Section>

        <Section style={btnContainer}>
          <Button style={button} href={dashboardUrl}>
            Go to Dashboard
          </Button>
        </Section>

        <Section style={infoBox}>
          <Text style={infoTitle}>Getting Started Tips:</Text>
          <Text style={infoText}>
            1. Create your first upload portal from the dashboard
          </Text>
          <Text style={infoText}>
            2. Customize the portal name and security settings
          </Text>
          <Text style={infoText}>
            3. Share the portal link with your clients or team
          </Text>
          <Text style={infoText}>
            4. Monitor uploads and download files anytime
          </Text>
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          Need help? Check out our{" "}
          <Link href="https://secureuploadhub.com/docs" style={linkText}>
            documentation
          </Link>
          {" "}or contact our support team at{" "}
          <Link href="mailto:support@secureuploadhub.com" style={linkText}>
            support@secureuploadhub.com
          </Link>
        </Text>

        <Text style={footer}>
          Thank you for choosing SecureUploadHub for your file sharing needs.
        </Text>

        <Link href="https://secureuploadhub.com" style={footerLink}>
          SecureUploadHub
        </Link>
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail;

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
  fontSize: "28px",
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

const featureContainer = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #333",
};

const featureTitle = {
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 16px",
};

const featureItem = {
  marginBottom: "16px",
};

const featureBullet = {
  color: "#7c3aed",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const featureDesc = {
  color: "#a1a1aa",
  fontSize: "13px",
  margin: "0",
  lineHeight: "18px",
};

const btnContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
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

const infoBox = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #333",
};

const infoTitle = {
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 12px",
};

const infoText = {
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "8px 0",
};

const linkText = {
  color: "#7c3aed",
  textDecoration: "underline",
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
