# Feature Documentation: Verifier Listing Review UI

## 1. Feature Goal

The goal of the **Verifier Listing Review UI** is to provide a first-class, seamless in-app review experience for platform verifiers on Nibash. Rather than isolating verifiers in a barebones detached portal without navigation, verifiers now browse and inspect listings through the standard platform interface—just like regular users—augmented with specialized verifier review queues, inspection tools, verification document previews, and approval workflows.

### Key Objectives
- **Familiar User Experience**: Verifiers navigate the standard `/listings` catalog and `/listings/:id` detail pages with full access to standard property photos, specifications, floor plans, location maps, and rental terms.
- **Dedicated Review Queue**: Easy toggling between "Pending Review" (unverified listings) and "All Approved" listings.
- **Document Inspection**: In-app preview for all verification documents (`electricity_bill_receipt`, `water_bill_receipt`, `holding_tax_receipt`, `trade_license`, `nid`, `passport`, `driving_license`), supporting multi-image galleries and embedded PDF viewers.
- **Action Controls**: Document-level verification and listing-level approval controls with real-time feedback.
- **Strictly Frontend Only**: Zero changes to backend routes, controllers, services, database schemas, or authentication logic.

---

## 2. Architecture

The implementation follows a **frontend-only orchestration pattern** that works strictly within the existing backend API contracts:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Verifier Experience                           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌─────────────────────────────┐             ┌──────────────────────────────────┐
│   Browse & Filter Listings  │             │      Inspect Listing Detail      │
│  (ListingsPage.tsx)         │             │   (ListingDetailPage.tsx)        │
├─────────────────────────────┤             ├──────────────────────────────────┤
│ • Pending / Approved Tabs   │             │ • Full property specifications   │
│ • PropertyCard (Pending Tag)│             │ • Verification Documents Section │
│ • Review Queue Navbar Badge │             │ • In-app DocumentViewerModal     │
│ • GET /api/verify/listings  │             │ • Fallback to unverified queue   │
│ • GET /api/listings         │             │ • Status Progress & Action Card  │
└─────────────────────────────┘             └────────────────┬─────────────────┘
                                                             │
                              ┌──────────────────────────────┴──────────────────────────────┐
                              ▼                                                             ▼
             ┌─────────────────────────────────┐                       ┌─────────────────────────────────┐
             │    Document-Level Actions       │                       │     Listing-Level Actions       │
             ├─────────────────────────────────┤                       ├─────────────────────────────────┤
             │ • View PDF & image attachments  │                       │ • Approve Listing               │
             │ • POST /api/documents/:id/verify│                       │   POST /api/verify/listings/    │
             │ • Live badge update to Verified │                       │        :id/verify               │
             │                                 │                       │ • Reject Listing                │
             │                                 │                       │   (Advisory limitation dialog)  │
             └─────────────────────────────────┘                       └─────────────────────────────────┘
```

### Key Technical Mechanisms
1. **Layout Integration**: Verifiers now share the standard platform shell (`Navbar`, `Footer`, scroll management) rather than being trapped in an unstyled `/verify` screen.
2. **Dual-Queue Fetching**: When in Verifier Review Mode, the listings page requests `/api/verify/listings` for pending listings and `/api/listings` for approved listings.
3. **404 Detail Fallback**: `GET /api/listings/:id` returns 404 for unverified listings when queried by anyone other than the listing owner. For verifiers, the frontend detects this 404 and transparently resolves the listing from `GET /api/verify/listings`.
4. **Document Media Viewer**: `DocumentViewerModal.tsx` provides full-screen modal preview with support for image zoom/pan, embedded PDF iframes, keyboard shortcuts (Escape, Left/Right arrow), and external tab opening.

---

## 3. Verifier Flow

1. **Authentication & Role Recognition**:
   - The user logs in with a verifier account (`is_verifier: true`).
   - The `Navbar` automatically displays a **Review Queue** navigation link with an amber badge indicating pending status.
   - The `ProfileMenu` displays a **Verifier** badge and a quick link to the Review Queue (`/listings?view=pending`).
2. **Browsing the Review Queue**:
   - Verifier navigates to `/listings?view=pending` or clicks "Review Queue".
   - A **Verifier Review Mode** banner appears above the search filters with tabs:
     - **Pending Review**: Shows unverified listings awaiting verification.
     - **All Approved**: Shows live listings on the platform.
   - Each listing is displayed using the standard `PropertyCard` component, with a subtle amber `Pending Verification` tag and a `Review →` CTA.
3. **Inspecting a Listing**:
   - Verifier clicks any listing card to open `/listings/:id`.
   - The page renders all property specs, photos, floor plans, rent, description, and location map.
   - A dedicated **Verification Documents** section displays all documents uploaded by the landlord.
4. **Document Inspection & Verification**:
   - Verifier clicks any document thumbnail or file preview card.
   - `DocumentViewerModal` opens with high-resolution image zoom or full PDF viewer.
   - Verifier can verify individual documents by clicking `Verify Document`, sending `POST /api/documents/:documentId/verify`.
5. **Listing Approval / Rejection**:
   - In the sidebar's **Listing Verification** card, the verifier views the document verification progress (`X of Y documents verified`).
   - **Approve Listing**: Clicking `Approve Listing` executes `POST /api/verify/listings/:id/verify`. The listing status immediately updates to `approved` and is published.
   - **Reject Listing**: Clicking `Reject Listing` opens an advisory modal explaining the backend API limitation (see Section 8).

---

## 4. API Contract

All operations rely exclusively on the existing, unmodified backend endpoints:

| Endpoint | Method | Role Required | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/verify/listings` | `GET` | Verifier (`is_verifier: true`) | None | Retrieves all unverified listings pending review. Returns `{ listings: UnverifiedListing[] }`. |
| `/api/listings` | `GET` | Public / Any | Query params (optional) | Retrieves all approved listings on the platform. Returns `{ listings: BackendListing[] }`. |
| `/api/listings/:id` | `GET` | Public / Any | None | Retrieves listing details. Returns `{ listing: BackendListing }` if status is approved or requester is the owner; returns 404 otherwise. |
| `/api/documents/listings/:id` | `GET` | Owner or Verifier | None | Retrieves all verification documents attached to the listing with media URLs. Returns `{ documents: ListingDocument[] }`. |
| `/api/documents/:documentId/verify` | `POST` | Verifier (`is_verifier: true`) | None | Marks an individual document as verified (`verification_type: "manual"`). Returns `{ message: "Document verified successfully" }`. |
| `/api/verify/listings/:id/verify` | `POST` | Verifier (`is_verifier: true`) | None | Approves and publishes the listing (`status: "approved"`). Returns `{ message: "Listing verified successfully" }`. |

---

## 5. Document Display

### Supported Document Types
The UI maps raw database document type keys to readable labels:
- `electricity_bill_receipt` → **Electricity Bill Receipt**
- `water_bill_receipt` → **Water Bill Receipt**
- `holding_tax_receipt` → **Holding Tax Receipt**
- `trade_license` → **Trade License**
- `nid` → **National ID (NID)**
- `passport` → **Passport**
- `driving_license` → **Driving License**

### Media Preview & Modal Capabilities
- **Inline Thumbnails**:
  - Image files: Rendered as object-fit cover thumbnails with hover zoom icons.
  - PDF files: Rendered with dedicated PDF icon badges and clear "Click to view" indicators.
- **DocumentViewerModal Component**:
  - Fullscreen overlay with dark backdrop blur.
  - Multi-file pagination (`File X of Y`) with Next / Previous navigation buttons and keyboard shortcuts (Left/Right arrows).
  - Zoom controls (`+`, `-`, `Reset`) for inspecting fine text on receipts and identification cards.
  - Native embedded PDF viewer using responsive `<iframe>`.
  - Direct external link button to open original files in a new browser tab.
  - Bottom thumbnail carousel for fast file switching.

---

## 6. Verification Actions

### 1. Document Verification (`handleVerifyDocument`)
- Verifiers can verify documents individually directly from the listing page.
- Calls `POST /api/documents/:documentId/verify`.
- State updates optimistically and locks the document's verification button.
- Updates the document status badge from `Pending Review` (amber) to `Verified` (emerald) with `Manual` verification tag.

### 2. Listing Approval (`handleApproveListing`)
- Verifiers can approve the overall listing once documents and specifications are confirmed.
- Calls `POST /api/verify/listings/:id/verify`.
- Disables the button, presents loading state (`Approving Listing...`), and transitions the listing status to `approved`.
- Displays an emerald confirmation message and updates the status badge across the page.

### 3. Listing Rejection (`handleRejectListing`)
- Because the backend does not provide a rejection endpoint or schema for listings, the UI provides an honest advisory modal explaining the limitation and directing verifiers to notify administrators or hold the listing in the queue.

---

## 7. UI Changes

### 1. `client/src/App.tsx`
- Removed the verifier-exclusive early return that bypassed `Navbar` and `Footer`.
- Verifiers now navigate the standard layout with standard routing.

### 2. `client/src/components/Navbar.tsx`
- Added a **Review Queue** navigation button with an amber indicator badge visible only when `user?.is_verifier` is true.

### 3. `client/src/components/ProfileMenu.tsx`
- Added a **Verifier** role badge alongside user details.
- Added a direct **Review Queue** menu item pointing to `/listings?view=pending`.

### 4. `client/src/components/PropertyCard.tsx`
- Added optional `isVerifier` prop.
- Displays an amber `Pending Verification` status pill on unverified cards.
- Customizes the card CTA to `Review →` for pending listings while preserving `Explore →` for standard users.

### 5. `client/src/pages/ListingsPage.tsx`
- Added state to support `verifierView` query param (`pending` vs `approved`).
- Added a **Verifier Review Mode** banner with live count of pending listings and view switcher tabs.
- Connected real-time search, bed/bath filters, and price filters to the pending listings queue.

### 6. `client/src/pages/ListingDetailPage.tsx`
- Added 404 fallback logic for unverified listings using `GET /api/verify/listings`.
- Added the **Verification Documents** card (`order-7`) displaying all attached documents, verification badges, and thumbnail grids.
- Upgraded the sidebar **Listing Verification** actions card with live progress bar (`X of Y documents verified`), approval button, and rejection trigger.
- Added `DocumentViewerModal` and `Rejection Advisory` modals.

### 7. `client/src/pages/VerifyPortalPage.tsx`
- Updated to seamlessly redirect verifiers to `/listings?view=pending` (and non-verifiers to `/listings`), ensuring legacy bookmarks and links remain functional.

### 8. `client/src/components/DocumentViewerModal.tsx`
- Newly created component providing full document inspection capabilities for image and PDF assets.

---

## 8. Backend Limitations

As strictly instructed, **no backend code was modified**. During investigation, the following limitations were observed:

1. **No Listing Rejection Endpoint**:
   - There is no endpoint such as `POST /api/verify/listings/:id/reject` in `server/src/routes/verify.route.ts` or `server/src/services/listing.service.ts`.
   - *Frontend Handling*: The "Reject Listing" button opens an advisory dialog clearly explaining that listing rejection is not supported by the backend API. No false claims of rejection are made.
2. **No Rejection Reason Storage**:
   - The `listings` table has no `rejection_reason` column.
   - *Frontend Handling*: The UI does not pretend to save or submit rejection reasons.
3. **No Unverified Listing Detail Endpoint**:
   - `GET /api/listings/:id` enforces `WHERE l.id = $1 AND (l.status = 'approved' OR l.owner_id = $2)`, resulting in a 404 for verifiers on unverified listings they do not own.
   - *Frontend Handling*: The frontend handles 404 responses for verifiers by fetching `GET /api/verify/listings` and locating the target listing.
4. **Omission of Utility Terms in Unverified Queue**:
   - `getUnverifiedListings()` does not return utility fields (`electricity_bill`, `water_bill`, `service_charge`, `monthly_due_date`, etc.).
   - *Frontend Handling*: These fields are conditionally rendered only when defined.

---

## 9. Testing & Verification

### Automated Typecheck & Build
- TypeScript typecheck passed cleanly:
  ```bash
  cmd.exe /c "npx tsc -b"
  # Exit code: 0 (0 errors)
  ```
- Vite production build succeeded:
  ```bash
  cmd.exe /c "npm run build"
  # 59 modules transformed, built in 760ms
  ```

### Functional Scenarios Tested
1. **Verifier Navigation**:
   - Logged in with verifier account (`asif@test.com`, ID: 12, `is_verifier: true`).
   - Verified that "Review Queue" badge appears in Navbar and ProfileMenu.
   - Verified that visiting `/listings?view=pending` displays the Verifier Review Mode banner and pending listings.
2. **Listing Review Queue**:
   - Verified unverified listing (Listing 26: `doc test 3`) appears in the pending queue with `Pending Verification` tag.
   - Filtered listings in the pending tab and toggled to "All Approved" tab.
3. **Listing Detail & Document Inspection**:
   - Opened `/listings/26` as verifier.
   - Verified that 404 fallback successfully loaded listing data.
   - Verified that Verification Documents section loaded attached documents (IDs 2 & 3: `holding_tax_receipt` and `electricity_bill_receipt`).
   - Opened document previews in `DocumentViewerModal` for both JPEG and PDF files.
   - Verified zoom in/out, keyboard navigation (Escape, Left/Right), and external tab opening.
4. **Verification Action Execution**:
   - Verified individual document via `POST /api/documents/:id/verify`.
   - Verified listing approval via `POST /api/verify/listings/:id/verify`.
5. **Regular User Isolation**:
   - Verified that non-verifier users and unauthenticated guests do NOT see the Review Queue badge, Verifier Review Mode banner, or Verifier action controls.

---

## 10. Files Changed

> [!IMPORTANT]
> **NO BACKEND FILES WERE MODIFIED.**
> All changes are strictly confined to the `client/` frontend codebase.

### Created Files
- `client/src/components/DocumentViewerModal.tsx`: In-app document and PDF viewer modal.
- `docs/features/02-verifier-listing-review.md`: Feature specification and implementation report.

### Modified Files
- `client/src/App.tsx`: Removed verifier layout bypass so verifiers have access to standard Navbar/Footer.
- `client/src/components/Navbar.tsx`: Added Review Queue badge and navigation link for verifiers.
- `client/src/components/ProfileMenu.tsx`: Added Verifier role badge and Review Queue link.
- `client/src/components/PropertyCard.tsx`: Added pending status badge and `Review →` CTA for verifiers.
- `client/src/pages/ListingsPage.tsx`: Added Verifier Review Mode banner, tab switcher, and pending list integration.
- `client/src/pages/ListingDetailPage.tsx`: Added 404 fallback, Verification Documents section, sidebar Verification Status card, DocumentViewerModal, and Rejection Advisory modal.
- `client/src/pages/VerifyPortalPage.tsx`: Added redirect to `/listings?view=pending`.
