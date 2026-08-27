import React from "react";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";

import { CONSENT_STORAGE_KEY, ThemeContext } from "../config/config.js";
import {
    CONSENT_ACCEPT_LABEL,
    CONSENT_CLOSING,
    CONSENT_CPHS,
    CONSENT_DECLINE_BODY,
    CONSENT_DECLINE_HEADING,
    CONSENT_DECLINE_LABEL,
    CONSENT_DOC_URL,
    CONSENT_INSTITUTION,
    CONSENT_PRINT_LABEL,
    CONSENT_SECTIONS,
    CONSENT_SUBTITLE,
    CONSENT_TITLE,
    CONSENT_VERSION,
    PROLIFIC_HOME_URL,
} from "../config/consentText.js";

/**
 * Routes that never ask for consent — they are not part of the study run and are
 * used for authoring and debugging.
 */
const EXEMPT_HASH_PREFIXES = ["#/debug", "#/posts", "#/table-of-contents"];

function isExemptRoute() {
    const hash = window.location.hash || "";
    return EXEMPT_HASH_PREFIXES.some((prefix) => hash.startsWith(prefix));
}

/**
 * Reads the stored acceptance. Only counts when it was given under the current
 * CONSENT_VERSION: localStorage is per origin, so a stale record from another
 * deployment on the same host must not let anyone past the gate.
 */
function hasStoredConsent() {
    try {
        const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (!raw) return false;
        const record = JSON.parse(raw);
        return record?.accepted === true && record?.version === CONSENT_VERSION;
    } catch (err) {
        console.debug("could not read stored consent", err);
        return false;
    }
}

const printStyles = `
@media print {
    .consent-no-print { display: none !important; }
    .consent-paper { box-shadow: none !important; }
}
`;

/**
 * Gates the study behind the CPHS-approved consent form. Renders its children
 * only once the participant has clicked "Accept".
 *
 * The consent record is written to the siteLogs collection through the existing
 * Firebase.submitSiteLog, whose addMetaData already stamps oats_user_id, the
 * Prolific identifiers, study_id and the server timestamp — nothing extra needs
 * to be threaded through from App.js.
 */
class ConsentGate extends React.Component {
    static contextType = ThemeContext;

    constructor(props) {
        // Read synchronously so the gate paints on the first render and the
        // lesson underneath is never briefly visible.
        super(props);
        this.state = {
            accepted: hasStoredConsent(),
            declined: false,
            hash: window.location.hash,
        };
    }

    // ConsentGate sits outside <Switch> and so does not re-render on navigation
    // by itself. Without this, leaving an exempt route (e.g. /debug) would keep
    // rendering children ungated until a reload.
    componentDidMount() {
        this.onHashChange = () => this.setState({ hash: window.location.hash });
        window.addEventListener("hashchange", this.onHashChange);
        window.addEventListener("popstate", this.onHashChange);
    }

    componentWillUnmount() {
        window.removeEventListener("hashchange", this.onHashChange);
        window.removeEventListener("popstate", this.onHashChange);
    }

    logConsent = (outcome) => {
        try {
            this.context?.firebase?.submitSiteLog("consent", outcome, {
                consentVersion: CONSENT_VERSION,
                consentDocUrl: CONSENT_DOC_URL,
                recordedAt: new Date().toISOString(),
                userAgent: navigator.userAgent,
            });
        } catch (err) {
            // Never let a logging failure block or unblock participation.
            console.debug("could not log consent", err);
        }
    };

    handleAccept = () => {
        try {
            localStorage.setItem(
                CONSENT_STORAGE_KEY,
                JSON.stringify({
                    accepted: true,
                    version: CONSENT_VERSION,
                    at: new Date().toISOString(),
                })
            );
        } catch (err) {
            // A browser that refuses storage still gets to take part; they will
            // simply be asked again if they reload.
            console.debug("could not persist consent", err);
        }
        this.logConsent("accepted");
        this.setState({ accepted: true });
    };

    handleDecline = () => {
        this.logConsent("declined");
        this.setState({ declined: true });
    };

    handlePrint = () => {
        window.print();
    };

    renderSection = (section, index) => (
        <Box key={index} mb={3}>
            <h3 style={{ marginBottom: 8 }}>{section.heading}</h3>
            {(section.paragraphs || []).map((paragraph, i) => (
                <p key={`p${i}`} style={{ lineHeight: 1.6 }}>
                    {paragraph}
                </p>
            ))}
            {section.bullets && (
                <ul style={{ lineHeight: 1.6 }}>
                    {section.bullets.map((bullet, i) => (
                        <li key={`b${i}`} style={{ marginBottom: 8 }}>
                            {bullet}
                        </li>
                    ))}
                </ul>
            )}
            {(section.trailingParagraphs || []).map((paragraph, i) => (
                <p key={`t${i}`} style={{ lineHeight: 1.6 }}>
                    {paragraph}
                </p>
            ))}
        </Box>
    );

    renderDecline = () => (
        <Box
            role={"main"}
            style={{
                minHeight: "60vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: 24,
            }}
        >
            <h2>{CONSENT_DECLINE_HEADING}</h2>
            <p style={{ maxWidth: 600, lineHeight: 1.6 }}>{CONSENT_DECLINE_BODY}</p>
            <a
                href={PROLIFIC_HOME_URL}
                style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#1565C0",
                    textDecoration: "underline",
                    padding: "16px 24px",
                }}
            >
                {PROLIFIC_HOME_URL}
            </a>
        </Box>
    );

    render() {
        if (this.state.accepted || isExemptRoute()) {
            return this.props.children;
        }
        if (this.state.declined) {
            return this.renderDecline();
        }

        return (
            <div style={{ backgroundColor: "#F6F6F6", paddingTop: 24, paddingBottom: 40 }}>
                <style>{printStyles}</style>
                <Grid
                    container
                    spacing={0}
                    direction="column"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Box width="100%" maxWidth={800} px={2} role={"main"}>
                        <Paper className={"consent-paper"} style={{ padding: 24 }}>
                            <center>
                                <p style={{ marginBottom: 4 }}>{CONSENT_INSTITUTION}</p>
                                <h1 style={{ marginTop: 0, marginBottom: 4 }}>
                                    {CONSENT_TITLE}
                                </h1>
                                <h2 style={{ marginTop: 0, fontWeight: 400 }}>
                                    {CONSENT_SUBTITLE}
                                </h2>
                                <p style={{ marginTop: 0 }}>{CONSENT_CPHS}</p>
                            </center>
                            <Divider />
                            <Box mt={3}>
                                {CONSENT_SECTIONS.map(this.renderSection)}
                            </Box>
                            <Divider />
                            <Box mt={3}>
                                <p style={{ lineHeight: 1.6, fontWeight: 600 }}>
                                    {CONSENT_CLOSING}
                                </p>
                                <p className={"consent-no-print"} style={{ fontSize: 14 }}>
                                    You can also open this form in a separate window:{" "}
                                    <a
                                        href={CONSENT_DOC_URL}
                                        target={"_blank"}
                                        rel={"noopener noreferrer"}
                                    >
                                        Consent Form
                                    </a>
                                </p>
                            </Box>
                            <Box
                                className={"consent-no-print"}
                                mt={2}
                                display={"flex"}
                                flexWrap={"wrap"}
                                style={{ gap: 12 }}
                            >
                                <Button
                                    variant={"outlined"}
                                    color={"default"}
                                    onClick={this.handlePrint}
                                >
                                    {CONSENT_PRINT_LABEL}
                                </Button>
                                <Button
                                    variant={"contained"}
                                    color={"primary"}
                                    onClick={this.handleAccept}
                                >
                                    {CONSENT_ACCEPT_LABEL}
                                </Button>
                                <Button
                                    variant={"outlined"}
                                    color={"secondary"}
                                    onClick={this.handleDecline}
                                >
                                    {CONSENT_DECLINE_LABEL}
                                </Button>
                            </Box>
                        </Paper>
                    </Box>
                </Grid>
            </div>
        );
    }
}

export default ConsentGate;
