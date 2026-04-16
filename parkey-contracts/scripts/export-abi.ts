/**
 * Exporte l'ABI (et l'adresse deployee si dispo) de ParkeyNFT vers :
 *   - ./exports/ParkeyNFT.json
 *   - ../parkey-app/src/contracts/ParkeyNFT.json (si le dossier existe)
 *
 * A lancer apres `hardhat compile` ou `hardhat ignition deploy`.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ARTIFACT_PATH = resolve(
  ROOT,
  "artifacts/contracts/ParkeyNFT.sol/ParkeyNFT.json"
);

if (!existsSync(ARTIFACT_PATH)) {
  console.error(
    `[export-abi] Artifact introuvable: ${ARTIFACT_PATH}\nLance "npm run compile" d'abord.`
  );
  process.exit(1);
}

const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));

// Recupere l'adresse depuis les deploiements Ignition si dispo
function readDeployedAddress(): Record<string, string> {
  const out: Record<string, string> = {};
  const networks = ["chain-31337", "chain-11155111", "chain-1"];
  for (const net of networks) {
    const file = resolve(
      ROOT,
      `ignition/deployments/${net}/deployed_addresses.json`
    );
    if (existsSync(file)) {
      try {
        const data = JSON.parse(readFileSync(file, "utf8"));
        const addr = data["ParkeyNFTModule#ParkeyNFT"];
        if (addr) {
          const chainId = net.replace("chain-", "");
          out[chainId] = addr;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

const addresses = readDeployedAddress();

const payload = {
  contractName: "ParkeyNFT",
  abi: artifact.abi,
  addresses, // { "11155111": "0x...", "31337": "0x..." }
};

// Ecriture locale
const localDir = resolve(ROOT, "exports");
mkdirSync(localDir, { recursive: true });
writeFileSync(
  resolve(localDir, "ParkeyNFT.json"),
  JSON.stringify(payload, null, 2)
);
console.log(`[export-abi] ecrit: ${resolve(localDir, "ParkeyNFT.json")}`);

// Copie vers l'app si elle existe en parallele du dossier contracts
const appContractsDir = resolve(ROOT, "../parkey-app/src/contracts");
if (existsSync(resolve(ROOT, "../parkey-app"))) {
  mkdirSync(appContractsDir, { recursive: true });
  writeFileSync(
    resolve(appContractsDir, "ParkeyNFT.json"),
    JSON.stringify(payload, null, 2)
  );
  console.log(`[export-abi] copie: ${resolve(appContractsDir, "ParkeyNFT.json")}`);
} else {
  console.log(
    `[export-abi] parkey-app introuvable a cote, pas de copie cote front`
  );
}
