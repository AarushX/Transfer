import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER ?? '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? '';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
	if (transporter) return transporter;
	if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
	transporter = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 587,
		secure: false,
		auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
	});
	return transporter;
}

export function isEmailConfigured(): boolean {
	return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
}

export async function sendEmail(opts: {
	to: string | string[];
	subject: string;
	text: string;
	html?: string;
}): Promise<{ ok: boolean; error?: string }> {
	const t = getTransporter();
	if (!t)
		return { ok: false, error: 'Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.' };
	try {
		const recipients = Array.isArray(opts.to) ? opts.to : [opts.to];
		await t.sendMail({
			from: GMAIL_USER,
			bcc: recipients,
			subject: opts.subject,
			text: opts.text,
			html: opts.html
		});
		return { ok: true };
	} catch (err: any) {
		return { ok: false, error: err?.message ?? 'Email send failed.' };
	}
}
