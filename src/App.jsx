import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const QUICK_TAGS = ["타이레놀정500mg", "판콜에이내복액", "아드빌정", "겔포스엠현탁액"];

function stockClassName(status) {
  if (status === "충분") return "high";
  if (status === "소량") return "mid";
  if (status === "품절 임박") return "low";
  return "none";
}

function buildNaverMapUrl(pharmacy) {
  return `https://map.naver.com/p/search/${encodeURIComponent(pharmacy.name)}`;
}

async function requestJson(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function App() {
  const [activeMode, setActiveMode] = useState("name");
  const [preferredSort, setPreferredSort] = useState("distance");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("서울특별시");
  const [district, setDistrict] = useState("강남구");
  const [medicineSuggestions, setMedicineSuggestions] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [partnerDistance, setPartnerDistance] = useState([]);
  const [partnerStock, setPartnerStock] = useState([]);
  const [publicPharmacies, setPublicPharmacies] = useState([]);
  const [summary, setSummary] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(null);
  const [highlightedMedicineId, setHighlightedMedicineId] = useState(null);
  const [partners, setPartners] = useState([]);
  const [serviceStatus, setServiceStatus] = useState({ apis: { medicine: false, pharmacy: false } });
  const [photoHint, setPhotoHint] = useState("사진 검색은 OCR 기반으로 텍스트를 읽고, 읽힌 결과를 약품 검색으로 연결합니다.");
  const [locationLabel, setLocationLabel] = useState("위치를 아직 불러오지 않았습니다.");
  const [userLocation, setUserLocation] = useState(null);
  const [adminMedicineQuery, setAdminMedicineQuery] = useState("");
  const [adminCount, setAdminCount] = useState(10);
  const [adminStatus, setAdminStatus] = useState("충분");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [publicDirectoryLoading, setPublicDirectoryLoading] = useState(false);
  const closeTimer = useRef(null);

  const selectedPharmacy = useMemo(
    () => partners.find((pharmacy) => pharmacy.id === selectedPharmacyId) ?? partners[0] ?? null,
    [partners, selectedPharmacyId]
  );

  const pharmacyInventory = useMemo(
    () => (selectedPharmacy?.inventory ?? []).slice().sort((a, b) => b.count - a.count),
    [selectedPharmacy]
  );

  useEffect(() => {
    bootstrap();
    return () => window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (activeMode === "pharmacy" || !query.trim()) {
      setMedicineSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const data = await requestJson(`/api/medicines/search?q=${encodeURIComponent(query)}`);
        setMedicineSuggestions(data.items ?? []);
      } catch {
        setMedicineSuggestions([]);
      }
    }, 240);

    return () => window.clearTimeout(timer);
  }, [activeMode, query]);

  async function bootstrap() {
    try {
      const [partnerData, statusData, publicData] = await Promise.all([
        requestJson("/api/pharmacies/partners"),
        requestJson("/api/status"),
        requestJson(`/api/pharmacies/public?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`)
      ]);
      setPartners(partnerData.items ?? []);
      setSelectedPharmacyId(partnerData.items?.[0]?.id ?? null);
      setServiceStatus(statusData);
      setPublicPharmacies(publicData.items ?? []);
    } catch {
      triggerToast("초기 데이터를 불러오지 못했습니다.");
    }
  }

  function triggerToast(message) {
    setToast(message);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setToast(""), 2200);
  }

  async function handleSearch(nextQuery = query) {
    if (!nextQuery.trim()) {
      setSummary("");
      setPartnerDistance([]);
      setPartnerStock([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: nextQuery,
        mode: activeMode,
        city,
        district
      });
      if (userLocation) {
        params.set("lat", String(userLocation.lat));
        params.set("lng", String(userLocation.lng));
      }
      const data = await requestJson(`/api/search?${params.toString()}`);
      setSummary(data.summary || "");
      setSelectedMedicine(data.medicine || null);
      setPartnerDistance(data.partnerDistance || []);
      setPartnerStock(data.partnerStock || []);
      setPublicPharmacies(data.publicPharmacies || []);
      const primary = preferredSort === "stock" ? data.partnerStock?.[0] : data.partnerDistance?.[0];
      if (primary) {
        setSelectedPharmacyId(primary.id);
        setHighlightedMedicineId(data.medicine?.id ?? null);
      }
    } catch {
      triggerToast("검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublicDirectoryRefresh() {
    setPublicDirectoryLoading(true);
    try {
      const data = await requestJson(`/api/pharmacies/public?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`);
      setPublicPharmacies(data.items ?? []);
      triggerToast("공공 약국 정보를 새로 불러왔습니다.");
    } catch {
      triggerToast("공공 약국 정보를 불러오지 못했습니다.");
    } finally {
      setPublicDirectoryLoading(false);
    }
  }

  function handleLocationRequest() {
    if (!navigator.geolocation) {
      setLocationLabel("이 브라우저에서는 위치 기능을 지원하지 않습니다.");
      return;
    }

    setLocationLabel("현재 위치를 불러오는 중입니다...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(nextLocation);
        setLocationLabel(`현재 위치 반영 완료: 위도 ${nextLocation.lat.toFixed(4)}, 경도 ${nextLocation.lng.toFixed(4)}`);
        triggerToast("현재 위치를 반영했습니다.");
        if (query.trim()) {
          handleSearch();
        }
      },
      () => {
        setLocationLabel("위치 권한이 없어 기본 거리 기준으로 추천합니다.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  async function handlePhotoUpload(event) {
    const [file] = event.target.files ?? [];
    if (!file) return;

    setOcrLoading(true);
    setPhotoHint("이미지에서 약품명을 읽는 중입니다...");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("kor+eng");
      const result = await worker.recognize(file);
      await worker.terminate();

      const normalizedText = result.data.text.replace(/\s+/g, " ").trim();
      const guessed = normalizedText
        .split(" ")
        .find((token) => token.length >= 2 && /[가-힣A-Za-z]/.test(token));

      if (guessed) {
        setQuery(guessed);
        setPhotoHint(`OCR 인식 결과: "${guessed}"를 검색어로 반영했습니다.`);
        await handleSearch(guessed);
        triggerToast("사진 OCR 검색을 반영했습니다.");
      } else {
        setPhotoHint("OCR 결과에서 유효한 약품명을 찾지 못했습니다. 텍스트 검색을 함께 사용해 주세요.");
      }
    } catch {
      setPhotoHint("OCR 처리 중 오류가 발생했습니다. 이미지가 선명한지 확인해 주세요.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleSaveStock() {
    if (!selectedPharmacyId || !adminMedicineQuery.trim()) {
      triggerToast("약국과 약품명을 확인해 주세요.");
      return;
    }

    try {
      const data = await requestJson("/api/admin/inventory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacyId: selectedPharmacyId,
          medicineId: selectedMedicine?.id || null,
          medicineName: adminMedicineQuery,
          count: adminCount,
          status: adminStatus
        })
      });
      setPartners(data.items ?? []);
      setHighlightedMedicineId(selectedMedicine?.id ?? null);
      setSlideOpen(true);
      triggerToast("서버에 재고를 저장했습니다.");
      if (query.trim()) {
        await handleSearch();
      }
    } catch {
      triggerToast("재고 저장 중 오류가 발생했습니다.");
    }
  }

  function renderPartnerLane(items, accent, laneMode) {
    if (!items.length) {
      return <div className="empty-state">조건에 맞는 파트너 약국이 없습니다.</div>;
    }

    return items.map((pharmacy, index) => {
      const recommendation =
        laneMode === "medicine" && pharmacy.stock ? `${pharmacy.stock.status} · ${pharmacy.stock.count}개` : "약국 정보 보기";
      const headline = index === 0
        ? accent === "var(--blue)"
          ? "가장 가까운 추천"
          : "가장 많이 보유"
        : `추천 ${index + 1}`;
      const distanceText = `${(pharmacy.calculatedDistance ?? pharmacy.distanceKm).toFixed(1)}km`;

      return (
        <article
          key={`${accent}-${pharmacy.id}-${index}`}
          className="result-card"
          style={{ "--accent": accent }}
          onClick={() => {
            setSelectedPharmacyId(pharmacy.id);
            setHighlightedMedicineId(selectedMedicine?.id ?? null);
            setSlideOpen(true);
          }}
        >
          <div className="result-card-header">
            <div>
              <span className="slide-pill">{headline}</span>
              <strong>{pharmacy.name}</strong>
              <div>{pharmacy.address}</div>
            </div>
            <div className={`stock-state ${laneMode === "medicine" && pharmacy.stock ? stockClassName(pharmacy.stock.status) : "high"}`}>
              {recommendation}
            </div>
          </div>
          <div className="result-meta">
            <span className="pill">{distanceText}</span>
            <span className="pill">{pharmacy.source}</span>
            <span className="pill">{pharmacy.hours}</span>
          </div>
          <div className="action-row">
            <a className="action-button call" href={`tel:${pharmacy.phone}`} onClick={(event) => event.stopPropagation()}>
              전화 문의
            </a>
            <a className="action-button map" href={buildNaverMapUrl(pharmacy)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
              길찾기
            </a>
          </div>
        </article>
      );
    });
  }

  return (
    <>
      <div className="ambient ambient-a"></div>
      <div className="ambient ambient-b"></div>
      <div className="shell">
        <header className="hero">
          <nav className="topbar">
            <div className="brand">
              <span className="brand-badge">PF</span>
              <div>
                <strong>PharmFinder</strong>
                <p>API 기반 약국 재고 정보 서비스</p>
              </div>
            </div>
            <div className="top-actions">
              <a className="ghost-button" href="#consumer">검색 체험</a>
              <a className="primary-button" href="#pharmacy-admin">약사 화면</a>
            </div>
          </nav>

          <section className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Real Service Structure</span>
              <h1>실제 API와 서버 저장소를 붙인 약국 재고 탐색 웹사이트</h1>
              <p>
                파트너 약국 재고는 서버에 저장하고, 의약품 검색은 MFDS API 연동 가능 구조로, 공공 약국 정보는 국립중앙의료원 API 연동 가능 구조로 구현했습니다.
              </p>
              <div className="hero-cta">
                <button className="primary-button" type="button" onClick={() => handleSearch()}>현재 검색 실행</button>
                <button className="secondary-button" type="button" onClick={handlePublicDirectoryRefresh}>공공 약국 새로고침</button>
              </div>
              <div className="hero-metrics">
                <div className="metric-card">
                  <span>의약품 API</span>
                  <strong>{serviceStatus.apis.medicine ? "활성 가능" : "키 필요"}</strong>
                  <p>MFDS e약은요 연결 구조</p>
                </div>
                <div className="metric-card">
                  <span>약국 API</span>
                  <strong>{serviceStatus.apis.pharmacy ? "활성 가능" : "키 필요"}</strong>
                  <p>국립중앙의료원 공공 약국 조회</p>
                </div>
                <div className="metric-card">
                  <span>사진 검색</span>
                  <strong>{ocrLoading ? "OCR 처리 중" : "OCR 연결"}</strong>
                  <p>Tesseract 기반 업로드 OCR</p>
                </div>
              </div>
            </div>

            <div className="hero-stage card">
              <div className="stage-ribbon">Production-Oriented Flow</div>
              <div className="stage-stack">
                <div className="stage-layer layer-top">
                  <span>Public Drug API</span>
                  <strong>의약품 자동완성 / 정보 보강</strong>
                </div>
                <div className="stage-layer layer-mid">
                  <span>Partner Inventory API</span>
                  <strong>약국 재고 저장 / 조회</strong>
                </div>
                <div className="stage-layer layer-low">
                  <span>Public Pharmacy API</span>
                  <strong>지역 공공 약국 데이터 병행</strong>
                </div>
              </div>
            </div>
          </section>
        </header>

        <main>
          <section id="consumer" className="section">
            <div className="section-head">
              <span className="eyebrow">Consumer Flow</span>
              <h2>실서비스형 검색 경험</h2>
            </div>

            <div className="consumer-shell">
              <section className="search-rail card">
                <div className="search-mode-tabs">
                  {[
                    { id: "name", label: "이름 검색" },
                    { id: "photo", label: "사진 검색" },
                    { id: "pharmacy", label: "약국 검색" }
                  ].map((mode) => (
                    <button key={mode.id} className={`tab-button ${activeMode === mode.id ? "is-active" : ""}`} type="button" onClick={() => setActiveMode(mode.id)}>
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className="search-box">
                  <label htmlFor="medicine-search">{activeMode === "pharmacy" ? "약국 이름 또는 주소" : "약 이름 또는 성분명"}</label>
                  <input
                    id="medicine-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={activeMode === "pharmacy" ? "예: 강남센트럴약국, 테헤란로" : "예: 타이레놀, 아세트아미노펜, 아드빌"}
                    autoComplete="off"
                  />
                  <div className="autocomplete">
                    {medicineSuggestions.map((medicine) => (
                      <button
                        key={medicine.id}
                        type="button"
                        onClick={() => {
                          setQuery(medicine.name);
                          setSelectedMedicine(medicine);
                        }}
                      >
                        {medicine.name} · {medicine.manufacturer || medicine.category || "의약품"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="search-actions">
                  <button className="primary-button" type="button" onClick={() => handleSearch()} disabled={loading}>
                    {loading ? "검색 중..." : "재고 정보 확인"}
                  </button>
                  <label className="upload-button">
                    {ocrLoading ? "OCR 처리 중" : "사진 업로드"}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                </div>

                <div className="region-grid">
                  <label>
                    시도
                    <input value={city} onChange={(event) => setCity(event.target.value)} />
                  </label>
                  <label>
                    시군구
                    <input value={district} onChange={(event) => setDistrict(event.target.value)} />
                  </label>
                </div>

                <div className="location-box">
                  <div>
                    <strong>현재 위치 기반 추천</strong>
                    <p>{locationLabel}</p>
                  </div>
                  <button className="ghost-button" type="button" onClick={handleLocationRequest}>내 위치 사용</button>
                </div>

                <div className="info-notice">
                  <strong>위치 안내</strong>
                  <p>위치 정보는 가까운 약국 추천에만 사용하며, 실제 서비스에서는 동의 후 최소 범위로 처리됩니다.</p>
                </div>

                <div className="sort-panel">
                  <span className="sort-label">추천 방식</span>
                  <div className="sort-options">
                    <button className={`sort-button ${preferredSort === "distance" ? "is-active" : ""}`} type="button" onClick={() => setPreferredSort("distance")}>
                      가까운 약국 우선
                    </button>
                    <button className={`sort-button ${preferredSort === "stock" ? "is-active" : ""}`} type="button" onClick={() => setPreferredSort("stock")}>
                      재고 많은 약국 우선
                    </button>
                  </div>
                </div>

                <div className="photo-hint">{photoHint}</div>

                <div className="info-notice">
                  <strong>안내</strong>
                  <p>표시되는 재고는 참고용입니다. 실제 구매 가능 여부와 복약 상담은 반드시 해당 약국 약사에게 직접 확인하세요.</p>
                </div>

                <div className="quick-tags">
                  {QUICK_TAGS.map((tag) => (
                    <button key={tag} className="tag" type="button" onClick={() => setQuery(tag)}>
                      {tag.replace("정500mg", "").replace("내복액", "").replace("현탁액", "")}
                    </button>
                  ))}
                </div>
              </section>

              <section className="results-stage">
                <article className="card results-panel">
                  <div className="panel-head">
                    <div>
                      <h3>파트너 약국 추천 결과</h3>
                      <p>{summary || "약 이름을 검색하면 파트너 약국 재고와 지역 공공 약국 정보를 함께 보여줍니다."}</p>
                    </div>
                  </div>
                  <div className="result-columns">
                    <div className="result-lane">
                      <div className="lane-head">
                        <span className="lane-chip distance">가까운 파트너 약국</span>
                        <p>{userLocation ? "현재 위치 기준 가장 가까운 순입니다." : "기본 거리값 기준 추천입니다."}</p>
                      </div>
                      <div className="results">{renderPartnerLane(partnerDistance, "var(--blue)", activeMode === "pharmacy" ? "pharmacy" : "medicine")}</div>
                    </div>
                    <div className="result-lane">
                      <div className="lane-head">
                        <span className="lane-chip stock">재고 많은 파트너 약국</span>
                        <p>보유량 기준 추천입니다.</p>
                      </div>
                      <div className="results">{renderPartnerLane(partnerStock, "var(--pink)", activeMode === "pharmacy" ? "pharmacy" : "medicine")}</div>
                    </div>
                  </div>
                </article>

                <article className="card public-directory-card">
                  <div className="panel-head">
                    <div>
                      <h3>지역 공공 약국 정보</h3>
                      <p>{serviceStatus.apis.pharmacy ? `${city} ${district} 기준 공공 약국 정보입니다.` : "API 키를 넣으면 공공 약국 정보를 실제로 불러옵니다."}</p>
                    </div>
                    <button className="ghost-button" type="button" onClick={handlePublicDirectoryRefresh} disabled={publicDirectoryLoading}>
                      {publicDirectoryLoading ? "갱신 중..." : "새로고침"}
                    </button>
                  </div>
                  <div className="public-directory-list">
                    {publicPharmacies.length ? (
                      publicPharmacies.map((pharmacy) => (
                        <article key={pharmacy.id} className="public-pharmacy-item">
                          <div>
                            <strong>{pharmacy.name}</strong>
                            <p>{pharmacy.address}</p>
                          </div>
                          <div className="action-row">
                            {pharmacy.phone ? <a className="action-button call" href={`tel:${pharmacy.phone}`}>전화 문의</a> : null}
                            <a className="action-button map" href={buildNaverMapUrl(pharmacy)} target="_blank" rel="noreferrer">길찾기</a>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">표시할 공공 약국 정보가 없습니다.</div>
                    )}
                  </div>
                </article>

                <aside className={`slide-panel ${slideOpen ? "is-open" : ""}`} aria-live="polite">
                  <div className="slide-panel-inner">
                    <div className="slide-head">
                      <span className="slide-pill">Partner Pharmacy Detail</span>
                      <button className="ghost-button slide-close" type="button" onClick={() => setSlideOpen(false)}>닫기</button>
                    </div>
                    <div className="slide-content">
                      {selectedPharmacy ? (
                        <>
                          <h3>{selectedPharmacy.name}</h3>
                          <p>{selectedPharmacy.address}</p>
                          <div className="result-meta">
                            <span className="pill">{selectedPharmacy.phone}</span>
                            <span className="pill">{selectedPharmacy.hours}</span>
                            <span className="pill">{selectedPharmacy.source}</span>
                          </div>
                          <p>재고 정보는 참고용이며, 실제 구매 가능 여부와 복약 상담은 반드시 해당 약국 약사에게 직접 확인하세요.</p>
                          <div className="action-row">
                            <a className="action-button call" href={`tel:${selectedPharmacy.phone}`}>전화 문의</a>
                            <a className="action-button map" href={buildNaverMapUrl(selectedPharmacy)} target="_blank" rel="noreferrer">네이버 길찾기</a>
                          </div>
                          <ul className="inventory-list">
                            {pharmacyInventory.map((stock) => {
                              const isHighlight = highlightedMedicineId && highlightedMedicineId === stock.medicineId;
                              return (
                                <li
                                  key={`${selectedPharmacy.id}-${stock.medicineId}`}
                                  style={isHighlight ? { padding: 12, borderRadius: 16, background: "rgba(102,247,223,0.08)" } : undefined}
                                >
                                  <div className="stock-line">
                                    <strong>{stock.medicineName}</strong>
                                    <span className={`stock-state ${stockClassName(stock.status)}`}>{stock.status} ({stock.count})</span>
                                  </div>
                                  <div>마지막 반영 {stock.updatedAt}</div>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      ) : (
                        <>
                          <h3>약국을 선택하세요</h3>
                          <p>검색 결과에서 약국 카드를 누르면 상세 재고 패널이 오른쪽에서 슬라이드됩니다.</p>
                        </>
                      )}
                    </div>
                  </div>
                </aside>
              </section>
            </div>
          </section>

          <section id="service-principles" className="section">
            <div className="section-head">
              <span className="eyebrow">Service Principles</span>
              <h2>실서비스 운영 원칙</h2>
            </div>
            <div className="plan-grid">
              <article className="card">
                <h3>API 기반 약품 검색</h3>
                <p>의약품 자동완성과 기본 정보는 MFDS e약은요 API를 연결할 수 있게 만들었습니다.</p>
              </article>
              <article className="card">
                <h3>서버 재고 저장</h3>
                <p>파트너 약국 재고는 서버 JSON 저장소에 반영되도록 바꿔 브라우저 로컬 상태에만 의존하지 않습니다.</p>
              </article>
              <article className="card">
                <h3>공공 약국 정보 병행</h3>
                <p>국립중앙의료원 API를 붙이면 특정 지역의 실제 공공 약국 정보를 함께 조회할 수 있습니다.</p>
              </article>
            </div>
          </section>

          <section id="pharmacy-admin" className="section">
            <div className="section-head">
              <span className="eyebrow">Pharmacy Admin</span>
              <h2>약사 재고 관리 화면</h2>
            </div>
            <div className="admin-layout">
              <article className="card">
                <h3>서버 저장형 재고 수정</h3>
                <div className="admin-form">
                  <label>
                    약국 선택
                    <select value={selectedPharmacyId ?? ""} onChange={(event) => setSelectedPharmacyId(event.target.value)}>
                      {partners.map((pharmacy) => (
                        <option key={pharmacy.id} value={pharmacy.id}>{pharmacy.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    약품 선택
                    <input value={adminMedicineQuery} onChange={(event) => setAdminMedicineQuery(event.target.value)} placeholder="약품명 검색 또는 직접 입력" />
                  </label>
                  <label>
                    재고 수량
                    <input type="number" min="0" value={adminCount} onChange={(event) => setAdminCount(Number(event.target.value))} />
                  </label>
                  <label>
                    상태
                    <select value={adminStatus} onChange={(event) => setAdminStatus(event.target.value)}>
                      <option value="충분">충분</option>
                      <option value="소량">소량</option>
                      <option value="품절 임박">품절 임박</option>
                      <option value="품절">품절</option>
                    </select>
                  </label>
                  <button className="primary-button" type="button" onClick={handleSaveStock}>재고 저장</button>
                </div>
                <p className="helper">실서비스에서는 이 저장 로직을 DB와 POS 연동 레이어로 교체하면 됩니다.</p>
              </article>

              <article className="card">
                <h3>현재 파트너 약국 재고</h3>
                <div className="inventory-board">
                  {pharmacyInventory.map((stock) => (
                    <div className="inventory-item" key={`${selectedPharmacyId}-${stock.medicineId}`}>
                      <div>
                        <strong>{stock.medicineName}</strong>
                        <p>마지막 반영 {stock.updatedAt}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className={`stock-state ${stockClassName(stock.status)}`}>{stock.status}</div>
                        <div>{stock.count}개</div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        </main>
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}

export default App;
