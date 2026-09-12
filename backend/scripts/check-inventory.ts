import prisma from "../src/config/prisma.js";

const inventory = await prisma.inventory.findFirst({
  where: {
    itemId: 1,
    locationId: 1,
  },
});

if (inventory) {
  console.log({
    physicalQuantity: inventory.physicalQuantity,
    reservedQuantity: inventory.reservedQuantity,
    availableQuantity:
      inventory.physicalQuantity - inventory.reservedQuantity,
  });
} else {
  console.log("Inventory not found");
}

await prisma.$disconnect();