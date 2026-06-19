export interface Package {
  id: string;
  title: string;
  price: string;
  departure: string;
  arrival: string;
  img: string;
  description?: string;
  duration?: string;
  rating?: string;
  inclusions?: string[];
  createdAt?: any;
  status?: string;
}

export const MOCK_PACKAGES: Package[] = [
  {
    id: 'mock-1',
    title: 'Dubai Luxury Escape',
    price: '$1,200',
    departure: 'Dhaka',
    arrival: 'Dubai',
    img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800',
    description: 'Experience the ultimate luxury in the heart of the desert. From the Burj Khalifa to the Dubai Mall, explore the wonders of this modern oasis.',
    duration: '5 Days, 4 Nights',
    rating: '4.9',
    inclusions: ['Luxury Hotel Stay', 'Desert Safari', 'City Tour', 'Airport Transfers'],
  },
  {
    id: 'mock-2',
    title: 'Singapore City Lights',
    price: '$850',
    departure: 'Dhaka',
    arrival: 'Singapore',
    img: 'https://images.unsplash.com/photo-1525625239513-99733141b086?auto=format&fit=crop&q=80&w=800',
    description: 'Discover the vibrant city-state of Singapore. Visit Gardens by the Bay, Sentosa Island, and enjoy the world-class shopping and dining.',
    duration: '4 Days, 3 Nights',
    rating: '4.8',
    inclusions: ['4-Star Hotel', 'Gardens by the Bay Entry', 'Sentosa Fun Pass', 'Daily Breakfast'],
  },
  {
    id: 'mock-3',
    title: 'Bangkok Street Food Tour',
    price: '$450',
    departure: 'Dhaka',
    arrival: 'Bangkok',
    img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800',
    description: 'A culinary journey through the streets of Bangkok. Taste the best Pad Thai, Mango Sticky Rice, and explore the Grand Palace.',
    duration: '3 Days, 2 Nights',
    rating: '4.7',
    inclusions: ['Boutique Hotel', 'Guided Food Tour', 'Temple Visit', 'Local Transport'],
  },
  {
    id: 'mock-4',
    title: 'Maldives Island Paradise',
    price: '$1,500',
    departure: 'Dhaka',
    arrival: 'Maldives',
    img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&q=80&w=800',
    description: 'Relax in the crystal-clear waters of the Maldives. Stay in an overwater villa and enjoy snorkeling and sunset cruises.',
    duration: '6 Days, 5 Nights',
    rating: '5.0',
    inclusions: ['Overwater Villa', 'All-Inclusive Meals', 'Snorkeling Gear', 'Speedboat Transfers'],
  },
  {
    id: 'mock-5',
    title: 'London Royal Heritage',
    price: '$1,800',
    departure: 'Dhaka',
    arrival: 'London',
    img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=800',
    description: 'Explore the historic landmarks of London. From Big Ben to Buckingham Palace, immerse yourself in British culture.',
    duration: '7 Days, 6 Nights',
    rating: '4.8',
    inclusions: ['Central London Hotel', 'London Pass', 'River Thames Cruise', 'Afternoon Tea'],
  },
  {
    id: 'mock-6',
    title: 'Tokyo Neon Nights',
    price: '$2,200',
    departure: 'Dhaka',
    arrival: 'Tokyo',
    img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=800',
    description: 'Experience the unique blend of tradition and technology in Tokyo. Visit Shibuya Crossing, Akihabara, and ancient temples.',
    duration: '6 Days, 5 Nights',
    rating: '4.9',
    inclusions: ['Modern Hotel', 'JR Pass', 'Robot Restaurant Show', 'Guided City Tour'],
  },
  {
    id: 'mock-7',
    title: 'Paris Romantic Getaway',
    price: '$1,600',
    departure: 'Dhaka',
    arrival: 'Paris',
    img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800',
    description: 'Fall in love with the City of Light. Visit the Eiffel Tower, the Louvre, and enjoy a romantic cruise on the Seine.',
    duration: '5 Days, 4 Nights',
    rating: '4.9',
    inclusions: ['Luxury Hotel', 'Eiffel Tower Entry', 'Seine River Cruise', 'Daily Breakfast'],
  },
];
