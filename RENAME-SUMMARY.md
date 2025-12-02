# Rename Summary: secure-app → markindex

## Changes Made

All references to "secure-app" and "secureapp" have been renamed to "markindex" throughout the project.

### Directory Structure
- ✅ `secure-app/` → `markindex/`

### Files Updated

#### Application Files (`markindex/`)
1. ✅ `package.json` - Changed name from "secure-app" to "markindex"
2. ✅ `init.sql` - Changed database name and admin email to markindex
3. ✅ `.env.example` - Changed database name from "secureapp" to "markindex"
4. ✅ `docker-compose.yml` - Changed container names and database name:
   - `secureapp-db` → `markindex-db`
   - `secureapp-app` → `markindex-app`
   - Database name: `secureapp` → `markindex`
5. ✅ `README.md` - Updated all references:
   - Title changed to "Markindex - KEA Security Course"
   - Project structure paths updated
   - Database setup commands updated

#### Documentation Files (Root)
6. ✅ `report.md` - Updated all configuration examples:
   - Environment variables
   - Docker compose configuration
   - Project structure paths
7. ✅ `FILES-CREATED.md` - Updated application root path reference

### Database Changes
- Database name: `secureapp` → `markindex`
- Admin email: `admin@secureapp.local` → `admin@markindex.io`

### Container Names
- `secureapp-db` → `markindex-db`
- `secureapp-app` → `markindex-app`

### URLs/Domains
- References to secureapp domain updated to markindex.io where applicable

## Verification

All files have been checked and updated. No remaining references to "secure-app" or "secureapp" exist in the codebase.

## Next Steps

1. If using Docker, rebuild containers:
   ```bash
   cd markindex
   docker-compose down
   docker-compose up --build
   ```

2. If using local database, rename it:
   ```bash
   # PostgreSQL
   ALTER DATABASE secureapp RENAME TO markindex;

   # Or drop and recreate
   dropdb secureapp
   createdb markindex
   psql markindex < init.sql
   ```

3. Update your `.env.local` file:
   ```bash
   DATABASE_URL=postgresql://appuser:password@localhost:5432/markindex
   ```

The project is now fully renamed to "markindex"!
