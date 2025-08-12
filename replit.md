# QuizMaster - Dynamic Quiz & Exam Platform

## Overview

QuizMaster is a modern web application designed for creating and taking interactive quizzes. The platform serves both teachers and students, providing role-based dashboards, real-time quiz functionality, and comprehensive quiz management. Teachers can create and manage quizzes with various question types, while students can take quizzes and view their results on leaderboards.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built using **React 18** with **TypeScript** and follows a modern component-based architecture:

- **Framework**: React with Vite for fast development and building
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Styling**: Tailwind CSS with CSS variables for theming
- **Forms**: React Hook Form with Zod validation for type-safe form handling

The frontend structure separates concerns with dedicated directories for components, pages, hooks, and utilities. Custom hooks like `useAuth` manage authentication state, while the routing system provides role-based access control.

### Backend Architecture
The server-side uses **Express.js** with **TypeScript** in a REST API architecture:

- **Framework**: Express.js with middleware for JSON parsing and logging
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions stored in PostgreSQL
- **API Structure**: RESTful endpoints organized by feature (auth, quizzes, questions, attempts)
- **Error Handling**: Centralized error middleware with proper HTTP status codes

The backend follows a layered architecture with separate modules for database operations, authentication, and route handling.

### Database Architecture
The application uses **PostgreSQL** with **Drizzle ORM** for type-safe database operations:

- **ORM**: Drizzle ORM with schema-first approach
- **Schema**: Defined in TypeScript with automatic type generation
- **Tables**: Users, quizzes, questions, quiz attempts, and sessions
- **Relationships**: Foreign key constraints between related entities
- **Migrations**: Managed through Drizzle Kit

The database design supports role-based access (teachers/students), quiz versioning, and comprehensive attempt tracking.

### Authentication & Authorization
Implements **Replit Auth** for seamless authentication:

- **Strategy**: OpenID Connect with Passport.js
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Role Management**: User roles (teacher/student) determine access levels
- **Security**: HTTP-only cookies, CSRF protection, and secure session handling

### State Management Pattern
Uses a modern React Query pattern for efficient data management:

- **Server State**: TanStack Query handles API calls, caching, and synchronization
- **Client State**: React hooks and context for UI-specific state
- **Form State**: React Hook Form for complex form handling
- **Authentication State**: Custom useAuth hook with automatic redirects

### Error Handling & User Experience
Comprehensive error handling ensures robust user experience:

- **API Errors**: Structured error responses with appropriate HTTP codes
- **Client Errors**: Toast notifications and fallback UI states
- **Authentication**: Automatic redirects to login on unauthorized access
- **Loading States**: Skeleton loaders and loading indicators throughout the app

## External Dependencies

### Database Services
- **PostgreSQL**: Primary database for all application data
- **Neon Database**: Serverless PostgreSQL provider via `@neondatabase/serverless`

### Authentication Services
- **Replit Auth**: OAuth provider for user authentication and authorization
- **OpenID Connect**: Standard protocol for secure authentication flows

### Development & Build Tools
- **Vite**: Modern build tool and development server
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast bundling for production builds
- **Drizzle Kit**: Database migration and schema management tool

### UI & Styling Libraries
- **Radix UI**: Headless UI components for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library based on Radix UI

### Utility Libraries
- **Zod**: Schema validation for forms and API responses
- **date-fns**: Date manipulation and formatting utilities
- **clsx/tailwind-merge**: Conditional CSS class management
- **nanoid**: URL-safe unique ID generation