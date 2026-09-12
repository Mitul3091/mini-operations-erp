import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma.js";

const resetAdmin = async () => {
  const admin = await prisma.user.findFirst({
    where: {
      role: "ADMIN",
    },
  });

  if (!admin) {
    console.log("No Admin user found.");
    return;
  }

  const newEmail = "admin@erp.com";
  const newPassword = "Admin@123";

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const existingEmail = await prisma.user.findUnique({
    where: {
      email: newEmail,
    },
  });

  if (existingEmail && existingEmail.id !== admin.id) {
    console.log("The new email is already being used by another user.");
    return;
  }

  const updatedAdmin = await prisma.user.update({
    where: {
      id: admin.id,
    },
    data: {
      email: newEmail,
      passwordHash,
      name: "Admin User",
    },
  });

  console.log("Admin credentials reset successfully.");
  console.log(`Email: ${updatedAdmin.email}`);
  console.log(`Password: ${newPassword}`);
};

resetAdmin()
  .catch((error) => {
    console.error("Failed to reset Admin:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });