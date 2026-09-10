# Graph Report - Nibash  (2026-09-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1402 nodes · 2376 edges · 114 communities (81 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `499e6b95`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- BM25
- validate_data.py
- gray
- client/package.json
- spacing
- search_stack
- 005_triggers.sql
- html-token-validator.py
- TestTailwindConfigGenerator
- search
- core.py
- server/package.json
- TailwindConfigGenerator
- index.ts
- AppError
- generate-slide.py
- fetch-background.py
- detect_domain
- compilerOptions
- listing.controller.ts
- color
- auth.controller.ts
- devDependencies
- DesignSystemGenerator
- TestThresholdGate
- design_system.py
- CatalogRefreshTest
- read_rows
- compilerOptions
- fontSize
- TestShadcnInstaller
- .generate
- test_tailwind_config_gen.py
- design-tokens-starter.json
- contract.service.ts
- payment.service.ts
- validate-tokens.cjs
- card
- .check_shadcn_config
- .generate_config_string
- patch
- _select_palette_for_mode
- _style_is_dark_primary
- embed-tokens.cjs
- primitive
- ShadcnInstaller
- test_design_system_mode.py
- parse_decision_rules
- test_text_layout_resilience.py
- generate-tokens.cjs
- button
- ._base_config
- _run
- _normalize
- review.service.ts
- input
- radius
- _row_identities
- format_ascii_box
- generate_design_system
- CatalogSummaryLineEndingsTest
- test_data_contracts.py
- _filter_anti_patterns_for_mode
- shadow
- TestGeneratedCatalogContract
- .oxlintrc.json
- $type
- radius
- lg
- slide-token-validator.py
- padding-y
- xl
- md
- none
- search.py
- scripts
- destructive
- destructive-foreground
- muted
- primary-foreground
- ring
- secondary-foreground
- .__init__
- tsconfig.json
- index.d.ts
- .test_add_components_no_config
- .test_add_components_already_installed
- .test_add_all_components_no_config
- .test_list_installed_no_config
- .test_init_default_project_root
- .test_init_custom_project_root
- .test_check_shadcn_config_not_exists
- .test_get_installed_components_with_files
- .test_add_components_no_components
- .test_add_color_palette
- .test_add_spacing
- .test_add_plugins_no_duplicates
- .test_recommend_plugins_nextjs
- .test_init_default_typescript
- .test_generate_config_with_colors
- .test_generate_config_with_plugins
- .test_write_config
- .test_write_config_creates_content
- .test_full_configuration_typescript
- .test_init_framework
- .test_default_output_path_typescript
- .test_default_output_path_javascript
- .test_base_config_structure
- .test_default_content_paths_react
- .test_default_content_paths_nextjs

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `search()` - 43 edges
3. `DesignSystemGenerator` - 35 edges
4. `TestTailwindConfigGenerator` - 35 edges
5. `useAuth()` - 35 edges
6. `search_stack()` - 35 edges
7. `ShadcnInstaller` - 34 edges
8. `AppError` - 30 edges
9. `TestShadcnInstaller` - 26 edges
10. `react-router-dom` - 22 edges

## Surprising Connections (you probably didn't know these)
- `TestGeneratedConfigIsValidJs` --uses--> `TailwindConfigGenerator`  [INFERRED]
  .agents/skills/ui-styling/scripts/tests/test_tailwind_config_gen.py → .agents/skills/ui-styling/scripts/tailwind_config_gen.py
- `TestTailwindConfigGenerator` --uses--> `TailwindConfigGenerator`  [INFERRED]
  .agents/skills/ui-styling/scripts/tests/test_tailwind_config_gen.py → .agents/skills/ui-styling/scripts/tailwind_config_gen.py
- `TestReasoningContract` --uses--> `DesignSystemGenerator`  [INFERRED]
  .agents/skills/ui-ux-pro-max/scripts/tests/test_data_contracts.py → .agents/skills/ui-ux-pro-max/scripts/design_system.py
- `TestShadcnInstaller` --uses--> `ShadcnInstaller`  [INFERRED]
  .agents/skills/ui-styling/scripts/tests/test_shadcn_add.py → .agents/skills/ui-styling/scripts/shadcn_add.py
- `Main search function with auto-domain detection` --rationale_for--> `search()`  [EXTRACTED]
  .agents/skills/ui-ux-pro-max/scripts/core.py → .agents/skills/design-system/scripts/slide_search_core.py

## Import Cycles
- None detected.

## Communities (114 total, 30 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.05
Nodes (67): apiClient, ApiError, makeowner, request(), App(), ActualListings(), StatusBadge(), ApplicationInfoModal() (+59 more)

### Community 1 - "BM25"
Cohesion: 0.06
Nodes (42): format_context(), format_result(), main(), Format a single search result for display, Slide Search CLI - Search slide design databases for strategies, layouts, copy,…, Format contextual recommendations for display., BM25, calculate_pattern_break() (+34 more)

### Community 2 - "validate_data.py"
Cohesion: 0.07
Nodes (48): Semantic quality contracts for the core UI/UX datasets., read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, _catalog_date(), _check_app_interface_contract() (+40 more)

### Community 3 - "gray"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 4 - "client/package.json"
Cohesion: 0.05
Nodes (37): dependencies, gsap, react, react-dom, react-router-dom, @types/gsap, devDependencies, oxlint (+29 more)

### Community 5 - "spacing"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 6 - "search_stack"
Cohesion: 0.10
Nodes (10): _exact_stack_identifier(), Resolve a standalone API identifier even when its BM25 IDF is low., Search stack-specific guidelines, search_stack(), Freshness and migration contracts for native, desktop, and 3D stacks., _rows(), TestNativeDesktopStackFreshness, Freshness and generation-isolation contracts for web stack guidance. (+2 more)

### Community 7 - "005_triggers.sql"
Cohesion: 0.11
Nodes (29): areas, owners, tenants, users, verifiers, agreements, amenities, documents (+21 more)

### Community 8 - "html-token-validator.py"
Cohesion: 0.12
Nodes (26): _find_project_root(), get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result() (+18 more)

### Community 9 - "TestTailwindConfigGenerator"
Cohesion: 0.07
Nodes (15): Test adding custom fonts., Test adding custom breakpoints., Test TailwindConfigGenerator class., Test plugin recommendations., Test generating TypeScript configuration., Test generating JavaScript configuration., Test validating valid configuration., Test validating config with no content paths. (+7 more)

### Community 10 - "search"
Cohesion: 0.11
Nodes (8): Resolve a deprecated in-domain alias, or expose a cross-domain redirect., Main search function with auto-domain detection, search(), _style_search_destination(), TestSearchDomains, Regression tests for the public style taxonomy and search contract., read_rows(), TestStyleTaxonomy

### Community 11 - "core.py"
Cohesion: 0.12
Nodes (26): _contains_phrase(), _domain_keywords(), _file_signature(), _get_bm25(), _load_csv(), _load_csv_snapshot(), _load_product_keywords(), _load_rows_or_empty() (+18 more)

### Community 12 - "server/package.json"
Cohesion: 0.10
Nodes (20): bcrypt, dotenv, jsonwebtoken, node-cron, pg, tsx, @types/bcrypt, @types/cors (+12 more)

### Community 13 - "TailwindConfigGenerator"
Cohesion: 0.09
Nodes (12): Add custom font families. Args: fonts: Dict of font_type: [font_names] e.g.,…, Add custom spacing values. Args: spacing: Dict of name: value e.g., {'18':…, Add custom breakpoints. Args: breakpoints: Dict of name: width e.g., {'3xl':…, Add plugin requirements. Args: plugins: List of plugin names e.g.,…, Get plugin recommendations based on configuration. Returns: List of recommended…, Generate Tailwind CSS configuration files., Validate configuration. Returns: Tuple of (valid, message), Add custom colors to theme. Args: colors: Dict of color_name: color_value Value… (+4 more)

### Community 14 - "index.ts"
Cohesion: 0.25
Nodes (13): cors, express, app, authMiddleware(), optionalAuthMiddleware(), router, router, router (+5 more)

### Community 15 - "AppError"
Cohesion: 0.16
Nodes (16): apply(), getAll(), getForListing(), getMy(), reject(), AppError, ApplyInput, applySchema (+8 more)

### Community 16 - "generate-slide.py"
Cohesion: 0.14
Nodes (20): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+12 more)

### Community 17 - "fetch-background.py"
Cohesion: 0.15
Nodes (18): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+10 more)

### Community 18 - "detect_domain"
Cohesion: 0.16
Nodes (5): detect_domain(), Auto-detect the most relevant domain from query. Matches are weighted by…, Stdlib-only regression tests for core.py / design_system.py (unittest, not…, TestDiagnosticsContracts, TestDomainDetection

### Community 19 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 20 - "listing.controller.ts"
Cohesion: 0.16
Nodes (17): create(), getAll(), getById(), getMy(), remove(), update(), CreateListingInput, createListingSchema (+9 more)

### Community 21 - "color"
Cohesion: 0.11
Nodes (19): $type, $value, background, foreground, muted-foreground, primary, primary-hover, secondary (+11 more)

### Community 22 - "auth.controller.ts"
Cohesion: 0.13
Nodes (15): zod, login(), me(), register(), BecomeOwnerInput, becomeOwnerSchema, BecomeTenantInput, becomeTenantSchema (+7 more)

### Community 23 - "devDependencies"
Cohesion: 0.10
Nodes (19): dependencies, bcrypt, cors, dotenv, express, jsonwebtoken, node-cron, pg (+11 more)

### Community 24 - "DesignSystemGenerator"
Cohesion: 0.18
Nodes (6): DesignSystemGenerator, Generates design system recommendations from aggregated searches., Load reasoning rules from CSV., TestReasoningMatch, The exact reproduction from issue #428., TestEndToEndCoherence

### Community 25 - "TestThresholdGate"
Cohesion: 0.12
Nodes (4): Unit tests for metric math and relevance fixture validation., TestFixtureValidation, TestMetricMath, TestThresholdGate

### Community 26 - "design_system.py"
Cohesion: 0.17
Nodes (16): _detect_page_type(), format_master_md(), format_page_override_md(), _generate_intelligent_overrides(), persist_design_system(), Path, Format design system as MASTER.md with hierarchical override logic., Format a page-specific override file with intelligent AI-generated content. (+8 more)

### Community 28 - "read_rows"
Cohesion: 0.16
Nodes (3): read_rows(), TestLandingAndStackContract, TestReasoningContract

### Community 29 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 30 - "fontSize"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 31 - "TestShadcnInstaller"
Cohesion: 0.13
Nodes (9): Test adding components in dry run mode., Test ShadcnInstaller class., Create temporary project structure., Test listing installed components when none exist., Test listing installed components when they exist., Test initialization with dry run mode., Test checking for existing shadcn config., TestShadcnInstaller (+1 more)

### Community 32 - ".generate"
Cohesion: 0.14
Nodes (8): Execute searches across multiple domains., Find matching reasoning rule for a category., Apply reasoning rules to search results., Select best matching result based on priority keywords., Extract results list from search result dict., Generate complete design system recommendation. variance/motion/density are…, Bucket a 1-10 dial value into its tier config. Returns None if value is None., _resolve_dial()

### Community 33 - "test_tailwind_config_gen.py"
Cohesion: 0.16
Nodes (10): main(), Tailwind CSS Configuration Generator Generate tailwind.config.js/ts with custom…, Tests for tailwind_config_gen.py, Reduce a generated TS/JS config to a bare assignable object so it can be handed…, Regression guard for the missing-comma bug between the ``theme`` block and…, The property preceding ``plugins`` must end with a comma (pure-Python check, so…, The emitted config parses as valid JS via ``node --check``., _strip_to_object() (+2 more)

### Community 34 - "design-tokens-starter.json"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 35 - "contract.service.ts"
Cohesion: 0.24
Nodes (10): create(), getById(), sign(), CreateContractInput, createContractSchema, UpdateContractInput, updateContractSchema, createContract() (+2 more)

### Community 36 - "payment.service.ts"
Cohesion: 0.24
Nodes (10): create(), getForContract(), resolve(), CreatePaymentInput, createPaymentSchema, UpdatePaymentInput, updatePaymentSchema, createPayment() (+2 more)

### Community 37 - "validate-tokens.cjs"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 38 - "card"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 39 - ".check_shadcn_config"
Cohesion: 0.21
Nodes (6): Add all available shadcn/ui components. Args: overwrite: If True, overwrite…, List installed components. Returns: Tuple of (success, message with component…, Check if shadcn is initialized in project. Returns: True if components.json…, Get list of already installed components. Returns: List of installed component…, Read shadcn version from project package.json; fall back to a pinned default., Add shadcn/ui components. Args: components: List of component names to add…

### Community 40 - ".generate_config_string"
Cohesion: 0.20
Nodes (6): Generate configuration file content. Returns: Configuration file as string, Generate TypeScript configuration., Generate JavaScript configuration., Format plugins array for config. Validates each plugin name against a strict…, Add indentation to JSON string., Write configuration to file. Returns: Tuple of (success, message)

### Community 41 - "patch"
Cohesion: 0.17
Nodes (6): Test adding components with overwrite flag., Test successful component addition., Test component addition with subprocess error., Test component addition when npx is not found., Test successful addition of all components., patch

### Community 42 - "_select_palette_for_mode"
Cohesion: 0.24
Nodes (7): _contrast_ratio(), _derive_dark_palette(), WCAG contrast ratio for two hex colors, or None if either is invalid., Keep product brand tokens while deriving accessible dark surfaces., Pick the highest-ranked palette matching the resolved mode. Only the dark case…, _select_palette_for_mode(), TestPaletteSelection

### Community 43 - "_style_is_dark_primary"
Cohesion: 0.21
Nodes (7): _query_wants_dark(), True when a styles.csv row describes itself as dark-first., True when the query explicitly asks for a dark theme., Resolve the mode the rest of the output has to agree with., _resolve_color_mode(), _style_is_dark_primary(), TestModeResolution

### Community 44 - "embed-tokens.cjs"
Cohesion: 0.18
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 45 - "primitive"
Cohesion: 0.18
Nodes (11): fast, normal, slow, $type, $value, $type, $value, primitive (+3 more)

### Community 46 - "ShadcnInstaller"
Cohesion: 0.22
Nodes (7): main(), Handle shadcn/ui component installation., shadcn/ui Component Installer Add shadcn/ui components to project with…, ShadcnInstaller, Tests for shadcn_add.py, Test getting installed components when none exist., Test getting installed components without config.

### Community 47 - "test_design_system_mode.py"
Cohesion: 0.27
Nodes (6): _palette_is_dark(), WCAG relative luminance of a #RRGGBB string, or None if unparseable., True when a colors.csv row's Background is a dark surface., _relative_luminance(), Regression tests for color-mode coherence in design_system.py (issue #428).…, TestLuminance

### Community 48 - "parse_decision_rules"
Cohesion: 0.24
Nodes (7): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), Return deterministic mutations and an audit trail; never execute data., Closed, non-executable grammar for design-system decision rules., Parse the canonical condition -> action-array representation., _validate_action()

### Community 49 - "test_text_layout_resilience.py"
Cohesion: 0.20
Nodes (4): Canonical regression contracts for resilient UI text layouts., read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval

### Community 50 - "generate-tokens.cjs"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 51 - "button"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 52 - "._base_config"
Cohesion: 0.22
Nodes (6): Path, Initialize generator. Args: typescript: If True, generate .ts config, else .js…, Determine default output path., Create base configuration structure., Get default content paths for framework., Any

### Community 53 - "_run"
Cohesion: 0.28
Nodes (8): Path, Regression tests for validate-tokens.cjs. The validator used to skip any line…, A hardcoded hex on the same line as a var() token is still a violation., A line that references only tokens produces no false positives., _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation(), CompletedProcess

### Community 54 - "_normalize"
Cohesion: 0.25
Nodes (9): _exact_match_diagnostic(), _legacy_successor_guidance(), _normalize(), Apply longest-first synonym substitution at token boundaries., Whether a stack query explicitly targets an older framework generation., Choose one coherent applicability generation for stack retrieval., Prefer the explicit successor row for a brand-new app on legacy-only stacks., _stack_query_requests_legacy() (+1 more)

### Community 55 - "review.service.ts"
Cohesion: 0.36
Nodes (6): create(), getForListing(), CreateReviewInput, createReviewSchema, createReview(), getReviewsForListing()

### Community 56 - "input"
Cohesion: 0.29
Nodes (8): padding-x, input, $type, $value, focus-ring, padding-x, $type, $value

### Community 57 - "radius"
Cohesion: 0.29
Nodes (8): $type, $value, $type, $value, radius, default, full, default

### Community 58 - "_row_identities"
Cohesion: 0.25
Nodes (8): _exact_row_identity(), Suggest complete public identities so a retry can bypass score thresholds., Return non-empty public identities from ordinary and alias fields., Resolve an explicit style identity without opening generic variant ranking., Return one row whose stable public identity exactly matches the query., _row_identities(), _style_identity(), _suggest_identities()

### Community 59 - "format_ascii_box"
Cohesion: 0.25
Nodes (8): ansi_ljust(), format_ascii_box(), hex_to_ansi(), Convert hex color to ANSI True Color swatch (██) with fallback., Like str.ljust but accounts for zero-width ANSI escape sequences., Create a Unicode section separator: ├─── NAME ───...┤, Format design system as Unicode box with ANSI color swatches., section_header()

### Community 60 - "generate_design_system"
Cohesion: 0.29
Nodes (5): format_markdown(), generate_design_system(), Format design system as markdown., Main entry point for design system generation. Args: query: Search query (e.g.,…, TestPersistence

### Community 61 - "CatalogSummaryLineEndingsTest"
Cohesion: 0.32
Nodes (4): CatalogSummaryLineEndingsTest, _load_generator(), The catalog snapshot must not depend on the checkout's line endings. Regression…, Simulate a Windows checkout: the recorded hashes must still validate.

### Community 62 - "test_data_contracts.py"
Cohesion: 0.39
Nodes (4): Cross-file semantic contracts for curated design data., split_values(), style_identities(), TestStyleIdentityContract

### Community 63 - "_filter_anti_patterns_for_mode"
Cohesion: 0.43
Nodes (3): _filter_anti_patterns_for_mode(), Drop "avoid dark mode" advice once dark mode is the resolved answer., TestAntiPatternGating

### Community 64 - "shadow"
Cohesion: 0.47
Nodes (6): sm, shadow, sm, sm, $type, $value

### Community 66 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 67 - "$type"
Cohesion: 0.60
Nodes (5): $type, $value, border, border, border

### Community 68 - "radius"
Cohesion: 0.60
Nodes (5): radius, radius, radius, $type, $value

### Community 69 - "lg"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 70 - "slide-token-validator.py"
Cohesion: 0.50
Nodes (3): main(), Slide Token Validator (Legacy Wrapper) Now delegates to html-token-validator.py…, Delegate to unified html-token-validator.py with --type slides.

### Community 71 - "padding-y"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 72 - "xl"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 73 - "md"
Cohesion: 0.67
Nodes (4): $type, $value, md, md

### Community 74 - "none"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 75 - "search.py"
Cohesion: 0.50
Nodes (3): format_output(), UI/UX Pro Max Search - BM25 search engine for UI/UX style guides Usage: python…, Format results for Claude consumption (token-optimized)

### Community 76 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, start

### Community 77 - "destructive"
Cohesion: 0.67
Nodes (3): destructive, $type, $value

### Community 78 - "destructive-foreground"
Cohesion: 0.67
Nodes (3): destructive-foreground, $type, $value

### Community 79 - "muted"
Cohesion: 0.67
Nodes (3): muted, $type, $value

### Community 80 - "primary-foreground"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 81 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 82 - "secondary-foreground"
Cohesion: 0.67
Nodes (3): secondary-foreground, $type, $value

## Knowledge Gaps
- **241 isolated node(s):** `ApiError`, `PropertyCardItem`, `ProtectedRouteProps`, `AuthContextType`, `User` (+236 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 514 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `search()` connect `search` to `.generate`, `validate_data.py`, `_row_identities`, `core.py`, `search.py`, `test_text_layout_resilience.py`, `detect_domain`, `_normalize`, `design_system.py`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `search_stack()` connect `search_stack` to `search`, `search.py`, `core.py`, `test_text_layout_resilience.py`, `detect_domain`, `_normalize`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `DesignSystemGenerator` connect `DesignSystemGenerator` to `.generate`, `patch`, `read_rows`, `test_design_system_mode.py`, `detect_domain`, `design_system.py`, `generate_design_system`, `test_data_contracts.py`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `DesignSystemGenerator` (e.g. with `TestReasoningMatch` and `TestReasoningContract`) actually correct?**
  _`DesignSystemGenerator` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ApiError`, `PropertyCardItem`, `ProtectedRouteProps` to the rest of the system?**
  _241 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05408805031446541 - nodes in this community are weakly interconnected._