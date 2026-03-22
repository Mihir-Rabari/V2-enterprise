import nodemailer from 'nodemailer';

const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_APP_PASSWORD = process.env.SMTP_APP_PASSWORD;

let transporterInstance: nodemailer.Transporter | null = null;

export const getTransporter = () => {
    if (!SMTP_EMAIL || !SMTP_APP_PASSWORD) {
        throw new Error('[Mailer] SMTP_EMAIL and SMTP_APP_PASSWORD must be set in .env');
    }
    if (!transporterInstance) {
        transporterInstance = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: SMTP_EMAIL,
                pass: SMTP_APP_PASSWORD,
            },
        });
    }
    return transporterInstance;
};

export const sendMail = async (to: string, subject: string, html: string) => {
    try {
        const transporter = getTransporter();
        await transporter.sendMail({
            from: `"V2 Fashion" <${SMTP_EMAIL}>`,
            to,
            subject,
            html,
        });
        console.log('[Mailer] Email sent to', to);
    } catch (err: any) {
        // Log but don't throw — email failures should never break core flows
        console.error('[Mailer] Failed to send email to', to, ':', err.message);
    }
};
