import { storage } from "../server/storage";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
    console.log("🌱 Seeding database...");

    try {
        // 1. Create Demo User
        const demoPassword = await bcrypt.hash("demo1234", 12);
        const demoUser = await storage.createUser({
            email: "demo@archilex.gr",
            password: demoPassword,
            fullName: "Δήμος Χρήστης",
            profession: "architect",
        });

        await storage.updateUserPlan(demoUser.id, "professional");
        // Increment usage
        for (let i = 0; i < 5; i++) {
            await storage.incrementUsageCount(demoUser.id);
        }

        console.log("✅ Demo user created: demo@archilex.gr / demo1234");

        // 2. Create Admin User
        const adminPassword = await bcrypt.hash("Admin@2024!", 12);
        const adminUser = await storage.createUser({
            email: "admin@archilex.gr",
            password: adminPassword,
            fullName: "Διαχειριστής ArchiLex",
            profession: "other",
        });

        await db.update(users)
            .set({ role: "admin", plan: "unlimited" })
            .where(eq(users.id, adminUser.id));

        console.log("✅ Admin user created: admin@archilex.gr / Admin@2024!");

        console.log("✨ Seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seed();
