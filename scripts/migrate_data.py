import pandas as pd

# Load source data
df_src = pd.read_csv('JOSAA_2026_Predicted_Cutoffs.csv')

# Load target to build mappings
df_tgt = pd.read_csv('2024_data0.csv')
state_map = df_tgt.set_index('State')['StateId'].to_dict()
state_map_lower = {k.lower(): v for k, v in state_map.items()}
state_map_lower['utterakhand'] = state_map_lower.get('uttarakhand')
state_map_lower['daman and diu'] = state_map_lower.get('dadra and nagar haveli and daman and diu')
state_map_rev = {v: k for k, v in state_map.items()} # Id to proper State name

inst_map = df_tgt.set_index('Institute')['InstituteId'].to_dict()
max_inst_id = max(inst_map.values()) if inst_map else 0

# Convert columns
# The desired output columns
target_cols = ['Institute', 'AcademicProgramName', 'Quota', 'SeatType', 'Gender',
               'OpeningRank', 'ClosingRank', 'State', 'StateId', 'InstituteId', 'Type', 'Id']

records = []
for idx, row in df_src.iterrows():
    inst = row['Institute']
    inst_id = inst_map.get(inst)
    if inst_id is None:
        max_inst_id += 1
        inst_id = max_inst_id
        inst_map[inst] = inst_id

    st = row['college_state']
    st_lower = str(st).lower()
    st_id = state_map_lower.get(st_lower, 0)
    proper_state = state_map_rev.get(st_id, st)

    # For opening rank, if we don't have it, we use predicted_closing_rank_2026 or 0
    # Actually, in source there is no predicted_opening_rank.
    # The API sorts by ClosingRank, then OpeningRank. We'll set OpeningRank to 0.
    c_rank = row['predicted_closing_rank_2026']
    o_rank = 0

    # "Id" format in 2024_data0: InstituteId + GenderCode + SeatTypeCode etc..
    # Or just random unique string, we can make it row index
    record_id = f"{inst_id}P{idx}" # P for predicted

    new_row = {
        'Institute': inst,
        'AcademicProgramName': f"{row['branch_shortcut']} ({row['degree_type']})",
        'Quota': row['Quota'],
        'SeatType': row['Seat Type'],
        'Gender': row['Gender'],
        'OpeningRank': o_rank,
        'ClosingRank': c_rank,
        'Round1OpeningRank': 0, 'Round1ClosingRank': 0, 'Round2OpeningRank': 0, 'Round2ClosingRank': 0,
        'Round3OpeningRank': 0, 'Round3ClosingRank': 0, 'Round4OpeningRank': 0, 'Round4ClosingRank': 0,
        'Round5OpeningRank': 0, 'Round5ClosingRank': 0,
        'State': proper_state,
        'StateId': st_id,
        'InstituteId': inst_id,
        'Type': row['institute_type'],
        'Id': record_id
    }
    records.append(new_row)

df_out = pd.DataFrame(records)
print("Mapped columns successfully. First row:")
print(df_out.head(1).to_dict(orient='records'))
print(f"Total rows: {len(df_out)}")

# Write the final transformed DataFrame back to CSV
out_path = '2026_Predicted_Cutoffs.csv'
df_out.to_csv(out_path, index=False)
print(f"Data successfully saved to {out_path}")
