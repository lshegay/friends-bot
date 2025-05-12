export function toShuffled<T>(array: T[]): T[] {
  let currentIndex = array.length;

  const a = [...array];

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [a[currentIndex], a[randomIndex]] = [a[randomIndex], a[currentIndex]];
  }

  return a;
}

export function runAtSpecificTimeOfDay(hour: number, minutes: number, func: () => void) {
  const TWENTY_FOUR_HOURS = 86400000;

  const now = new Date();

  let etaMs =
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minutes, 0, 0).getTime() -
    now.getTime();

  if (etaMs < 0) {
    etaMs += TWENTY_FOUR_HOURS;
  }

  let interval: ReturnType<typeof setInterval>;

  const timeout = setTimeout(() => {
    // запустить один раз
    func();

    // запускать каждые 24 часа
    interval = setInterval(func, TWENTY_FOUR_HOURS);
  }, etaMs);

  return () => {
    // остановить таймер
    clearTimeout(timeout);

    if (interval) {
      clearInterval(interval);
    }
  };
}