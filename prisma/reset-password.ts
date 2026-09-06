// Reset a password for any account role.
//
// Usage:
//   bun run reset:password -- user@example.com 'NewPassword123'
//
// Leave out the password to enter it privately at a prompt:
//   bun run reset:password -- user@example.com
//
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function promptForPassword(): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error("Provide the new password as the second argument when not running interactively.");
  }

  process.stdout.write("New password: ");
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let password = "";

    const finish = (callback: () => void) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      callback();
    };

    const onData = (input: Buffer) => {
      const value = input.toString("utf8");

      if (value === "\u0003") {
        process.stdout.write("\n");
        finish(() => reject(new Error("Password reset cancelled.")));
        return;
      }

      if (value === "\r" || value === "\n") {
        process.stdout.write("\n");
        finish(() => resolve(password));
        return;
      }

      if (value === "\u007f" || value === "\b") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }

      password += value;
    };

    process.stdin.on("data", onData);
  });
}

async function main() {
  const [, , emailArgument, passwordArgument] = process.argv;
  const email = emailArgument?.trim().toLowerCase();

  if (!email) {
    throw new Error("Usage: bun run reset:password -- user@example.com [new-password]");
  }

  const password = passwordArgument ?? (await promptForPassword());
  if (password.length < 6) {
    throw new Error("The new password must contain at least 6 characters.");
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    throw new Error(`No user found with email: ${email}`);
  }

  await db.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, 10) },
  });

  console.log(`Password reset for ${user.email} (${user.name}, ${user.role}).`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
