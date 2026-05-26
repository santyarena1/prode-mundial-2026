export function shouldShowWelcomeModal(
  seenKey: string,
  featureUsed: boolean,
  maxShows = 5
): boolean {
  if (typeof window === "undefined") return false;
  const doneKey = `${seenKey}_done`;
  if (featureUsed) {
    localStorage.setItem(doneKey, "1");
    return false;
  }
  if (localStorage.getItem(doneKey)) return false;
  // Support legacy key (old code stored "1" directly at seenKey)
  if (localStorage.getItem(seenKey)) {
    localStorage.setItem(doneKey, "1");
    return false;
  }
  const countKey = `${seenKey}_count`;
  const count = parseInt(localStorage.getItem(countKey) || "0", 10);
  if (count >= maxShows) {
    localStorage.setItem(doneKey, "1");
    return false;
  }
  localStorage.setItem(countKey, String(count + 1));
  return true;
}
