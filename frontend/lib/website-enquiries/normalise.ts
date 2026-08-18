export function cleanWebsiteText(value: unknown, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function cleanWebsiteEmail(value: unknown) {
  return cleanWebsiteText(value, 180).toLowerCase();
}

export function priorityFromWebsiteUrgency(value: unknown) {
  const urgency = cleanWebsiteText(value, 120).toLowerCase();
  if (urgency.includes("down") || urgency.includes("urgent")) return "urgent";
  if (urgency.includes("fault")) return "high";
  if (urgency.includes("planned") || urgency.includes("routine")) return "normal";
  return "normal";
}

export function machinePartsFromDescription(value: unknown) {
  const description = cleanWebsiteText(value, 260);
  if (!description) return { make: "", model: "" };

  const pieces = description.split(/\s+/).filter(Boolean);
  if (pieces.length === 1) return { make: pieces[0], model: "Unknown" };

  return {
    make: pieces[0],
    model: pieces.slice(1).join(" "),
  };
}
