const medicines = [
  {
    id: "med-001",
    name: "타이레놀정500mg",
    aliases: ["타이레놀", "acetaminophen", "아세트아미노펜"],
    manufacturer: "한국얀센",
    category: "해열진통제",
  },
  {
    id: "med-002",
    name: "아드빌정",
    aliases: ["아드빌", "ibuprofen", "이부프로펜"],
    manufacturer: "화이자",
    category: "진통소염제",
  },
  {
    id: "med-003",
    name: "판콜에이내복액",
    aliases: ["판콜", "판콜a", "감기약"],
    manufacturer: "동화약품",
    category: "감기약",
  },
  {
    id: "med-004",
    name: "겔포스엠현탁액",
    aliases: ["겔포스", "제산제", "gelphos"],
    manufacturer: "보령",
    category: "소화기",
  },
  {
    id: "med-005",
    name: "지르텍정",
    aliases: ["지르텍", "cetirizine", "알레르기"],
    manufacturer: "유한양행",
    category: "항히스타민제",
  },
  {
    id: "med-006",
    name: "인사돌플러스정",
    aliases: ["인사돌", "잇몸약"],
    manufacturer: "동국제약",
    category: "치주질환",
  },
];

const seedPharmacies = [
  {
    id: "ph-001",
    name: "강남센트럴약국",
    district: "서울 강남구",
    distanceKm: 0.8,
    address: "서울 강남구 테헤란로 152",
    phone: "02-555-1245",
    hours: "평일 09:00 - 21:00 / 토 09:00 - 17:00",
    lat: 37.5006,
    lng: 127.0367,
    source: "POS 연동",
    inventory: [
      { medicineId: "med-001", count: 42, status: "충분", updatedAt: "5분 전" },
      { medicineId: "med-002", count: 11, status: "소량", updatedAt: "8분 전" },
      { medicineId: "med-005", count: 19, status: "충분", updatedAt: "12분 전" },
    ],
  },
  {
    id: "ph-002",
    name: "역삼365약국",
    district: "서울 강남구",
    distanceKm: 1.2,
    address: "서울 강남구 역삼로 134",
    phone: "02-553-3650",
    hours: "매일 08:00 - 23:00",
    lat: 37.4953,
    lng: 127.0332,
    source: "수기 입력",
    inventory: [
      { medicineId: "med-001", count: 9, status: "소량", updatedAt: "방금" },
      { medicineId: "med-003", count: 16, status: "충분", updatedAt: "3분 전" },
      { medicineId: "med-004", count: 5, status: "품절 임박", updatedAt: "3분 전" },
    ],
  },
  {
    id: "ph-003",
    name: "선릉메디약국",
    district: "서울 강남구",
    distanceKm: 2.4,
    address: "서울 강남구 선릉로 433",
    phone: "02-568-8891",
    hours: "평일 09:00 - 19:30",
    lat: 37.5048,
    lng: 127.0481,
    source: "POS 연동",
    inventory: [
      { medicineId: "med-002", count: 27, status: "충분", updatedAt: "11분 전" },
      { medicineId: "med-004", count: 14, status: "소량", updatedAt: "11분 전" },
      { medicineId: "med-006", count: 7, status: "품절 임박", updatedAt: "18분 전" },
    ],
  },
  {
    id: "ph-004",
    name: "삼성온누리약국",
    district: "서울 강남구",
    distanceKm: 3.1,
    address: "서울 강남구 삼성로 521",
    phone: "02-542-7775",
    hours: "평일 09:00 - 20:00 / 일 휴무",
    lat: 37.5081,
    lng: 127.0639,
    source: "수기 입력",
    inventory: [
      { medicineId: "med-001", count: 0, status: "품절", updatedAt: "26분 전" },
      { medicineId: "med-003", count: 21, status: "충분", updatedAt: "26분 전" },
      { medicineId: "med-005", count: 4, status: "품절 임박", updatedAt: "26분 전" },
    ],
  },
];

const storageKey = "pharmfinder-demo-pharmacies";
const pharmacies = loadPharmacies();

const medicineSearch = document.querySelector("#medicine-search");
const autocomplete = document.querySelector("#autocomplete");
const distanceResults = document.querySelector("#distance-results");
const stockResults = document.querySelector("#stock-results");
const resultSummary = document.querySelector("#result-summary");
const distanceSummary = document.querySelector("#distance-summary");
const stockSummary = document.querySelector("#stock-summary");
const pharmacyDetailPane = document.querySelector("#pharmacy-detail-pane");
const pharmacySelect = document.querySelector("#pharmacy-select");
const adminMedicineSearch = document.querySelector("#admin-medicine-search");
const adminAutocomplete = document.querySelector("#admin-autocomplete");
const inventoryBoard = document.querySelector("#inventory-board");
const stockCount = document.querySelector("#stock-count");
const stockStatus = document.querySelector("#stock-status");
const photoInput = document.querySelector("#photo-input");
const photoHint = document.querySelector("#photo-hint");
const locationButton = document.querySelector("#location-button");
const locationLabel = document.querySelector("#location-label");
const slidePanel = document.querySelector("#slide-panel");
const closeSlide = document.querySelector("#close-slide");

let activeMode = "name";
let selectedPharmacyId = pharmacies[0]?.id ?? null;
let selectedMedicineId = null;
let preferredSort = "distance";
let userLocation = null;

bootstrap();

function bootstrap() {
  hydratePharmacySelect();
  renderInventoryBoard(selectedPharmacyId);
  renderEmptyLanes();
  bindEvents();
  if (pharmacies[0]) {
    selectPharmacyDetail(pharmacies[0].id, null, false);
  }
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      activeMode = button.dataset.mode;
      selectedMedicineId = null;
      triggerPress(button);
    });
  });

  document.querySelectorAll(".sort-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".sort-button").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      preferredSort = button.dataset.sort;
      triggerPress(button);
      runSearch();
    });
  });

  document.querySelectorAll(".tag").forEach((tag) => {
    tag.addEventListener("click", () => {
      medicineSearch.value = tag.dataset.medicine;
      selectedMedicineId = resolveMedicineId(tag.dataset.medicine);
      runSearch();
      triggerPress(tag);
    });
  });

  medicineSearch.addEventListener("input", () => {
    selectedMedicineId = null;
    renderAutocomplete(medicineSearch.value, autocomplete, (medicine) => {
      medicineSearch.value = medicine.name;
      selectedMedicineId = medicine.id;
      autocomplete.innerHTML = "";
      runSearch();
    });
  });

  adminMedicineSearch.addEventListener("input", () => {
    renderAutocomplete(adminMedicineSearch.value, adminAutocomplete, (medicine) => {
      adminMedicineSearch.value = medicine.name;
      selectedMedicineId = medicine.id;
      adminAutocomplete.innerHTML = "";
    });
  });

  document.querySelector("#search-button").addEventListener("click", runSearch);
  document.querySelector("#save-stock").addEventListener("click", saveStock);
  photoInput.addEventListener("change", handlePhotoSearch);
  locationButton.addEventListener("click", requestUserLocation);
  closeSlide.addEventListener("click", closeSlidePanel);

  pharmacySelect.addEventListener("change", (event) => {
    selectedPharmacyId = event.target.value;
    renderInventoryBoard(selectedPharmacyId);
    selectPharmacyDetail(selectedPharmacyId, null, true);
  });
}

function runSearch() {
  const query = medicineSearch.value.trim();
  if (!query) {
    resultSummary.textContent = "약 이름을 검색하면 가까운 약국과 재고 많은 약국을 나눠서 보여주고, 전화 문의 전 확인에 도움을 줍니다.";
    renderEmptyLanes();
    return;
  }

  if (activeMode === "pharmacy") {
    const matches = pharmacies.filter((pharmacy) => pharmacy.name.includes(query) || pharmacy.address.includes(query));
    resultSummary.textContent = `"${query}" 기준으로 ${matches.length}개 약국을 찾았습니다.`;
    distanceSummary.textContent = "약국 이름 기준 검색 결과입니다.";
    stockSummary.textContent = "약국 이름 기준 검색 결과입니다.";
    renderLane(distanceResults, matches, { kind: "pharmacy", accent: "var(--blue)" });
    renderLane(stockResults, matches, { kind: "pharmacy", accent: "var(--pink)" });
    return;
  }

  const medicineId = selectedMedicineId || resolveMedicineId(query);
  const medicine = medicines.find((item) => item.id === medicineId);

  if (!medicine) {
    resultSummary.textContent = `"${query}"와 일치하는 약품을 찾지 못했습니다.`;
    renderEmptyLanes();
    return;
  }

  const matched = pharmacies
    .map((pharmacy) => {
      const stock = pharmacy.inventory.find((item) => item.medicineId === medicine.id);
      if (!stock) return null;
      const calculatedDistance = userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, pharmacy.lat, pharmacy.lng)
        : pharmacy.distanceKm;
      return {
        ...pharmacy,
        stock,
        calculatedDistance,
      };
    })
    .filter(Boolean);

  const distanceSorted = matched
    .slice()
    .sort((a, b) => a.calculatedDistance - b.calculatedDistance || b.stock.count - a.stock.count);

  const stockSorted = matched
    .slice()
    .sort((a, b) => b.stock.count - a.stock.count || a.calculatedDistance - b.calculatedDistance);

  const primary = preferredSort === "stock" ? stockSorted : distanceSorted;
  resultSummary.textContent = `${medicine.name} 재고를 가진 약국 ${matched.length}곳을 찾았습니다.`;
  distanceSummary.textContent = userLocation
    ? `현재 위치 기준 가장 가까운 순으로 정렬했습니다.`
    : `기본 데모 거리 기준으로 가까운 순 정렬입니다.`;
  stockSummary.textContent = `보유 수량이 많은 약국 순으로 정렬했습니다.`;

  renderLane(distanceResults, distanceSorted, { kind: "medicine", medicineId: medicine.id, accent: "var(--blue)" });
  renderLane(stockResults, stockSorted, { kind: "medicine", medicineId: medicine.id, accent: "var(--pink)" });

  if (primary[0]) {
    selectPharmacyDetail(primary[0].id, medicine.id, false);
  }
}

function renderLane(container, items, options) {
  container.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "조건에 맞는 약국이 없습니다.";
    container.appendChild(empty);
    return;
  }

  items.forEach((pharmacy, index) => {
    const card = document.createElement("article");
    card.className = "result-card tappable";
    card.style.setProperty("--accent", options.accent);

    const recommendation = options.kind === "medicine"
      ? `${pharmacy.stock.status} · ${pharmacy.stock.count}개`
      : "약국 정보 보기";

    const distanceText = `${pharmacy.calculatedDistance?.toFixed(1) ?? pharmacy.distanceKm.toFixed(1)}km`;
    const headline = index === 0
      ? options.accent === "var(--blue)" ? "가장 가까운 추천" : "가장 많이 보유"
      : `추천 ${index + 1}`;
    const mapUrl = buildNaverMapUrl(pharmacy);

    card.innerHTML = `
      <div class="result-card-header">
        <div>
          <span class="slide-pill">${headline}</span>
          <strong>${pharmacy.name}</strong>
          <div>${pharmacy.address}</div>
        </div>
        <div class="stock-state ${options.kind === "medicine" ? stockClassName(pharmacy.stock.status) : "high"}">${recommendation}</div>
      </div>
      <div class="result-meta">
        <span class="pill">${distanceText}</span>
        <span class="pill">${pharmacy.source}</span>
        <span class="pill">${pharmacy.hours}</span>
      </div>
      <div class="action-row">
        <a class="action-button call" href="tel:${pharmacy.phone}" aria-label="${pharmacy.name} 전화 문의">전화 문의</a>
        <a class="action-button map" href="${mapUrl}" target="_blank" rel="noreferrer" aria-label="${pharmacy.name} 길찾기">길찾기</a>
      </div>
    `;

    card.addEventListener("click", () => {
      selectPharmacyDetail(pharmacy.id, options.medicineId ?? null, true);
      triggerPress(card);
    });

    container.appendChild(card);
  });
}

function renderEmptyLanes() {
  renderLane(distanceResults, [], { kind: "medicine", accent: "var(--blue)" });
  renderLane(stockResults, [], { kind: "medicine", accent: "var(--pink)" });
  distanceSummary.textContent = "내 위치 기준 추천이 여기에 표시됩니다.";
  stockSummary.textContent = "보유량 기준 추천이 여기에 표시됩니다.";
}

function renderAutocomplete(query, container, onSelect) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    container.innerHTML = "";
    return;
  }

  const matches = medicines.filter((medicine) => {
    const haystack = [medicine.name, ...medicine.aliases, medicine.category].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });

  container.innerHTML = "";
  matches.slice(0, 6).forEach((medicine) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${medicine.name} · ${medicine.category}`;
    button.addEventListener("click", () => onSelect(medicine));
    container.appendChild(button);
  });
}

function selectPharmacyDetail(pharmacyId, highlightedMedicineId = null, openPanel = true) {
  const pharmacy = pharmacies.find((item) => item.id === pharmacyId);
  if (!pharmacy) return;

  selectedPharmacyId = pharmacyId;
  pharmacySelect.value = pharmacyId;
  renderInventoryBoard(pharmacyId);

  const sortedInventory = pharmacy.inventory.slice().sort((a, b) => b.count - a.count);
  const inventoryMarkup = sortedInventory
    .map((stock) => {
      const medicine = medicines.find((item) => item.id === stock.medicineId);
      const isHighlight = highlightedMedicineId === stock.medicineId;
      const rowStyle = isHighlight ? `style="padding:12px;border-radius:16px;background:rgba(102,247,223,0.08)"` : "";
      return `
        <li ${rowStyle}>
          <div class="stock-line">
            <strong>${medicine?.name ?? stock.medicineId}</strong>
            <span class="stock-state ${stockClassName(stock.status)}">${stock.status} (${stock.count})</span>
          </div>
          <div>${medicine?.category ?? ""} · 마지막 반영 ${stock.updatedAt}</div>
        </li>
      `;
    })
    .join("");

  const distanceText = userLocation
    ? `${haversineKm(userLocation.lat, userLocation.lng, pharmacy.lat, pharmacy.lng).toFixed(1)}km`
    : `${pharmacy.distanceKm.toFixed(1)}km`;
  const mapUrl = buildNaverMapUrl(pharmacy);

  pharmacyDetailPane.innerHTML = `
    <h3>${pharmacy.name}</h3>
    <p>${pharmacy.address}</p>
    <div class="result-meta">
      <span class="pill">${pharmacy.phone}</span>
      <span class="pill">${pharmacy.hours}</span>
      <span class="pill">${pharmacy.source}</span>
      <span class="pill">거리 ${distanceText}</span>
    </div>
    <p>재고 정보는 참고용이며, 실제 구매 가능 여부와 복약 상담은 반드시 해당 약국 약사에게 직접 확인하세요.</p>
    <div class="action-row">
      <a class="action-button call" href="tel:${pharmacy.phone}" aria-label="${pharmacy.name} 전화 문의">전화 문의</a>
      <a class="action-button map" href="${mapUrl}" target="_blank" rel="noreferrer" aria-label="${pharmacy.name} 네이버 길찾기">네이버 길찾기</a>
    </div>
    <ul class="inventory-list">${inventoryMarkup}</ul>
  `;

  if (openPanel) {
    slidePanel.classList.add("is-open");
  }
}

function closeSlidePanel() {
  slidePanel.classList.remove("is-open");
}

function hydratePharmacySelect() {
  pharmacySelect.innerHTML = pharmacies
    .map((pharmacy) => `<option value="${pharmacy.id}">${pharmacy.name}</option>`)
    .join("");
}

function renderInventoryBoard(pharmacyId) {
  const pharmacy = pharmacies.find((item) => item.id === pharmacyId);
  if (!pharmacy) {
    inventoryBoard.innerHTML = "";
    return;
  }

  inventoryBoard.innerHTML = pharmacy.inventory
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((stock) => {
      const medicine = medicines.find((item) => item.id === stock.medicineId);
      return `
        <div class="inventory-item">
          <div>
            <strong>${medicine?.name ?? stock.medicineId}</strong>
            <p>${medicine?.category ?? ""}</p>
          </div>
          <div style="text-align:right">
            <div class="stock-state ${stockClassName(stock.status)}">${stock.status}</div>
            <div>${stock.count}개</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function saveStock() {
  const pharmacy = pharmacies.find((item) => item.id === pharmacySelect.value);
  const medicineId = selectedMedicineId || resolveMedicineId(adminMedicineSearch.value.trim());
  const count = Number(stockCount.value);
  const status = stockStatus.value;

  if (!pharmacy || !medicineId || Number.isNaN(count)) {
    alert("약국, 약품, 수량을 모두 확인해주세요.");
    return;
  }

  const existing = pharmacy.inventory.find((item) => item.medicineId === medicineId);
  if (existing) {
    existing.count = count;
    existing.status = status;
    existing.updatedAt = "방금";
  } else {
    pharmacy.inventory.push({
      medicineId,
      count,
      status,
      updatedAt: "방금",
    });
  }

  persistPharmacies();
  renderInventoryBoard(pharmacy.id);
  selectPharmacyDetail(pharmacy.id, medicineId, true);
  runSearch();
  alert("재고가 저장되었습니다.");
}

function handlePhotoSearch(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  const lowerName = file.name.toLowerCase();
  const detected = medicines.find((medicine) => {
    const keywords = [medicine.name, ...medicine.aliases].map((token) => token.toLowerCase());
    return keywords.some((token) => lowerName.includes(token.replaceAll(" ", "")) || lowerName.includes(token));
  });

  if (detected) {
    medicineSearch.value = detected.name;
    selectedMedicineId = detected.id;
    photoHint.textContent = `사진 파일명 기반 데모 검색 결과: ${detected.name} 후보를 인식했습니다.`;
    runSearch();
    return;
  }

  photoHint.textContent =
    "데모 모드에서는 파일명 기반으로만 후보를 잡습니다. 실서비스에서는 OCR 또는 비전 API로 약품명을 추출합니다.";
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    locationLabel.textContent = "이 브라우저에서는 위치 기능을 지원하지 않습니다.";
    return;
  }

  locationLabel.textContent = "현재 위치를 불러오는 중입니다...";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      locationLabel.textContent = `현재 위치 반영 완료: 위도 ${userLocation.lat.toFixed(4)}, 경도 ${userLocation.lng.toFixed(4)}`;
      runSearch();
    },
    () => {
      locationLabel.textContent = "위치 권한을 허용하지 않아 기본 거리 기준으로 추천합니다.";
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    }
  );
}

function buildNaverMapUrl(pharmacy) {
  const encodedName = encodeURIComponent(pharmacy.name);
  return `https://map.naver.com/p/search/${encodedName}`;
}

function resolveMedicineId(query) {
  const normalized = query.trim().toLowerCase();
  const found = medicines.find((medicine) => {
    const haystack = [medicine.name, ...medicine.aliases].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
  return found?.id ?? null;
}

function stockClassName(status) {
  if (status === "충분") return "high";
  if (status === "소량") return "mid";
  if (status === "품절 임박") return "low";
  return "none";
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function loadPharmacies() {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    return structuredClone(seedPharmacies);
  }

  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(seedPharmacies);
  }
}

function persistPharmacies() {
  window.localStorage.setItem(storageKey, JSON.stringify(pharmacies));
}

function triggerPress(element) {
  element.classList.remove("pressable");
  void element.offsetWidth;
  element.classList.add("pressable");
}
