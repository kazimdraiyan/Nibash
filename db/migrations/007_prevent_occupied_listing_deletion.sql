-- Prevent deletion or archiving of occupied listings
CREATE OR REPLACE FUNCTION prevent_occupied_listing_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Direct status check on the listing
    IF OLD.status = 'occupied' THEN
        RAISE EXCEPTION 'Cannot delete listing %: property is currently occupied.', OLD.id
            USING ERRCODE = 'check_violation';
    END IF;

    -- 2. Relational invariant check on contracts
    IF EXISTS (
        SELECT 1 FROM contracts 
        WHERE listing_id = OLD.id 
          AND status IN ('signed', 'proposed')
    ) THEN
        RAISE EXCEPTION 'Cannot delete listing %: an active or proposed lease contract exists.', OLD.id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for hard DELETE
DROP TRIGGER IF EXISTS trg_prevent_occupied_listing_delete ON listings;
CREATE TRIGGER trg_prevent_occupied_listing_delete
BEFORE DELETE ON listings
FOR EACH ROW
EXECUTE FUNCTION prevent_occupied_listing_deletion();

-- Prevent soft-delete status override if occupied
CREATE OR REPLACE FUNCTION prevent_occupied_listing_status_override()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'occupied' AND NEW.status = 'unavailable' THEN
        RAISE EXCEPTION 'Cannot mark listing % as unavailable: property is currently occupied.', OLD.id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for UPDATE of status to 'unavailable'
DROP TRIGGER IF EXISTS trg_prevent_occupied_listing_unavailable ON listings;
CREATE TRIGGER trg_prevent_occupied_listing_unavailable
BEFORE UPDATE OF status ON listings
FOR EACH ROW
EXECUTE FUNCTION prevent_occupied_listing_status_override();
