import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env },
});

const client = new Client({ name: "e2e-test", version: "1.0.0" });
await client.connect(transport);

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}: ${err.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

function parse(result) {
  return JSON.parse(result.content[0].text);
}

function text(result) {
  return result.content[0].text;
}

console.log("\n=== E2E Tests against live Neon ===\n");

// 1. List tools
await test("lists all 11 tools", async () => {
  const { tools } = await client.listTools();
  assert(tools.length === 11, `Expected 11 tools, got ${tools.length}`);
});

// 2. List resources
await test("lists schema resource", async () => {
  const { resources } = await client.listResources();
  assert(resources.length === 1, `Expected 1 resource, got ${resources.length}`);
  assert(resources[0].uri === "schema://tables", `Expected schema://tables`);
});

// 3. Read schema resource
await test("reads schema resource", async () => {
  const result = await client.readResource({ uri: "schema://tables" });
  const data = JSON.parse(result.contents[0].text);
  assert(Array.isArray(data.tables), "Schema should have tables array");
  const tableNames = data.tables.map((t) => t.name);
  assert(tableNames.includes("customers"), "Missing customers table");
  assert(tableNames.includes("tickets"), "Missing tickets table");
  assert(tableNames.includes("products"), "Missing products table");
});

// 4. List customers
await test("list_customers returns 22 customers", async () => {
  const result = await client.callTool({ name: "list_customers", arguments: {} });
  const data = parse(result);
  assert(data.count >= 22, `Expected at least 22 customers, got ${data.count}`);
});

// 5. Filter customers by status
await test("list_customers filters by status", async () => {
  const result = await client.callTool({ name: "list_customers", arguments: { status: "lead" } });
  const data = parse(result);
  assert(data.count === 3, `Expected 3 leads, got ${data.count}`);
});

// 6. Get a specific customer
await test("get_customer returns customer with tickets", async () => {
  const list = await client.callTool({ name: "list_customers", arguments: { company: "Meridian" } });
  const customers = parse(list);
  assert(customers.count >= 1, "Should find Meridian customer");
  const id = customers.results[0].id;

  const result = await client.callTool({ name: "get_customer", arguments: { id } });
  const data = parse(result);
  assert(data.name === "Sarah Chen", `Expected Sarah Chen, got ${data.name}`);
  assert(typeof data.total_tickets_count === "number", "Should have ticket count");
});

// 7. List tickets
await test("list_tickets returns 32 tickets", async () => {
  const result = await client.callTool({ name: "list_tickets", arguments: {} });
  const data = parse(result);
  assert(data.count >= 32, `Expected at least 32 tickets, got ${data.count}`);
});

// 8. List tickets by status
await test("list_tickets filters by status", async () => {
  const result = await client.callTool({ name: "list_tickets", arguments: { status: "closed" } });
  const data = parse(result);
  assert(data.count >= 9, `Expected at least 9 closed tickets, got ${data.count}`);
});

// 9. List products
await test("list_products returns 12 products", async () => {
  const result = await client.callTool({ name: "list_products", arguments: {} });
  const data = parse(result);
  assert(data.count === 12, `Expected 12 products, got ${data.count}`);
  assert(data.results[0].price_display, "Should have price_display");
});

// 10. Search products
await test("search_products finds subscription plans", async () => {
  const result = await client.callTool({ name: "search_products", arguments: { query: "plan" } });
  const data = parse(result);
  assert(data.count >= 3, `Expected at least 3 plans, got ${data.count}`);
});

// 11. Get summary
await test("get_summary returns dashboard stats", async () => {
  const result = await client.callTool({ name: "get_summary", arguments: {} });
  const data = parse(result);
  assert(data.customers.total >= 22, `Expected at least 22 total customers, got ${data.customers.total}`);
  assert(data.customers.active >= 15, `Expected at least 15 active, got ${data.customers.active}`);
  assert(data.tickets.total >= 32, `Expected at least 32 total tickets, got ${data.tickets.total}`);
  assert(data.products.total_value, "Should have products total_value");
});

// 12. Create + close ticket flow
await test("create_ticket and close_ticket round-trip", async () => {
  const list = await client.callTool({ name: "list_customers", arguments: { status: "active" } });
  const customerId = parse(list).results[0].id;

  const createResult = await client.callTool({
    name: "create_ticket",
    arguments: {
      customer_id: customerId,
      subject: "E2E test ticket",
      description: "Created by automated E2E test",
      priority: "low",
    },
  });
  const ticket = parse(createResult);
  assert(ticket.subject === "E2E test ticket", "Ticket should be created");
  assert(ticket.status === "open", "New ticket should be open");

  const closeResult = await client.callTool({
    name: "close_ticket",
    arguments: { id: ticket.id, resolution: "E2E test complete" },
  });
  const closed = parse(closeResult);
  assert(closed.status === "closed", "Ticket should be closed");
  assert(closed.resolution === "E2E test complete", "Should have resolution");
});

// 13. Create customer + update
await test("create_customer and update_customer round-trip", async () => {
  const ts = Date.now();
  const createResult = await client.callTool({
    name: "create_customer",
    arguments: {
      name: `E2E Test ${ts}`,
      email: `e2e-${ts}@test.com`,
      company: "E2E Corp",
    },
  });
  const customer = parse(createResult);
  assert(customer.name === `E2E Test ${ts}`, "Customer should be created");

  const updateResult = await client.callTool({
    name: "update_customer",
    arguments: { id: customer.id, company: "Updated E2E Corp" },
  });
  const updated = parse(updateResult);
  assert(updated.company === "Updated E2E Corp", "Company should be updated");
});

// 14. list_tickets by customer_name
await test("list_tickets resolves customer by name", async () => {
  const result = await client.callTool({
    name: "list_tickets",
    arguments: { customer_name: "Sarah" },
  });
  const data = parse(result);
  assert(data.count >= 2, `Sarah Chen should have at least 2 tickets, got ${data.count}`);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

await client.close();
process.exit(failed > 0 ? 1 : 0);
