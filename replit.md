# Codebase Time Machine

## Overview

Codebase Time Machine is a full-stack web application that visualizes the evolution of GitHub repositories over time. The application analyzes git commit history to help new engineers understand how codebases have evolved through feature development, bug fixes, refactoring, and architectural changes. Users input a GitHub repository URL and receive an interactive timeline visualization categorizing commits into different event types (major features, minor features, bug fixes, refactors, and architecture changes).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for build tooling
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Data Visualization**: D3.js for interactive timeline charts and commit visualization
- **Form Handling**: React Hook Form with Zod schema validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for repository analysis and data retrieval
- **Git Operations**: Child process execution of git commands for repository cloning and log parsing
- **Data Processing**: Server-side commit categorization using keyword matching and file analysis

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: Two main entities - repositories and commits with proper foreign key relationships
- **Hosting**: Neon Database for PostgreSQL hosting
- **Migration Strategy**: Drizzle Kit for database schema migrations

### Authentication and Authorization
- **Current Implementation**: No authentication system implemented
- **Access Control**: Public access to all repository analysis features
- **Security**: Basic input validation using Zod schemas

### Development and Build Configuration
- **Development Server**: Vite dev server with HMR and custom middleware
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **TypeScript**: Strict mode enabled with path mapping for clean imports
- **Code Organization**: Monorepo structure with shared schema between client and server

### Data Flow and Processing
- **Repository Analysis**: Asynchronous processing of git repositories with status tracking
- **Commit Categorization**: Rule-based classification into 5 event types based on commit messages and file changes
- **Real-time Updates**: Polling mechanism for repository processing status updates
- **Caching Strategy**: React Query handles client-side caching with configurable stale time

### UI/UX Design Patterns
- **Layout**: Modern SaaS dashboard with sidebar navigation and main content area
- **Color System**: CSS custom properties for theming with semantic color naming
- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints
- **Interactive Elements**: Hover states, tooltips, and smooth transitions for enhanced user experience
- **Accessibility**: Radix UI primitives ensure ARIA compliance and keyboard navigation