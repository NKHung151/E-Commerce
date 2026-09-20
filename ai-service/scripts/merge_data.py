import pandas as pd
from pathlib import Path
import sys

# Add ai-service to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import settings

def merge_data():
    excel_path = Path(settings.BEHAVIOR_EXCEL_PATH)
    csv_path = Path(settings.BEHAVIOR_CSV_PATH)
    
    # 1. Load Excel Data
    print(f"Reading Excel data from {excel_path}...")
    if excel_path.exists():
        df_excel = pd.read_excel(excel_path)
    else:
        print(f"Warning: Excel file not found at {excel_path}")
        df_excel = pd.DataFrame(columns=['user_id', 'product_id', 'action', 'timestamp'])
    
    # 2. Load Live CSV Data
    if csv_path.exists():
        print(f"Reading live behavior data from {csv_path}...")
        df_csv = pd.read_csv(csv_path)
    else:
        df_csv = pd.DataFrame(columns=['user_id', 'product_id', 'action', 'timestamp'])
        
    # 3. Merge and Deduplicate
    print("Merging datasets...")
    df_final = pd.concat([df_excel, df_csv]).drop_duplicates(subset=['user_id', 'product_id', 'action', 'timestamp'])
    
    # 4. Save back to BOTH formats
    print(f"Saving merged data ({len(df_final)} records) to CSV: {csv_path}")
    df_final.to_csv(csv_path, index=False)
    
    print(f"Updating source Excel file: {excel_path}")
    try:
        df_final.to_excel(excel_path, index=False)
        print("Success: Excel file updated successfully!")
    except Exception as e:
        print(f"Error updating Excel: {e}. (Make sure the file is not open in another program)")

if __name__ == "__main__":
    merge_data()
