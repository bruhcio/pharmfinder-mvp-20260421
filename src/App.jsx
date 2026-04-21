import { useEffect, useMemo, useRef, useState } from "react";
import { medicines, seedPharmacies } from "./data";

const STORAGE_KEY = "pharmfinder-demo-pharmacies";
const QUICK_TAGS = ["타이레놀정500mg", "판콜에이내복액", "아드빌정", "겔포스엠현탁액"];

function loadPharmacies() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seedPharmacies);
  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(seedPharmacies);
  }
}

function persistPharmacies(pharmacies) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pharmacies));
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
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function resolveMedicine(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  return (
    medicines.find((medicine) => {
      const haystack = [medicine.name, ...medicine.aliases, medicine.category].join(" ").toLowerCase();
      return haystack.includes(normalized);
    }) ?? null
  );
}

function buildNaverMapUrl(pharmacy) {
  return `https://map.naver.com/p/search/${encodeURIComponent(pharmacy.name)}`;
}

function App() {
  const [pharmacies, setPharmacies] = useState(() => loadPharmacies());
  const [activeMode, setActiveMode] = useState("name");
  const [preferredSort, setPreferredSort] = useState("distance");
  const [query, setQuery] = useState("");
  const [selectedMedicineId, setSelectedMedicineId] = useState(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(seedPharmacies[0]?.id ?? null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [highlightedMedicineId, setHighlightedMedicineId] = useState(null);
  const [photoHint, setPhotoHint] = useState("사진 검색은 현재 데모 모드입니다. 파일명에 약 이름이 포함되면 후보를 자동 추천합니다.");
  const [locationLabel, setLocationLabel] = useState("위치를 아직 불러오지 않았습니다.");
  const [userLocation, setUserLocation] = useState(null);
  const [adminMedicineQuery, setAdminMedicineQuery] = useState("");
  const [adminMedicineId, setAdminMedicineId] = useState(null);
  const [adminCount, setAdminCount] = useState(10);
  const [adminStatus, setAdminStatus] = useState("충분");
  const [toast, setToast] = useState("");
  const closeTimer = useRef(null);

  useEffect(() => {
    persistPharmacies(pharmacies);
  }, [pharmacies]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const selectedPharmacy = useMemo(
    () => pharmacies.find((pharmacy) => pharmacy.id === selectedPharmacyId) ?? pharmacies[0] ?? null,
    [pharmacies, selectedPharmacyId]
  );

  const searchMatches = useMemo(() => {
    if (!query.trim()) return { medicine: null, distanceSorted: [], stockSorted: [], summary: "" };

    if (activeMode === "pharmacy") {
      const matches = pharmacies.filter((pharmacy) => pharmacy.name.includes(query) || pharmacy.address.includes(query));
      return {
        medicine: null,
        distanceSorted: matches,
        stockSorted: matches,
        summary: `"${query}" 기준으로 ${matches.length}개 약국을 찾았습니다.`
      };
    }

    const medicine = medicines.find((item) => item.id === selectedMedicineId) ?? resolveMedicine(query);
    if (!medicine) {
      return {
        medicine: null,
        distanceSorted: [],
        stockSorted: [],
        summary: `"${query}"와 일치하는 약품을 찾지 못했습니다.`
      };
    }

    const matched = pharmacies
      .map((pharmacy) => {
        const stock = pharmacy.inventory.find((item) => item.medicineId === medicine.id);
        if (!stock) return null;
        return {
          ...pharmacy,
          stock,
          calculatedDistance: userLocation
            ? haversineKm(userLocation.lat, userLocation.lng, pharmacy.lat, pharmacy.lng)
            : pharmacy.distanceKm
        };
      })
      .filter(Boolean);

    const distanceSorted = matched
      .slice()
      .sort((a, b) => a.calculatedDistance - b.calculatedDistance || b.stock.count - a.stock.count);
    const stockSorted = matched
      .slice()
      .sort((a, b) => b.stock.count - a.stock.count || a.calculatedDistance - b.calculatedDistance);

    return {
      medicine,
      distanceSorted,
      stockSorted,
      summary: `${medicine.name} 재고를 가진 약국 ${matched.length}곳을 찾았습니다.`
    };
  }, [activeMode, pharmacies, query, selectedMedicineId, userLocation]);

  useEffect(() => {
    const primary = preferredSort === "stock" ? searchMatches.stockSorted[0] : searchMatches.distanceSorted[0];
    if (primary) {
      setSelectedPharmacyId(primary.id);
      setHighlightedMedicineId(searchMatches.medicine?.id ?? null);
    }
  }, [preferredSort, searchMatches]);

  const medicineSuggestions = useMemo(() => {
    if (!query.trim() || activeMode === "pharmacy") return [];
    const normalized = query.trim().toLowerCase();
    return medicines
      .filter((medicine) => {
        const haystack = [medicine.name, ...medicine.aliases, medicine.category].join(" ").toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 6);
  }, [activeMode, query]);

  const adminSuggestions = useMemo(() => {
    if (!adminMedicineQuery.trim()) return [];
    const normalized = adminMedicineQuery.trim().toLowerCase();
    return medicines
      .filter((medicine) => {
        const haystack = [medicine.name, ...medicine.aliases, medicine.category].join(" ").toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 6);
  }, [adminMedicineQuery]);

  function triggerToast(message) {
    setToast(message);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setToast(""), 2200);
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

  function handleQuickTag(tag) {
    setQuery(tag);
    setSelectedMedicineId(resolveMedicine(tag)?.id ?? null);
  }

  function handlePhotoUpload(event) {
    const [file] = event.target.files ?? [];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const detected = medicines.find((medicine) => {
      const keywords = [medicine.name, ...medicine.aliases].map((token) => token.toLowerCase());
      return keywords.some((token) => lowerName.includes(token.replaceAll(" ", "")) || lowerName.includes(token));
    });

    if (detected) {
      setQuery(detected.name);
      setSelectedMedicineId(detected.id);
      setPhotoHint(`사진 파일명 기반 데모 검색 결과: ${detected.name} 후보를 인식했습니다.`);
      triggerToast("사진 기반 후보를 반영했습니다.");
      return;
    }

    setPhotoHint("데모 모드에서는 파일명 기반으로만 후보를 잡습니다. 실서비스에서는 OCR 또는 비전 API로 약품명을 추출합니다.");
  }

  function handleSelectPharmacy(pharmacyId, medicineId = null) {
    setSelectedPharmacyId(pharmacyId);
    setHighlightedMedicineId(medicineId);
    setSlideOpen(true);
  }

  function handleSaveStock() {
    const pharmacy = pharmacies.find((item) => item.id === selectedPharmacyId);
    const medicineId = adminMedicineId || resolveMedicine(adminMedicineQuery)?.id;
    const count = Number(adminCount);

    if (!pharmacy || !medicineId || Number.isNaN(count)) {
      triggerToast("약국, 약품, 수량을 확인해 주세요.");
      return;
    }

    const nextPharmacies = pharmacies.map((item) => {
      if (item.id !== pharmacy.id) return item;
      const existing = item.inventory.find((entry) => entry.medicineId === medicineId);
      const nextInventory = existing
        ? item.inventory.map((entry) =>
            entry.medicineId === medicineId ? { ...entry, count, status: adminStatus, updatedAt: "방금" } : entry
          )
        : [...item.inventory, { medicineId, count, status: adminStatus, updatedAt: "방금" }];
      return { ...item, inventory: nextInventory };
    });

    setPharmacies(nextPharmacies);
    setHighlightedMedicineId(medicineId);
    setSlideOpen(true);
    triggerToast("재고를 저장했습니다.");
  }

  function renderLane(items, accent, laneMode) {
    if (!items.length) {
      return <div className="empty-state">조건에 맞는 약국이 없습니다.</div>;
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
          onClick={() => handleSelectPharmacy(pharmacy.id, searchMatches.medicine?.id ?? null)}
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
            <a
              className="action-button map"
              href={buildNaverMapUrl(pharmacy)}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              길찾기
            </a>
          </div>
        </article>
      );
    });
  }

  const pharmacyInventory = (selectedPharmacy?.inventory ?? []).slice().sort((a, b) => b.count - a.count);

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
                <p>약국 재고 정보 전달 웹사이트</p>
              </div>
            </div>
            <div className="top-actions">
              <a className="ghost-button" href="#consumer">검색 체험</a>
              <a className="primary-button" href="#pharmacy-admin">약사 화면</a>
            </div>
          </nav>

          <section className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Location + Inventory Intelligence</span>
              <h1>방문 전에 가까운 약국과 재고가 많은 약국을 함께 확인하는 실제 웹앱</h1>
              <p>
                약 이름, 사진, 약국명으로 탐색하고 현재 위치 기준 추천과 재고 보유량 추천을 함께 제공합니다.
                이 서비스는 판매가 아니라 정보 전달과 전화 문의, 길찾기 지원을 목표로 구성되어 있습니다.
              </p>
              <div className="hero-cta">
                <a className="primary-button" href="#consumer">소비자 플로우 보기</a>
                <a className="secondary-button" href="#service-principles">운영 원칙 보기</a>
              </div>
              <div className="hero-metrics">
                <div className="metric-card">
                  <span>추천 축 01</span>
                  <strong>내 위치 기준</strong>
                  <p>가장 가까운 약국 우선 정렬</p>
                </div>
                <div className="metric-card">
                  <span>추천 축 02</span>
                  <strong>재고 보유량 기준</strong>
                  <p>가장 많이 가진 약국 우선 노출</p>
                </div>
                <div className="metric-card">
                  <span>실행 상태</span>
                  <strong>실제 웹앱 구조</strong>
                  <p>Vite + React 기반 실행 가능</p>
                </div>
              </div>
            </div>

            <div className="hero-stage card">
              <div className="stage-ribbon">Dual Recommendation Engine</div>
              <div className="stage-stack">
                <div className="stage-layer layer-top">
                  <span>가까운 약국 추천</span>
                  <strong>현재 위치 반영</strong>
                </div>
                <div className="stage-layer layer-mid">
                  <span>많이 가진 약국 추천</span>
                  <strong>재고 수량 반영</strong>
                </div>
                <div className="stage-layer layer-low">
                  <span>선택 후 슬라이드</span>
                  <strong>상세 재고 정보 확장</strong>
                </div>
              </div>
            </div>
          </section>
        </header>

        <main>
          <section id="consumer" className="section">
            <div className="section-head">
              <span className="eyebrow">Consumer Flow</span>
              <h2>소비자 검색 경험</h2>
            </div>

            <div className="consumer-shell">
              <section className="search-rail card">
                <div className="search-mode-tabs">
                  {[
                    { id: "name", label: "이름 검색" },
                    { id: "photo", label: "사진 검색" },
                    { id: "pharmacy", label: "약국 검색" }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      className={`tab-button ${activeMode === mode.id ? "is-active" : ""}`}
                      onClick={() => {
                        setActiveMode(mode.id);
                        setSelectedMedicineId(null);
                      }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className="search-box">
                  <label htmlFor="medicine-search">{activeMode === "pharmacy" ? "약국 이름 또는 주소" : "약 이름 또는 성분명"}</label>
                  <input
                    id="medicine-search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSelectedMedicineId(null);
                    }}
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
                          setSelectedMedicineId(medicine.id);
                        }}
                      >
                        {medicine.name} · {medicine.category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="search-actions">
                  <button className="primary-button" type="button" onClick={() => setQuery((current) => current.trim())}>재고 정보 확인</button>
                  <label className="upload-button">
                    사진 업로드
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} />
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
                    <button key={tag} className="tag" type="button" onClick={() => handleQuickTag(tag)}>
                      {tag.replace("정500mg", "").replace("내복액", "").replace("현탁액", "")}
                    </button>
                  ))}
                </div>
              </section>

              <section className="results-stage">
                <article className="card results-panel">
                  <div className="panel-head">
                    <div>
                      <h3>추천 결과</h3>
                      <p>{searchMatches.summary || "약 이름을 검색하면 가까운 약국과 재고 많은 약국을 나눠서 보여주고, 전화 문의 전 확인에 도움을 줍니다."}</p>
                    </div>
                  </div>
                  <div className="result-columns">
                    <div className="result-lane">
                      <div className="lane-head">
                        <span className="lane-chip distance">가까운 약국</span>
                        <p>{userLocation ? "현재 위치 기준 가장 가까운 순으로 정렬했습니다." : "기본 거리값 기준 추천입니다."}</p>
                      </div>
                      <div className="results">{renderLane(searchMatches.distanceSorted, "var(--blue)", activeMode === "pharmacy" ? "pharmacy" : "medicine")}</div>
                    </div>
                    <div className="result-lane">
                      <div className="lane-head">
                        <span className="lane-chip stock">재고 많은 약국</span>
                        <p>보유량 기준 추천이 여기에 표시됩니다.</p>
                      </div>
                      <div className="results">{renderLane(searchMatches.stockSorted, "var(--pink)", activeMode === "pharmacy" ? "pharmacy" : "medicine")}</div>
                    </div>
                  </div>
                </article>

                <aside className={`slide-panel ${slideOpen ? "is-open" : ""}`} aria-live="polite">
                  <div className="slide-panel-inner">
                    <div className="slide-head">
                      <span className="slide-pill">Pharmacy Detail</span>
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
                            <span className="pill">
                              거리 {(userLocation
                                ? haversineKm(userLocation.lat, userLocation.lng, selectedPharmacy.lat, selectedPharmacy.lng)
                                : selectedPharmacy.distanceKm
                              ).toFixed(1)}km
                            </span>
                          </div>
                          <p>재고 정보는 참고용이며, 실제 구매 가능 여부와 복약 상담은 반드시 해당 약국 약사에게 직접 확인하세요.</p>
                          <div className="action-row">
                            <a className="action-button call" href={`tel:${selectedPharmacy.phone}`}>전화 문의</a>
                            <a className="action-button map" href={buildNaverMapUrl(selectedPharmacy)} target="_blank" rel="noreferrer">네이버 길찾기</a>
                          </div>
                          <ul className="inventory-list">
                            {pharmacyInventory.map((stock) => {
                              const medicine = medicines.find((item) => item.id === stock.medicineId);
                              const isHighlight = highlightedMedicineId === stock.medicineId;
                              return (
                                <li
                                  key={`${selectedPharmacy.id}-${stock.medicineId}`}
                                  style={isHighlight ? { padding: 12, borderRadius: 16, background: "rgba(102,247,223,0.08)" } : undefined}
                                >
                                  <div className="stock-line">
                                    <strong>{medicine?.name ?? stock.medicineId}</strong>
                                    <span className={`stock-state ${stockClassName(stock.status)}`}>{stock.status} ({stock.count})</span>
                                  </div>
                                  <div>{medicine?.category ?? ""} · 마지막 반영 {stock.updatedAt}</div>
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
              <h2>리스크를 낮추는 서비스 원칙</h2>
            </div>
            <div className="plan-grid">
              <article className="card">
                <h3>정보 제공 중심</h3>
                <p>서비스는 약국 위치, 운영시간, 재고 상태, 갱신 시각을 전달하는 정보 플랫폼으로 동작합니다.</p>
              </article>
              <article className="card">
                <h3>판매 행위 배제</h3>
                <p>주문, 결제, 예약 확정, 픽업 보장 흐름은 두지 않고 전화 문의와 길찾기 중심으로 안내합니다.</p>
              </article>
              <article className="card">
                <h3>최종 확인 주체 명확화</h3>
                <p>구매 가능 여부와 복약 관련 판단은 해당 약국 약사 확인이 최종이라는 문구를 핵심 화면에 반복 노출합니다.</p>
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
                <h3>재고 수정</h3>
                <div className="admin-form">
                  <label>
                    약국 선택
                    <select value={selectedPharmacyId ?? ""} onChange={(event) => setSelectedPharmacyId(event.target.value)}>
                      {pharmacies.map((pharmacy) => (
                        <option key={pharmacy.id} value={pharmacy.id}>{pharmacy.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    약품 선택
                    <input
                      type="text"
                      placeholder="약품명 검색"
                      value={adminMedicineQuery}
                      onChange={(event) => {
                        setAdminMedicineQuery(event.target.value);
                        setAdminMedicineId(null);
                      }}
                    />
                    <div className="autocomplete">
                      {adminSuggestions.map((medicine) => (
                        <button
                          key={medicine.id}
                          type="button"
                          onClick={() => {
                            setAdminMedicineQuery(medicine.name);
                            setAdminMedicineId(medicine.id);
                          }}
                        >
                          {medicine.name} · {medicine.category}
                        </button>
                      ))}
                    </div>
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
                <p className="helper">실서비스에서는 POS/ERP 연동 품목은 자동 동기화하고, 누락 품목만 수기 보정하는 구조가 적합합니다.</p>
              </article>

              <article className="card">
                <h3>현재 약국 재고 스냅샷</h3>
                <div className="inventory-board">
                  {pharmacyInventory.map((stock) => {
                    const medicine = medicines.find((item) => item.id === stock.medicineId);
                    return (
                      <div className="inventory-item" key={`${selectedPharmacyId}-${stock.medicineId}`}>
                        <div>
                          <strong>{medicine?.name ?? stock.medicineId}</strong>
                          <p>{medicine?.category ?? ""}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className={`stock-state ${stockClassName(stock.status)}`}>{stock.status}</div>
                          <div>{stock.count}개</div>
                        </div>
                      </div>
                    );
                  })}
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
