import { headers } from "next/headers";

export default async function WidgetPage() {
  const host = headers().get("host");
  const protocol =
    process.env.NODE_ENV === "development" ? "http" : "https";

  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(
    `${baseUrl}/api/widget/view`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to load widget view JSON");
  }

  const data = await res.json();

  return (
    <div
      style={{
        fontFamily: "system-ui",
        fontSize: "13px",
        padding: "12px",
        color: "#e5e7eb",
        background: "transparent",
      }}
    >
      <h3>📌 Finance Rules Tester</h3>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontSize: "11px",
          opacity: 0.9,
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
