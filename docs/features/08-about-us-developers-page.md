# Feature 08: About Us Section & Meet the Developers Page

## 1. Overview
This feature introduces an **About Us** landing-page section and a dedicated **Meet the Developers** page (`/about`). The page showcases the two developers behind Nibash with their photographs, names, and roll numbers in an optimized, responsive layout.

---

## 2. Dedicated "Meet the Developers" Page
- **Component**: `client/src/pages/AboutUsPage.tsx`
- **Route**: Accessible at `/about` (with `/about-us` redirecting to `/about`).
- **Page Title**: `Meet the Developers`
- **Compact Header Section**:
  - Tightened vertical spacing (`pt-3 sm:pt-5`, reduced margins on breadcrumb and header).
  - Compact typography to ensure developer cards appear immediately in the upper viewport without requiring heavy scrolling.
- **Card Content Order**:
  1. **Developer Photograph**: Positioned in the top section of the card inside a clean rounded aspect container.
  2. **Developer Name**: Displayed in prominent serif typography directly below the photograph.
  3. **Roll Number**: Displayed directly below the name in clean monospace styling (number only, no "Roll" label).
- **Developer 1**:
  - Name: **Abid Hossain**
  - Roll Number: `2405114`
  - Photograph: `client/src/assets/developers/abid-hossain.jpg`
- **Developer 2**:
  - Name: **Kazi Md Raiyan**
  - Roll Number: `2405103`
  - Photograph: `client/src/assets/developers/kazi-md-raiyan.jpg`
- **Responsiveness**: Side-by-side on desktop (`grid-cols-1 md:grid-cols-2`), stacked vertically on mobile devices.
