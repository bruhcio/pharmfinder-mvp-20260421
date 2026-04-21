export const medicines = [
  { id: "med-001", name: "타이레놀정500mg", aliases: ["타이레놀", "acetaminophen", "아세트아미노펜"], manufacturer: "한국얀센", category: "해열진통제" },
  { id: "med-002", name: "아드빌정", aliases: ["아드빌", "ibuprofen", "이부프로펜"], manufacturer: "화이자", category: "진통소염제" },
  { id: "med-003", name: "판콜에이내복액", aliases: ["판콜", "판콜a", "감기약"], manufacturer: "동화약품", category: "감기약" },
  { id: "med-004", name: "겔포스엠현탁액", aliases: ["겔포스", "제산제", "gelphos"], manufacturer: "보령", category: "소화기" },
  { id: "med-005", name: "지르텍정", aliases: ["지르텍", "cetirizine", "알레르기"], manufacturer: "유한양행", category: "항히스타민제" },
  { id: "med-006", name: "인사돌플러스정", aliases: ["인사돌", "잇몸약"], manufacturer: "동국제약", category: "치주질환" }
];

export const seedPharmacies = [
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
      { medicineId: "med-005", count: 19, status: "충분", updatedAt: "12분 전" }
    ]
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
      { medicineId: "med-004", count: 5, status: "품절 임박", updatedAt: "3분 전" }
    ]
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
      { medicineId: "med-006", count: 7, status: "품절 임박", updatedAt: "18분 전" }
    ]
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
      { medicineId: "med-005", count: 4, status: "품절 임박", updatedAt: "26분 전" }
    ]
  }
];
