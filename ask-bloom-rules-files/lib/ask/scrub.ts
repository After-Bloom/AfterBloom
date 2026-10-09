// Remove anything that could identify a person before an unanswered question is kept (only if she agreed).
// Plain rules: emails, phone numbers, any number of 3 or more digits, @handles and web links. Capped at 200 characters.
export function scrub(text: string) {
  return text
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[link]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/@\w+/g, "[name]")
    .replace(/(\+?\d[\d\s-]{6,}\d)/g, "[number]")
    .replace(/\d{3,}/g, "[number]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}
