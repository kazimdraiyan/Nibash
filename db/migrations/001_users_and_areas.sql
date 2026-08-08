-- drop table if exists verifiers;
-- drop table if exists tenants;
-- drop table if exists owners;
-- drop table if exists users;
-- drop table if exists areas;

 create table users(
    id  serial primary key,
    name varchar(255) not null,
    email varchar(255)  unique,
    nid varchar(20) not null unique,
    phone varchar(20) not null unique,
    password_hash varchar(255) not null,
    created_at timestamp default current_timestamp
);


create table areas(
    id serial primary key,
    name varchar(255) not null unique,
    city varchar(20) not null,
    latitude numeric not null,
    longitude numeric not null,
    radius numeric not null,
    created_at timestamp default current_timestamp
);
create table owners(
   user_id int  primary key references users(id) on delete cascade
);
create table tenants(
    user_id int primary key references users(id) on delete cascade,
    monthly_income numeric not null,
    emergency_contact varchar(20) not null
);
create table verifiers(
    user_id int primary key references users(id) on delete cascade
);