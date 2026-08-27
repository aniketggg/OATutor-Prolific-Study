/**
 * The approved CPHS consent form, transcribed verbatim from
 * https://docs.google.com/document/d/1A_OQckTh2pxbdwBLKUhyo1BeqnZZTYd9qdHQgry-82A
 *
 * Kept separate from the layout (`pages/ConsentGate.js`) so the wording can be
 * updated without touching the component. Do not paraphrase: this is the text
 * CPHS approved.
 *
 * Bump CONSENT_VERSION whenever the wording changes materially — the gate stores
 * the version it was accepted under and re-prompts anyone holding an older one.
 */

const CONSENT_VERSION = "cphs-2026-02-19319-v1";

const CONSENT_DOC_URL =
    "https://docs.google.com/document/d/1A_OQckTh2pxbdwBLKUhyo1BeqnZZTYd9qdHQgry-82A/edit?usp=sharing";

const CONSENT_INSTITUTION = "University of California at Berkeley";
const CONSENT_TITLE = "Consent to Participate in Research";
const CONSENT_SUBTITLE = "Adapting Mastery-Based GenAI Tools to STEM Classrooms";
const CONSENT_CPHS = "CPHS #2026-02-19319";

const CONSENT_SECTIONS = [
    {
        heading: "Introduction",
        paragraphs: [
            "My name is Shreya Sheel, and I am a graduate student at the University of California, Berkeley working with my faculty advisor, Professor Zachary Pardos in the School of Education. We would like to invite you to take part in our research study, which concerns evaluating the educational value of a pedagogical chatbot in learning STEM subjects.",
        ],
    },
    {
        heading: "Purpose",
        paragraphs: [
            "The purpose of this study is to understand how pedagogical chatbots can support learning STEM subjects. Your interactions with the chatbot will be rated by subject matter experts on the pedagogical quality of the chatbot.",
        ],
    },
    {
        heading: "Procedures",
        paragraphs: ["If you agree to participate in my research, we will ask you to:"],
        bullets: [
            "Answer 4 questions related to a STEM subject. You will have the opportunity to interact with a pedagogical chatbot to help you answer the first 2 questions. The last 2 questions you will not have access to the chatbot. We expect this interaction to take anywhere from 15 to 20 minutes.",
            "Allow us to use your interaction data (e.g., your inputs to the pedagogical chatbot, hint usage, and time spent).",
            "Allow us to release your anonymized conversation history with the chatbot to external research repositories and public scholarly publications.",
        ],
        trailingParagraphs: [
            "Study location: All study procedures will take place online through Prolific.",
        ],
    },
    {
        heading: "Benefits",
        paragraphs: [
            "There is no direct benefit to you from taking part in this study. It is hoped that the research will help understand the educational value of pedagogical chatbots.",
        ],
    },
    {
        heading: "Risks/Discomforts",
        paragraphs: [
            "You may experience minor discomfort answering the STEM subject matter questions. You are free to decline to answer any questions you don't wish to, or to stop participating at any time. As with all research, there is a chance that confidentiality could be compromised; however, we are taking precautions to minimize this risk.",
        ],
    },
    {
        heading: "Confidentiality",
        paragraphs: [
            "Your study data will be handled as confidentially as possible. We will strip any direct identifiers at the ingestion level and apply strict contextual tokenization to any personal details shared with the chatbot so that the data is decoupled from any real-world identities. If results of this study are published or presented, individual names and other personally identifiable information will not be used. Your personal information may be released if required by law. Authorized representatives from the following organizations may review your research data for purposes such as monitoring or managing the conduct of this study: University of California",
            "To minimize the risks to confidentiality:",
        ],
        bullets: [
            "Pedagogical chatbot interaction data (e.g., logs) is anonymized.",
            "Before releasing logs of chatbot interactions to external research repositories and public scholarly publications, we will scrub/redact text that includes any personal information identified during auditing to suppress any sensitive personal disclosures from the final dataset.",
            "All data will be stored in a secure, access-restricted database hosted at UC Berkeley",
        ],
        trailingParagraphs: [
            "Retention of Records: When the research is completed, we will save the data for possible use in future research done by us or others. We will retain these records for up to 10 years after the study is over. The same measures described above will be taken to protect confidentiality of this study data.",
            "Use in Future Research: Identifiers will be removed from the identifiable private information. After such removal, the information could be used for future research studies or distributed to other investigators for future research studies without additional informed consent from the subject or the legally authorized representative.",
        ],
    },
    {
        heading: "Compensation",
        paragraphs: [
            "You will be paid the amount listed on Prolific for taking part in this study.",
        ],
    },
    {
        heading: "Rights",
        paragraphs: [
            "Participation in research is completely voluntary. You are free to decline to take part in the project. You can decline to answer any questions and are free to stop taking part in the project at any time.",
        ],
    },
    {
        heading: "Questions",
        paragraphs: [
            "If you have any questions about this research, please feel free to contact us. You can reach me, Shreya Sheel, at shreya_sheel@berkeley.edu or you can reach Zachary Pardos at pardos@berkeley.edu.",
            "If you have any questions about your rights or treatment as a research participant in this study, please contact the University of California at Berkeley's Committee for Protection of Human Subjects at 510-642-7461, or e-mail subjects@berkeley.edu.",
        ],
    },
];

const CONSENT_CLOSING =
    'If you agree to take part in the research, please print a copy of this page to keep for future reference, then click on the "Accept" button below.';

const CONSENT_ACCEPT_LABEL = "Accept";
const CONSENT_DECLINE_LABEL = "I do not agree";
const CONSENT_PRINT_LABEL = "Print a copy";

const PROLIFIC_HOME_URL = "https://app.prolific.com/";

const CONSENT_DECLINE_HEADING = "You have not consented to take part.";
const CONSENT_DECLINE_BODY =
    "Nothing further will be recorded. Please return your submission on Prolific so that the place can be offered to someone else. Thank you for your time.";

export {
    CONSENT_VERSION,
    CONSENT_DOC_URL,
    CONSENT_INSTITUTION,
    CONSENT_TITLE,
    CONSENT_SUBTITLE,
    CONSENT_CPHS,
    CONSENT_SECTIONS,
    CONSENT_CLOSING,
    CONSENT_ACCEPT_LABEL,
    CONSENT_DECLINE_LABEL,
    CONSENT_PRINT_LABEL,
    CONSENT_DECLINE_HEADING,
    CONSENT_DECLINE_BODY,
    PROLIFIC_HOME_URL,
};
