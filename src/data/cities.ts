export interface City {
  id: string;
  name: string;
  nameAr: string;
  lat: number;
  lon: number;
  tz: string;
}

export const CITIES: City[] = [
  { id: 'cairo', name: 'Cairo', nameAr: 'القاهرة', lat: 30.0444, lon: 31.2357, tz: 'Africa/Cairo' },
  { id: 'alexandria', name: 'Alexandria', nameAr: 'الإسكندرية', lat: 31.2001, lon: 29.9187, tz: 'Africa/Cairo' },
  { id: 'giza', name: 'Giza', nameAr: 'الجيزة', lat: 30.0131, lon: 31.2089, tz: 'Africa/Cairo' },
  { id: 'riyadh', name: 'Riyadh', nameAr: 'الرياض', lat: 24.7136, lon: 46.6753, tz: 'Asia/Riyadh' },
  { id: 'dubai', name: 'Dubai', nameAr: 'دبي', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
  { id: 'london', name: 'London', nameAr: 'لندن', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { id: 'newyork', name: 'New York', nameAr: 'نيويورك', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { id: 'tokyo', name: 'Tokyo', nameAr: 'طوكيو', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
  { id: 'sydney', name: 'Sydney', nameAr: 'سيدني', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
  { id: 'capetown', name: 'Cape Town', nameAr: 'كيب تاون', lat: -33.9249, lon: 18.4241, tz: 'Africa/Johannesburg' },
  { id: 'tromso', name: 'Tromsø', nameAr: 'ترومسو', lat: 69.6492, lon: 18.9553, tz: 'Europe/Oslo' },
];

export function cityById(id: string): City {
  return CITIES.find(c => c.id === id) ?? CITIES[0];
}