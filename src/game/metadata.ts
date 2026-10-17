export function gameMeta(title: string, description: string) {
  return [
    { title: `${title} — CIVITAS` }, { name: "description", content: description },
    { property: "og:title", content: `${title} — CIVITAS` }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ];
}