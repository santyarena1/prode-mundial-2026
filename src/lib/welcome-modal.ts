export function shouldShowWelcomeModal(
  seenKey: string,
  featureUsed: boolean,
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
  // Mark as done immediately so it only ever shows once
  localStorage.setItem(doneKey, "1");
  return true;
}
