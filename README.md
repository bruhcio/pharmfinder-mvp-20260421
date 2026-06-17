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
