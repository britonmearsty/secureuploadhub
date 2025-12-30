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

interface VerificationEmailProps {
  userFirstname?: string;
  verificationLink: string;
  expiresIn?: string;
}

export const VerificationEmail = ({
  userFirstname = "User",
  verificationLink,
  expiresIn = "24 hours",
}: VerificationEmailProps) => (
  <Html>
    <Head />
    <Preview>Verify your SecureUploadHub account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Heading style={logo}>SecureUploadHub</Heading>
        </Section>

        <Heading style={h1}>Verify Your Email</Heading>

        <Text style={text}>Hi {userFirstname},</Text>

        <Text style={text}>
          Thank you for signing up for SecureUploadHub. Please verify your email address to get started.
        </Text>

        <Section style={btnContainer}>
          <Button style={button} href={verificationLink}>
            Verify Email
          </Button>
        </Section>

        <Text style={smallText}>
          Or copy and paste this link in your browser:
        </Text>
        <Text style={link}>{verificationLink}</Text>

        <Text style={smallText}>
          This verification link expires in {expiresIn}.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          If you didn't create this account, you can safely ignore this email.
        </Text>

        <Link href="https://secureuploadhub.com" style={footerLink}>
          SecureUploadHub
        </Link>
      </Container>
    </Body>
  </Html>
);

export default VerificationEmail;

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

const smallText = {
  color: "#a1a1aa",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "16px 0",
};

const link = {
  color: "#7c3aed",
  fontSize: "14px",
  wordBreak: "break-all" as const,
  margin: "16px 0",
  padding: "12px",
  backgroundColor: "#1a1a1a",
  borderRadius: "6px",
  border: "1px solid #333",
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
