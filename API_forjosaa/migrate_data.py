import pandas as pd
import sys

def migrate():
    # Since unipillar-backend is an external repo, we'll assume it's downloaded or accessible.
    # For this script we assume the source file is adjacent or we point to its path.
    source_path = '../unipillar-backend/data/JOSAA_2026_Predicted_Cutoffs.csv'
    target_path = 'data/predicted_cutoffs_cleaned.csv'

    print(f"Reading source dataset from {source_path}...")
    try:
        df = pd.read_csv(source_path)
    except FileNotFoundError:
        print(f"Error: Could not find {source_path}. Please ensure the unipillar-backend repository is available.")
        sys.exit(1)

    initial_row_count = len(df)
    print(f"Initial row count: {initial_row_count}")

    # Strip potential BOM from the first column name
    df.rename(columns=lambda x: x.strip('\ufeff'), inplace=True)

    # Define mapping blueprint
    mapping = {
        'Institute': 'Institute',
        'college_state': 'CollegeState',
        'branch_shortcut': 'BranchShortcut',
        'degree_type': 'DegreeType',
        'Quota': 'Quota',
        'Seat Type': 'SeatType',
        'Gender': 'Gender',
        'predicted_closing_rank_2026': 'PredictedClosingRank2026',
        'institute_type': 'InstituteType',
        'Global_Prestige_Index': 'GlobalPrestigeIndex',
        'Global_Branch_Popularity': 'GlobalBranchPopularity'
    }

    # Print old to new column mapping
    print("\n--- Column Mapping Summary ---")
    for old_col, new_col in mapping.items():
        print(f"{old_col} ➔ {new_col}")
    print("------------------------------\n")

    # Apply mapping
    df.rename(columns=mapping, inplace=True)

    final_row_count = len(df)
    print(f"Final row count: {final_row_count}")

    if initial_row_count != final_row_count:
        print("ERROR: Row count mismatch! Data integrity compromised.")
        sys.exit(1)

    print("Row counts match successfully. Zero data loss verified.")

    df.to_csv(target_path, index=False)
    print(f"Cleaned dataset exported to {target_path}")

if __name__ == "__main__":
    migrate()
