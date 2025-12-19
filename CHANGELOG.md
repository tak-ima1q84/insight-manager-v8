# Changelog

## v7.0.1 - 2024-12-19

### Fixed
- **CSV Import/Export**: Fixed critical issue where CSV files exported from the system could not be imported back
- **CSV Field Escaping**: Properly escape CSV fields containing commas, quotes, and special characters
- **JSON Array Parsing**: Enhanced parsing of JSON array fields (targetBanks, storyImages) in CSV import
- **Error Handling**: Improved validation and error reporting for CSV import process
- **Data Integrity**: CSV import/export cycle now maintains data integrity for all field types

### Technical Details
- Fixed CSV export to wrap all fields in quotes and escape internal quotes
- Enhanced CSV parser to handle escaped quotes within quoted fields
- Improved safeJSONParse function for better JSON field handling
- Added validation for required fields (subject, insightId)
- Better error messages for debugging import issues

## v7.0.0 - 2024-12-17

### Changed
- **Documentation Cleanup**: Removed excessive documentation files from v6
- **Simplified Structure**: Kept only essential files (README.md, QUICKSTART.md, CHANGELOG.md)
- **Working QUICKSTART**: Fixed and simplified the quick start guide with clear step-by-step instructions
- **Clean Project**: Removed redundant deployment guides and multiple README variants

### Removed
- 20+ redundant documentation files
- Multiple deployment guides
- Duplicate README files
- Excessive configuration files

### Maintained
- All core functionality from v6
- Complete source code
- Docker configuration
- Database schema and migrations
- React frontend
- ElysiaJS backend

### Fixed
- QUICKSTART.md now provides working instructions
- Clear setup process for both Docker and local development
- Proper environment configuration examples