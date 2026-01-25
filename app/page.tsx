export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>📦 Inventory App</h1>
      <p>This is your inventory management system.</p>

      <ul>
        <li>Scan a box to see its contents</li>
        <li>Add items with photos</li>
        <li>Search items and find the box instantly</li>
      </ul>

      <p>
        Status: <strong>App is running correctly</strong>
      </p>
    </main>
  );
}
