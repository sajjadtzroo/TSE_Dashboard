"""
Database schema utilities
Provides helper functions for schema operations
"""
from database.models import Base


def get_table_names():
    """Get list of all table names defined in models"""
    return [table.name for table in Base.metadata.sorted_tables]


def get_table_info():
    """Get detailed information about all tables"""
    tables_info = []

    for table in Base.metadata.sorted_tables:
        columns_info = []
        for column in table.columns:
            columns_info.append({
                'name': column.name,
                'type': str(column.type),
                'nullable': column.nullable,
                'primary_key': column.primary_key,
                'foreign_key': column.foreign_keys is not None and len(column.foreign_keys) > 0
            })

        tables_info.append({
            'name': table.name,
            'columns': columns_info,
            'indexes': [idx.name for idx in table.indexes],
            'constraints': [c.name for c in table.constraints if hasattr(c, 'name') and c.name]
        })

    return tables_info


def print_schema():
    """Print database schema information in readable format"""
    print("\n" + "="*80)
    print("DATABASE SCHEMA")
    print("="*80)

    for table_info in get_table_info():
        print(f"\nTable: {table_info['name']}")
        print("-" * 80)

        print("\nColumns:")
        for col in table_info['columns']:
            pk = " [PK]" if col['primary_key'] else ""
            fk = " [FK]" if col['foreign_key'] else ""
            null = " NULL" if col['nullable'] else " NOT NULL"
            print(f"  - {col['name']}: {col['type']}{null}{pk}{fk}")

        if table_info['indexes']:
            print("\nIndexes:")
            for idx in table_info['indexes']:
                if idx:  # Skip None names
                    print(f"  - {idx}")

        if table_info['constraints']:
            print("\nConstraints:")
            for constraint in table_info['constraints']:
                if constraint:  # Skip None names
                    print(f"  - {constraint}")

    print("\n" + "="*80 + "\n")


if __name__ == '__main__':
    # Print schema when run directly
    print_schema()
