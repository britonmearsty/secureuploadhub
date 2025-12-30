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

interface ResetPasswordEmailProps {
  userFirstname?: string;
  resetLink: string;
  expiresIn?: string;
}

export const ResetPasswordEmail = ({
  userFirstname = "User",
  resetLink,
  expiresIn = "1 hour",
}: ResetPasswordEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your SecureUploadHub password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Heading style={logo}>SecureUploadHub</Heading>
        </Section>

        <Heading style={h1}>Reset Your Password</Heading>

        <Text style={text}>Hi {userFirstname},</Text>

        <Text style={text}>
          We received a request to reset your password. Click the button below to set a new password.
        </Text>

        <Section style={btnContainer}>
          <Button style={button} href={resetLink}>
            Reset Password
          </Button>
        </Section>

        <Text style={smallText}>
          Or copy and paste this link in your browser:
        </Text>
        <Text style={link}>{resetLink}</Text>

        <Text style={smallText}>
          This password reset link expires in {expiresIn}.
        </Text>

        <Hr style={hr} />

        <Section style={warningBox}>
          <Text style={warningText}>
            <strong>⚠️ Security Notice:</strong> If you did not request a password reset, please ignore this email. Your account remains secure.
          </Text>
        </Section>

        <Text style={footer}>
          For your security, never share this link with anyone. SecureUploadHub staff will never ask for your password.
        </Text>

        <Link href="https://secureuploadhub.com" style={footerLink}>
          SecureUploadHub
        </Link>
      </Container>
    </Body>
  </Html>
);

export default ResetPasswordEmail;

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

const warningBox = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
  border: "1px solid #ef4444",
  borderLeft: "4px solid #ef4444",
};

const warningText = {
  color: "#fca5a5",
  fontSize: "14px",
  margin: "0",
  lineHeight: "20px",
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
