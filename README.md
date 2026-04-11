# CS5002 — Final Design Report

**UniSync** · Spring semester · University of Cincinnati

> **Submission note:** Final course grades for the spring semester cannot be assigned until this Final Design Report is submitted. An **up-to-date link to this repository** is an acceptable deliverable, provided all sections below are complete and reflect the **final** state of the project.

This document is the course **Final Design Report**. Presentation and formatting should read as a **professional, uniformly structured** project record. All sections should describe **final results**, not mid-semester plans.

---

## Table of contents

| # | Section | Jump |
|---|---------|------|
| 1 | [Project description](#1-project-description) | Abstract (≤400 characters) + final system summary |
| 2 | [User interface specification](#2-user-interface-specification) | UI behavior; optional design artifacts |
| 3 | [Test plan and results](#3-test-plan-and-results) | Execution and outcomes of all tests |
| 4 | [User manual](#4-user-manual) | Links to online manual, screenshots, FAQ |
| 5 | [Spring final PPT presentation](#5-spring-final-ppt-presentation) | Slides or recording |
| 6 | [Final Expo poster](#6-final-expo-poster) | Poster file or image |
| 7 | [Assessments](#7-assessments) | Initial (fall) and final (spring) self-assessments |
| 8 | [Summary of hours and justification](#8-summary-of-hours-and-justification) | Per member; evidence of ~45 hours/member |
| 9 | [Summary of expenses](#9-summary-of-expenses) | Costs + donated hardware/software |
| 10 | [Appendix](#10-appendix) | References, citations, repos, meeting notes |

---

## Team and advisor

| Role | Name |
|------|------|
| Team | Tanishq Thakkar · Sai Abhishek Ketepally · Ansh Bhanushali |
| Advisor | Dr. Ali Minai |

**Code repository (this project):** [UniSync](https://github.com/tanishq-thakkar/senior-design2025) *(update if the canonical URL changed).*

---

## 1. Project description

### 1.1 Abstract (≤400 characters)

*Replace the paragraph below with a **single** abstract of **no more than 400 characters** (including spaces). It must reflect the **final** shipped or demonstrated system. Verify length before submission.*

```
UniSync unifies academic tools behind one conversational web app: chat, schedule, and Canvas-oriented flows with Supabase auth and a FastAPI backend. Students use text or voice to reduce app switching; the stack supports cloud static hosting and secure API access—aimed at fewer missed deadlines and clearer campus workflows.
```
*(Sample above: **325 characters** — you may expand up to the 400-character limit.)*

### 1.2 Final system summary

*Summarize what was **actually built and demonstrated** by the end of the project: architecture (e.g. React/Vite frontend, FastAPI backend, Supabase auth, AWS static hosting), key features (chat, schedule, integrations), and known limitations. Link to the main app entry points in this repo: [`unisync-academic-hub/`](./unisync-academic-hub/), [`unisync-backend/`](./unisync-backend/).*

Extended narrative and prior design text: [`docs/Project_Description.md`](./docs/Project_Description.md) *(update that file so it matches the final system).*

---

## 2. User interface specification

*Describe the **final** UI: primary screens, navigation, accessibility choices, responsive behavior, and error/empty states. Optional: embed or link to UI mockups, Figma, or screenshots.*

---

## 3. Test plan and results

*Document **all** testing performed: unit, integration, manual, user acceptance, security/privacy checks, and deployment smoke tests. For each area, state **what** was run, **when**, and **pass/fail** (or metrics). Add links to test logs or CI if applicable.*

| Test area | Method | Results |
|-----------|--------|---------|
| *Example: API health* | *curl / manual* | *Pass* |
| *Add rows* | | |

---

## 4. User manual

*The user-facing manual should be suitable for non-developers. This section should **link** to the online manual and include **representative screenshots** and the **FAQ**.*

| Resource | Link |
|----------|------|
| User documentation hub | [`docs/user-docs/README.md`](./docs/user-docs/README.md) |
| User guide | [`docs/user-docs/user-guide.md`](./docs/user-docs/user-guide.md) |
| User manual | [`docs/user-docs/user-manual.md`](./docs/user-docs/user-manual.md) |
| FAQ | [`docs/user-docs/faq.md`](./docs/user-docs/faq.md) |

*Embed 2–4 screenshots here or under `docs/user-docs/assets/` and reference them.*

---

## 5. Spring final PPT presentation

*Link the **spring** final presentation (PDF/PPTX) or recording.*

| Item | Location |
|------|----------|
| Presentation notes / index | [`docs/Final_Presentation.md`](./docs/Final_Presentation.md) |
| Slides file | *Add path under `docs/` or `Documentation/`, e.g. `docs/Final_Presentation_Spring.pdf`* |

---

## 6. Final Expo poster

*Link or embed the final Expo poster (PDF or high-resolution image).*

| Item | Location |
|------|----------|
| Poster | *Add path, e.g. `docs/Expo_Poster_Final.pdf`* |

---

## 7. Assessments

### 7.1 Initial self-assessments (fall semester)

*Link each team member’s **fall** self-assessment (or a single combined document). Do not include confidential team-only assessments here.*

| Team member | Link |
|-------------|------|
| Tanishq Thakkar | [`docs/homework-essays/Tanishq Thakkar/senior_design_essay.md`](./docs/homework-essays/Tanishq%20Thakkar/senior_design_essay.md) |
| Sai Abhishek Ketepally | [`docs/homework-essays/Sai Abhishek Ketepally/senior_design_essay.md`](./docs/homework-essays/Sai%20Abhishek%20Ketepally/senior_design_essay.md) |
| Ansh Bhanushali | [`docs/homework-essays/Ansh Bhanushali/seniordesign_Essay.md`](./docs/homework-essays/Ansh%20Bhanushali/seniordesign_Essay.md) |

### 7.2 Final self-assessments (spring semester)

*Add links to **spring** final self-assessments per course instructions. **Do not** include confidential team assessments.*

| Team member | Link |
|-------------|------|
| *Name* | *`docs/...`* |

---

## 8. Summary of hours and justification

*Per course policy: provide evidence supporting roughly **45 hours of effort per team member** (adjust if your section specifies otherwise). Include **both semesters** per person, **year totals**, and **project totals**; add a short **justification paragraph** per person; link to **notebooks, time logs, or meeting notes** as evidence.*

### 8.1 Hours table (template)

| Team member | Fall hours | Fall amount ($) | Spring hours | Spring amount ($) | **Year total hours** | **Year total ($)** |
|-------------|------------|-------------------|--------------|-------------------|------------------------|---------------------|
| Tanishq Thakkar | | | | | | |
| Sai Abhishek Ketepally | | | | | | |
| Ansh Bhanushali | | | | | | |
| **Project total** | | | | | | |

### 8.2 Justification (one paragraph per member)

**Tanishq Thakkar** — *Describe activities tied to logged hours (development, integration, deployment, documentation, meetings). Link evidence:* *[e.g. Notion / Google Doc / `docs/meeting-notes/…`]*

**Sai Abhishek Ketepally** — *

**Ansh Bhanushali** — *

---

## 9. Summary of expenses

*List **all** project expenses and any **donated** hardware or software (vendor, description, estimated value if donated).*

| Item | Type (purchase / donation) | Amount or est. value | Notes |
|------|----------------------------|----------------------|-------|
| *Example: API credits* | Purchase | | |
| *Example: laptop loan* | Donation | | |

Prior budget reference: [`docs/Project_Cost_Estimate.md`](./docs/Project_Cost_Estimate.md) *(update to match final numbers).*

---

## 10. Appendix

*Include **references**, **citations**, **links to code repositories**, **meeting notes**, API docs, and any material that supports the report but is not central to the sections above.*

| Kind | Link |
|------|------|
| Main application repo | This repository |
| ABET / standards essay | [`docs/ABET_Essay.md`](./docs/ABET_Essay.md) |
| Canvas developer key request | [`docs/Canvas_Developer_Key_Request.md`](./docs/Canvas_Developer_Key_Request.md) |
| Crawling / compliance | [`docs/crawling_compliance.md`](./docs/crawling_compliance.md) |
| Design diagrams (PDF) | [`docs/UniSync_DesignDiagrams (2).pdf`](./docs/UniSync_DesignDiagrams%20(2).pdf) |
| Professional biographies | [`docs/professional-biographies/`](./docs/professional-biographies/) |
| Meeting notes | *Add folder or doc links* |

---

## Repository structure (overview)

```
UniSync/
├── unisync-academic-hub/   # Vite + React frontend (CloudFront deploy)
├── unisync-backend/        # FastAPI backend
├── docs/                   # Reports, user docs, essays, assets
└── README.md               # This Final Design Report
```

*Keep this README and linked documents updated through the submission deadline.*
