const TZ = 'Asia/Kolkata';
const IST = '+05:30'; // India has no daylight saving, so a fixed offset is safe
const DAY_MS = 24 * 60 * 60 * 1000;

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD

const dayRange = (dateStr) => {
  const start = new Date(`${dateStr}T00:00:00${IST}`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
};

// First moment of the month, `monthsAgo` months back (0 = this month)
const monthStart = (monthsAgo = 0) => {
  const [y, m] = todayStr().split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - monthsAgo, 1));
  const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return new Date(`${ym}-01T00:00:00${IST}`);
};

const dateKey = (date) => date.toLocaleDateString('en-CA', { timeZone: TZ });

module.exports = { TZ, DAY_MS, todayStr, dayRange, monthStart, dateKey };