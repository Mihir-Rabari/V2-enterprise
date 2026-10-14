import type { Metadata } from 'next';
import ContactContent from './contact-content';

/**
 * /contact — server entry for the Contact page (Next.js port of
 * frontend/pages/Contact.tsx).
 *
 * The Vite version called
 *   usePageMeta({
 *     title: 'Contact Us | V2 Enterprise',
 *     description: 'Get in touch with V2 Enterprise. Visit our Smart Fashion Hub in Bhavnagar, or reach out to our team of style experts.',
 *     canonical: '/contact',
 *   });
 * which is replaced here by a static metadata export (titles/descriptions
 * kept verbatim). The interactive form lives in the client component
 * `./contact-content.tsx` (client components cannot export metadata).
 *
 * Route placement mirrors frontend/components/CustomerView.tsx: /contact
 * renders INSIDE the customer layout → this page lives in the (storefront)
 * route group (the AuthProvider + SettingsProvider stack it relies on).
 */

export const metadata: Metadata = {
    title: 'Contact Us | V2 Enterprise',
    description:
        'Get in touch with V2 Enterprise. Visit our Smart Fashion Hub in Bhavnagar, or reach out to our team of style experts.',
    alternates: {
        canonical: '/contact',
    },
};

export default function ContactPage() {
    return <ContactContent />;
}
