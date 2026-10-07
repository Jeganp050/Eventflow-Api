import { Role, EventStatus, BookingStatus } from '@prisma/client';

export { Role, EventStatus, BookingStatus };

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
  iat?: number;
  exp?: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface EventFilterQuery extends PaginationQuery {
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
  status?: EventStatus;
  availableOnly?: boolean;
  search?: string;
  sort?: 'startTime' | 'price' | 'createdAt' | 'capacity';
  order?: 'asc' | 'desc';
}

export interface EventStats {
  ticketsSold: number;
  remainingCapacity: number;
  totalCapacity: number;
  revenue: number;
  bookingCount: number;
  confirmedBookings: number;
  cancelledBookings: number;
}
