import { tool } from '@openai/agents';
import { z } from 'zod';
import { createCalendarEvent } from '../integrations/notion/calendarDatabase.js';

const DEFAULT_TIME_ZONE = 'Asia/Singapore';
const WEEKDAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};
const MONTH_INDEX = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

function formatDateInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getDatePartsInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function buildDateFromParts(year, monthIndex, day) {
  const date = new Date(Date.UTC(year, monthIndex, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== monthIndex
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function resolveWeekdayDate(normalized, now) {
  const match = normalized.match(/^(?:on\s+)?(?:(this|next)\s+)?(sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)$/);

  if (!match) {
    return null;
  }

  const modifier = match[1] || 'this';
  const weekdayKey = Object.keys(WEEKDAY_INDEX).find((day) => day.startsWith(match[2].slice(0, 3)));
  const targetWeekday = WEEKDAY_INDEX[weekdayKey];
  const currentParts = getDatePartsInTimeZone(now, DEFAULT_TIME_ZONE);
  const currentWeekday = WEEKDAY_INDEX[currentParts.weekday.toLowerCase()];
  let daysUntilTarget = (targetWeekday - currentWeekday + 7) % 7;

  if (modifier === 'next') {
    daysUntilTarget = daysUntilTarget === 0 ? 7 : daysUntilTarget;
  }

  const target = new Date(now);
  target.setDate(target.getDate() + daysUntilTarget);
  return formatDateInTimeZone(target, DEFAULT_TIME_ZONE);
}

function resolveMonthDate(normalized, now) {
  const match = normalized.match(/^(?:on\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?$/);

  if (!match) {
    return null;
  }

  const monthIndex = MONTH_INDEX[match[1]];

  if (monthIndex === undefined) {
    return null;
  }

  const day = Number(match[2]);
  const currentYear = Number(getDatePartsInTimeZone(now, DEFAULT_TIME_ZONE).year);
  let year = match[3] ? Number(match[3]) : currentYear;
  let target = buildDateFromParts(year, monthIndex, day);

  if (!target) {
    return null;
  }

  if (!match[3] && formatDateInTimeZone(target, DEFAULT_TIME_ZONE) < formatDateInTimeZone(now, DEFAULT_TIME_ZONE)) {
    year += 1;
    target = buildDateFromParts(year, monthIndex, day);
  }

  return target ? formatDateInTimeZone(target, DEFAULT_TIME_ZONE) : null;
}

function resolveEventDate(dateText) {
  if (!dateText) {
    return null;
  }

  const normalized = dateText.trim().toLowerCase();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const now = new Date();

  if (normalized === 'today') {
    return formatDateInTimeZone(now, DEFAULT_TIME_ZONE);
  }

  if (normalized === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateInTimeZone(tomorrow, DEFAULT_TIME_ZONE);
  }

  return resolveWeekdayDate(normalized, now) || resolveMonthDate(normalized, now);
}

export function createCalendarEventTool() {
  return tool({
    name: 'create_calendar_event',
    description: 'Create one event or activity in the Notion calendar database.',
    parameters: z.object({
      title: z.string().min(1).describe('A short event or activity title, such as baby shower or photoshoot.'),
      date: z
        .string()
        .min(1)
        .describe('The event date as YYYY-MM-DD or a simple phrase like today, tomorrow, this Saturday, or July 22.'),
    }).strict(),

    async execute({ title, date }) {
      const resolvedDate = resolveEventDate(date);

      if (!resolvedDate) {
        throw new Error('Calendar event date must be clear. Use YYYY-MM-DD, today, tomorrow, this weekday, next weekday, or Month Day.');
      }

      const event = await createCalendarEvent({
        title,
        date: resolvedDate,
      });

      return JSON.stringify({
        ok: true,
        event,
      });
    },
  });
}
