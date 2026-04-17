import QRCode from 'qrcode';
import { SignJWT } from 'jose';

const encoder = new TextEncoder();

export const buildPassportQrDataUrl = async (userId: string, qrVersion: number) => {
	const secret = encoder.encode(process.env.PASSPORT_QR_SECRET ?? 'dev-secret-change-me');
	const token = await new SignJWT({ user_id: userId, qr_version: qrVersion })
		.setProtectedHeader({ alg: 'HS256' })
		.sign(secret);
	return QRCode.toDataURL(token);
};
