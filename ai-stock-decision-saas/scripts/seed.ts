import { stocks } from "../src/lib/mock-data";

async function main() {
  console.log("Seed preview. Connect Prisma client here after DATABASE_URL is ready.");
  console.table(stocks);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
