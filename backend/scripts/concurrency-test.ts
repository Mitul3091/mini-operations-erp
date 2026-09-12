import "dotenv/config";

const email = "sales@erp.com";
const password = "Sales@123";

const login = async () => {
  const response = await fetch("http://localhost:5000/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data.token;
};

const createOrder = async (token: string, orderNumber: string) => {
  const start = Date.now();

  const response = await fetch("http://localhost:5000/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      orderNumber,
      customerId: 1,
      locationId: 1,
      items: [
        {
          itemId: 1,
          quantity: 20,
        },
      ],
    }),
  });

  const data = await response.json();

  return {
    orderNumber,
    status: response.status,
    duration: Date.now() - start,
    data,
  };
};

const run = async () => {
  const token = await login();

  const orderA = `ORD-RACE-A-${Date.now()}`;
  const orderB = `ORD-RACE-B-${Date.now()}`;

  console.log("Sending both reservation requests simultaneously...");
  console.log(orderA);
  console.log(orderB);

  const results = await Promise.all([
    createOrder(token, orderA),
    createOrder(token, orderB),
  ]);

  console.log("\nRESULTS:\n");
  console.dir(results, { depth: null });

  await fetch("http://localhost:5000/inventory", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(async (response) => {
    const data = await response.json();

    const inventory = data.inventory.find(
      (item: any) =>
        item.itemId === 1 && item.locationId === 1
    );

    console.log("\nMAIN WAREHOUSE AFTER TEST:\n");

    if (inventory) {
      console.log({
        physicalQuantity: inventory.physicalQuantity,
        reservedQuantity: inventory.reservedQuantity,
        availableQuantity: inventory.availableQuantity,
      });
    }
  });
};

run().catch((error) => {
  console.error("Concurrency test failed:");
  console.error(error);
  process.exit(1);
});