(function () {
  const VALID_VIEW_TYPES = new Set([
    "home",
    "game",
    "console-launch",
    "browse-date",
    "browse-console",
    "birthday",
    "search"
  ]);
  const MAX_TITLE_LENGTH = 160;
  const MAX_CONSOLE_LENGTH = 80;
  const MAX_QUERY_LENGTH = 160;
  const MAX_SHARE_PAYLOAD_LENGTH = 6000;

  function getBoundedString(value, maxLength) {
    const stringValue = String(value || "").trim();
    return stringValue.length <= maxLength ? stringValue : null;
  }

  function getSafeExternalUrl(value) {
    const raw = String(value || "").trim();
    if (!raw || raw.length > 2048) return null;

    try {
      const url = new URL(raw);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch (err) {
      return null;
    }
  }

  function isValidArchiveMonthYear(month, year) {
    return Number.isInteger(month) && month >= 1 && month <= 12 &&
      Number.isInteger(year) && year >= 1970 && year <= 2100;
  }

  function isValidBirthdayDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const currentYear = new Date().getFullYear();
    if (year < 1970 || year > currentYear || month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
  }

  function sanitizeViewState(candidate) {
    if (!candidate || typeof candidate !== "object" || !VALID_VIEW_TYPES.has(candidate.type)) {
      return null;
    }

    const title = getBoundedString(candidate.title, MAX_TITLE_LENGTH);
    const consoleName = getBoundedString(candidate.console, MAX_CONSOLE_LENGTH);
    const query = getBoundedString(candidate.query, MAX_QUERY_LENGTH);
    const date = getBoundedString(candidate.date, 10);
    if (title === null || consoleName === null || query === null || date === null) return null;

    const month = Number(candidate.month) || 0;
    const year = Number(candidate.year) || 0;
    const hasMonthOrYear = Boolean(month || year);
    if (hasMonthOrYear && !isValidArchiveMonthYear(month, year)) return null;

    if (candidate.type === "game" && (!title || !isValidArchiveMonthYear(month, year))) return null;
    if (candidate.type === "console-launch" && (!consoleName || !isValidArchiveMonthYear(month, year))) return null;
    if (candidate.type === "search" && !query) return null;
    if (candidate.type === "browse-date" && Boolean(month) !== Boolean(year)) return null;
    if (candidate.type === "birthday" && date && !isValidBirthdayDate(date)) return null;

    return {
      type: candidate.type,
      title,
      console: consoleName,
      query,
      date,
      month,
      year
    };
  }

  function isSafeSharePayload(value) {
    return String(value || "").length <= MAX_SHARE_PAYLOAD_LENGTH;
  }

  window.GameRewindUrl = {
    getSafeExternalUrl,
    isSafeSharePayload,
    isValidArchiveMonthYear,
    isValidBirthdayDate,
    sanitizeViewState
  };
}());
