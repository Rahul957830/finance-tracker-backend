export async function GET() {
  const view = {
    meta: {
      generated_at: "28 Jan 2026, 03:45 pm",
      timezone: "Asia/Kolkata"
    }
  };

  return new Response(JSON.stringify(view, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
