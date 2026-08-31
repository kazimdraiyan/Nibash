import type { Listing } from "../types/listing";

export const mockListings: Listing[] = [
    {
        id: "1",
        imageUrl: "https://i.pinimg.com/736x/1c/14/e6/1c14e6840d10bc63a2c813439a7276c4.jpg",
        beds: 4,
        baths: 3,
        sqft: 1928,
        price: 40000,
        location: "Road 5, Mohammadpur",
    },
    {
        id: "2",
        imageUrl: "https://vennaarchitects.com/wp-content/uploads/2022/02/Venna-Architects-Renovation-of-Residential-Building-Moham.jpg",
        beds: 2,
        baths: 2,
        sqft: 1150,
        price: 25000,
        location: "Block C, Banani",
    },
    {
        id: "3",
        imageUrl: "https://i.pinimg.com/1200x/ec/13/2a/ec132a12af20895ab228e5e484c4f6e8.jpg",
        beds: 3,
        baths: 3,
        sqft: 1600,
        price: 35000,
        location: "Sector 4, Uttara",
    },
];