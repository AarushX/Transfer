import { jwtVerify, SignJWT } from 'jose';

const encoder = new TextEncoder();
const attendanceSecret = () =>
	encoder.encode(process.env.PASSPORT_QR_SECRET ?? 'dev-secret-change-me');
const attendanceTimezone = () => process.env.ATTENDANCE_TIMEZONE ?? 'America/Los_Angeles';

const datePartsInZone = (date: Date, timeZone: string) => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(date);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
	return {
		year: get('year'),
		month: get('month'),
		day: get('day'),
		hour: get('hour'),
		minute: get('minute')
	};
};

const yyyyMmDd = (year: number, month: number, day: number) =>
	`${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

const subtractOneDay = (year: number, month: number, day: number) => {
	const shifted = new Date(Date.UTC(year, month - 1, day) - 24 * 60 * 60 * 1000);
	return {
		year: shifted.getUTCFullYear(),
		month: shifted.getUTCMonth() + 1,
		day: shifted.getUTCDate()
	};
};

export const attendanceDayKey = (date: Date = new Date(), timeZone = attendanceTimezone()) => {
	const p = datePartsInZone(date, timeZone);
	if (p.hour < 4 || (p.hour === 4 && p.minute < 30)) {
		const prev = subtractOneDay(p.year, p.month, p.day);
		return yyyyMmDd(prev.year, prev.month, prev.day);
	}
	return yyyyMmDd(p.year, p.month, p.day);
};

export const attendanceHourBucket = (date: Date = new Date(), timeZone = attendanceTimezone()) => {
	const p = datePartsInZone(date, timeZone);
	return `${yyyyMmDd(p.year, p.month, p.day)}-${p.hour.toString().padStart(2, '0')}`;
};

export const createAttendanceAccessToken = async (attendeeUserId: string, issuedBy: string) =>
	new SignJWT({ kind: 'attendance_access', attendee_user_id: attendeeUserId, issued_by: issuedBy })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('30d')
		.sign(attendanceSecret());

export const verifyAttendanceAccessToken = async (token: string) => {
	const { payload } = await jwtVerify(token, attendanceSecret());
	if (String(payload.kind ?? '') !== 'attendance_access') throw new Error('Invalid attendance access token');
	const attendeeUserId = String(payload.attendee_user_id ?? '');
	if (!attendeeUserId) throw new Error('Invalid attendance access token');
	return { attendeeUserId };
};

export const createAttendanceHourlyToken = async (attendeeUserId: string) => {
	const bucket = attendanceHourBucket();
	return new SignJWT({
		kind: 'attendance_hourly',
		attendee_user_id: attendeeUserId,
		bucket
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('65m')
		.sign(attendanceSecret());
};

export const createAttendanceActivationToken = async (accessToken: string) =>
	new SignJWT({
		kind: 'attendance_activate',
		access_token: accessToken
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('30d')
		.sign(attendanceSecret());

export const verifyAttendanceHourlyToken = async (token: string) => {
	const { payload } = await jwtVerify(token, attendanceSecret());
	if (String(payload.kind ?? '') !== 'attendance_hourly') throw new Error('Invalid attendance QR token');
	const attendeeUserId = String(payload.attendee_user_id ?? '');
	if (!attendeeUserId) throw new Error('Invalid attendance QR token');
	return { attendeeUserId };
};

export const verifyAttendanceActivationToken = async (token: string) => {
	const { payload } = await jwtVerify(token, attendanceSecret());
	if (String(payload.kind ?? '') !== 'attendance_activate') throw new Error('Invalid attendance activation token');
	const accessToken = String(payload.access_token ?? '');
	if (!accessToken) throw new Error('Invalid attendance activation token');
	return { accessToken };
};
