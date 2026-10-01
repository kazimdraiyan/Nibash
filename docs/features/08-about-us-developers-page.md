# Feature 08: About Us Section & Meet the Developers Page

## 1. Overview
This feature replaces the legacy **Featured Areas** section on the Nibash landing page with a modern, minimal **About Us** section and introduces a dedicated **Meet the Developers** page (`/about`). The new page showcases the two developers behind Nibash with their names, roll numbers, and official photographs in an exact specified order.

---

## 2. Removal of Featured Areas
- The previous `PopularLocations` component has been retired and removed from the landing page.
- The corresponding anchor `#locations` in `App.tsx` has been replaced with `#about-us`.
- Obsolete `#locations` / "Featured Areas" links in the main navigation (`Navbar.tsx`) and footer (`Footer.tsx`) have been converted into clean routes pointing to `/about`.

---

## 3. The New "About Us" Section & Landing Page Navigation
- **Component**: `client/src/components/AboutUsSection.tsx`
- **Location**: Positioned seamlessly between the `HowItWorks` and `WhyChooseUs` sections on the landing page.
- **Visual Design**:
  - Dark architectural backdrop (`#090a0c`) with subtle ambient silver radial gradients.
  - Consistent typography utilizing Inter with serif italic accent gradients.
  - Foundations glass cards outlining the 3 pillars: Verified Authenticity, Digital Tenancy Contracts, and Transparent Finances.
- **Call-to-Action**:
  - Direct **About Us** button using Nibash's polished `.glass-button-silver` styling with an arrow icon.
  - Secondary **Meet the Developers** link styled with `.glass-button-outline`.
  - Both navigate cleanly to the dedicated `/about` route.

---

## 4. Dedicated "Meet the Developers" Page
- **Component**: `client/src/pages/AboutUsPage.tsx`
- **Route**: Accessible at `/about` (with `/about-us` redirecting to `/about` to ensure direct link sharing and browser refreshes work).
- **Page Title**: `Meet the Developers`
- **Back Navigation**: Includes a minimal "Back to Home" link with smooth transition back to `/`.
- **Layout & Responsiveness**:
  - Two developer cards placed side-by-side with generous breathing room (`gap-10 sm:gap-12 md:gap-14 lg:gap-16`) on desktop screens.
  - Gracefully stacks vertically on tablet and mobile viewports.
  - Refined compact card height: optimized bottom padding and reduced image aspect ratio (`aspect-[4/4.2]` with `max-h-[340px]`), anchoring the head and smile with `object-top` while trimming excess table space from the bottom.
  - Consistent card padding, border highlights (`border-white/10 hover:border-white/30`), and glassmorphism styling (`glass-panel`).

---

## 5. Developer Information & Card Layout

Each developer card strictly observes the required content hierarchy and constraints:

### Layout Order per Card
1. **Developer Name**: Displayed in prominent serif typography.
2. **Roll Number**: Displayed directly below the name in clean monospace styling. It is NOT labeled with "Roll" or "Roll Number"; only the number appears.
3. **Developer Photograph**: Positioned **strictly below** the name and roll number inside an aspect-ratio preserving container (`aspect-[4/5]`) with `object-cover` and rounded borders, preventing any distortion.

### Developer 1
- **Name**: Abid Hossain
- **Roll Number**: `2405114`
- **Photo Asset**: `client/src/assets/developers/abid-hossain.jpg` (Abid's photograph)

### Developer 2
- **Name**: Kazi Md Raiyan
- **Roll Number**: `2405103`
- **Photo Asset**: `client/src/assets/developers/kazi-md-raiyan.jpg` (Raiyan's photograph)

---

## 6. Frontend Files Created & Modified

### Newly Created Files
- `client/src/assets/developers/abid-hossain.jpg`: Statically bundled photograph for Abid Hossain.
- `client/src/assets/developers/kazi-md-raiyan.jpg`: Statically bundled photograph for Kazi Md Raiyan.
- `client/src/components/AboutUsSection.tsx`: Landing page About Us section.
- `client/src/pages/AboutUsPage.tsx`: Dedicated Meet the Developers page.
- `docs/features/08-about-us-developers-page.md`: This feature documentation.

### Modified Files
- `client/src/App.tsx`:
  - Replaced `PopularLocations` with `AboutUsSection` in `HomePage()`.
  - Added `/about` and `/about-us` routes.
- `client/src/components/Navbar.tsx`:
  - Replaced the `#locations` "Neighborhoods" link with a direct Link to `/about` ("About Us").
- `client/src/components/Footer.tsx`:
  - Replaced legacy "Featured Areas" links with "Company" links including `/about` ("About Us" and "Meet the Developers").

---

## 7. Verification Checklist
- [x] Featured Areas is completely removed from the landing page.
- [x] About Us appears in its place.
- [x] Clicking About Us opens the Meet the Developers page.
- [x] Abid Hossain appears in the first card with roll number 2405114.
- [x] Kazi Md Raiyan appears in the second card with roll number 2405103.
- [x] The first provided photograph is used for Abid.
- [x] The second provided photograph is used for Raiyan.
- [x] Each card displays the name, then the roll number, then the photograph.
- [x] Both cards are aligned properly on desktop and stack correctly on mobile.
- [x] The page follows Nibash's existing design language.
- [x] Existing landing-page sections and functionality remain unaffected.
- [x] No backend changes were made.
