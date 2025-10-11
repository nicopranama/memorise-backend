import crypto from "crypto";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateSecret = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

const generateBase64Secret = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("base64url");
};

const args = process.argv.slice(2);
const format = args.includes("--format") 
  ? args[args.indexOf("--format") + 1] 
  : "env";
const shouldSave = args.includes("--save");

const secrets = {
  JWT_ACCESS_SECRET: generateSecret(64),
  JWT_REFRESH_SECRET: generateSecret(64),
  ENCRYPTION_KEY: generateSecret(32),
  EMAIL_VERIFICATION_SECRET: generateSecret(48),
  PASSWORD_RESET_SECRET: generateSecret(48),
  API_KEY_INTERNAL: generateBase64Secret(32),
  SESSION_SECRET: generateSecret(64),
};

if (format === "json") {
  console.log(JSON.stringify(secrets, null, 2));
} else {
  const envContent = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  
  console.log(envContent);
  
  if (shouldSave) {
    const envPath = join(__dirname, "..", ".env.secrets");
    try {
      writeFileSync(envPath, envContent + "\n", { flag: "wx" });
      console.log(`\nSecrets saved to: ${envPath}`);
      console.log("Remember to add this file to .gitignore");
    } catch (err) {
      if (err.code === "EEXIST") {
        console.error("\nError: File already exists");
      } else {
        console.error(`\nError: ${err.message}`);
      }
    }
  }
}

console.log("\nNotes:");
console.log("- Copy these to your .env file");
console.log("- Never commit secrets to version control");
console.log("- Use different secrets for each environment");
console.log("\nUsage: node scripts/generate-secrets.js [--save] [--format env|json]");