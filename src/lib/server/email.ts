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
	if (!t) return { ok: false, error: 'Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.' };
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

export async function sendAnnouncementEmail(opts: {
	title: string;
	body: string;
	recipients: string[];
	orgName?: string;
}): Promise<{ ok: boolean; sent: number; error?: string }> {
	if (opts.recipients.length === 0) return { ok: true, sent: 0 };
	const orgName = opts.orgName ?? 'Team';
	const html = `
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="background: #1a1a2e; color: #e6edf7; border-radius: 12px; padding: 24px;">
				<p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #9fb0cc; margin: 0 0 4px 0;">${orgName} Announcement</p>
				<h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px 0; color: #e6edf7;">${opts.title}</h1>
				<div style="font-size: 14px; line-height: 1.6; color: #c4d3e8; white-space: pre-wrap;">${opts.body}</div>
				<hr style="border: none; border-top: 1px solid #2a3754; margin: 20px 0;" />
				<p style="font-size: 11px; color: #6b7c99; margin: 0;">Sent via Transfer Portal</p>
			</div>
		</div>
	`;
	const result = await sendEmail({
		to: opts.recipients,
		subject: `[${orgName}] ${opts.title}`,
		text: `${opts.title}\n\n${opts.body}\n\n---\nSent via Transfer Portal`,
		html
	});
	return { ok: result.ok, sent: result.ok ? opts.recipients.length : 0, error: result.error };
}
