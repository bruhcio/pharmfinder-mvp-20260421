import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import { XMLParser } from "fast-xml-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const partnerPharmaciesPath = path.join(dataDir, "partner-pharmacies.json");
const distDir = path.join(__dirname, "dist");

const app = express();
const port = Number(process.env.PORT || 8787);
const xmlParser = new XMLParser({ ignoreAttributes: false, parseTagValue: true, trimValues: true });

const MEDICINE_API_URL = "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList";
const PHARMACY_API_URL = "https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire";

const seededMedicines = [
  { id: "med-001", name: "타이레놀정500mg", aliases: ["타이레놀", "acetaminophen", "아세트아미노펜"], manufacturer: "한국얀센", category: "해열진통제" },
  { id: "med-002", name: "아드빌정", aliases: ["아드빌", "ibuprofen", "이부프로펜"], manufacturer: "화이자", category: "진통소염제" },
  { id: "med-003", name: "판콜에이내복액", aliases: ["판콜", "판콜a", "감기약"], manufacturer: "동화약품", category: "감기약" },
  { id: "med-004", name: "겔포스엠현탁액", aliases: ["겔포스", "제산제", "gelphos"], manufacturer: "보령", category: "소화기" },
  { id: "med-005", name: "지르텍정", aliases: ["지르텍", "cetirizine", "알레르기"], manufacturer: "유한양행", category: "항히스타민제" },
  { id: "med-006", name: "인사돌플러스정", aliases: ["인사돌", "잇몸약"], manufacturer: "동국제약", category: "치주질환" }
];

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function loadPartnerPharmacies() {
  await ensureDataDir();
  const raw = await readFile(partnerPharmaciesPath, "utf8");
  return JSON.parse(raw);
}

async function savePartnerPharmacies(pharmacies) {
  await writeFile(partnerPharmaciesPath, JSON.stringify(pharmacies, null, 2), "utf8");
}

function normalizeMedicine(item) {
  return {
    id: item.itemSeq || item.id || item.medicineId || item.name,
    name: item.itemName || item.name || item.medicineName,
    manufacturer: item.entpName || item.manufacturer || "",
    category: item.category || "일반의약품",
    image: item.itemImage || null,
    efficacy: item.efcyQesitm || "",
    useMethod: item.useMethodQesitm || "",
    caution: item.atpnQesitm || item.atpnWarnQesitm || "",
    source: item.source || "public"
  };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function medicineMatchesQuery(medicine, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;
  const aliases = medicine.aliases || [];
  const haystack = [medicine.name, medicine.manufacturer, medicine.category, ...aliases].join(" ").toLowerCase();
  return haystack.includes(normalized);
}

async function fetchMedicineCandidates(query) {
  const fallback = seededMedicines.filter((medicine) => medicineMatchesQuery(medicine, query)).map((item) => ({
    ...item,
    source: "seed"
  }));

  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY || process.env.MFDS_SERVICE_KEY || "";
  if (!serviceKey || !query.trim()) {
    return { items: fallback, source: serviceKey ? "fallback" : "seed-only" };
  }

  try {
    const response = await axios.get(MEDICINE_API_URL, {
      params: {
        ServiceKey: serviceKey,
        pageNo: 1,
        numOfRows: 10,
        itemName: query,
        type: "json"
      },
      timeout: 15000
    });

    const items = response.data?.body?.items || response.data?.items || [];
    const normalized = Array.isArray(items) ? items.map(normalizeMedicine) : [normalizeMedicine(items)];
    return {
      items: normalized.length ? normalized : fallback,
      source: normalized.length ? "mfds" : "fallback"
    };
  } catch {
    return { items: fallback, source: "fallback" };
  }
}

async function fetchPublicPharmacies({ city, district, name }) {
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY || process.env.NMC_SERVICE_KEY || "";
  if (!serviceKey) {
    return { items: [], source: "disabled" };
  }

  try {
    const response = await axios.get(PHARMACY_API_URL, {
      params: {
        ServiceKey: serviceKey,
        Q0: city || "서울특별시",
        Q1: district || "강남구",
        QN: name || "",
        ORD: "NAME",
        pageNo: 1,
        numOfRows: 20
      },
      timeout: 15000
    });

    const parsed = xmlParser.parse(response.data);
    const items = parsed?.response?.body?.items?.item;
    const itemList = Array.isArray(items) ? items : items ? [items] : [];
    return {
      source: "nmc",
      items: itemList.map((item) => ({
        id: item.hpid || item.rnum || item.dutyName,
        name: item.dutyName,
        address: item.dutyAddr,
        phone: item.dutyTel1,
        lat: Number(item.wgs84Lat || 0),
        lng: Number(item.wgs84Lon || 0),
        hours: [
          item.dutyTime1s && item.dutyTime1c ? `월 ${item.dutyTime1s}-${item.dutyTime1c}` : null,
          item.dutyTime2s && item.dutyTime2c ? `화 ${item.dutyTime2s}-${item.dutyTime2c}` : null
        ].filter(Boolean).join(" / "),
        source: "공공 약국 데이터"
      }))
    };
  } catch {
    return { items: [], source: "fallback" };
  }
}

app.get("/api/status", async (_req, res) => {
  res.json({
    ok: true,
    apis: {
      medicine: Boolean(process.env.PUBLIC_DATA_SERVICE_KEY || process.env.MFDS_SERVICE_KEY),
      pharmacy: Boolean(process.env.PUBLIC_DATA_SERVICE_KEY || process.env.NMC_SERVICE_KEY)
    }
  });
});

app.get("/api/medicines/search", async (req, res) => {
  const query = String(req.query.q || "");
  const result = await fetchMedicineCandidates(query);
  res.json(result);
});

app.get("/api/pharmacies/partners", async (_req, res) => {
  const pharmacies = await loadPartnerPharmacies();
  res.json({ items: pharmacies });
});

app.get("/api/pharmacies/public", async (req, res) => {
  const city = String(req.query.city || "서울특별시");
  const district = String(req.query.district || "강남구");
  const name = String(req.query.name || "");
  const result = await fetchPublicPharmacies({ city, district, name });
  res.json(result);
});

app.get("/api/search", async (req, res) => {
  const query = String(req.query.q || "");
  const mode = String(req.query.mode || "name");
  const city = String(req.query.city || "서울특별시");
  const district = String(req.query.district || "강남구");
  const lat = req.query.lat ? Number(req.query.lat) : null;
  const lng = req.query.lng ? Number(req.query.lng) : null;

  const partnerPharmacies = await loadPartnerPharmacies();

  if (!query.trim()) {
    return res.json({
      summary: "",
      medicine: null,
      partnerDistance: [],
      partnerStock: [],
      publicPharmacies: []
    });
  }

  if (mode === "pharmacy") {
    const matches = partnerPharmacies.filter(
      (pharmacy) => pharmacy.name.includes(query) || pharmacy.address.includes(query)
    );
    const publicPharmacies = await fetchPublicPharmacies({ city, district, name: query });
    return res.json({
      summary: `"${query}" 기준으로 ${matches.length}개 파트너 약국을 찾았습니다.`,
      medicine: null,
      partnerDistance: matches,
      partnerStock: matches,
      publicPharmacies: publicPharmacies.items
    });
  }

  const medicineCandidates = await fetchMedicineCandidates(query);
  const fallbackMedicine =
    seededMedicines.find((item) => medicineMatchesQuery(item, query)) ??
    medicineCandidates.items[0] ??
    null;

  if (!fallbackMedicine) {
    return res.json({
      summary: `"${query}"와 일치하는 약품을 찾지 못했습니다.`,
      medicine: null,
      partnerDistance: [],
      partnerStock: [],
      publicPharmacies: []
    });
  }

  const matchedPartners = partnerPharmacies
    .map((pharmacy) => {
      const stock = pharmacy.inventory.find((item) => {
        const haystack = `${item.medicineName} ${item.medicineId}`.toLowerCase();
        return haystack.includes(fallbackMedicine.name.toLowerCase()) || haystack.includes(query.toLowerCase());
      });
      if (!stock) return null;
      const calculatedDistance =
        lat != null && lng != null ? haversineKm(lat, lng, pharmacy.lat, pharmacy.lng) : pharmacy.distanceKm;
      return { ...pharmacy, stock, calculatedDistance };
    })
    .filter(Boolean);

  const partnerDistance = matchedPartners
    .slice()
    .sort((a, b) => a.calculatedDistance - b.calculatedDistance || b.stock.count - a.stock.count);
  const partnerStock = matchedPartners
    .slice()
    .sort((a, b) => b.stock.count - a.stock.count || a.calculatedDistance - b.calculatedDistance);

  const publicPharmacies = await fetchPublicPharmacies({ city, district, name: "" });

  res.json({
    summary: `${fallbackMedicine.name} 재고를 가진 파트너 약국 ${matchedPartners.length}곳을 찾았습니다.`,
    medicine: fallbackMedicine,
    medicineSource: medicineCandidates.source,
    partnerDistance,
    partnerStock,
    publicPharmacies: publicPharmacies.items
  });
});

app.post("/api/admin/inventory/update", async (req, res) => {
  const { pharmacyId, medicineId, medicineName, count, status } = req.body;
  if (!pharmacyId || !medicineName || Number.isNaN(Number(count))) {
    return res.status(400).json({ error: "pharmacyId, medicineName, count are required." });
  }

  const pharmacies = await loadPartnerPharmacies();
  const nextPharmacies = pharmacies.map((pharmacy) => {
    if (pharmacy.id !== pharmacyId) return pharmacy;
    const existing = pharmacy.inventory.find((item) => item.medicineName === medicineName || item.medicineId === medicineId);
    const nextInventory = existing
      ? pharmacy.inventory.map((item) =>
          item.medicineName === medicineName || item.medicineId === medicineId
            ? { ...item, count: Number(count), status, updatedAt: "방금" }
            : item
        )
      : [
          ...pharmacy.inventory,
          {
            medicineId: medicineId || `custom-${Date.now()}`,
            medicineName,
            count: Number(count),
            status,
            updatedAt: "방금"
          }
        ];
    return { ...pharmacy, inventory: nextInventory };
  });

  await savePartnerPharmacies(nextPharmacies);
  res.json({ ok: true, items: nextPharmacies });
});

async function serveFrontend() {
  try {
    await access(distDir);
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } catch {
    app.get("/", (_req, res) => {
      res.json({ ok: true, message: "Frontend build not found. Run npm run build or npm run dev:web." });
    });
  }
}

await serveFrontend();

app.listen(port, () => {
  console.log(`PharmFinder API server listening on http://localhost:${port}`);
});
