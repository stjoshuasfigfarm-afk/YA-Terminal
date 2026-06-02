import fs from "fs";

async function checkModels() {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  const data = await res.json();
  const freeModels = data.data.filter((m: any) => m.pricing?.prompt === "0" && m.pricing?.completion === "0").map((m: any) => m.id);
  
  fs.writeFileSync("models.json", JSON.stringify({
    free: freeModels
  }, null, 2));
}

checkModels();
