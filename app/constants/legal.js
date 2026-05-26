import { SUPPORT_EMAIL } from './appConfig';

export const EULA_URL =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export const getPrivacyText = () =>
  `DuoLink collects information you provide when creating an account, including your name, email address, phone number, and profile photo. For drivers, we also collect professional credentials, work history, and uploaded documents.\n\nWe use your information to provide the DuoLink service, connect car owners with drivers, verify driver credentials, and facilitate communication between users.\n\nYour profile information is visible to other DuoLink users. We do not sell your personal information to third parties.\n\nYour data is stored securely using industry-standard encryption. You have the right to access, correct, and delete your personal data at any time through the app settings.\n\nFor privacy-related inquiries, contact us at ${SUPPORT_EMAIL}.`;

export const getTermsText = () =>
  `By using DuoLink, you agree to these Terms of Service. DuoLink is a platform that connects car owners with professional drivers in Namibia.\n\nYou must provide accurate information when creating an account. You must be at least 18 years old to use DuoLink.\n\nDrivers may submit documents for verification. Verification does not constitute an endorsement or guarantee. Car owners should conduct their own due diligence.\n\nUsers agree not to provide false information, harass other users, or use the platform for illegal purposes. There is zero tolerance for objectionable content or abusive behavior. Content that violates these terms may be removed and offending users may be blocked or banned.\n\nReviews must be honest and based on actual experience. DuoLink reserves the right to remove fraudulent reviews.\n\nDuoLink provides a platform for connecting users and is not liable for disputes between car owners and drivers.\n\nFor questions about these terms, contact us at ${SUPPORT_EMAIL}.`;
