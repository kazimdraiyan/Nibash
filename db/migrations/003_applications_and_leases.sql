drop table if exists contracts cascade;
drop table if exists applies cascade;

create table applies(
    tenant_id int not null references tenants(user_id) on delete cascade,
    listing_id int not null references listings(id) on delete cascade,
    primary key (tenant_id, listing_id),
    applied_at timestamp not null default current_timestamp,
    status varchar(20) not null default 'pending' check (status in ('approved', 'pending', 'rejected'))
);
create table contracts(
    id serial primary key,
    tenant_id int not null references tenants(user_id) on delete cascade,
    listing_id int not null references listings(id) on delete cascade,
    agreement_id int unique references agreements(terms_id) on delete cascade,
    
    status varchar(20) not null default 'proposed' check (status in ('proposed', 'signed','completed')),
    start_date date not null,
    end_date date not null,
    paid_security_deposit boolean not null default false
);