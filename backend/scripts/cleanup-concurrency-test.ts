import prisma from "../src/config/prisma.js";

const cleanup = async () => {
  const orders = await prisma.customerOrder.findMany({
    where: {
      orderNumber: {
        startsWith: "ORD-RACE-",
      },
    },
    select: {
      id: true,
      orderNumber: true,
    },
  });

  if (orders.length === 0) {
    console.log("No concurrency test orders found.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const order of orders) {
      const transactions = await tx.inventoryTransaction.findMany({
        where: {
          transactionKey: {
            startsWith: `RESERVATION-${order.orderNumber}-`,
          },
        },
        select: {
          id: true,
          inventoryId: true,
          quantity: true,
        },
      });

      for (const transaction of transactions) {
        const inventory = await tx.inventory.findUnique({
          where: {
            id: transaction.inventoryId,
          },
          select: {
            id: true,
            reservedQuantity: true,
          },
        });

        if (!inventory) {
          continue;
        }

        if (inventory.reservedQuantity < transaction.quantity) {
          throw new Error(
            `Cannot remove reservation from inventory ${inventory.id}`
          );
        }

        await tx.inventory.update({
          where: {
            id: inventory.id,
          },
          data: {
            reservedQuantity: {
              decrement: transaction.quantity,
            },
          },
        });

        await tx.inventoryTransaction.delete({
          where: {
            id: transaction.id,
          },
        });
      }

      await tx.customerOrder.delete({
        where: {
          id: order.id,
        },
      });
    }
  });

  console.log(`Removed ${orders.length} concurrency test orders.`);
};

cleanup()
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });