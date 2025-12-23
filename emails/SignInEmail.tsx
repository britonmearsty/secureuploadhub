import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import * as React from "react";

interface SignInEmailProps {
    userFirstname?: string;
    signInDate?: string;
    signInDevice?: string;
    signInLocation?: string;
}

export const SignInEmail = ({
    userFirstname,
    signInDate,
    signInDevice,
    signInLocation,
}: SignInEmailProps) => (
    <Html>
        <Head />
        <Preview>New sign-in to your SecureUploadHub account</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={logoContainer}>
                    {/* You can add your logo URL here */}
                    <Heading style={logo}>SecureUploadHub</Heading>
                </Section>
                <Heading style={h1}>New sign-in detected</Heading>
                <Text style={text}>Hi {userFirstname},</Text>
                <Text style={text}>
                    We noticed a new sign-in to your account on {signInDate}.
                </Text>
                <Section style={detailsContainer}>
                    <Text style={detailsTitle}>Sign-in Details:</Text>
                    <Text style={detailsText}>
                        <strong>Device:</strong> {signInDevice || "Unknown Device"}
                    </Text>
                    <Text style={detailsText}>
                        <strong>Location:</strong> {signInLocation || "Unknown Location"}
                    </Text>
                </Section>
                <Text style={text}>
                    If this was you, you can safely ignore this email. If you don't
                    recognize this activity, please secure your account immediately.
                </Text>
                <Section style={btnContainer}>
                    <Link
                        style={button}
                        href="https://secureuploadhub.com/settings/security"
                    >
                        Review Security Activity
                    </Link>
                </Section>
                <Hr style={hr} />
                <Link href="https://secureuploadhub.com" style={footerLink}>
                    SecureUploadHub
                </Link>
                <Text style={footer}>
                    Protecting your digital assets with top-tier security.
                </Text>
            </Container>
        </Body>
    </Html>
);

export default SignInEmail;

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
    margin: "0 0 12px",
};

const detailsText = {
    color: "#a1a1aa",
    fontSize: "14px",
    margin: "4px 0",
};

const btnContainer = {
    textAlign: "center" as const,
    margin: "32px 0",
};

const button = {
    backgroundColor: "#fff",
    borderRadius: "6px",
    color: "#000",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "12px 24px",
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
