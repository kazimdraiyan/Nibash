-- Migration: 013_search_infrastructure.sql
-- Description: Full-text search tsvector, pg_trgm fuzzy matching, denormalized rent/pet_allowed, triggers, and performance indexes

-- 1. Enable trigram extension for typo-tolerant fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Denormalize rent and pet_allowed onto listings table for join-free filtering
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rent numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pet_allowed boolean DEFAULT false;

-- 3. Add precomputed tsvector search document column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_document tsvector;

-- 4. Create search_misses table for logging zero-result queries
CREATE TABLE IF NOT EXISTS search_misses (
    id serial PRIMARY KEY,
    query_text text NOT NULL,
    parsed_filters jsonb,
    searched_at timestamp NOT NULL DEFAULT current_timestamp
);

-- 5. Stored function: build_search_document(p_listing_id)
-- Weighted tsvector:
-- A: Title
-- B: Area Name & City
-- C: Amenity Names
-- D: Description
-- Text config: 'simple' (avoids English stemmer mangling Bengali place names like Mirpur)
CREATE OR REPLACE FUNCTION build_search_document(p_listing_id int)
RETURNS tsvector AS $$
DECLARE
    v_title text;
    v_desc text;
    v_area text;
    v_city text;
    v_amenities text;
    v_doc tsvector;
BEGIN
    SELECT l.title, l.description, a.name, a.city
    INTO v_title, v_desc, v_area, v_city
    FROM listings l
    LEFT JOIN areas a ON a.id = l.area_id
    WHERE l.id = p_listing_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT string_agg(am.name, ' ')
    INTO v_amenities
    FROM listing_amenities la
    JOIN amenities am ON am.id = la.amenity_id
    WHERE la.listing_id = p_listing_id;

    v_doc := setweight(to_tsvector('simple', COALESCE(v_title, '')), 'A') ||
             setweight(to_tsvector('simple', COALESCE(v_area, '') || ' ' || COALESCE(v_city, '')), 'B') ||
             setweight(to_tsvector('simple', COALESCE(v_amenities, '')), 'C') ||
             setweight(to_tsvector('simple', COALESCE(v_desc, '')), 'D');

    RETURN v_doc;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger functions & triggers to keep search_document and denormalized columns fresh

-- A. Trigger for listings changes (title, description, area_id)
CREATE OR REPLACE FUNCTION trg_listings_search_doc_after_fn()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE listings
    SET search_document = build_search_document(NEW.id)
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_search_doc ON listings;
CREATE TRIGGER trg_listings_search_doc
AFTER INSERT OR UPDATE OF title, description, area_id ON listings
FOR EACH ROW
EXECUTE FUNCTION trg_listings_search_doc_after_fn();

-- B. Trigger for listing_amenities changes
CREATE OR REPLACE FUNCTION trg_listing_amenities_search_doc_fn()
RETURNS TRIGGER AS $$
DECLARE
    target_id int;
BEGIN
    target_id := COALESCE(NEW.listing_id, OLD.listing_id);
    IF target_id IS NOT NULL THEN
        UPDATE listings
        SET search_document = build_search_document(target_id)
        WHERE id = target_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listing_amenities_search_doc ON listing_amenities;
CREATE TRIGGER trg_listing_amenities_search_doc
AFTER INSERT OR DELETE ON listing_amenities
FOR EACH ROW
EXECUTE FUNCTION trg_listing_amenities_search_doc_fn();

-- C. Trigger for syncing rent & pet_allowed from terms updates
CREATE OR REPLACE FUNCTION trg_sync_terms_to_listings_fn()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE listings l
    SET rent = NEW.rent,
        pet_allowed = COALESCE(NEW.pet_allowed, false)
    FROM initial_terms it
    WHERE it.terms_id = NEW.id AND it.listing_id = l.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_terms_to_listings ON terms;
CREATE TRIGGER trg_sync_terms_to_listings
AFTER INSERT OR UPDATE OF rent, pet_allowed ON terms
FOR EACH ROW
EXECUTE FUNCTION trg_sync_terms_to_listings_fn();

-- D. Trigger for initial_terms insertion
CREATE OR REPLACE FUNCTION trg_sync_initial_terms_to_listings_fn()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE listings l
    SET rent = t.rent,
        pet_allowed = COALESCE(t.pet_allowed, false)
    FROM terms t
    WHERE t.id = NEW.terms_id AND l.id = NEW.listing_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_initial_terms_to_listings ON initial_terms;
CREATE TRIGGER trg_sync_initial_terms_to_listings
AFTER INSERT OR UPDATE ON initial_terms
FOR EACH ROW
EXECUTE FUNCTION trg_sync_initial_terms_to_listings_fn();

-- 7. Backfill existing listings data
UPDATE listings l
SET rent = t.rent,
    pet_allowed = COALESCE(t.pet_allowed, false)
FROM initial_terms it
JOIN terms t ON t.id = it.terms_id
WHERE it.listing_id = l.id;

UPDATE listings SET search_document = build_search_document(id);

-- 8. Indexes
-- Full-text GIN index
CREATE INDEX IF NOT EXISTS idx_listings_search_document ON listings USING GIN(search_document);

-- Trigram GIN indexes for typo tolerance
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON listings USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_areas_name_trgm ON areas USING GIN(name gin_trgm_ops);

-- B-tree indexes for structured filters & sorting
CREATE INDEX IF NOT EXISTS idx_listings_status_area_id ON listings(status, area_id);
CREATE INDEX IF NOT EXISTS idx_listings_bedroom_count ON listings(bedroom_count);
CREATE INDEX IF NOT EXISTS idx_listings_bathroom_count ON listings(bathroom_count);
CREATE INDEX IF NOT EXISTS idx_listings_on_which_floor ON listings(on_which_floor);
CREATE INDEX IF NOT EXISTS idx_listings_rent ON listings(rent);
CREATE INDEX IF NOT EXISTS idx_listings_status_view_count_id ON listings(status, view_count DESC, id DESC);
