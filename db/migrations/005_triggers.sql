-- a tenant or owner cant be a verifier
create or replace function is_a_user()
returns trigger as $$
begin
    if NEW.user_id in (select user_id from owners) or
    NEW.user_id in (select user_id from tenants) then
         raise exception 'User is already registered as an owner or tenant';
    end if;
    return new;
end;
$$ language plpgsql;
create trigger check_user
before insert on verifiers
for each row execute function is_a_user();


-- a verifier cant be owner or tenant
create or replace function is_a_verifier()
returns trigger as $$
begin
    if NEW.user_id in (select user_id from verifiers)  then
         raise exception 'User is already registered as a verifier';
    end if;
    return new;
end;
$$ language plpgsql;
create trigger check_verifier_owner
before insert on owners
for each row execute function is_a_verifier();

create trigger check_verifier_tenant
before insert on tenants
for each row execute function is_a_verifier();

-- listing becomes occupied when a contract is signed
create or replace function update_listing_status()
returns trigger as $$
begin 
    if NEW.status = 'signed' and OLD.status = 'proposed' then
        update listings set status = 'occupied' where id = NEW.listing_id;
    end if;
    return new;
end;
$$ language plpgsql;
create trigger update_listing_status_trigger
after update on contracts
for each row execute function update_listing_status();

-- listing becomes available when a contract is completed
create or replace function update_listing_status_completed()
returns trigger as $$
begin
    if NEW.status = 'completed' and OLD.status = 'signed' then
        update listings set status = 'approved' where id = NEW.listing_id;
    end if;
    return new;
end;
$$ language plpgsql;
create trigger update_listing_status_completed_trigger
after update on contracts
for each row execute function update_listing_status_completed();