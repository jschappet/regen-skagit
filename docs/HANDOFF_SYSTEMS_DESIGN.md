# Regenerate Skagit — Handoff & System Guide

## Purpose & Philosophy
This system is designed to be **human-scale, locally operated, and easily maintainable**.  
Our sites and tools exist to **orient, connect, and inform** — not to compete for attention or traffic.  

Guiding principles:

- **Human scale:** Everything is legible and approachable. A visitor should understand the site in minutes.  
- **Local ownership:** The system can be run from a Raspberry Pi, old laptop, or personal server — no cloud dependency required.  
- **Web of connections:** The site is part of a network of relationships, not a broadcast megaphone. Content and participation flow like a **mesh**, not a hierarchy.  
- **Low barrier to entry:** Adding content, updating pages, or running the system should be straightforward, not require special credentials or high-end infrastructure.  

Think **Small Local Web** instead of **WorldWideWeb**. The system exists for the community it serves, not for clicks or metrics.

---

## Technical Stack

### **Frontend — Eleventy (Static Site Generator)**
- **Static by default:** Pages are generated at build-time. No database dependencies for core content.  
- **Content as code:** Text, structure, and assets live in plain text / markdown wherever possible.  
- **Content management out-of-band:** Editors update files directly or through simple tools; no complex CMS required.  
- **Mobile-first and human-first design:** UX prioritizes clarity, orientation, and low friction.  

### **Backend — Rust Service**
- Provides optional dynamic content (e.g., events, API endpoints).  
- Scope is **limited and replaceable**: could be swapped for another backend or even a local JSON feed.  
- Designed to run **disconnected**, supporting offline-first approaches or low-bandwidth hosting.  

### **Hosting**
- Can run on:
  - Raspberry Pi
  - Old laptop / local server
  - Standard cloud providers (GoDaddy, Google, Amazon)  
- The system is **portable and resilient**; hosting location does not define functionality.

---

## Operational Principles

1. **Content-first, not platform-first**  
   The story, orientation, and participation guidance comes first. Infrastructure is secondary.  

2. **Orientation over persuasion**  
   The site should **show what’s possible**, not ask or pressure visitors. “Trail sign” logic applies everywhere.  

3. **Easy handoff**  
   Anyone familiar with Eleventy, markdown, and basic server deployment should be able to run or extend the site.  

4. **Sustainability**  
   Avoid dependencies on large frameworks, SaaS platforms, or high-bandwidth systems.  
   Simplicity ensures the system survives beyond any individual operator.

---

## Contributions & Extensions

- Add new content via markdown in `src/pages` or `src/posts`.  
- Style updates via `src/_includes` and CSS layers (Tailwind / DaisyUI optional).  
- Dynamic feeds (events, newsletters) handled via the Rust backend or static JSON.  
- Follow **human-scale principles**: small, digestible updates rather than bloated feature creep.  

---

## Summary

The Regenerate Skagit system is a **portable, legible, human-scale web system**.  
It exists to:

- Ground visitors in place and purpose  
- Connect people with community and rhythm  
- Be easily maintained, shared, and extended without cloud dependencies  

It is **a tool, not a monument**. Anyone should be able to step in, understand it, and let it live in the world without relying on a single steward.
