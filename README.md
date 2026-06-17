<div align="center">

# PharmFinder MVP

A pharmacy inventory search MVP that helps users find nearby pharmacies by medicine name, OCR, stock level, and location.

![Status](https://img.shields.io/badge/status-MVP-0A1317?style=for-the-badge)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express-0064E0?style=for-the-badge)
![Scope](https://img.shields.io/badge/scope-healthcare%20platform-444950?style=for-the-badge)

</div>

---

## Overview

PharmFinder MVP is a `React + Express` prototype for reducing the friction of finding specific medicines. Instead of calling or visiting multiple pharmacies, users can search by medicine name, ingredient, uploaded image OCR, or location-based recommendations.

This service is designed as an information-delivery MVP. It does not sell, reserve, or dispense medicine.

## Core Flow

- Search by medicine name or ingredient
- Upload a photo and extract medicine text with `Tesseract.js`
- Recommend nearby partner pharmacies
- Sort or highlight pharmacies with higher stock
- View stock cards and detail panels
- Let pharmacy/admin users update inventory data
- Connect users to phone inquiry and map navigation
- Keep risk wording focused on information guidance, not medical advice

## Stack

| Area | Technology |
| --- | --- |
| Frontend | React, Vite |
| Backend | Express |
| OCR | Tesseract.js |
| Data/API | JSON seed data, public data API-ready structure |
| Deploy | Dockerfile, Render config |

## Run

```bash
npm install
npm run dev
```

Default local ports:

- Frontend: `http://localhost:4173`
- Backend API: `http://localhost:8787`

Production-style start:

```bash
npm run build
npm run start
```

## Current Scope

The current version uses seed/partner pharmacy data and API-ready structure. A production service would need authentication, a real database, POS/ERP integration, stronger OCR validation, caching, and pharmacy-side permissions.

---

## 한국어 버전

# PharmFinder MVP

약 이름, OCR, 재고 수량, 위치 정보를 바탕으로 가까운 약국을 찾는 약국 재고 검색 MVP입니다.

## 개요

PharmFinder MVP는 특정 의약품을 찾기 위해 여러 약국에 직접 전화하거나 방문해야 하는 불편을 줄이기 위한 `React + Express` 프로토타입입니다. 사용자는 약 이름, 성분명, 사진 OCR, 위치 기반 추천을 통해 가까운 약국의 재고 정보를 확인할 수 있습니다.

이 서비스는 정보 제공형 MVP로 설계되었습니다. 의약품 판매, 예약, 조제를 직접 처리하지 않습니다.

## 핵심 흐름

- 약 이름 또는 성분명 검색
- 사진 업로드 후 `Tesseract.js`로 약품명 추출
- 가까운 partner pharmacy 추천
- 재고 수량이 많은 약국 강조
- 약국 재고 card와 detail panel 확인
- 약사/관리자용 재고 수정 흐름
- 전화 문의 및 지도 길찾기 연결
- 의료 조언이 아니라 정보 안내 중심의 risk wording 유지

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React, Vite |
| Backend | Express |
| OCR | Tesseract.js |
| Data/API | JSON seed data, public data API-ready structure |
| Deploy | Dockerfile, Render config |

## 실행

```bash
npm install
npm run dev
```

기본 local port:

- Frontend: `http://localhost:4173`
- Backend API: `http://localhost:8787`

production-style start:

```bash
npm run build
npm run start
```

## 현재 범위

현재 버전은 seed/partner pharmacy data와 API-ready structure를 사용합니다. 실제 서비스화를 위해서는 인증, 실제 database, POS/ERP 연동, OCR 검증 강화, caching, 약국 측 권한 관리가 필요합니다.
