const timeStatusEl = document.querySelector("#time-status");
const todayDateEl = document.querySelector("#today-date");
const tonightPhaseEl = document.querySelector("#tonight-phase");
const birthPhaseEl = document.querySelector("#birth-phase");
const nextBirthdayDateEl = document.querySelector("#next-birthday-date");
const nextBirthdayPhaseEl = document.querySelector("#next-birthday-phase");
const countdownEl = document.querySelector("#countdown");
const birthdayForm = document.querySelector("#birthday-form");
const birthdayInput = document.querySelector("#birthday");

const monthCache = new Map();
let currentDate = new Date();

const phaseLabels = {
  "New Moon": "New Moon",
  "Waxing Crescent": "Waxing Crescent",
  "First Quarter": "First Quarter",
  "Waxing Gibbous": "Waxing Gibbous",
  "Full Moon": "Full Moon",
  "Waning Gibbous": "Waning Gibbous",
  "Last Quarter": "Last Quarter",
  "Waning Crescent": "Waning Crescent",
};

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function normalizePhase(phaseName, lighting) {
  const lowerName = String(phaseName).toLowerCase();

  if (lowerName.includes("new")) return "New Moon";
  if (lowerName.includes("full")) return "Full Moon";
  if (lowerName.includes("first quarter")) return "First Quarter";
  if (lowerName.includes("last quarter")) return "Last Quarter";

  if (lowerName.includes("waxing")) {
    return lighting < 50 ? "Waxing Crescent" : "Waxing Gibbous";
  }

  if (lowerName.includes("waning")) {
    return lighting > 50 ? "Waning Gibbous" : "Waning Crescent";
  }

  return "New Moon";
}

async function fetchCurrentTime() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
  const response = await fetch(
    `https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(zone)}`,
  );

  if (!response.ok) {
    throw new Error(`Time API request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchMoonPhaseByDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  if (!monthCache.has(monthKey)) {
    const response = await fetch(
      `https://www.icalendar37.net/lunar/api/?lang=en&month=${month}&year=${year}`,
    );
    if (!response.ok) {
      throw new Error(`Moon phase API request failed: ${response.status}`);
    }

    monthCache.set(monthKey, await response.json());
  }

  const monthData = monthCache.get(monthKey);
  const dayData = monthData.phase[String(day)];
  if (!dayData) {
    throw new Error("No moon phase data found for this date");
  }

  const normalized = normalizePhase(dayData.phaseName, Number(dayData.lighting));
  return {
    english: normalized,
    display: phaseLabels[normalized],
  };
}

function getNextBirthday(baseDate, birthdaySourceDate) {
  const year = baseDate.getFullYear();
  const month = birthdaySourceDate.getMonth();
  const day = birthdaySourceDate.getDate();

  let next = new Date(year, month, day);
  if (next < new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())) {
    next = new Date(year + 1, month, day);
  }
  return next;
}

function daysUntil(fromDate, toDate) {
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  const ms = to - from;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

async function renderTonightInfo() {
  try {
    const timeData = await fetchCurrentTime();
    currentDate = new Date(
      timeData.year,
      timeData.month - 1,
      timeData.day,
      timeData.hour,
      timeData.minute,
      timeData.seconds,
    );

    timeStatusEl.textContent = `Current timezone: ${timeData.timeZone}, current time: ${timeData.dateTime}`;
    todayDateEl.textContent = formatDate(currentDate);

    const tonightPhase = await fetchMoonPhaseByDate(currentDate);
    tonightPhaseEl.textContent = tonightPhase.display;
  } catch (error) {
    timeStatusEl.textContent = `Could not fetch time from API. Falling back to local time. ${error.message}`;
    currentDate = new Date();
    todayDateEl.textContent = formatDate(currentDate);

    try {
      const tonightPhase = await fetchMoonPhaseByDate(currentDate);
      tonightPhaseEl.textContent = tonightPhase.display;
    } catch (phaseError) {
      tonightPhaseEl.textContent = `Could not load moon phase data: ${phaseError.message}`;
    }
  }
}

birthdayForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!birthdayInput.value) return;

  const birthday = new Date(`${birthdayInput.value}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) {
    birthPhaseEl.textContent = "Invalid birthday format";
    return;
  }

  try {
    const birthPhase = await fetchMoonPhaseByDate(birthday);
    birthPhaseEl.textContent = `${formatDate(birthday)}: ${birthPhase.display}`;

    const nextBirthday = getNextBirthday(currentDate, birthday);
    nextBirthdayDateEl.textContent = formatDate(nextBirthday);

    const nextPhase = await fetchMoonPhaseByDate(nextBirthday);
    nextBirthdayPhaseEl.textContent = nextPhase.display;

    const leftDays = daysUntil(currentDate, nextBirthday);
    countdownEl.textContent = `${leftDays} day(s)`;
  } catch (error) {
    birthPhaseEl.textContent = `Query failed: ${error.message}`;
    nextBirthdayDateEl.textContent = "-";
    nextBirthdayPhaseEl.textContent = "-";
    countdownEl.textContent = "-";
  }
});

renderTonightInfo();

