// DuoLink Theme Constants

export const COLORS = {
  // Primary Brand Colors
  primary: '#1E40AF',      // Deep Blue - Trust & Professionalism
  primaryLight: '#3B82F6',
  primaryDark: '#1E3A8A',

  // Secondary Colors
  secondary: '#059669',    // Green - Verification & Success
  secondaryLight: '#10B981',
  secondaryDark: '#047857',

  // Accent Colors
  accent: '#F59E0B',       // Amber - Highlights & Ratings
  accentLight: '#FBBF24',
  accentDark: '#D97706',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Background Colors
  background: '#F9FAFB',
  surface: '#FFFFFF',

  // Text Colors
  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Verification Status Colors
  verified: '#10B981',
  pending: '#F59E0B',
  rejected: '#EF4444',
  unverified: '#9CA3AF',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Namibia-specific locations with GPS coordinates (source: simplemaps.com/data/na-cities)
export const NAMIBIA_LOCATIONS = [
  { name: 'Windhoek', lat: -22.5700, lng: 17.0836 },
  { name: 'Walvis Bay', lat: -22.9561, lng: 14.5081 },
  { name: 'Swakopmund', lat: -22.6833, lng: 14.5333 },
  { name: 'Oshakati', lat: -17.7833, lng: 15.6995 },
  { name: 'Rundu', lat: -17.9167, lng: 19.7667 },
  { name: 'Katima Mulilo', lat: -17.5039, lng: 24.2750 },
  { name: 'Otjiwarongo', lat: -20.4642, lng: 16.6528 },
  { name: 'Keetmanshoop', lat: -26.5786, lng: 18.1333 },
  { name: 'Ondangwa', lat: -17.9167, lng: 15.9500 },
  { name: 'Okahandja', lat: -21.9833, lng: 16.9167 },
  { name: 'Rehoboth', lat: -23.3167, lng: 17.0833 },
  { name: 'Gobabis', lat: -22.4333, lng: 18.9667 },
  { name: 'Grootfontein', lat: -19.5658, lng: 18.1036 },
  { name: 'Mariental', lat: -24.6333, lng: 17.9667 },
  { name: 'Tsumeb', lat: -19.2500, lng: 17.7000 },
  { name: 'Outjo', lat: -20.1089, lng: 16.1547 },
  { name: 'Karibib', lat: -21.9381, lng: 15.8544 },
  { name: 'Usakos', lat: -22.0000, lng: 15.6000 },
  { name: 'Omaruru', lat: -21.4333, lng: 15.9333 },
  { name: 'Henties Bay', lat: -22.1184, lng: 14.2824 },
];

export const LANGUAGES = [
  'English',
  'Afrikaans',
  'Oshiwambo',
  'Otjiherero',
  'Nama/Damara',
  'Rukwangali',
  'Silozi',
  'German',
  'Portuguese',
  'Setswana',
];

export const VEHICLE_TYPES = [
  { id: 'taxi', label: 'Taxi', icon: 'car-outline' },
  { id: 'yango', label: 'Yango / Ride-hailing', icon: 'phone-portrait-outline' },
  { id: 'sedan', label: 'Sedan', icon: 'car-outline' },
  { id: 'suv', label: 'SUV', icon: 'car-sport-outline' },
  { id: 'minibus', label: 'Minibus Taxi', icon: 'bus-outline' },
  { id: 'bus', label: 'Bus', icon: 'bus-outline' },
  { id: 'truck', label: 'Truck', icon: 'cube-outline' },
  { id: 'long_haul', label: 'Long-haul Truck', icon: 'swap-horizontal-outline' },
  { id: 'delivery', label: 'Delivery Van', icon: 'cart-outline' },
  { id: 'luxury', label: 'Luxury / VIP', icon: 'diamond-outline' },
  { id: 'tour', label: 'Tour / Safari', icon: 'compass-outline' },
  { id: 'construction', label: 'Construction', icon: 'construct-outline' },
];

export const AVAILABILITY_OPTIONS = [
  { id: 'full_time', label: 'Full Time', description: 'Available for permanent positions' },
  { id: 'part_time', label: 'Part Time', description: 'Available for specific hours' },
  { id: 'weekends_only', label: 'Weekends Only', description: 'Available Saturdays & Sundays' },
];

export const DOCUMENT_TYPES = [
  {
    id: 'drivers_license',
    label: "Driver's License",
    required: true,
    requiresSelfie: true,
    requiresExpiry: true,
    requiresNumber: true,
    icon: 'card-outline',
    instructions: "Take a clear photo of the front of your driver's license. Make sure all text and your photo are visible.",
  },
  {
    id: 'pdp',
    label: 'Professional Driving Permit (PDP)',
    required: false,
    requiresSelfie: false,
    requiresExpiry: true,
    requiresNumber: true,
    icon: 'shield-checkmark-outline',
    instructions: 'Photograph your PDP card or certificate clearly.',
  },
  {
    id: 'id_document',
    label: 'National ID / Passport',
    required: true,
    requiresSelfie: true,
    requiresExpiry: false,
    requiresNumber: true,
    icon: 'finger-print-outline',
    instructions: 'Take a photo of your National ID card or passport bio page.',
  },
  {
    id: 'police_clearance',
    label: 'Police Clearance Certificate',
    required: false,
    requiresSelfie: false,
    requiresExpiry: false,
    requiresNumber: false,
    icon: 'shield-outline',
    instructions: 'Photograph the full police clearance certificate including stamps and signatures.',
  },
  {
    id: 'reference_letter',
    label: 'Reference Letter',
    required: false,
    requiresSelfie: false,
    requiresExpiry: false,
    requiresNumber: false,
    icon: 'mail-outline',
    instructions: 'Photograph your reference letter. Ensure the letterhead and signature are visible.',
  },
];

export const VERIFICATION_STATUS = {
  pending: { label: 'Pending Review', color: COLORS.pending },
  submitted: { label: 'Under Review', color: COLORS.warning },
  verified: { label: 'Verified', color: COLORS.verified },
  rejected: { label: 'Rejected', color: COLORS.rejected },
  expired: { label: 'Expired', color: COLORS.error },
};

