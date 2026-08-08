drop table if exists document_media;
drop table if exists review_media;
drop table if exists media;
drop table if exists reviews;
drop table if exists payments;

create table payments(
    id serial primary key,
    contract_id int not null references contracts(id) on delete cascade,
    amount numeric not null,
    payment_method varchar(20) not null check (payment_method in ('bKash', 'SSLCommerz', 'Cash')),
    status varchar(20) not null default 'pending' check (status in ('pending', 'confirmed')),
    bKash_transaction_id varchar(255) unique,
    SSLCommerz_transaction_id varchar(255) unique,
    paid_at timestamp

);

create table reviews(
    id serial primary key,
    contract_id int not null unique references contracts(id) on delete cascade,
    rating int not null check (rating between 1 and 5),
    description text,
    created_at timestamp not null default current_timestamp
);

create table media(
    id serial primary key,
    media_type varchar(20) not null check (media_type in ('image', 'video')),
    media_path varchar(255) not null,
    uploaded_at timestamp not null default current_timestamp
);
create table review_media(
    review_id int not null references reviews(id) on delete cascade,
    media_id int not null references media(id) on delete cascade,
    primary key (review_id, media_id)
);
create table document_media(
    document_id int not null references documents(id) on delete cascade,
    media_id int not null references media(id) on delete cascade,
    primary key (document_id, media_id)
);