import csv
import os
import logging

from app.exceptions.custom_exceptions import InternalServerException

logger = logging.getLogger(__name__)

class CSVParser:
    """
    Efficient CSV parser with validation and error handling
    """
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.required_fields = ['name', 'sku', 'description']
    
    def count_rows(self) -> int:
        """Count total rows in CSV (excluding header)"""
        try:
            with open(self.file_path, 'r', encoding='utf-8-sig') as f:
                return sum(1 for _ in f) - 1  # Exclude header
        except Exception as e:
            logger.error(f"Error counting rows: {e}")
            return 0
    
    def parse(self):
        """
        Generator to parse CSV row by row
        Yields validated row data
        """
        try:
            with open(self.file_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                
                # Validate headers
                if not all(field in reader.fieldnames for field in self.required_fields):
                    raise ValueError(f"CSV missing required fields: {self.required_fields}")
                
                for row_num, row in enumerate(reader, start=2):
                    try:
                        # Clean and validate data
                        cleaned_row = {
                            'sku': row['sku'].strip() if row.get('sku') else '',
                            'name': row['name'].strip() if row.get('name') else '',
                            'description': row['description'].strip() if row.get('description') else ''
                        }
                        
                        # Validation
                        if not cleaned_row['sku']:
                            logger.warning(f"Row {row_num}: Missing SKU, skipping")
                            continue
                        
                        if not cleaned_row['name']:
                            logger.warning(f"Row {row_num}: Missing name, skipping")
                            continue
                        
                        yield cleaned_row
                        
                    except Exception as e:
                        logger.error(f"Error parsing row {row_num}: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error reading CSV file: {e}")
            raise InternalServerException("Failed to parse CSV file")
    
    def cleanup(self):
        """Remove temporary file"""
        try:
            if os.path.exists(self.file_path):
                os.remove(self.file_path)
                logger.info(f"Cleaned up file: {self.file_path}")
        except Exception as e:
            logger.error(f"Error cleaning up file: {e}")
            raise InternalServerException("Failed to clean up CSV file")
