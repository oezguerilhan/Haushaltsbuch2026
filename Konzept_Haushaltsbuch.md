# Haushaltsbuch 2026 - Concept & Architecture

## Concept Overview
The goal is to build a state-of-the-art 2026 web application for managing personal finances (Haushaltsbuch). The application will provide full control over income, expenses, custom categories, and recurring transactions, presented in a visually stunning, dynamic UI.

## User Review Required
> [!IMPORTANT]
> Since you requested that we do *not* program anything yet, this document outlines the concept. Please review the proposed features and the UI mockup below. Let me know if the styling direction and features align with your vision ("was großartiges, visuell ansprechend" - something great and visually appealing). 
> *Note: I could not find `haushaltsbuch.html` in the folder, so the plan assumes we are starting fresh.*

![Haushaltsbuch Mockup](haushaltsbuch_mockup.png)

## Proposed Features

### 1. Dashboard (The Command Center)
- **Dynamic Visuals:** Neon-accented charts (spending trends, income vs. expense balance) on a deep dark-mode background.
- **Glassmorphism UI:** Translucent cards for summaries.
- **Quick Insights:** Highlight highest expenses and remaining budget for the month.

### 2. Transaction Management
- **Smart Input:** Fast entry for single expenses or income.
- **Flexible Categories:** Pre-defined categories (e.g., Housing, Food, Transport) plus a dedicated manager to add, edit, or color-code custom categories.
- **Micro-animations:** Smooth transitions when logging a transaction or switching tabs.

### 3. Recurring Transactions Engine
- **Subscription Tracker:** A specialized view to manage Netflix, gym, salary, and rent.
- **Auto-Projection:** Calculates your projected balance for the end of the month based on upcoming recurring costs.

## Proposed Architecture (Updated for Mobile Entry)

Since you want to be able to enter expenses on your phone while on the go, a simple local offline HTML file on your PC will not be sufficient. We need a way to synchronize data between your phone and your PC.

## Proposed Architecture (Nextcloud Synchronization)

Da du eine eigene, über das Internet erreichbare **Nextcloud-Instanz** hast, ist das die **perfekte, souveräne Lösung** für dein Haushaltsbuch! Wir benötigen keine Drittanbieter-Cloud.

### Die "Nextcloud WebDAV" Architektur
- **Das Konzept:** Wir bauen eine "Progressive Web App" (PWA), die komplett im Browser läuft. Du kannst sie auf dem PC als Lesezeichen speichern und auf dem Handy per "Zum Startbildschirm hinzufügen" wie eine echte App installieren.
- **Die Speicherung:** Die App verbindet sich direkt über die **WebDAV-Schnittstelle (API) deiner Nextcloud**.
- **Der Workflow:** 
  1. Die App speichert alle deine Ausgaben und Kategorien in einer einzigen Datei (z.B. `haushaltsbuch_data.json`) auf deiner Nextcloud.
  2. Wenn du unterwegs auf dem Handy eine Ausgabe einträgst, speichert die App dies direkt in dieser Datei auf der Nextcloud.
  3. Wenn du zuhause den PC öffnest, lädt das Dashboard die aktuelle Datei sofort herunter und zeigt dir die wunderschönen Neon-Charts mit den neuesten Daten an.
- **Vorteile:** 
  - 100% Datenhoheit (alles bleibt auf deinem Server).
  - Funktioniert geräteübergreifend.
  - Das Design kann auf Handy und Desktop separat optimiert werden (Mobile-First für die Eingabe, riesiges Dashboard für den PC).

**Core Tech Stack:** HTML5, modern vanilla JavaScript, Vanilla CSS (Grid/Flexbox/Animations) für die UI. Die Nextcloud API wird nativ per JavaScript `fetch()` aufgerufen. Keine aufgeblähten UI-Frameworks nötig, um den 2026 Glassmorphism-Look zu erreichen.

## Verification Plan

### Manual Verification
1. User reviews this implementation plan.
2. User reviews the generated `haushaltsbuch_mockup` image.
3. Upon your approval and feedback on this concept, we can proceed to implement the actual `haushaltsbuch.html`, CSS, and JS files.
