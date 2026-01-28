# Web Crawling & Data Ingestion Compliance

## Project Context
**Project Name:** UniSync – AI-Powered Voice Assistant for University Students  
**Purpose:** Academic senior design project (non-commercial, educational use)

This document outlines the compliance, legal, and ethical guidelines followed when crawling, fetching, storing, and using publicly available web content (e.g., `uc.edu`) for retrieval-augmented generation (RAG) in UniSync.

---

## Scope of Crawling

The system ingests **only publicly accessible content** that:
- Is available without authentication or login
- Is hosted on public university domains (e.g., `https://www.uc.edu/*`)
- Is explicitly allowed by the website’s `robots.txt` policy

The system **does not** crawl:
- Canvas LMS or any authenticated systems
- Student portals, intranet pages, or staff-only resources
- Any content requiring cookies, tokens, or credentials

---

## robots.txt Compliance

- The crawler checks and respects `robots.txt` for each domain before fetching content.
- Disallowed paths are never accessed.
- Any crawl-delay directives are honored.
- If crawling is disallowed entirely, the domain is excluded.

---

## Rate Limiting & Traffic Control

To avoid server strain and ensure ethical access:
- Requests are rate-limited to human-like speeds (e.g., 1–3 requests per second).
- Exponential backoff and retry limits are enforced.
- Crawling jobs are scheduled during off-peak hours where possible.

---

## Data Storage & Transformation

- Raw HTML is stored privately in secure object storage (e.g., S3) for traceability and debugging.
- Content is transformed into:
  - Cleaned text
  - Chunked passages
  - Vector embeddings (non-reversible representations)
- Embeddings and metadata are used for semantic retrieval only.

The system **does not**:
- Redistribute full webpage content verbatim
- Act as a mirror or replacement for the original website

---

## Attribution & Citation

All answers grounded in crawled data:
- Include clear source attribution (URL)
- Prefer summarization over direct quotation
- Cite timestamps or “last updated” information when available

---

## FERPA & Privacy Considerations

- No student-specific or protected educational records are ingested.
- No authenticated or personalized data is crawled.
- Student data is accessed only via explicit, user-authorized APIs (e.g., Canvas, calendars) and is processed per-session.

Public website ingestion is kept **strictly separate** from private or student-authorized data pipelines.

---

## Copyright & Fair Use

- Content is used for educational, non-commercial research purposes.
- Only minimal excerpts are surfaced when necessary.
- All responses are transformative (summaries, answers), not reproductions.

---

## Disclaimer

> This project is a student-built research prototype and is not affiliated with or endorsed by the University of Cincinnati.

---

## Summary

By limiting ingestion to public content, respecting web standards, rate-limiting access, providing attribution, and avoiding private data, this project adheres to accepted legal and ethical practices for web crawling and AI-assisted information retrieval.
