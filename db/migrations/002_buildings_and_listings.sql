drop table if exists initial_terms;

drop table if exists agreements;

drop table if exists listing_amenities;

drop table if exists documents;

drop table if exists terms;

drop table if exists listings;

drop table if exists amenities;

create table listings(
    id serial primary key,
    title varchar(255) not null,
    description text not null,
    latitude numeric not null,
    longitude numeric not null,
    status varchar(20) not null default 'waiting' check (
        status in (
            'approved',
            'waiting',
            'rejected',
            'occupied',
            'unavailable'
        )
    ),
    bedroom_count int not null,
    bathroom_count int not null,
    on_which_floor int not null,
    area_id int not null references areas(id) on delete cascade,
    owner_id int not null references owners(user_id) on delete cascade,
    view_count int default 0
);

create table amenities(
    id serial primary key,
    name varchar(255) not null unique,
    description text not null,
    icon_path varchar(255) not null
);

create table listing_amenities(
    listing_id int not null references listings(id) on delete cascade,
    amenity_id int not null references amenities(id) on delete cascade,
    primary key (listing_id, amenity_id)
);

create table documents(
    id serial primary key,
    verifier_id int references verifiers(user_id) on delete cascade,
    listing_id int not null references listings(id) on delete cascade,
    document_type varchar(255) not null check (
        document_type in (
            'electricity_bill_receipt',
            'holding_tax_receipt',
            'water_bill_receipt',
            'trade_license',
            'nid',
            'passport',
            'driving_license'
        )
    ),
    is_verified boolean not null default false,
    verification_type varchar(255) check (verification_type in ('manual', 'automatic')),
    uploaded_at timestamp not null default current_timestamp
);

create table terms(
    id serial primary key,
    rent numeric not null,
    electricity_bill numeric not null,
    water_bill numeric not null,
    service_charge numeric not null,
    monthly_due_date int not null check (monthly_due_date between 1 and 28),
    pet_allowed boolean not null,
    security_deposit numeric not null
);

create table initial_terms(
    terms_id int references terms(id) on delete cascade,
    listing_id int not null unique references listings(id) on delete cascade,
    primary key (terms_id)
);

create table agreements(
    terms_id int references terms(id) on delete cascade,
    primary key (terms_id)
);