# Inventory Tracker

## Overview

This is a full-stack inventory management application built with React, Express, and PostgreSQL. The system allows users to track items by storing them in specific bin locations, with features for searching, adding, editing, and organizing inventory data. The application supports CSV import/export functionality and provides a clean, responsive interface for managing warehouse or storage inventory.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for robust form handling
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Schema Validation**: Zod for runtime type checking and API validation
- **File Upload**: Multer for handling CSV file uploads
- **Session Management**: Express sessions with PostgreSQL store

### Database Design
- **Database**: PostgreSQL with connection via Neon Database serverless driver
- **Schema**: Single `items` table with fields for description, bin location, brand, size, color, category, condition, price, and notes
- **Migrations**: Drizzle Kit for database schema migrations and management

### Key Features Architecture
- **Search System**: Real-time search across all item fields with debounced queries
- **Bin Organization**: Items grouped by bin locations with browsing interface
- **CSV Operations**: Import/export functionality with error handling and validation
- **Responsive Design**: Mobile-first approach with collapsible sidebar navigation

### Storage Strategy
- **Development**: In-memory storage implementation for rapid prototyping
- **Production**: PostgreSQL database with proper persistence and relationships
- **Data Validation**: Comprehensive validation at both client and server levels

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: PostgreSQL database connection for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-kit**: Database migration and schema management tools

### UI Components
- **@radix-ui/***: Comprehensive set of unstyled, accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant styling system

### Form Handling
- **react-hook-form**: Performant forms library with minimal re-renders
- **@hookform/resolvers**: Validation resolver for React Hook Form
- **zod**: Schema validation library for runtime type checking

### File Processing
- **multer**: Middleware for handling multipart/form-data (file uploads)
- **csv parsing**: Custom CSV parsing implementation for data import/export

### Development Tools
- **typescript**: Static type checking for both frontend and backend
- **vite**: Fast build tool with HMR for development
- **tsx**: TypeScript execution engine for Node.js development